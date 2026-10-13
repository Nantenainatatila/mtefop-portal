const router = require('express').Router();
const { body, param, query } = require('express-validator');
const ctrl = require('../controllers/demandeController');
const authorize = require('../middlewares/authorize');
const validate = require('../middlewares/validate');
const { ROLES } = require('../config/constants');

const { ADMIN, RH, DIRECTEUR, CHEF_SERVICE } = ROLES;
const id = param('id').isInt({ min: 1 }).withMessage('id invalide');

// Routes statiques AVANT les routes avec :id
router.get('/mes-demandes', ctrl.mesDemandes);
router.get('/a-valider', authorize(ADMIN, RH, DIRECTEUR, CHEF_SERVICE), ctrl.aValider);
router.get(
  '/planning',
  [query('debut').isISO8601(), query('fin').isISO8601()],
  validate,
  ctrl.planning
);
router.get('/', authorize(ADMIN, RH, DIRECTEUR, CHEF_SERVICE), ctrl.list);

router.post(
  '/',
  [
    body('id_type').isInt({ min: 1 }).withMessage('id_type requis'),
    body('date_debut').isISO8601({ strict: true }).withMessage('date_debut invalide (YYYY-MM-DD)'),
    body('date_fin')
      .isISO8601({ strict: true })
      .withMessage('date_fin invalide (YYYY-MM-DD)')
      .custom((v, { req }) => v >= req.body.date_debut)
      .withMessage('date_fin doit être postérieure ou égale à date_debut'),
    body('motif').optional().isLength({ max: 255 }),
    body('id_interim').optional({ nullable: true }).isInt({ min: 1 }),
    body('id_employe').optional().isInt({ min: 1 }),
  ],
  validate,
  ctrl.create
);

router.get('/:id', [id], validate, ctrl.getOne);
router.post(
  '/:id/decision',
  authorize(ADMIN, RH, DIRECTEUR, CHEF_SERVICE),
  [id, body('decision').isIn(['APPROUVE', 'REFUSE']).withMessage('decision : APPROUVE ou REFUSE'), body('commentaire').optional().isLength({ max: 255 })],
  validate,
  ctrl.decider
);
router.patch('/:id/annuler', [id], validate, ctrl.annuler);

module.exports = router;
