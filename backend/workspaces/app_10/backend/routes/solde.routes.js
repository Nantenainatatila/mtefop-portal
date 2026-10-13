const router = require('express').Router();
const { body, param } = require('express-validator');
const ctrl = require('../controllers/soldeController');
const authorize = require('../middlewares/authorize');
const validate = require('../middlewares/validate');
const { ROLES } = require('../config/constants');

router.get('/mes-soldes', ctrl.mesSoldes);
router.get('/employe/:id', [param('id').isInt({ min: 1 })], validate, ctrl.soldesEmploye);

router.post(
  '/initialiser',
  authorize(ROLES.ADMIN, ROLES.RH),
  [
    body('annee').isInt({ min: 2000, max: 2100 }),
    body('reporter').optional().isBoolean(),
    body('plafond_report').optional().isFloat({ min: 0, max: 60 }),
  ],
  validate,
  ctrl.initialiser
);

router.put(
  '/:id',
  authorize(ROLES.ADMIN, ROLES.RH),
  [
    param('id').isInt({ min: 1 }),
    body('droit').optional().isFloat({ min: 0 }),
    body('report').optional().isFloat({ min: 0 }),
    body('pris').optional().isFloat({ min: 0 }),
  ],
  validate,
  ctrl.ajuster
);

module.exports = router;
