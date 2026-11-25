const express = require('express');
const cors = require('cors');
const { INSURERS, VEHICLES, CERTIFICATES } = require('./data');

const PORT = process.env.PORT || 4001;
const API_KEY = process.env.INSURER_API_KEY || 'dev-insurer-key';
const norm = (p) => String(p || '').replace(/[\s-]/g, '').toUpperCase();

const app = express();
app.use(cors());

app.get('/health', (_req, res) => res.json({ ok: true, service: 'mock-insurer-api' }));

app.use('/api/v1', (req, res, next) => {
  if (req.get('x-api-key') !== API_KEY) return res.status(401).json({ error: 'invalid_api_key' });
  next();
});

// All insurers that participate in the shared registry
app.get('/api/v1/insurers', (_req, res) => res.json({ insurers: INSURERS }));

// Vehicle registry lookup (stands in for the RRA/police vehicle register)
app.get('/api/v1/vehicles/:plate', (req, res) => {
  const v = VEHICLES[norm(req.params.plate)];
  if (!v) return res.status(404).json({ error: 'vehicle_not_found' });
  res.json({ vehicle: v });
});

// Owner lookup: is this National ID the registered owner of at least one vehicle? (used for FR 1.2)
app.get('/api/v1/owners/:nid', (req, res) => {
  const owned = Object.values(VEHICLES).filter((v) => v.owner_national_id === req.params.nid);
  if (!owned.length) return res.status(404).json({ error: 'owner_not_found' });
  res.json({ owner: { national_id: req.params.nid, name: owned[0].owner_name, vehicles: owned.length } });
});

// Every certificate ever issued for a plate, across ALL insurers
app.get('/api/v1/certificates', (req, res) => {
  const plate = norm(req.query.plate);
  if (!plate) return res.status(400).json({ error: 'plate_required' });
  const key = Object.keys(VEHICLES).find((k) => k === plate);
  const list = key ? CERTIFICATES.filter((c) => norm(c.plate) === plate) : [];
  res.json({ plate, count: list.length, certificates: list });
});

app.listen(PORT, () => console.log(`mock-insurer-api listening on :${PORT}`));
