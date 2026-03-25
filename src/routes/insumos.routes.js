const router = require('express').Router();
const InsumosController = require('../controllers/insumosController');

router.get('/', InsumosController.listar);

module.exports = router;
