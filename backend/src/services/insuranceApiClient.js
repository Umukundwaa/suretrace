// InsuranceAPIClient from the class diagram. Talks to the (mock or real) insurer registry.
// Node 22 has global fetch.
const cfg = require('../config');
const { normalizePlate } = require('../utils/plate');

async function call(path) {
  const res = await fetch(cfg.insurerApi.url + path, {
    headers: { 'x-api-key': cfg.insurerApi.key },
    signal: AbortSignal.timeout(5000)
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`insurer_api_${res.status}`);
  return res.json();
}

module.exports = {
  async fetchInsurers() { return (await call('/api/v1/insurers')).insurers; },
  async fetchOwner(nationalId) { const r = await call(`/api/v1/owners/${encodeURIComponent(nationalId)}`); return r && r.owner; },
  async fetchVehicle(plate) { const r = await call(`/api/v1/vehicles/${normalizePlate(plate)}`); return r && r.vehicle; },
  async fetchCertificates(plate) { return (await call(`/api/v1/certificates?plate=${normalizePlate(plate)}`)).certificates; }
};
