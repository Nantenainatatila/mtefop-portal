const { pool } = require('../config/db');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const audit = require('../utils/audit');

/* Directions */
exports.listDirections = asyncHandler(async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM directions ORDER BY nom');
  res.json({ success: true, data: rows });
});

exports.createDirection = asyncHandler(async (req, res) => {
  const { code, nom } = req.body;
  const [r] = await pool.query('INSERT INTO directions (code, nom) VALUES (?,?)', [code, nom]);
  await audit(req, 'CREATION', { table: 'directions', id: r.insertId });
  res.status(201).json({ success: true, data: { id_direction: r.insertId } });
});

exports.updateDirection = asyncHandler(async (req, res) => {
  const { code, nom } = req.body;
  const [r] = await pool.query('UPDATE directions SET code = IFNULL(?, code), nom = IFNULL(?, nom) WHERE id_direction = ?', [
    code ?? null, nom ?? null, req.params.id,
  ]);
  if (!r.affectedRows) throw new ApiError(404, 'Direction introuvable');
  res.json({ success: true, message: 'Direction mise à jour' });
});

/* Services */
exports.listServices = asyncHandler(async (req, res) => {
  const { id_direction } = req.query;
  const [rows] = await pool.query(
    `SELECT s.*, d.nom AS direction FROM services s JOIN directions d ON d.id_direction = s.id_direction
      ${id_direction ? 'WHERE s.id_direction = ?' : ''} ORDER BY s.nom`,
    id_direction ? [id_direction] : []
  );
  res.json({ success: true, data: rows });
});

exports.createService = asyncHandler(async (req, res) => {
  const { id_direction, code, nom } = req.body;
  const [r] = await pool.query('INSERT INTO services (id_direction, code, nom) VALUES (?,?,?)', [id_direction, code, nom]);
  await audit(req, 'CREATION', { table: 'services', id: r.insertId });
  res.status(201).json({ success: true, data: { id_service: r.insertId } });
});

exports.updateService = asyncHandler(async (req, res) => {
  const { id_direction, code, nom } = req.body;
  const [r] = await pool.query(
    'UPDATE services SET id_direction = IFNULL(?, id_direction), code = IFNULL(?, code), nom = IFNULL(?, nom) WHERE id_service = ?',
    [id_direction ?? null, code ?? null, nom ?? null, req.params.id]
  );
  if (!r.affectedRows) throw new ApiError(404, 'Service introuvable');
  res.json({ success: true, message: 'Service mis à jour' });
});

/* Postes */
exports.listPostes = asyncHandler(async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM postes ORDER BY libelle');
  res.json({ success: true, data: rows });
});

exports.createPoste = asyncHandler(async (req, res) => {
  const [r] = await pool.query('INSERT INTO postes (libelle) VALUES (?)', [req.body.libelle]);
  res.status(201).json({ success: true, data: { id_poste: r.insertId } });
});
