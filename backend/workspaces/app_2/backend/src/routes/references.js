const router = require('express').Router();
const db = require('../config/db');
const { authenticate, authorize, log } = require('../middleware/auth');

router.get('/services', authenticate, async (_req, res) => {
  const [rows] = await db.query('SELECT * FROM services WHERE actif = 1 ORDER BY nom');
  res.json(rows);
});

router.post('/services', authenticate, authorize('admin'), async (req, res) => {
  const { code, nom, description } = req.body;
  if (!code || !nom) return res.status(400).json({ message: 'Code et nom requis' });
  try {
    const [r] = await db.query('INSERT INTO services (code, nom, description) VALUES (?,?,?)', [code, nom, description || null]);
    await log(req.user.id, 'CREATION_SERVICE', nom, req.ip);
    res.status(201).json({ id: r.insertId });
  } catch (e) {
    res.status(e.code === 'ER_DUP_ENTRY' ? 409 : 500).json({ message: e.code === 'ER_DUP_ENTRY' ? 'Code déjà utilisé' : 'Erreur serveur' });
  }
});

router.get('/types', authenticate, async (_req, res) => {
  const [rows] = await db.query('SELECT * FROM types_dossier ORDER BY libelle');
  res.json(rows);
});

router.post('/types', authenticate, authorize('admin'), async (req, res) => {
  const { libelle, delai_jours, service_responsable_id } = req.body;
  if (!libelle) return res.status(400).json({ message: 'Libellé requis' });
  const [r] = await db.query('INSERT INTO types_dossier (libelle, delai_jours, service_responsable_id) VALUES (?,?,?)',
    [libelle, delai_jours || 30, service_responsable_id || null]);
  res.status(201).json({ id: r.insertId });
});

module.exports = router;
