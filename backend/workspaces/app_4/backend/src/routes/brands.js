// Liste des marques (Toyota, Peugeot...)
const express = require('express');
const pool = require('../db');

const router = express.Router();

// GET /api/brands
router.get('/', async (req, res) => {
  const resultat = await pool.query('SELECT id, name FROM brands ORDER BY name');
  res.json(resultat.rows);
});

module.exports = router;
