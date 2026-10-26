const router = require('express').Router();
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, async (req, res) => {
  const scoped = !['admin', 'directeur'].includes(req.user.role);
  const w = scoped ? ' WHERE (service_actuel_id = ? OR created_by = ?)' : '';
  const p = scoped ? [req.user.service_id, req.user.id] : [];
  const and = scoped ? w + ' AND ' : ' WHERE ';

  const [[tot]] = await db.query(`SELECT COUNT(*) AS total FROM dossiers${w}`, p);
  const [parStatut] = await db.query(`SELECT statut, COUNT(*) AS n FROM dossiers${w} GROUP BY statut`, p);
  const [[retard]] = await db.query(
    `SELECT COUNT(*) AS n FROM dossiers${and}date_echeance < CURDATE() AND statut NOT IN ('valide','rejete','cloture')`, p);
  const [[mois]] = await db.query(
    `SELECT COUNT(*) AS n FROM dossiers${and}MONTH(date_reception)=MONTH(CURDATE()) AND YEAR(date_reception)=YEAR(CURDATE())`, p);
  const [parType] = await db.query(
    `SELECT t.libelle, COUNT(*) AS n FROM dossiers d JOIN types_dossier t ON t.id = d.type_id
     ${scoped ? 'WHERE (d.service_actuel_id = ? OR d.created_by = ?)' : ''} GROUP BY t.id ORDER BY n DESC LIMIT 6`, p);
  const [parService] = await db.query(
    `SELECT s.code, s.nom, COUNT(*) AS n FROM dossiers d JOIN services s ON s.id = d.service_actuel_id
     WHERE d.statut NOT IN ('valide','rejete','cloture') ${scoped ? 'AND (d.service_actuel_id = ? OR d.created_by = ?)' : ''}
     GROUP BY s.id ORDER BY n DESC`, p);
  const [recents] = await db.query(
    `SELECT d.id, d.numero, d.objet, d.statut, d.demandeur_nom, d.date_reception FROM dossiers d
     ${scoped ? 'WHERE (d.service_actuel_id = ? OR d.created_by = ?)' : ''} ORDER BY d.id DESC LIMIT 6`, p);

  res.json({ total: tot.total, en_retard: retard.n, ce_mois: mois.n, par_statut: parStatut, par_type: parType, par_service: parService, recents });
});

module.exports = router;
