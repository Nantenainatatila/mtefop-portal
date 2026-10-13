const router = require('express').Router();
const { param } = require('express-validator');
const ctrl = require('../controllers/notificationController');
const validate = require('../middlewares/validate');

router.get('/', ctrl.list);
router.patch('/lire-tout', ctrl.toutLire);
router.patch('/:id/lu', [param('id').isInt({ min: 1 })], validate, ctrl.marquerLue);

module.exports = router;
