const router = require('express').Router();
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { authenticate, authorize, log } = require('../middleware/auth');

router.use(authenticate);

router.get('/', authorize('admin', 'directeur'), async (_req, res) => {
  const [rows] = await db.query(
    `SELECT u.id, u.matricule, u.nom, u.prenom, u.email, u.telephone, u.role, u.actif, u.derniere_connexion,
            u.service_id, s.nom AS service_nom
     FROM utilisateurs u LEFT JOIN services s ON s.id = u.service_id ORDER BY u.nom`);
  res.json(rows);
});

// Liste simplifiée pour l'affectation d'un dossier
router.get('/agents', async (req, res) => {
  const serviceId = req.query.service_id;
  const [rows] = await db.query(
    `SELECT id, nom, prenom, service_id FROM utilisateurs WHERE actif = 1 ${serviceId ? 'AND service_id = ?' : ''} ORDER BY nom`,
    serviceId ? [serviceId] : []);
  res.json(rows);
});

router.post('/', authorize('admin'), async (req, res) => {
  const { matricule, nom, prenom, email, telephone, mot_de_passe, role, service_id } = req.body;
  if (!nom || !email || !mot_de_passe) return res.status(400).json({ message: 'Nom, email et mot de passe requis' });
  if (mot_de_passe.length < 8) return res.status(400).json({ message: 'Mot de passe : 8 caractères minimum' });
  try {
    const hash = await bcrypt.hash(mot_de_passe, 10);
    const [r] = await db.query(
      `INSERT INTO utilisateurs (matricule, nom, prenom, email, telephone, mot_de_passe, role, service_id)
       VALUES (?,?,?,?,?,?,?,?)`,
      [matricule || null, nom, prenom || null, email, telephone || null, hash, role || 'agent', service_id || null]);
    await log(req.user.id, 'CREATION_UTILISATEUR', email, req.ip);
    res.status(201).json({ id: r.insertId });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Email ou matricule déjà utilisé' });
    console.error(e); res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.put('/:id', authorize('admin'), async (req, res) => {
  const { matricule, nom, prenom, telephone, role, service_id, actif, mot_de_passe } = req.body;
  await db.query(
    `UPDATE utilisateurs SET matricule=?, nom=?, prenom=?, telephone=?, role=?, service_id=?, actif=? WHERE id=?`,
    [matricule || null, nom, prenom || null, telephone || null, role, service_id || null, actif ? 1 : 0, req.params.id]);
  if (mot_de_passe) {
    if (mot_de_passe.length < 8) return res.status(400).json({ message: 'Mot de passe : 8 caractères minimum' });
    await db.query('UPDATE utilisateurs SET mot_de_passe=? WHERE id=?', [await bcrypt.hash(mot_de_passe, 10), req.params.id]);
  }
  await log(req.user.id, 'MODIFICATION_UTILISATEUR', `id=${req.params.id}`, req.ip);
  res.json({ message: 'Utilisateur mis à jour' });
});

router.get('/journal/activite', authorize('admin'), async (_req, res) => {
  const [rows] = await db.query(
    `SELECT j.*, CONCAT(u.nom,' ',COALESCE(u.prenom,'')) AS utilisateur
     FROM journal_activite j LEFT JOIN utilisateurs u ON u.id = j.user_id ORDER BY j.id DESC LIMIT 200`);
  res.json(rows);
});

module.exports = router;
