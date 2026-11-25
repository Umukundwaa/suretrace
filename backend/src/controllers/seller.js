const crypto = require('crypto');
const db = require('../config/db');
const api = require('../services/insuranceApiClient');
const history = require('../services/historyService');
const pdf = require('../services/pdfService');
const { HttpError, wrap } = require('../utils/errors');
const { isValidPlate, normalizePlate, displayPlate } = require('../utils/plate');

async function ownedVehicle(sellerId, plate) {
  const rows = await db.query('SELECT * FROM vehicles WHERE plate = ? AND seller_id = ?', [normalizePlate(plate), sellerId]);
  if (!rows.length) throw new HttpError(404, 'vehicle_not_found', 'Vehicle not found on your account');
  return rows[0];
}

exports.listVehicles = wrap(async (req, res) => {
  const vehicles = await db.query('SELECT * FROM vehicles WHERE seller_id = ? ORDER BY id', [req.seller.id]);
  const out = [];
  for (const v of vehicles) {
    const q = await history.quickStatus(v.plate);
    out.push({ plate: v.plate, plate_display: v.plate_display, make: v.make, model: v.model, year: v.year, status: q.status, insurer: q.insurer });
  }
  res.json({ vehicles: out });
});

// Seller claims a plate; ownership is checked against the registry's owner National ID
exports.addVehicle = wrap(async (req, res) => {
  const plate = normalizePlate(req.body && req.body.plate);
  if (!isValidPlate(plate)) throw new HttpError(400, 'invalid_plate', 'Plate must look like RAD 123 A');
  const [me] = await db.query('SELECT national_id FROM sellers WHERE id = ?', [req.seller.id]);
  let reg;
  try { reg = await api.fetchVehicle(plate); } catch { throw new HttpError(502, 'registry_unavailable', 'Vehicle registry is unreachable, try again shortly'); }
  if (!reg) throw new HttpError(404, 'vehicle_not_in_registry', 'No vehicle found with this plate');
  if (reg.owner_national_id !== me.national_id) throw new HttpError(403, 'not_owner', 'This vehicle is not registered under your National ID');
  const dup = await db.query('SELECT id FROM vehicles WHERE plate = ?', [plate]);
  if (dup.length) throw new HttpError(409, 'already_added', 'This vehicle is already on an account');
  await db.query('INSERT INTO vehicles (plate, plate_display, make, model, year, chassis, vehicle_class, seller_id) VALUES (?,?,?,?,?,?,?,?)',
    [plate, displayPlate(plate), reg.make, reg.model, reg.year, reg.chassis, reg.vehicle_class, req.seller.id]);
  res.status(201).json({ plate, plate_display: displayPlate(plate) });
});

exports.vehicleHistory = wrap(async (req, res) => {
  const v = await ownedVehicle(req.seller.id, req.params.plate);
  const h = await history.fullHistory(v.plate);
  res.json({ vehicle: { plate: v.plate, plate_display: v.plate_display, make: v.make, model: v.model, year: v.year, chassis: v.chassis }, history: h });
});

exports.historyPdf = wrap(async (req, res) => {
  const v = await ownedVehicle(req.seller.id, req.params.plate);
  const [seller] = await db.query('SELECT full_name FROM sellers WHERE id = ?', [req.seller.id]);
  const h = await history.fullHistory(v.plate);
  const ref = `ST-${v.plate}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
  const digest = crypto.createHash('sha256').update(JSON.stringify(h.insurers)).digest('hex');
  await db.query('INSERT INTO history_reports (ref, plate, seller_id, digest) VALUES (?,?,?,?)', [ref, v.plate, req.seller.id, digest]);
  await pdf.historyPdf(res, { history: h, vehicle: v, seller, ref });
});

async function ownedCertificate(sellerId, no) {
  const rows = await db.query('SELECT * FROM insurance_certificates WHERE certificate_no = ?', [no]);
  if (!rows.length) throw new HttpError(404, 'certificate_not_found', 'Certificate not found');
  const v = await ownedVehicle(sellerId, rows[0].plate); // 404s if it's not their vehicle
  return { cert: { ...rows[0], status: history.certStatus(rows[0]) }, vehicle: v };
}

exports.certificate = wrap(async (req, res) => {
  const { cert, vehicle } = await ownedCertificate(req.seller.id, req.params.no);
  res.json({ certificate: cert, vehicle: { plate_display: vehicle.plate_display, make: vehicle.make, model: vehicle.model, chassis: vehicle.chassis } });
});

exports.certificatePdf = wrap(async (req, res) => {
  const { cert, vehicle } = await ownedCertificate(req.seller.id, req.params.no);
  await pdf.certificatePdf(res, { cert, vehicle });
});

exports.searches = wrap(async (req, res) => {
  const rows = await db.query('SELECT plate, result, searched_at FROM search_logs WHERE seller_id = ? ORDER BY id DESC LIMIT 20', [req.seller.id]);
  res.json({ searches: rows.map((r) => ({ ...r, plate_display: displayPlate(r.plate) })) });
});
