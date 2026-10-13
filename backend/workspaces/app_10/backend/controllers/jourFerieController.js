const { pool } = require('../config/db');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const audit = require('../utils/audit');

exports.list = asyncHandler(async (req, res) => {
  const annee = req.query.annee || new Date().getFullYear();
  const [rows] = await pool.query('SELECT * FROM jours_feries WHERE YEAR(date_ferie) = ? ORDER BY date_ferie', [annee]);
  res.json({ success: true, data: rows });
});

exports.create = asyncHandler(async (req, res) => {
  const { date_ferie, libelle } = req.body;
  const [r] = await pool.query('INSERT INTO jours_feries (date_ferie, libelle) VALUES (?,?)', [date_ferie, libelle]);
  await audit(req, 'CREATION', { table: 'jours_feries', id: r.insertId });
  res.status(201).json({ success: true, data: { id_ferie: r.insertId } });
});

exports.update = asyncHandler(async (req, res) => {
  const { date_ferie, libelle } = req.body;
  const [r] = await pool.query(
    'UPDATE jours_feries SET date_ferie = IFNULL(?, date_ferie), libelle = IFNULL(?, libelle) WHERE id_ferie = ?',
    [date_ferie ?? null, libelle ?? null, req.params.id]
  );
  if (!r.affectedRows) throw new ApiError(404, 'Jour férié introuvable');
  res.json({ success: true, message: 'Jour férié mis à jour' });
});

exports.remove = asyncHandler(async (req, res) => {
  const [r] = await pool.query('DELETE FROM jours_feries WHERE id_ferie = ?', [req.params.id]);
  if (!r.affectedRows) throw new ApiError(404, 'Jour férié introuvable');
  await audit(req, 'SUPPRESSION', { table: 'jours_feries', id: Number(req.params.id) });
  res.json({ success: true, message: 'Jour férié supprimé' });
});
