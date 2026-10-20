// Voitures : liste, détail, likes, commentaires, publication par l'admin
const express = require('express');
const pool = require('../db');
const upload = require('../middleware/upload');
const { optionalAuth, authRequired, adminOnly } = require('../middleware/auth');

const router = express.Router();

// Requête de base réutilisée pour la liste et le détail.
// $1 = id de l'utilisateur connecté (ou null) pour savoir s'il a liké la voiture.
const CAR_SELECT = `
  SELECT c.id, c.name, c.price, c.year, c.description, c.image, c.created_at,
         b.id AS brand_id, b.name AS brand_name,
         (SELECT COUNT(*) FROM likes l WHERE l.car_id = c.id) AS likes_count,
         (SELECT COUNT(*) FROM comments m WHERE m.car_id = c.id) AS comments_count,
         EXISTS (SELECT 1 FROM likes l WHERE l.car_id = c.id AND l.user_id = $1) AS liked_by_me
  FROM cars c
  JOIN brands b ON b.id = c.brand_id`;

// GET /api/cars?brand=1&search=toyota  (public)
router.get('/', optionalAuth, async (req, res) => {
  const userId = req.user ? req.user.id : null;
  const brandId = Number(req.query.brand) || null;
  const search = req.query.search ? String(req.query.search).trim() : null;

  const resultat = await pool.query(
    `${CAR_SELECT}
     WHERE ($2::int IS NULL OR c.brand_id = $2)
       AND ($3::text IS NULL OR c.name ILIKE '%' || $3::text || '%' OR b.name ILIKE '%' || $3::text || '%')
     ORDER BY c.created_at DESC`,
    [userId, brandId, search || null]
  );
  res.json(resultat.rows);
});

// GET /api/cars/:id  (public) : détail + commentaires
router.get('/:id', optionalAuth, async (req, res) => {
  const userId = req.user ? req.user.id : null;

  const voiture = await pool.query(`${CAR_SELECT} WHERE c.id = $2`, [userId, req.params.id]);
  if (voiture.rows.length === 0) {
    return res.status(404).json({ message: 'Voiture introuvable' });
  }

  const commentaires = await pool.query(
    `SELECT m.id, m.content, m.created_at, u.name AS user_name, u.avatar AS user_avatar
     FROM comments m
     JOIN users u ON u.id = m.user_id
     WHERE m.car_id = $1
     ORDER BY m.created_at DESC`,
    [req.params.id]
  );

  res.json({ ...voiture.rows[0], comments: commentaires.rows });
});

// POST /api/cars/:id/like : liker / retirer son like
router.post('/:id/like', authRequired, async (req, res) => {
  const carId = req.params.id;

  // On essaie d'abord de supprimer le like. S'il n'existait pas, on le crée.
  const supprime = await pool.query('DELETE FROM likes WHERE user_id = $1 AND car_id = $2', [
    req.user.id,
    carId,
  ]);

  let liked = false;
  if (supprime.rowCount === 0) {
    await pool.query('INSERT INTO likes (user_id, car_id) VALUES ($1, $2)', [req.user.id, carId]);
    liked = true;
  }

  const total = await pool.query('SELECT COUNT(*) FROM likes WHERE car_id = $1', [carId]);
  res.json({ liked, likes_count: total.rows[0].count });
});

// POST /api/cars/:id/comments : ajouter un commentaire
router.post('/:id/comments', authRequired, async (req, res) => {
  const contenu = (req.body.content || '').trim();
  if (!contenu) {
    return res.status(400).json({ message: 'Le commentaire est vide' });
  }

  const resultat = await pool.query(
    `INSERT INTO comments (user_id, car_id, content) VALUES ($1, $2, $3)
     RETURNING id, content, created_at`,
    [req.user.id, req.params.id, contenu]
  );

  const user = await pool.query('SELECT name, avatar FROM users WHERE id = $1', [req.user.id]);

  res.status(201).json({
    ...resultat.rows[0],
    user_name: user.rows[0].name,
    user_avatar: user.rows[0].avatar,
  });
});

// Trouve l'id de la marque : soit une marque existante (brand_id),
// soit une nouvelle marque à créer (brand_name). Utilisé pour publier ET modifier.
async function trouverMarque(brand_id, brand_name) {
  if (brand_name && brand_name.trim()) {
    const marque = await pool.query(
      `INSERT INTO brands (name) VALUES ($1)
       ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [brand_name.trim()]
    );
    return marque.rows[0].id;
  }
  return Number(brand_id) || null;
}

// POST /api/cars  (admin) : publier une voiture avec son image
router.post('/', authRequired, adminOnly, upload.single('image'), async (req, res) => {
  const { name, price, year, description, brand_id, brand_name } = req.body;
  const prix = Math.round(Number(price));

  if (!name || !name.trim() || !(prix > 0)) {
    return res.status(400).json({ message: 'Le nom et un prix valide sont obligatoires' });
  }

  const brandId = await trouverMarque(brand_id, brand_name);
  if (!brandId) {
    return res.status(400).json({ message: 'Choisissez une marque' });
  }

  const image = req.file ? `/uploads/${req.file.filename}` : null;

  const resultat = await pool.query(
    `INSERT INTO cars (brand_id, name, price, year, description, image)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [brandId, name.trim(), prix, year ? Number(year) : null, description || '', image]
  );

  res.status(201).json({ id: resultat.rows[0].id, message: 'Voiture publiée' });
});

// PUT /api/cars/:id  (admin) : modifier une voiture publiée
// Si aucune nouvelle image n'est envoyée, l'ancienne image est conservée.
router.put('/:id', authRequired, adminOnly, upload.single('image'), async (req, res) => {
  const { name, price, year, description, brand_id, brand_name } = req.body;
  const prix = Math.round(Number(price));

  if (!name || !name.trim() || !(prix > 0)) {
    return res.status(400).json({ message: 'Le nom et un prix valide sont obligatoires' });
  }

  const brandId = await trouverMarque(brand_id, brand_name);
  if (!brandId) {
    return res.status(400).json({ message: 'Choisissez une marque' });
  }

  const nouvelleImage = req.file ? `/uploads/${req.file.filename}` : null;

  // COALESCE($6, image) = "prends la nouvelle image, sinon garde l'ancienne"
  const resultat = await pool.query(
    `UPDATE cars
     SET brand_id = $1, name = $2, price = $3, year = $4, description = $5,
         image = COALESCE($6, image)
     WHERE id = $7
     RETURNING id`,
    [brandId, name.trim(), prix, year ? Number(year) : null, description || '', nouvelleImage, req.params.id]
  );

  if (resultat.rowCount === 0) {
    return res.status(404).json({ message: 'Voiture introuvable' });
  }
  res.json({ id: resultat.rows[0].id, message: 'Voiture modifiée' });
});

// DELETE /api/cars/:id  (admin)
router.delete('/:id', authRequired, adminOnly, async (req, res) => {
  await pool.query('DELETE FROM cars WHERE id = $1', [req.params.id]);
  res.json({ message: 'Voiture supprimée' });
});

module.exports = router;
