const jwt = require('jsonwebtoken');
const cfg = require('../config');
const { HttpError } = require('../utils/errors');

module.exports = function requireSeller(req, _res, next) {
  const h = req.get('authorization') || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : req.query.token; // query token only for PDF download links
  if (!token) return next(new HttpError(401, 'auth_required', 'Please log in'));
  try {
    const p = jwt.verify(token, cfg.jwtSecret);
    req.seller = { id: p.sub, name: p.name };
    next();
  } catch {
    next(new HttpError(401, 'invalid_token', 'Session expired, please log in again'));
  }
};
