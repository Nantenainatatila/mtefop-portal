const { pool } = require('../config/db');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const audit = require('../utils/audit');
const { buildUpdate } = require('../utils/helpers');
const { peutAccederEmploye } = require('../utils/scope');

const SELECT_SOLDES = `
  SELECT s.id_solde, s.id_employe, t.id_type, t.code, t.libelle AS type_conge, s.annee,
         s.droit, s.report, s.pris, (s.droit + s.report - s.pris) AS reste
    FROM soldes_conges s JOIN types_conges t ON t.id_type = s.id_type`;

exports.mesSoldes = asyncHandler(async (req, res) => {
  const annee = req.query.annee || new Date().getFullYear();
  const [rows] = await pool.query(`${SELECT_SOLDES} WHERE s.id_employe = ? AND s.annee = ? ORDER BY t.libelle`, [
    req.user.id_employe, annee,
  ]);
  res.json({ success: true, data: rows });
});

exports.soldesEmploye = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (!(await peutAccederEmploye(req.user, id))) throw new ApiError(403, 'Accès refusé');
  const annee = req.query.annee || new Date().getFullYear();
  const [rows] = await pool.query(`${SELECT_SOLDES} WHERE s.id_employe = ? AND s.annee = ? ORDER BY t.libelle`, [id, annee]);
  res.json({ success: true, data: rows });
});

// Ouverture des soldes d'une année pour tous les employés actifs (RH/ADMIN)
exports.initialiser = asyncHandler(async (req, res) => {
  const { annee, reporter = false, plafond_report = 0 } = req.body;

  const [r] = await pool.query(
    `INSERT IGNORE INTO soldes_conges (id_employe, id_type, annee, droit)
     SELECT e.id_employe, t.id_type, ?, t.jours_par_an
       FROM employes e JOIN types_conges t ON t.jours_par_an IS NOT NULL AND t.actif = 1
      WHERE e.actif = 1`,
    [annee]
  );

  let reportes = 0;
  if (reporter && Number(plafond_report) > 0) {
    // Report du reliquat du congé annuel de l'année précédente, plafonné
    const [u] = await pool.query(
      `UPDATE soldes_conges n
          SET report = LEAST(GREATEST(p.droit + p.report - p.pris, 0), ?)
         FROM soldes_conges p, types_conges t
        WHERE p.id_employe = n.id_employe AND p.id_type = n.id_type AND p.annee = n.annee - 1
          AND t.id_type = n.id_type AND t.code = 'ANNUEL'
          AND n.annee = ?`,
      [plafond_report, annee]
    );
    reportes = u.affectedRows;
  }
  await audit(req, 'INITIALISATION_SOLDES', { table: 'soldes_conges', details: { annee, reporter, plafond_report } });
  res.status(201).json({ success: true, data: { soldes_crees: r.affectedRows, soldes_avec_report: reportes } });
});

// Ajustement manuel (RH/ADMIN)
exports.ajuster = asyncHandler(async (req, res) => {
  const { fields, values } = buildUpdate(req.body, ['droit', 'report', 'pris']);
  if (!fields.length) throw new ApiError(400, 'Aucun champ à modifier');
  const [r] = await pool.query(`UPDATE soldes_conges SET ${fields.join(', ')} WHERE id_solde = ?`, [...values, req.params.id]);
  if (!r.affectedRows) throw new ApiError(404, 'Solde introuvable');
  await audit(req, 'AJUSTEMENT_SOLDE', { table: 'soldes_conges', id: Number(req.params.id), details: req.body });
  res.json({ success: true, message: 'Solde ajusté' });
});
