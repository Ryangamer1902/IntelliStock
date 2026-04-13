const router = require('express').Router();
const InsumosController      = require('../controllers/insumosController');
const authMiddleware         = require('../middleware/authMiddleware');
const subscriptionMiddleware = require('../middleware/subscriptionMiddleware');

router.use(authMiddleware);
router.use(subscriptionMiddleware);

router.get('/', InsumosController.listar);

module.exports = router;
