const db = require('../config/db');
const api = require('./insuranceApiClient');
const { normalizePlate } = require('../utils/plate');

const today = () => new Date().toISOString().slice(0, 10);
const dayMs = 86400000;
const toMs = (d) => Date.parse(d + 'T00:00:00Z');

function certStatus(c, now = today()) {
  if (c.start_date > now) return 'upcoming';
  return c.end_date >= now ? 'active' : 'expired';
}

// Pull certs from the insurer API and keep a local copy. If the API is down we serve the
// cache and flag the result as stale rather than failing.
async function loadCertificates(plate) {
  const p = normalizePlate(plate);
  let stale = false, certs;
  try {
    certs = await api.fetchCertificates(p);
    for (const c of certs) {
      const ex = await db.query('SELECT id FROM insurance_certificates WHERE certificate_no = ?', [c.certificate_no]);
      if (!ex.length) {
        await db.query(
          `INSERT INTO insurance_certificates (plate, certificate_no, policy_no, insurer_code, insurer_name, certificate_class, cover_type, policyholder, start_date, end_date, persons_entitled, premium_rwf)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
          [p, c.certificate_no, c.policy_no, c.insurer_code, c.insurer_name, c.certificate_class, c.cover_type, c.policyholder, c.start_date, c.end_date, c.persons_entitled, c.premium_rwf]
        );
      }
    }
  } catch (e) {
    stale = true;
    certs = await db.query('SELECT * FROM insurance_certificates WHERE plate = ?', [p]);
  }
  return { certs: certs.map((c) => ({ ...c, status: certStatus(c) })), stale };
}

// Buyer view: minimal, no personal data
async function quickStatus(plate) {
  const { certs, stale } = await loadCertificates(plate);
  const active = certs.filter((c) => c.status === 'active').sort((a, b) => b.end_date.localeCompare(a.end_date))[0];
  let result = 'notfound', last = null;
  if (active) result = 'active';
  else if (certs.length) { result = 'expired'; last = [...certs].sort((a, b) => b.end_date.localeCompare(a.end_date))[0]; }
  const shown = active || last;
  return {
    plate: normalizePlate(plate),
    status: result,
    stale,
    insurer: shown ? shown.insurer_name : null,
    policy_no: shown ? shown.policy_no : null,
    start_date: shown ? shown.start_date : null,
    end_date: shown ? shown.end_date : null
  };
}

// Seller view: one row per Rwandan insurer, whether or not the seller ever dealt with it
async function fullHistory(plate) {
  const p = normalizePlate(plate);
  const [insurers, { certs, stale }] = await Promise.all([
    api.fetchInsurers().catch(() => null),
    loadCertificates(p)
  ]);
  const list = insurers || [...new Map(certs.map((c) => [c.insurer_code, { code: c.insurer_code, name: c.insurer_name }])).values()];

  const rows = list.map((ins) => {
    const mine = certs.filter((c) => c.insurer_code === ins.code).sort((a, b) => b.start_date.localeCompare(a.start_date));
    const hasActive = mine.some((c) => c.status === 'active');
    return {
      insurer_code: ins.code,
      insurer_name: ins.name,
      status: hasActive ? 'active' : mine.length ? 'past' : 'none',
      certificates: mine
    };
  });
  // active first, then past, then none
  const order = { active: 0, past: 1, none: 2 };
  rows.sort((a, b) => order[a.status] - order[b.status]);

  // coverage gaps between consecutive certificates (useful when a buyer/RRA asks "was it ever uninsured?")
  const sorted = [...certs].sort((a, b) => a.start_date.localeCompare(b.start_date));
  const gaps = [];
  let coveredUntil = null;
  for (const c of sorted) {
    if (coveredUntil && toMs(c.start_date) - toMs(coveredUntil) > dayMs) {
      gaps.push({ from: new Date(toMs(coveredUntil) + dayMs).toISOString().slice(0, 10), to: new Date(toMs(c.start_date) - dayMs).toISOString().slice(0, 10), days: Math.round((toMs(c.start_date) - toMs(coveredUntil)) / dayMs) - 1 });
    }
    if (!coveredUntil || c.end_date > coveredUntil) coveredUntil = c.end_date;
  }

  return {
    plate: p,
    stale,
    generated_at: new Date().toISOString(),
    insurers_checked: rows.length,
    insurers_with_cover: rows.filter((r) => r.status !== 'none').length,
    total_certificates: certs.length,
    first_cover: sorted[0] ? sorted[0].start_date : null,
    currently_insured: certs.some((c) => c.status === 'active'),
    gaps,
    insurers: rows
  };
}

module.exports = { quickStatus, fullHistory, loadCertificates, certStatus };
