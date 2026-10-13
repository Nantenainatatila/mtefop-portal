const router = require('express').Router();
const { body, param } = require('express-validator');
const ctrl = require('../controllers/employeController');
const authorize = require('../middlewares/authorize');
const validate = require('../middlewares/validate');
const { ROLES } = require('../config/constants');

const { ADMIN, RH, DIRECTEUR, CHEF_SERVICE } = ROLES;
const id = param('id').isInt({ min: 1 }).withMessage('id invalide');

// En création les champs principaux sont obligatoires ; en modification tout est optionnel
const champ = (chain, creation) => (creation ? chain : chain.optional());

const regles = (creation) => [
  champ(body('matricule').trim().notEmpty().withMessage('matricule requis'), creation),
  champ(body('nom').trim().notEmpty().withMessage('nom requis'), creation),
  champ(body('sexe').isIn(['M', 'F']).withMessage('sexe : M ou F'), creation),
  champ(body('date_embauche').isISO8601().withMessage('date_embauche invalide (YYYY-MM-DD)'), creation),
  champ(body('id_service').isInt({ min: 1 }).withMessage('id_service requis'), creation),
  body('email').optional({ checkFalsy: true }).isEmail().withMessage('email invalide'),
  body('statut').optional().isIn(['FONCTIONNAIRE', 'ECD', 'EFA', 'STAGIAIRE']),
  body('compte.login').optional().trim().isLength({ min: 3 }),
  body('compte.mot_de_passe').optional().isLength({ min: 8 }).withMessage('8 caractères minimum'),
  body('compte.role').optional().isIn(Object.values(ROLES)),
];

router.get('/', authorize(ADMIN, RH, DIRECTEUR, CHEF_SERVICE), ctrl.list);
router.get('/:id', [id], validate, ctrl.getOne); // accès filtré dans le controller
router.post('/', authorize(ADMIN, RH), regles(true), validate, ctrl.create);
router.put('/:id', authorize(ADMIN, RH), [id, ...regles(false)], validate, ctrl.update);
router.patch('/:id/desactiver', authorize(ADMIN, RH), [id], validate, ctrl.desactiver);
router.patch('/:id/reactiver', authorize(ADMIN, RH), [id], validate, ctrl.reactiver);
router.put(
  '/:id/compte',
  authorize(ADMIN),
  [id, body('role').optional().isIn(Object.values(ROLES)), body('mot_de_passe').optional().isLength({ min: 8 })],
  validate,
  ctrl.setCompte
);

module.exports = router;
