const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const auth = require('../middleware/auth');
const A = require('../controllers/auth');
const S = require('../controllers/search');
const V = require('../controllers/seller');
const VF = require('../controllers/verify');

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false });
const searchLimiter = rateLimit({ windowMs: 60 * 1000, limit: 60, standardHeaders: true, legacyHeaders: false });

router.get('/config', (_q, r) => r.json({ demo: process.env.DEMO_MODE !== 'false' }));

router.post('/auth/register', authLimiter, A.register);
router.post('/auth/login', authLimiter, A.login);

router.get('/search/:plate', searchLimiter, S.search);              // buyer, public

router.get('/verify/cert/:no', VF.verifyCertificate);                // QR targets, public
router.get('/verify/:ref', VF.verifyReport);

router.get('/qr/cert/:no.png', async (req, res) => {              // QR image for the certificate screen
  const QR = require('qrcode');
  res.type('png').send(await QR.toBuffer(`${require('../config').baseUrl}/verify/cert/${req.params.no}`, { margin: 1, width: 240 }));
});

router.use('/seller', auth);
router.get('/seller/vehicles', V.listVehicles);
router.post('/seller/vehicles', V.addVehicle);
router.get('/seller/profile', A.profile);
router.put('/seller/profile', A.updateProfile);
router.put('/seller/password', authLimiter, A.updatePassword);
router.get('/seller/activity', A.activity);
router.get('/seller/vehicles/:plate/history', V.vehicleHistory);
router.get('/seller/vehicles/:plate/history.pdf', V.historyPdf);
router.get('/seller/certificates/:no', V.certificate);
router.get('/seller/certificates/:no/pdf', V.certificatePdf);
router.get('/seller/searches', V.searches);

module.exports = router;
