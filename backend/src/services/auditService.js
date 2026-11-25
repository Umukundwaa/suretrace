const db = require('../config/db');

// NFR 8: keep a record of account events. Only the last 4 digits of the National ID are stored for
// failed attempts, and a logging problem must never block the user, so errors are swallowed.
async function logAccountEvent({ sellerId = null, nationalId = '', event, ip = null }) {
  try {
    await db.query('INSERT INTO login_logs (seller_id, national_id_last4, event, ip) VALUES (?,?,?,?)',
      [sellerId, String(nationalId).slice(-4) || null, event, ip]);
  } catch (e) { console.error('audit log failed:', e.message); }
}

async function recentActivity(sellerId, limit = 10) {
  return db.query('SELECT event, logged_at FROM login_logs WHERE seller_id = ? ORDER BY id DESC LIMIT ' + Number(limit), [sellerId]);
}

module.exports = { logAccountEvent, recentActivity };
