// Espace admin : statistiques et notifications
const express = require('express');
const pool = require('../db');
const { authRequired, adminOnly } = require('../middleware/auth');

const router = express.Router();

// Toutes les routes de ce fichier sont réservées à l'admin
router.use(authRequired, adminOnly);

// GET /api/admin/stats : chiffres du tableau de bord
router.get('/stats', async (req, res) => {
  const totaux = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM users WHERE role = 'client') AS clients,
      (SELECT COUNT(*) FROM cars) AS cars,
      (SELECT COUNT(*) FROM orders) AS orders,
      (SELECT COUNT(*) FROM likes) AS likes,
      (SELECT COUNT(*) FROM comments) AS comments
  `);

  // Voitures les plus commandées
  const plusCommandees = await pool.query(`
    SELECT c.id, c.name, b.name AS brand_name, COUNT(o.id) AS total
    FROM cars c
    JOIN brands b ON b.id = c.brand_id
    LEFT JOIN orders o ON o.car_id = c.id
    GROUP BY c.id, b.name
    ORDER BY total DESC, c.name
    LIMIT 5
  `);

  // Voitures les plus likées
  const plusLikees = await pool.query(`
    SELECT c.id, c.name, b.name AS brand_name, COUNT(l.id) AS total
    FROM cars c
    JOIN brands b ON b.id = c.brand_id
    LEFT JOIN likes l ON l.car_id = c.id
    GROUP BY c.id, b.name
    ORDER BY total DESC, c.name
    LIMIT 5
  `);

  // Voitures les plus commentées
  const plusCommentees = await pool.query(`
    SELECT c.id, c.name, b.name AS brand_name, COUNT(m.id) AS total
    FROM cars c
    JOIN brands b ON b.id = c.brand_id
    LEFT JOIN comments m ON m.car_id = c.id
    GROUP BY c.id, b.name
    ORDER BY total DESC, c.name
    LIMIT 5
  `);

  // Nombre de commandes par statut
  const parStatut = await pool.query(`
    SELECT status, COUNT(*) AS total FROM orders GROUP BY status
  `);

  res.json({
    totals: totaux.rows[0],
    mostOrdered: plusCommandees.rows,
    mostLiked: plusLikees.rows,
    mostCommented: plusCommentees.rows,
    ordersByStatus: parStatut.rows,
  });
});

// GET /api/admin/notifications : dernières notifications + nombre non lues
router.get('/notifications', async (req, res) => {
  const liste = await pool.query(
    `SELECT id, order_id, message, is_read, created_at
     FROM notifications ORDER BY created_at DESC LIMIT 50`
  );
  const nonLues = await pool.query('SELECT COUNT(*) FROM notifications WHERE is_read = false');
  res.json({ notifications: liste.rows, unread: nonLues.rows[0].count });
});

// POST /api/admin/notifications/read-all : tout marquer comme lu
router.post('/notifications/read-all', async (req, res) => {
  await pool.query('UPDATE notifications SET is_read = true WHERE is_read = false');
  res.json({ message: 'Notifications lues' });
});

module.exports = router;
