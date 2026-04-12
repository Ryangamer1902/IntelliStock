const router = require('express').Router();
const InsumosController = require('../controllers/insumosController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/', InsumosController.listar);

module.exports = router;
