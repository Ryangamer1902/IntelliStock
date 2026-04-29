const router = require('express').Router();
const AuthController = require('../controllers/authController');

router.post('/cadastro', AuthController.cadastrar);
router.post('/login', AuthController.login);
router.post('/verificar', AuthController.verificar);
router.post('/reenviar-codigo', AuthController.reenviarCodigo);
router.post('/solicitar-reset', AuthController.solicitarReset);
router.post('/redefinir-senha', AuthController.redefinirSenha);
router.post('/logout', AuthController.logout);

module.exports = router;
