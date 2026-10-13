const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const { ROLES } = require('../config/constants');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const audit = require('../utils/audit');
const { buildUpdate, paginate } = require('../utils/helpers');
const { scopeClause, peutAccederEmploye } = require('../utils/scope');

const CHAMPS_MODIFIABLES = [
  'matricule', 'cin', 'nom', 'prenom', 'sexe', 'date_naissance', 'date_embauche',
  'email', 'telephone', 'statut', 'id_service', 'id_poste', 'id_superieur',
];

exports.list = asyncHandler(async (req, res) => {
  const { q, id_service, actif = '1' } = req.query;
  const { page, limit, offset } = paginate(req.query);
  const where = ['1=1'];
  const params = [];

  if (q) {
    where.push('(e.nom LIKE ? OR e.prenom LIKE ? OR e.matricule LIKE ?)');
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (id_service) { where.push('e.id_service = ?'); params.push(id_service); }
  if (actif !== 'all') { where.push('e.actif = ?'); params.push(actif === '0' ? 0 : 1); }

  const scope = scopeClause(req.user);
  const whereSql = where.join(' AND ') + scope.clause;
  const allParams = [...params, ...scope.params];

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM employes e JOIN services s ON s.id_service = e.id_service WHERE ${whereSql}`,
    allParams
  );
  const [rows] = await pool.query(
    `SELECT e.id_employe, e.matricule, e.nom, e.prenom, e.sexe, e.email, e.telephone, e.statut, e.actif,
            e.id_service, s.nom AS service, d.nom AS direction, p.libelle AS poste
       FROM employes e
       JOIN services s ON s.id_service = e.id_service
       JOIN directions d ON d.id_direction = s.id_direction
       LEFT JOIN postes p ON p.id_poste = e.id_poste
      WHERE ${whereSql}
      ORDER BY e.nom, e.prenom
      LIMIT ? OFFSET ?`,
    [...allParams, limit, offset]
  );
  res.json({ success: true, data: rows, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

exports.getOne = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (!(await peutAccederEmploye(req.user, id))) throw new ApiError(403, 'Accès refusé à cet employé');

  const [rows] = await pool.query(
    `SELECT e.*, s.nom AS service, d.id_direction, d.nom AS direction, p.libelle AS poste,
            CONCAT(sup.nom, ' ', IFNULL(sup.prenom, '')) AS superieur,
            u.login, u.role
       FROM employes e
       JOIN services s ON s.id_service = e.id_service
       JOIN directions d ON d.id_direction = s.id_direction
       LEFT JOIN postes p ON p.id_poste = e.id_poste
       LEFT JOIN employes sup ON sup.id_employe = e.id_superieur
       LEFT JOIN utilisateurs u ON u.id_employe = e.id_employe
      WHERE e.id_employe = ?`,
    [id]
  );
  if (!rows.length) throw new ApiError(404, 'Employé introuvable');
  res.json({ success: true, data: rows[0] });
});

exports.create = asyncHandler(async (req, res) => {
  const { compte, ...emp } = req.body;
  if (compte?.role === ROLES.ADMIN && req.user.role !== ROLES.ADMIN) {
    throw new ApiError(403, 'Seul un administrateur peut créer un compte ADMIN');
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const cols = CHAMPS_MODIFIABLES.filter((c) => emp[c] !== undefined && emp[c] !== '');
    const [r] = await conn.query(
      `INSERT INTO employes (${cols.map((c) => `\`${c}\``).join(',')}) VALUES (${cols.map(() => '?').join(',')})`,
      cols.map((c) => emp[c])
    );
    const idEmploye = r.insertId;

    if (compte?.login) {
      const hash = await bcrypt.hash(compte.mot_de_passe, 10);
      await conn.query('INSERT INTO utilisateurs (id_employe, login, mot_de_passe, role) VALUES (?,?,?,?)', [
        idEmploye, compte.login, hash, compte.role || ROLES.EMPLOYE,
      ]);
    }

    // Soldes de l'année en cours pour les types avec quota annuel
    await conn.query(
      `INSERT IGNORE INTO soldes_conges (id_employe, id_type, annee, droit)
       SELECT ?, id_type, YEAR(CURDATE()), jours_par_an FROM types_conges WHERE jours_par_an IS NOT NULL AND actif = 1`,
      [idEmploye]
    );
    await conn.commit();
    await audit(req, 'CREATION', { table: 'employes', id: idEmploye });
    res.status(201).json({ success: true, data: { id_employe: idEmploye } });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

exports.update = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { fields, values } = buildUpdate(req.body, CHAMPS_MODIFIABLES);
  if (!fields.length) throw new ApiError(400, 'Aucun champ à modifier');
  if (req.body.id_superieur && Number(req.body.id_superieur) === id) {
    throw new ApiError(400, 'Un employé ne peut pas être son propre supérieur');
  }

  const [r] = await pool.query(`UPDATE employes SET ${fields.join(', ')} WHERE id_employe = ?`, [...values, id]);
  if (!r.affectedRows) throw new ApiError(404, 'Employé introuvable');
  await audit(req, 'MODIFICATION', { table: 'employes', id, details: req.body });
  res.json({ success: true, message: 'Employé mis à jour' });
});

// Désactivation (pas de suppression : on conserve l'historique des congés)
exports.desactiver = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (id === req.user.id_employe) throw new ApiError(400, 'Vous ne pouvez pas désactiver votre propre compte');

  const [r] = await pool.query('UPDATE employes SET actif = 0 WHERE id_employe = ?', [id]);
  if (!r.affectedRows) throw new ApiError(404, 'Employé introuvable');
  await pool.query('UPDATE utilisateurs SET actif = 0 WHERE id_employe = ?', [id]);
  await audit(req, 'DESACTIVATION', { table: 'employes', id });
  res.json({ success: true, message: 'Employé désactivé' });
});

exports.reactiver = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const [r] = await pool.query('UPDATE employes SET actif = 1 WHERE id_employe = ?', [id]);
  if (!r.affectedRows) throw new ApiError(404, 'Employé introuvable');
  await pool.query('UPDATE utilisateurs SET actif = 1 WHERE id_employe = ?', [id]);
  await audit(req, 'REACTIVATION', { table: 'employes', id });
  res.json({ success: true, message: 'Employé réactivé' });
});

// Gestion du compte utilisateur lié à un employé (ADMIN)
exports.setCompte = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { login, mot_de_passe, role } = req.body;
  const hash = mot_de_passe ? await bcrypt.hash(mot_de_passe, 10) : null;

  const [[existing]] = await pool.query('SELECT id_utilisateur FROM utilisateurs WHERE id_employe = ?', [id]);
  if (existing) {
    const sets = []; const vals = [];
    if (login) { sets.push('login = ?'); vals.push(login); }
    if (hash) { sets.push('mot_de_passe = ?'); vals.push(hash); }
    if (role) { sets.push('role = ?'); vals.push(role); }
    if (!sets.length) throw new ApiError(400, 'Aucun champ à modifier');
    await pool.query(`UPDATE utilisateurs SET ${sets.join(', ')} WHERE id_employe = ?`, [...vals, id]);
  } else {
    if (!login || !hash) throw new ApiError(400, 'login et mot_de_passe requis pour créer le compte');
    await pool.query('INSERT INTO utilisateurs (id_employe, login, mot_de_passe, role) VALUES (?,?,?,?)', [
      id, login, hash, role || ROLES.EMPLOYE,
    ]);
  }
  await audit(req, 'GESTION_COMPTE', { table: 'utilisateurs', id, details: { login, role } });
  res.json({ success: true, message: 'Compte enregistré' });
});
