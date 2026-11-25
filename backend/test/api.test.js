// Run with: npm test   (starts its own mock insurer API + backend on SQLite, no setup needed)
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');

const MOCK_PORT = 4301, API_PORT = 4300, BASE = `http://localhost:${API_PORT}/api`;
const dbFile = path.join(os.tmpdir(), `suretrace-test-${Date.now()}.sqlite`);
const procs = [];
const start = (cwd, env) => { const p = spawn(process.execPath, ['--no-warnings', 'src/server.js'], { cwd, env: { ...process.env, ...env }, stdio: 'ignore' }); procs.push(p); return p; };
const waitFor = async (url) => { for (let i = 0; i < 50; i++) { try { if ((await fetch(url)).ok) return; } catch {} await new Promise((r) => setTimeout(r, 150)); } throw new Error('server did not start: ' + url); };
const call = async (p, { method = 'GET', body, token } = {}) => {
  const res = await fetch(BASE + p, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const type = res.headers.get('content-type') || '';
  return { status: res.status, type, data: type.includes('json') ? await res.json() : Buffer.from(await res.arrayBuffer()) };
};

let ange, jc; // tokens
before(async () => {
  start(path.join(__dirname, '../../mock-insurer-api'), { PORT: MOCK_PORT });
  start(path.join(__dirname, '..'), { PORT: API_PORT, DB_CLIENT: 'sqlite', SQLITE_FILE: dbFile, INSURER_API_URL: `http://localhost:${MOCK_PORT}`, JWT_SECRET: 'test-secret' });
  await waitFor(`http://localhost:${MOCK_PORT}/health`); await waitFor(`http://localhost:${API_PORT}/health`);
});
after(() => { procs.forEach((p) => p.kill()); try { fs.unlinkSync(dbFile); } catch {} });

test('buyer search: active, expired, no record, invalid plate', async () => {
  assert.equal((await call('/search/RAD123A')).data.status, 'active');
  assert.equal((await call('/search/RAC%20902%20B')).data.status, 'expired');
  assert.equal((await call('/search/RAE310D')).data.status, 'notfound');
  const bad = await call('/search/XYZ'); assert.equal(bad.status, 400); assert.equal(bad.data.error, 'invalid_plate');
});

test('buyer search exposes no personal data', async () => {
  const { data } = await call('/search/RAD123A');
  assert.deepEqual(Object.keys(data).sort(), ['end_date', 'insurer', 'plate', 'policy_no', 'stale', 'start_date', 'status']);
});

test('FR 1.2: registration is refused for a National ID that owns no registered vehicle', async () => {
  const r = await call('/auth/register', { method: 'POST', body: { national_id: '1111111111111111', full_name: 'Not An Owner', password: 'password123' } });
  assert.equal(r.status, 403); assert.equal(r.data.error, 'not_registered_owner');
  assert.equal((await call('/auth/login', { method: 'POST', body: { national_id: '1111111111111111', password: 'password123' } })).status, 401, 'no account must exist');
});

test('FR 1.2: a registered owner who is not yet in the app can sign up', async () => {
  const r = await call('/auth/register', { method: 'POST', body: { national_id: '1199680044433322', full_name: 'Eric Niyonsenga', password: 'password123' } });
  assert.equal(r.status, 201);
});

test('register validates input and rejects duplicates', async () => {
  assert.equal((await call('/auth/register', { method: 'POST', body: { national_id: '123', full_name: 'Ange U', password: 'password123' } })).data.error, 'invalid_national_id');
  assert.equal((await call('/auth/register', { method: 'POST', body: { national_id: '1199880012345678', full_name: 'Ange U', password: 'short' } })).data.error, 'weak_password');
  const ok = await call('/auth/register', { method: 'POST', body: { national_id: '1199880012345678', full_name: 'Ange Umukundwa', password: 'password123' } });
  assert.equal(ok.status, 201); ange = ok.data.token;
  assert.equal((await call('/auth/register', { method: 'POST', body: { national_id: '1199880012345678', full_name: 'Ange Umukundwa', password: 'password123' } })).status, 409);
  const j = await call('/auth/register', { method: 'POST', body: { national_id: '1198570098765432', full_name: 'Jean Claude', password: 'password123' } });
  jc = j.data.token;
});

test('login: wrong password and unknown ID give the same error', async () => {
  const a = await call('/auth/login', { method: 'POST', body: { national_id: '1199880012345678', password: 'wrongpass1' } });
  const b = await call('/auth/login', { method: 'POST', body: { national_id: '1111111111111111', password: 'wrongpass1' } });
  assert.equal(a.status, 401); assert.deepEqual(a.data, b.data);
  assert.equal((await call('/auth/login', { method: 'POST', body: { national_id: '1199880012345678', password: 'password123' } })).status, 200);
});

test('seller profile can change but National ID stays fixed; password can be updated', async () => {
  const before = await call('/seller/profile', { token: ange });
  assert.equal(before.status, 200);
  assert.equal(before.data.seller.national_id, '1199880012345678');
  const updated = await call('/seller/profile', {
    method: 'PUT', token: ange,
    body: { full_name: 'Ange Updated', phone: '+250 791 376 658', national_id: '1111111111111111' }
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.data.seller.full_name, 'Ange Updated');
  assert.equal(updated.data.seller.phone, '+250 791 376 658');
  assert.equal(updated.data.seller.national_id, '1199880012345678');
  ange = updated.data.token;

  assert.equal((await call('/seller/password', {
    method: 'PUT', token: ange, body: { current_password: 'wrongpass1', new_password: 'newpassword1' }
  })).data.error, 'current_password_incorrect');
  assert.equal((await call('/seller/password', {
    method: 'PUT', token: ange, body: { current_password: 'password123', new_password: 'newpassword1' }
  })).status, 200);
  assert.equal((await call('/auth/login', {
    method: 'POST', body: { national_id: '1199880012345678', password: 'password123' }
  })).status, 401);
  const login = await call('/auth/login', {
    method: 'POST', body: { national_id: '1199880012345678', password: 'newpassword1' }
  });
  assert.equal(login.status, 200);
  ange = login.data.token;
});

test('seller routes need a valid token', async () => {
  assert.equal((await call('/seller/vehicles')).status, 401);
  assert.equal((await call('/seller/vehicles', { token: 'garbage' })).status, 401);
});

test('claiming vehicles: only the registered owner can', async () => {
  assert.equal((await call('/seller/vehicles', { method: 'POST', token: ange, body: { plate: 'RAD 123 A' } })).status, 201);
  assert.equal((await call('/seller/vehicles', { method: 'POST', token: ange, body: { plate: 'RAB555C' } })).data.error, 'not_owner');
  assert.equal((await call('/seller/vehicles', { method: 'POST', token: ange, body: { plate: 'RZZ999Z' } })).data.error, 'vehicle_not_in_registry');
  assert.equal((await call('/seller/vehicles', { method: 'POST', token: jc, body: { plate: 'RAD123A' } })).data.error, 'not_owner');
  assert.equal((await call('/seller/vehicles', { method: 'POST', token: ange, body: { plate: 'RAD123A' } })).data.error, 'already_added');
});

test('full history covers all 9 insurers and finds uninsured gaps', async () => {
  const { status, data } = await call('/seller/vehicles/RAD123A/history', { token: ange });
  assert.equal(status, 200);
  const h = data.history;
  assert.equal(h.insurers_checked, 9); assert.equal(h.insurers_with_cover, 2); assert.equal(h.total_certificates, 3);
  assert.equal(h.currently_insured, true); assert.equal(h.gaps.length, 2);
  assert.equal(h.insurers.filter((i) => i.status === 'none').length, 7);
});

test('a seller cannot read another seller\'s vehicle or certificate', async () => {
  assert.equal((await call('/seller/vehicles/RAD123A/history', { token: jc })).status, 404);
  const mine = (await call('/seller/vehicles/RAD123A/history', { token: ange })).data.history.insurers[0].certificates[0].certificate_no;
  assert.equal((await call('/seller/certificates/' + mine, { token: ange })).status, 200);
  assert.equal((await call('/seller/certificates/' + mine, { token: jc })).status, 404);
});

test('PDF downloads are real PDFs', async () => {
  const h = await call('/seller/vehicles/RAD123A/history.pdf', { token: ange });
  assert.equal(h.status, 200); assert.match(h.type, /pdf/); assert.equal(h.data.subarray(0, 4).toString(), '%PDF');
  const no = (await call('/seller/vehicles/RAD123A/history', { token: ange })).data.history.insurers[0].certificates[0].certificate_no;
  const c = await call(`/seller/certificates/${no}/pdf`, { token: ange });
  assert.equal(c.data.subarray(0, 4).toString(), '%PDF');
});

test('QR verification: genuine report and certificate pass, fake ones fail', async () => {
  const dbmod = require('node:sqlite'); const db = new dbmod.DatabaseSync(dbFile);
  const ref = db.prepare('SELECT ref FROM history_reports LIMIT 1').get().ref; db.close();
  const r = await call('/verify/' + ref); assert.equal(r.data.valid, true); assert.equal(r.data.plate_display, 'RAD 123 A');
  assert.equal((await call('/verify/ST-FAKE-REF')).status, 404);
  const no = (await call('/seller/vehicles/RAD123A/history', { token: ange })).data.history.insurers[0].certificates[0].certificate_no;
  assert.equal((await call('/verify/cert/' + no)).data.valid, true);
  assert.equal((await call('/verify/cert/NOPE-123')).status, 404);
});

test('recent searches are dated, isolated by seller, and config endpoint works', async () => {
  await call('/search/RAD123A', { token: ange });
  await call('/search/RAC902B', { token: jc });
  const s = await call('/seller/searches', { token: ange });
  assert.equal(s.data.searches.length, 1);
  assert.equal(s.data.searches[0].plate_display, 'RAD 123 A');
  assert.equal(s.data.searches[0].result, 'active');
  assert.ok(s.data.searches[0].searched_at);
  const other = await call('/seller/searches', { token: jc });
  assert.equal(other.data.searches.length, 1);
  assert.equal(other.data.searches[0].plate_display, 'RAC 902 B');
  assert.equal(typeof (await call('/config')).data.demo, 'boolean');
});

test('NFR 8: sign-ups, logins and failed logins are written to the audit log', async () => {
  const { DatabaseSync } = require('node:sqlite');
  const count = (event) => { const db = new DatabaseSync(dbFile); const n = db.prepare('SELECT COUNT(*) n FROM login_logs WHERE event = ?').get(event).n; db.close(); return n; };
  const before = { ok: count('login'), bad: count('login_failed'), reg: count('register') };
  await call('/auth/login', { method: 'POST', body: { national_id: '1198570098765432', password: 'password123' } }); // Jean Claude's password is never changed in this suite
  await call('/auth/login', { method: 'POST', body: { national_id: '1198570098765432', password: 'wrong-password' } });
  assert.equal(count('login'), before.ok + 1); assert.equal(count('login_failed'), before.bad + 1);
  assert.ok(before.reg >= 3, 'registrations were logged');
});

test('NFR 8: a seller can see their own recent account activity, and only that', async () => {
  const mine = await call('/seller/activity', { token: ange });
  assert.equal(mine.status, 200); assert.ok(mine.data.activity.length >= 2);
  assert.ok(mine.data.activity.every((a) => ['register', 'login', 'login_failed'].includes(a.event)));
  assert.equal((await call('/seller/activity')).status, 401);
});

test('NFR 3: buyer search and seller history answer well within 5 seconds', async () => {
  let t0 = Date.now(); await call('/search/RAD123A'); assert.ok(Date.now() - t0 < 5000, 'buyer search too slow');
  t0 = Date.now(); await call('/seller/vehicles/RAD123A/history', { token: ange }); assert.ok(Date.now() - t0 < 5000, 'history too slow');
});
