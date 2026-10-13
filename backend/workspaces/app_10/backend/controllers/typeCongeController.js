const { pool } = require('../config/db');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const audit = require('../utils/audit');
const { buildUpdate } = require('../utils/helpers');

const CHAMPS = ['code', 'libelle', 'jours_par_an', 'duree_max', 'decompte_solde', 'jours_ouvrables', 'justificatif_requis', 'sexe_requis', 'actif'];

exports.list = asyncHandler(async (req, res) => {
  const all = req.query.tous === '1';
  const [rows] = await pool.query(`SELECT * FROM types_conges ${all ? '' : 'WHERE actif = 1'} ORDER BY libelle`);
  res.json({ success: true, data: rows });
});

exports.create = asyncHandler(async (req, res) => {
  const cols = CHAMPS.filter((c) => req.body[c] !== undefined);
  const [r] = await pool.query(
    `INSERT INTO types_conges (${cols.map((c) => `\`${c}\``).join(',')}) VALUES (${cols.map(() => '?').join(',')})`,
    cols.map((c) => req.body[c])
  );
  await audit(req, 'CREATION', { table: 'types_conges', id: r.insertId });
  res.status(201).json({ success: true, data: { id_type: r.insertId } });
});

exports.update = asyncHandler(async (req, res) => {
  const { fields, values } = buildUpdate(req.body, CHAMPS);
  if (!fields.length) throw new ApiError(400, 'Aucun champ à modifier');
  const [r] = await pool.query(`UPDATE types_conges SET ${fields.join(', ')} WHERE id_type = ?`, [...values, req.params.id]);
  if (!r.affectedRows) throw new ApiError(404, 'Type de congé introuvable');
  await audit(req, 'MODIFICATION', { table: 'types_conges', id: Number(req.params.id), details: req.body });
  res.json({ success: true, message: 'Type de congé mis à jour' });
});

exports.desactiver = asyncHandler(async (req, res) => {
  const [r] = await pool.query('UPDATE types_conges SET actif = 0 WHERE id_type = ?', [req.params.id]);
  if (!r.affectedRows) throw new ApiError(404, 'Type de congé introuvable');
  await audit(req, 'DESACTIVATION', { table: 'types_conges', id: Number(req.params.id) });
  res.json({ success: true, message: 'Type de congé désactivé' });
});
