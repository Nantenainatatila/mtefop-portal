const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { authenticate, log } = require('../middleware/auth');

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
