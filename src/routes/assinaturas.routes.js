const router = require('express').Router();
const AssinaturasController = require('../controllers/assinaturasController');
const authMiddleware = require('../middleware/authMiddleware');

// ─── Rotas públicas (sem autenticação) ───────────────────────────────────────
router.post('/iniciar-checkout', AssinaturasController.iniciarCheckout);
router.post('/webhook',          AssinaturasController.webhook);

// ─── Rotas protegidas (requerem sessão) ──────────────────────────────────────
router.get('/status',       authMiddleware, AssinaturasController.status);
router.post('/renovar',     authMiddleware, AssinaturasController.renovar);
router.post('/cancelar',    authMiddleware, AssinaturasController.cancelar);

module.exports = router;
