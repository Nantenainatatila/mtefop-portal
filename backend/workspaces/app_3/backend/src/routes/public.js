// Suivi public : l'usager saisit le N° de dossier + son CIN ou téléphone.
// Seules des informations non sensibles sont renvoyées.
const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const db = require('../config/db');

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, message: { message: 'Trop de tentatives, réessayez plus tard' } });

router.post('/suivi', limiter, async (req, res) => {
  const { numero, verification } = req.body;
  if (!numero || !verification) return res.status(400).json({ message: 'Numéro de dossier et CIN/téléphone requis' });
  const [rows] = await db.query(
    `SELECT d.id, d.numero, d.objet, d.statut, d.date_reception, d.date_echeance, d.date_cloture,
            t.libelle AS type_libelle, s.nom AS service_nom
     FROM dossiers d JOIN types_dossier t ON t.id = d.type_id LEFT JOIN services s ON s.id = d.service_actuel_id
     WHERE d.numero = ? AND (d.demandeur_cin = ? OR d.demandeur_telephone = ?)`,
    [numero.trim(), verification.trim(), verification.trim()]);
  if (!rows.length) return res.status(404).json({ message: 'Aucun dossier ne correspond à ces informations' });
  const [etapes] = await db.query(
    `SELECT m.action, m.statut_apres, m.created_at, s.nom AS service_nom
     FROM mouvements m LEFT JOIN services s ON s.id = m.service_dest_id
     WHERE m.dossier_id = ? AND m.action <> 'observation' ORDER BY m.id`, [rows[0].id]);
  const { id, ...dossier } = rows[0];
  res.json({ ...dossier, etapes });
});

module.exports = router;
