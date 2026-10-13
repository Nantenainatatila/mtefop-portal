const router = require('express').Router();
const { authenticate } = require('../middlewares/auth');

router.use('/auth', require('./auth.routes'));

// Tout ce qui suit nécessite d'être connecté
router.use(authenticate);
router.use('/employes', require('./employe.routes'));
router.use('/demandes', require('./demande.routes'));
router.use('/soldes', require('./solde.routes'));
router.use('/types-conges', require('./typeConge.routes'));
router.use('/jours-feries', require('./jourFerie.routes'));
router.use('/structure', require('./structure.routes'));
router.use('/notifications', require('./notification.routes'));
router.use('/dashboard', require('./dashboard.routes'));

module.exports = router;
