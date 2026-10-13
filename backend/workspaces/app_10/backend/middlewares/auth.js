const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { pool } = require('../config/db');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

// Vérifie le JWT puis recharge l'utilisateur en base (compte désactivé = accès coupé immédiatement)
const authenticate = asyncHandler(async (req, res, next) => {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) throw new ApiError(401, 'Authentification requise');

  let payload;
  try {
    payload = jwt.verify(token, env.jwt.secret);
  } catch (err) {
    throw new ApiError(401, 'Session invalide ou expirée');
  }

  const [rows] = await pool.query(
    `SELECT u.id_utilisateur, u.id_employe, u.login, u.role, e.id_service, s.id_direction
       FROM utilisateurs u
       JOIN employes e ON e.id_employe = u.id_employe
       JOIN services s ON s.id_service = e.id_service
      WHERE u.id_utilisateur = ? AND u.actif = 1 AND e.actif = 1`,
    [payload.sub]
  );
  if (!rows.length) throw new ApiError(401, 'Compte introuvable ou désactivé');

  req.user = rows[0];
  next();
});

module.exports = { authenticate };
