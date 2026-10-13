const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { pool } = require('../config/db');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const audit = require('../utils/audit');

exports.login = asyncHandler(async (req, res) => {
  const { login, mot_de_passe } = req.body;

  const [rows] = await pool.query(
    `SELECT u.id_utilisateur, u.id_employe, u.login, u.mot_de_passe, u.role, u.actif,
            e.nom, e.prenom, e.matricule, e.actif AS employe_actif
       FROM utilisateurs u JOIN employes e ON e.id_employe = u.id_employe
      WHERE u.login = ?`,
    [login]
  );
  const user = rows[0];

  // Message volontairement générique (on ne révèle pas si le login existe)
  const ok = user && user.actif && user.employe_actif && (await bcrypt.compare(mot_de_passe, user.mot_de_passe));
  if (!ok) {
    await audit(req, 'CONNEXION_ECHEC', { details: { login } });
    throw new ApiError(401, 'Identifiants invalides');
  }

  const token = jwt.sign({ sub: user.id_utilisateur, role: user.role }, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn,
  });
  await pool.query('UPDATE utilisateurs SET derniere_connexion = NOW() WHERE id_utilisateur = ?', [user.id_utilisateur]);
  await audit(req, 'CONNEXION', { userId: user.id_utilisateur });

  res.json({
    success: true,
    data: {
      token,
      user: {
        id_utilisateur: user.id_utilisateur,
        id_employe: user.id_employe,
        login: user.login,
        role: user.role,
        nom: user.nom,
        prenom: user.prenom,
        matricule: user.matricule,
      },
    },
  });
});

exports.me = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT u.id_utilisateur, u.login, u.role, u.derniere_connexion,
            e.id_employe, e.matricule, e.nom, e.prenom, e.email, e.telephone, e.statut,
            s.nom AS service, d.nom AS direction, p.libelle AS poste
       FROM utilisateurs u
       JOIN employes e ON e.id_employe = u.id_employe
       JOIN services s ON s.id_service = e.id_service
       JOIN directions d ON d.id_direction = s.id_direction
       LEFT JOIN postes p ON p.id_poste = e.id_poste
      WHERE u.id_utilisateur = ?`,
    [req.user.id_utilisateur]
  );
  res.json({ success: true, data: rows[0] });
});

exports.changePassword = asyncHandler(async (req, res) => {
  const { ancien_mot_de_passe, nouveau_mot_de_passe } = req.body;
  const [[user]] = await pool.query('SELECT mot_de_passe FROM utilisateurs WHERE id_utilisateur = ?', [
    req.user.id_utilisateur,
  ]);
  if (!(await bcrypt.compare(ancien_mot_de_passe, user.mot_de_passe))) {
    throw new ApiError(400, 'Ancien mot de passe incorrect');
  }
  const hash = await bcrypt.hash(nouveau_mot_de_passe, 10);
  await pool.query('UPDATE utilisateurs SET mot_de_passe = ? WHERE id_utilisateur = ?', [hash, req.user.id_utilisateur]);
  await audit(req, 'CHANGEMENT_MOT_DE_PASSE');
  res.json({ success: true, message: 'Mot de passe modifié' });
});
