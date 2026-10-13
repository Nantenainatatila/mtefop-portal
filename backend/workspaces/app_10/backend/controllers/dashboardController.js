const { pool } = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const { scopeClause, isRH } = require('../utils/scope');
const { NIVEAUX } = require('../config/constants');

// Tableau de bord adapté au périmètre de l'utilisateur
exports.get = asyncHandler(async (req, res) => {
  const annee = Number(req.query.annee) || new Date().getFullYear();
  const scope = scopeClause(req.user);
  const base = `FROM demandes_conges d
                JOIN employes e ON e.id_employe = d.id_employe
                JOIN services s ON s.id_service = e.id_service`;

  const [[effectif]] = await pool.query(
    `SELECT COUNT(*) AS n FROM employes e JOIN services s ON s.id_service = e.id_service WHERE e.actif = 1 ${scope.clause}`,
    scope.params
  );
  const [[enAttente]] = await pool.query(`SELECT COUNT(*) AS n ${base} WHERE d.statut = 'EN_ATTENTE' ${scope.clause}`, scope.params);
  const [[enConge]] = await pool.query(
    `SELECT COUNT(*) AS n ${base} WHERE d.statut = 'APPROUVE' AND CURDATE() BETWEEN d.date_debut AND d.date_fin ${scope.clause}`,
    scope.params
  );
  const [parStatut] = await pool.query(
    `SELECT d.statut, COUNT(*) AS nb ${base} WHERE YEAR(d.date_debut) = ? ${scope.clause} GROUP BY d.statut`,
    [annee, ...scope.params]
  );
  const [parMois] = await pool.query(
    `SELECT MONTH(d.date_debut) AS mois, COUNT(*) AS nb, SUM(d.nb_jours) AS jours
       ${base} WHERE d.statut = 'APPROUVE' AND YEAR(d.date_debut) = ? ${scope.clause}
      GROUP BY MONTH(d.date_debut) ORDER BY mois`,
    [annee, ...scope.params]
  );
  const [[aValider]] = await pool.query(
    `SELECT COUNT(DISTINCT d.id_demande) AS n
       FROM demandes_conges d JOIN validations v ON v.id_demande = d.id_demande AND v.decision = 'EN_ATTENTE'
      WHERE d.statut = 'EN_ATTENTE' AND d.id_employe <> ?
        AND (v.id_valideur = ? OR (v.niveau = ? AND ? = 1))
        AND NOT EXISTS (SELECT 1 FROM validations v2 WHERE v2.id_demande = v.id_demande AND v2.niveau < v.niveau AND v2.decision = 'EN_ATTENTE')`,
    [req.user.id_employe, req.user.id_employe, NIVEAUX.RH, isRH(req.user) ? 1 : 0]
  );
  const [mesSoldes] = await pool.query(
    `SELECT t.libelle AS type_conge, s.droit, s.report, s.pris, (s.droit + s.report - s.pris) AS reste
       FROM soldes_conges s JOIN types_conges t ON t.id_type = s.id_type
      WHERE s.id_employe = ? AND s.annee = ?`,
    [req.user.id_employe, annee]
  );

  res.json({
    success: true,
    data: {
      annee,
      effectif: effectif.n,
      demandes_en_attente: enAttente.n,
      en_conge_aujourdhui: enConge.n,
      a_valider_par_moi: aValider.n,
      demandes_par_statut: parStatut,
      conges_par_mois: parMois,
      mes_soldes: mesSoldes,
    },
  });
});
