// Middlewares de sécurité : vérifient le token envoyé par le frontend
// Le frontend envoie : Authorization: Bearer <token>
const jwt = require('jsonwebtoken');

// Lit le token et renvoie { id, role } ou null s'il est absent/invalide
function lireUtilisateur(req) {
  const entete = req.headers.authorization || '';
  if (!entete.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(entete.slice(7), process.env.JWT_SECRET);
  } catch (erreur) {
    return null;
  }
}

// Connexion facultative (ex : la liste des voitures est publique,
// mais si on est connecté on sait quelles voitures on a likées)
function optionalAuth(req, res, next) {
  req.user = lireUtilisateur(req);
  next();
}

// Connexion obligatoire
function authRequired(req, res, next) {
  const user = lireUtilisateur(req);
  if (!user) {
    return res.status(401).json({ message: 'Veuillez vous connecter' });
  }
  req.user = user;
  next();
}

// Réservé à l'admin (à utiliser APRÈS authRequired)
function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Accès réservé à l’administrateur' });
  }
  next();
}

module.exports = { optionalAuth, authRequired, adminOnly };
