// Inscription, connexion et profil
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const upload = require('../middleware/upload');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

// Crée le token de connexion (valable 7 jours)
function creerToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

// POST /api/auth/register  (l'image de profil "avatar" est facultative)
router.post('/register', upload.single('avatar'), async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Nom, email et mot de passe sont obligatoires' });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: 'Le mot de passe doit contenir au moins 6 caractères' });
  }

  const existe = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
  if (existe.rows.length > 0) {
    return res.status(409).json({ message: 'Cet email est déjà utilisé' });
  }

  const motDePasseCache = await bcrypt.hash(password, 10);
  const avatar = req.file ? `/uploads/${req.file.filename}` : null;

  const resultat = await pool.query(
    `INSERT INTO users (name, email, password, avatar)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, email, role, avatar`,
    [name.trim(), email.toLowerCase().trim(), motDePasseCache, avatar]
  );

  const user = resultat.rows[0];
  res.status(201).json({ token: creerToken(user), user });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  const resultat = await pool.query('SELECT * FROM users WHERE email = $1', [
    (email || '').toLowerCase().trim(),
  ]);
  const user = resultat.rows[0];

  if (!user || !(await bcrypt.compare(password || '', user.password))) {
    return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
  }

  res.json({
    token: creerToken(user),
    user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar },
  });
});

// GET /api/auth/me : infos de l'utilisateur connecté
router.get('/me', authRequired, async (req, res) => {
  const resultat = await pool.query(
    'SELECT id, name, email, role, avatar FROM users WHERE id = $1',
    [req.user.id]
  );
  if (resultat.rows.length === 0) {
    return res.status(401).json({ message: 'Compte introuvable' });
  }
  res.json(resultat.rows[0]);
});

// PUT /api/auth/me : modifier son profil (nom et/ou image)
router.put('/me', authRequired, upload.single('avatar'), async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'Le nom est obligatoire' });
  }

  let resultat;
  if (req.file) {
    resultat = await pool.query(
      `UPDATE users SET name = $1, avatar = $2 WHERE id = $3
       RETURNING id, name, email, role, avatar`,
      [name.trim(), `/uploads/${req.file.filename}`, req.user.id]
    );
  } else {
    resultat = await pool.query(
      `UPDATE users SET name = $1 WHERE id = $2
       RETURNING id, name, email, role, avatar`,
      [name.trim(), req.user.id]
    );
  }
  res.json(resultat.rows[0]);
});

module.exports = router;
