const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cfg = require('./config');
const db = require('./config/db');

(async () => {
  await db.init();
  const app = express();
  app.set('trust proxy', 1); // behind Render's proxy: real client IPs for rate limiting and the audit log
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors());
  app.use(express.json({ limit: '50kb' }));

  app.get('/health', (_q, r) => r.json({ ok: true }));
  app.use('/api', require('./routes'));
  app.use('/api', (_q, r) => r.status(404).json({ error: 'not_found' }));

  // frontend
  const pub = path.join(__dirname, '../public');
  app.use(express.static(pub));
  app.get('*', (_q, r) => r.sendFile(path.join(pub, 'index.html')));

  app.use((err, _req, res, _next) => {
    if (!err.status) console.error(err);
    res.status(err.status || 500).json({ error: err.code || 'server_error', message: err.status ? err.message : 'Something went wrong' });
  });

  app.listen(cfg.port, () => console.log(`SureTrace backend on ${cfg.baseUrl} (db: ${cfg.dbClient})`));
})().catch((e) => { console.error('Failed to start:', e.message); process.exit(1); });
