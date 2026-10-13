const router = require('express').Router();
const { body, param } = require('express-validator');
const ctrl = require('../controllers/structureController');
const authorize = require('../middlewares/authorize');
const validate = require('../middlewares/validate');
const { ROLES } = require('../config/constants');

const gestion = authorize(ROLES.ADMIN, ROLES.RH);
const id = param('id').isInt({ min: 1 });

router.get('/directions', ctrl.listDirections);
router.post('/directions', gestion, [body('code').trim().notEmpty(), body('nom').trim().notEmpty()], validate, ctrl.createDirection);
router.put('/directions/:id', gestion, [id], validate, ctrl.updateDirection);

router.get('/services', ctrl.listServices);
router.post(
  '/services',
  gestion,
  [body('id_direction').isInt({ min: 1 }), body('code').trim().notEmpty(), body('nom').trim().notEmpty()],
  validate,
  ctrl.createService
);
router.put('/services/:id', gestion, [id], validate, ctrl.updateService);

router.get('/postes', ctrl.listPostes);
router.post('/postes', gestion, [body('libelle').trim().notEmpty()], validate, ctrl.createPoste);

module.exports = router;
