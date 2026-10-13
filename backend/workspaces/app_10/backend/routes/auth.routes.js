const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/authController');
const { authenticate } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { loginLimiter } = require('../middlewares/rateLimiter');

router.post(
  '/login',
  loginLimiter,
  [body('login').trim().notEmpty().withMessage('login requis'), body('mot_de_passe').notEmpty().withMessage('mot de passe requis')],
  validate,
  ctrl.login
);

router.get('/me', authenticate, ctrl.me);

router.put(
  '/mot-de-passe',
  authenticate,
  [
    body('ancien_mot_de_passe').notEmpty(),
    body('nouveau_mot_de_passe').isLength({ min: 8 }).withMessage('8 caractères minimum'),
  ],
  validate,
  ctrl.changePassword
);

module.exports = router;
