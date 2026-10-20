// Gestion de l'envoi d'images (photo de profil, photo de voiture) avec multer
const fs = require('fs');
const path = require('path');
const multer = require('multer');

// Dossier où les images sont enregistrées : backend/uploads
// Sur Vercel, seul /tmp est inscriptible (et temporaire)
const dossier = process.env.VERCEL
  ? '/tmp/uploads'
  : path.join(__dirname, '..', '..', 'uploads');

try {
  fs.mkdirSync(dossier, { recursive: true });
} catch (e) {
  console.error('Impossible de créer le dossier uploads :', e.message);
}

const storage = multer.diskStorage({
  destination: dossier,
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    // Nom unique : date + nombre aléatoire
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 Mo maximum
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) return cb(null, true);
    const erreur = new Error('Seules les images sont acceptées');
    erreur.status = 400;
    cb(erreur);
  },
});

module.exports = upload;
