// Point d'entrée de l'API : "npm start" lance ce fichier
require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');


 // Vercel utilise l'app exportée

const allowedOrigins = [
  'http://localhost:5173',
  'https://carfrontend-two.vercel.app',
];
const app = express();

app.use(cors({
  origin: function (origin, callback) {
    // Autoriser les requêtes sans origine, par exemple certains clients API.
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Origine non autorisée par CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));




app.use(cors());
app.use(express.json());

// Les images envoyées sont accessibles via http://localhost:5000/uploads/nom-image.jpg
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Les routes de l'API
app.use('/api/auth', require('./routes/auth'));
app.use('/api/brands', require('./routes/brands'));
app.use('/api/cars', require('./routes/cars'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/admin', require('./routes/admin'));

// Test rapide : http://localhost:5000/api/health
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Gestion des erreurs (toute erreur non prévue arrive ici)
app.use((err, req, res, next) => {
  console.error(err);

  if (err.name === 'MulterError') {
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'Image trop lourde (5 Mo maximum)' : err.message;
    return res.status(400).json({ message });
  }
  if (err.code === '23503') {
    return res.status(404).json({ message: 'Élément introuvable' }); // clé étrangère inexistante
  }
  if (err.code === '22P02') {
    return res.status(400).json({ message: 'Identifiant invalide' });
  }
  if (err.status) {
    return res.status(err.status).json({ message: err.message });
  }
  res.status(500).json({ message: 'Erreur du serveur' });
});

const PORT = process.env.PORT || 5000;
if (!process.env.VERCEL) {
  app.listen(PORT, () => console.log(`API prête sur http://localhost:${PORT}`));
}

module.exports = app;