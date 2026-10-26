const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const db = require('../config/db');
const { authenticate, log } = require('../middleware/auth');

// ---------------------------------------------------------------------
// Création de compte (inscription). Le rôle est toujours « agent » :
// seuls les rôles admin/directeur existants peuvent promouvoir un compte.
// ---------------------------------------------------------------------
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, max: 10,
  message: { message: 'Trop de créations de compte, réessayez plus tard' },
});

// Liste publique (id + nom) des services, nécessaire au formulaire d'inscription
router.get('/services', async (_req, res) => {
  try {
    const [rows] = await db.query('SELECT id, nom FROM services WHERE actif = 1 ORDER BY nom');
    res.json(rows);
  } catch (e) { console.error(e); res.status(500).json({ message: 'Erreur serveur' }); }
});

router.post('/register', registerLimiter, async (req, res) => {
  try {
    const clean = (v) => (typeof v === 'string' ? v.trim() : '');
    const matricule = clean(req.body.matricule);
    const nom = clean(req.body.nom);
    const prenom = clean(req.body.prenom);
    const email = clean(req.body.email).toLowerCase();
    const telephone = clean(req.body.telephone);
    const service_id = Number(req.body.service_id);
    const mot_de_passe = typeof req.body.mot_de_passe === 'string' ? req.body.mot_de_passe : '';

    if (!matricule || !nom || !email || !service_id || !mot_de_passe)
      return res.status(400).json({ message: 'Matricule, nom, e-mail, service et mot de passe sont requis' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ message: 'Adresse e-mail invalide' });
    if (mot_de_passe.length < 8)
      return res.status(400).json({ message: 'Le mot de passe doit contenir 8 caractères minimum' });

    const [svc] = await db.query('SELECT id FROM services WHERE id = ? AND actif = 1', [service_id]);
    if (!svc.length) return res.status(400).json({ message: 'Service invalide' });

    const hash = await bcrypt.hash(mot_de_passe, 10);
    const [r] = await db.query(
      `INSERT INTO utilisateurs (matricule, nom, prenom, email, telephone, mot_de_passe, role, service_id)
       VALUES (?,?,?,?,?,?, 'agent', ?)`,
      [matricule, nom, prenom || null, email, telephone || null, hash, service_id]);
    await log(r.insertId, 'CREATION_COMPTE', email, req.ip);
    res.status(201).json({ message: 'Compte créé avec succès' });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') {
      const champ = String(e.sqlMessage || '').includes('matricule') ? 'matricule' : 'adresse e-mail';
      return res.status(409).json({ message: `Ce ${champ} est déjà utilisé` });
    }
    console.error(e);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, mot_de_passe } = req.body;
    if (!email || !mot_de_passe) return res.status(400).json({ message: 'Email et mot de passe requis' });
    const [rows] = await db.query(
      `SELECT u.*, s.nom AS service_nom FROM utilisateurs u
       LEFT JOIN services s ON s.id = u.service_id WHERE u.email = ?`, [email]);
    const user = rows[0];
    if (!user || !user.actif || !(await bcrypt.compare(mot_de_passe, user.mot_de_passe)))
      return res.status(401).json({ message: 'Identifiants incorrects' });

    await db.query('UPDATE utilisateurs SET derniere_connexion = NOW() WHERE id = ?', [user.id]);
    await log(user.id, 'CONNEXION', user.email, req.ip);
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' });
    delete user.mot_de_passe;
    res.json({ token, user });
  } catch (e) { console.error(e); res.status(500).json({ message: 'Erreur serveur' }); }
});

router.get('/me', authenticate, async (req, res) => {
  const [rows] = await db.query(
    `SELECT u.id, u.nom, u.prenom, u.email, u.role, u.service_id, s.nom AS service_nom
     FROM utilisateurs u LEFT JOIN services s ON s.id = u.service_id WHERE u.id = ?`, [req.user.id]);
  res.json(rows[0]);
});

router.put('/password', authenticate, async (req, res) => {
  const { ancien, nouveau } = req.body;
  if (!nouveau || nouveau.length < 8) return res.status(400).json({ message: 'Le nouveau mot de passe doit contenir 8 caractères minimum' });
  const [rows] = await db.query('SELECT mot_de_passe FROM utilisateurs WHERE id = ?', [req.user.id]);
  if (!(await bcrypt.compare(ancien || '', rows[0].mot_de_passe)))
    return res.status(400).json({ message: 'Ancien mot de passe incorrect' });
  await db.query('UPDATE utilisateurs SET mot_de_passe = ? WHERE id = ?', [await bcrypt.hash(nouveau, 10), req.user.id]);
  await log(req.user.id, 'CHANGEMENT_MOT_DE_PASSE', null, req.ip);
  res.json({ message: 'Mot de passe modifié' });
});

module.exports = router;
