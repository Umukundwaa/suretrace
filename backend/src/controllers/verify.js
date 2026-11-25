const db = require('../config/db');
const history = require('../services/historyService');
const { HttpError, wrap } = require('../utils/errors');
const { displayPlate } = require('../utils/plate');

// PUBLIC: what the QR code opens. Proves a report/certificate copy really came from SureTrace
// and shows the CURRENT status (never personal data).
exports.verifyReport = wrap(async (req, res) => {
  const rows = await db.query('SELECT ref, plate, generated_at FROM history_reports WHERE ref = ?', [req.params.ref]);
  if (!rows.length) throw new HttpError(404, 'not_found', 'No SureTrace report with this reference');
  const q = await history.quickStatus(rows[0].plate);
  res.json({ valid: true, type: 'history_report', ref: rows[0].ref, plate_display: displayPlate(rows[0].plate), generated_at: rows[0].generated_at, current_status: q.status });
});

exports.verifyCertificate = wrap(async (req, res) => {
  const rows = await db.query('SELECT * FROM insurance_certificates WHERE certificate_no = ?', [req.params.no]);
  if (!rows.length) throw new HttpError(404, 'not_found', 'No certificate with this number in the registry');
  const c = rows[0];
  res.json({ valid: true, type: 'certificate', certificate_no: c.certificate_no, insurer: c.insurer_name, plate_display: displayPlate(c.plate), start_date: c.start_date, end_date: c.end_date, status: history.certStatus(c) });
});
