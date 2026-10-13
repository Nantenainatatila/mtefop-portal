const router = require('express').Router();
const { body, param } = require('express-validator');
const ctrl = require('../controllers/jourFerieController');
const authorize = require('../middlewares/authorize');
const validate = require('../middlewares/validate');
const { ROLES } = require('../config/constants');

const gestion = authorize(ROLES.ADMIN, ROLES.RH);
const id = param('id').isInt({ min: 1 });

router.get('/', ctrl.list);
router.post('/', gestion, [body('date_ferie').isISO8601({ strict: true }), body('libelle').trim().notEmpty()], validate, ctrl.create);
router.put('/:id', gestion, [id, body('date_ferie').optional().isISO8601({ strict: true })], validate, ctrl.update);
router.delete('/:id', gestion, [id], validate, ctrl.remove);

module.exports = router;
