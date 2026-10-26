const jwt = require('jsonwebtoken');
const db = require('../config/db');

async function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Authentification requise' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const [rows] = await db.query(
      'SELECT id, nom, prenom, email, role, service_id, actif FROM utilisateurs WHERE id = ?',
      [payload.id]
    );
    if (!rows.length || !rows[0].actif) return res.status(401).json({ message: 'Compte invalide ou désactivé' });
    req.user = rows[0];
    next();
  } catch (e) {
    return res.status(401).json({ message: 'Session expirée ou jeton invalide' });
  }
}

const authorize = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : res.status(403).json({ message: 'Accès refusé' });

async function log(userId, action, details, ip) {
  try {
    await db.query('INSERT INTO journal_activite (user_id, action, details, ip) VALUES (?,?,?,?)',
      [userId, action, details ? String(details).slice(0, 500) : null, ip || null]);
  } catch (_) { /* ne jamais bloquer la requête */ }
}

module.exports = { authenticate, authorize, log };
