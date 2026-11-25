const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const cfg = require('../config');
const api = require('../services/insuranceApiClient');
const audit = require('../services/auditService');
const { HttpError, wrap } = require('../utils/errors');

const sign = (s) => jwt.sign({ sub: s.id, name: s.full_name }, cfg.jwtSecret, { expiresIn: cfg.jwtExpiresIn });

exports.register = wrap(async (req, res) => {
  const { national_id, full_name, phone, password } = req.body || {};
  if (!/^\d{16}$/.test(national_id || '')) throw new HttpError(400, 'invalid_national_id', 'National ID must be 16 digits');
  if (!full_name || full_name.trim().length < 3) throw new HttpError(400, 'invalid_name', 'Enter your full name');
  if (!password || password.length < 8) throw new HttpError(400, 'weak_password', 'Password must be at least 8 characters');
  const exists = await db.query('SELECT id FROM sellers WHERE national_id = ?', [national_id]);
  if (exists.length) throw new HttpError(409, 'already_registered', 'This National ID is already registered');
  // FR 1.2: the National ID must belong to a registered vehicle owner before an account is created
  let owner;
  try { owner = await api.fetchOwner(national_id); }
  catch { throw new HttpError(502, 'registry_unavailable', 'Vehicle registry is unreachable, try again shortly'); }
  if (!owner) throw new HttpError(403, 'not_registered_owner', 'This National ID is not registered as a vehicle owner');
  const hash = await bcrypt.hash(password, 10);
  const r = await db.query('INSERT INTO sellers (national_id, full_name, phone, password_hash) VALUES (?,?,?,?)', [national_id, full_name.trim(), phone || null, hash]);
  const seller = { id: r.insertId, full_name: full_name.trim() };
  await audit.logAccountEvent({ sellerId: seller.id, nationalId: national_id, event: 'register', ip: req.ip });
  res.status(201).json({ token: sign(seller), seller: { id: seller.id, full_name: seller.full_name } });
});

exports.login = wrap(async (req, res) => {
  const { national_id, password } = req.body || {};
  const rows = await db.query('SELECT * FROM sellers WHERE national_id = ?', [national_id || '']);
  // same error for unknown ID and wrong password so IDs can't be enumerated
  if (!rows.length || !(await bcrypt.compare(password || '', rows[0].password_hash))) {
    await audit.logAccountEvent({ sellerId: rows[0] ? rows[0].id : null, nationalId: national_id || '', event: 'login_failed', ip: req.ip });
    throw new HttpError(401, 'bad_credentials', 'National ID or password is incorrect');
  }
  const s = rows[0];
  await audit.logAccountEvent({ sellerId: s.id, nationalId: national_id, event: 'login', ip: req.ip });
  res.json({ token: sign(s), seller: { id: s.id, full_name: s.full_name } });
});

exports.profile = wrap(async (req, res) => {
  const rows = await db.query('SELECT id, national_id, full_name, phone FROM sellers WHERE id = ?', [req.seller.id]);
  if (!rows.length) throw new HttpError(404, 'seller_not_found', 'Seller account not found');
  res.json({ seller: rows[0] });
});

exports.updateProfile = wrap(async (req, res) => {
  const { full_name, phone } = req.body || {};
  const name = typeof full_name === 'string' ? full_name.trim() : '';
  const phoneValue = typeof phone === 'string' ? phone.trim() : '';
  if (name.length < 3 || name.length > 120) throw new HttpError(400, 'invalid_name', 'Enter a name between 3 and 120 characters');
  if (phoneValue.length > 20) throw new HttpError(400, 'invalid_phone', 'Phone number must be 20 characters or fewer');

  const rows = await db.query('SELECT id, national_id FROM sellers WHERE id = ?', [req.seller.id]);
  if (!rows.length) throw new HttpError(404, 'seller_not_found', 'Seller account not found');
  await db.query('UPDATE sellers SET full_name = ?, phone = ? WHERE id = ?', [name, phoneValue || null, req.seller.id]);
  const seller = { ...rows[0], full_name: name, phone: phoneValue || null };
  res.json({ seller, token: sign(seller) });
});

exports.updatePassword = wrap(async (req, res) => {
  const { current_password, new_password } = req.body || {};
  if (!new_password || new_password.length < 8) throw new HttpError(400, 'weak_password', 'Password must be at least 8 characters');
  const rows = await db.query('SELECT password_hash FROM sellers WHERE id = ?', [req.seller.id]);
  if (!rows.length) throw new HttpError(404, 'seller_not_found', 'Seller account not found');
  if (!(await bcrypt.compare(current_password || '', rows[0].password_hash))) {
    throw new HttpError(400, 'current_password_incorrect', 'Current password is incorrect');
  }
  const hash = await bcrypt.hash(new_password, 10);
  await db.query('UPDATE sellers SET password_hash = ? WHERE id = ?', [hash, req.seller.id]);
  res.json({ ok: true });
});

exports.activity = wrap(async (req, res) => {
  res.json({ activity: await audit.recentActivity(req.seller.id, 10) });
});
