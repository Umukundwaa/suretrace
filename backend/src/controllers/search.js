const db = require('../config/db');
const history = require('../services/historyService');
const { HttpError, wrap } = require('../utils/errors');
const { isValidPlate, normalizePlate } = require('../utils/plate');
const jwt = require('jsonwebtoken');
const cfg = require('../config');

// PUBLIC: buyer checks a plate without logging in
exports.search = wrap(async (req, res) => {
  const plate = normalizePlate(req.params.plate);
  if (!isValidPlate(plate)) throw new HttpError(400, 'invalid_plate', 'Plate must look like RAD 123 A');
  let sellerId = null;
  const h = req.get('authorization') || '';
  if (h.startsWith('Bearer ')) { try { sellerId = jwt.verify(h.slice(7), cfg.jwtSecret).sub; } catch {} }
  const result = await history.quickStatus(plate);
  await db.query('INSERT INTO search_logs (plate, seller_id, result) VALUES (?,?,?)', [plate, sellerId, result.status]);
  res.json(result);
});
