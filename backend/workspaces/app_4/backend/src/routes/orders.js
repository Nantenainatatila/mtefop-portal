// Commandes + discussion (messages) entre le client et l'admin
const express = require('express');
const pool = require('../db');
const { authRequired, adminOnly } = require('../middleware/auth');

const router = express.Router();

// Toutes les routes de ce fichier demandent d'être connecté
router.use(authRequired);

// Requête de base : une commande avec les infos du client et de la voiture
const ORDER_SELECT = `
  SELECT o.id, o.status, o.note, o.created_at,
         u.id AS user_id, u.name AS user_name, u.email AS user_email, u.avatar AS user_avatar,
         c.id AS car_id, c.name AS car_name, c.price, c.image,
         b.name AS brand_name,
         (SELECT COUNT(*) FROM messages m WHERE m.order_id = o.id) AS messages_count
  FROM orders o
  JOIN users u ON u.id = o.user_id
  JOIN cars c ON c.id = o.car_id
  JOIN brands b ON b.id = c.brand_id`;

const STATUTS = ['pending', 'confirmed', 'delivered', 'cancelled'];

// POST /api/orders : un client passe une commande
router.post('/', async (req, res) => {
  if (req.user.role === 'admin') {
    return res.status(403).json({ message: 'L’administrateur ne peut pas commander' });
  }

  const { car_id, note } = req.body;

  const voiture = await pool.query(
    `SELECT c.id, c.name, b.name AS brand_name
     FROM cars c JOIN brands b ON b.id = c.brand_id WHERE c.id = $1`,
    [car_id]
  );
  if (voiture.rows.length === 0) {
    return res.status(404).json({ message: 'Voiture introuvable' });
  }

  const commande = await pool.query(
    'INSERT INTO orders (user_id, car_id, note) VALUES ($1, $2, $3) RETURNING id',
    [req.user.id, car_id, (note || '').trim()]
  );
  const orderId = commande.rows[0].id;

  // Notification envoyée à l'admin (boîte de commandes)
  const client = await pool.query('SELECT name FROM users WHERE id = $1', [req.user.id]);
  const v = voiture.rows[0];
  await pool.query('INSERT INTO notifications (order_id, message) VALUES ($1, $2)', [
    orderId,
    `${client.rows[0].name} a commandé ${v.brand_name} ${v.name}`,
  ]);

  res.status(201).json({ id: orderId, message: 'Commande envoyée' });
});

// GET /api/orders/mine : les commandes du client connecté
router.get('/mine', async (req, res) => {
  const resultat = await pool.query(
    `${ORDER_SELECT} WHERE o.user_id = $1 ORDER BY o.created_at DESC`,
    [req.user.id]
  );
  res.json(resultat.rows);
});

// GET /api/orders : toutes les commandes (admin = boîte de commandes)
router.get('/', adminOnly, async (req, res) => {
  const resultat = await pool.query(`${ORDER_SELECT} ORDER BY o.created_at DESC`);
  res.json(resultat.rows);
});

// PATCH /api/orders/:id/status : l'admin change l'état de la commande
router.patch('/:id/status', adminOnly, async (req, res) => {
  const { status } = req.body;
  if (!STATUTS.includes(status)) {
    return res.status(400).json({ message: 'Statut invalide' });
  }
  await pool.query('UPDATE orders SET status = $1 WHERE id = $2', [status, req.params.id]);
  res.json({ message: 'Statut mis à jour' });
});

// Vérifie que la commande existe ET que l'utilisateur a le droit d'y accéder
// (l'admin voit tout, un client ne voit que ses commandes)
async function commandeAutorisee(orderId, user) {
  const resultat = await pool.query('SELECT id, user_id FROM orders WHERE id = $1', [orderId]);
  const commande = resultat.rows[0];
  if (!commande) return null;
  if (user.role !== 'admin' && commande.user_id !== user.id) return null;
  return commande;
}

// GET /api/orders/:id/messages : la discussion de la commande
router.get('/:id/messages', async (req, res) => {
  const commande = await commandeAutorisee(req.params.id, req.user);
  if (!commande) return res.status(404).json({ message: 'Commande introuvable' });

  const resultat = await pool.query(
    `SELECT m.id, m.content, m.created_at, m.sender_id,
            u.name AS sender_name, u.role AS sender_role, u.avatar AS sender_avatar
     FROM messages m
     JOIN users u ON u.id = m.sender_id
     WHERE m.order_id = $1
     ORDER BY m.created_at ASC`,
    [req.params.id]
  );
  res.json(resultat.rows);
});

// POST /api/orders/:id/messages : envoyer un message
router.post('/:id/messages', async (req, res) => {
  const commande = await commandeAutorisee(req.params.id, req.user);
  if (!commande) return res.status(404).json({ message: 'Commande introuvable' });

  const contenu = (req.body.content || '').trim();
  if (!contenu) return res.status(400).json({ message: 'Le message est vide' });

  const resultat = await pool.query(
    `INSERT INTO messages (order_id, sender_id, content) VALUES ($1, $2, $3)
     RETURNING id, content, created_at, sender_id`,
    [req.params.id, req.user.id, contenu]
  );

  // Si c'est le client qui écrit, on prévient l'admin
  if (req.user.role !== 'admin') {
    const client = await pool.query('SELECT name FROM users WHERE id = $1', [req.user.id]);
    await pool.query('INSERT INTO notifications (order_id, message) VALUES ($1, $2)', [
      req.params.id,
      `${client.rows[0].name} a écrit un message (commande #${req.params.id})`,
    ]);
  }

  res.status(201).json(resultat.rows[0]);
});

module.exports = router;
