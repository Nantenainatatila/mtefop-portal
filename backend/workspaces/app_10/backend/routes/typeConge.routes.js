const router = require('express').Router();
const { body, param } = require('express-validator');
const ctrl = require('../controllers/typeCongeController');
const authorize = require('../middlewares/authorize');
const validate = require('../middlewares/validate');
const { ROLES } = require('../config/constants');

const gestion = authorize(ROLES.ADMIN, ROLES.RH);
const id = param('id').isInt({ min: 1 });
const champ = (chain, creation) => (creation ? chain : chain.optional());
const regles = (creation) => [
  champ(body('code').trim().notEmpty().withMessage('code requis'), creation),
  champ(body('libelle').trim().notEmpty().withMessage('libelle requis'), creation),
  body('jours_par_an').optional({ nullable: true }).isFloat({ min: 0 }),
  body('duree_max').optional({ nullable: true }).isInt({ min: 1 }),
  body('sexe_requis').optional({ nullable: true }).isIn(['M', 'F']),
];

router.get('/', ctrl.list);
router.post('/', gestion, regles(true), validate, ctrl.create);
router.put('/:id', gestion, [id, ...regles(false)], validate, ctrl.update);
router.delete('/:id', gestion, [id], validate, ctrl.desactiver);

module.exports = router;
