require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

if (!process.env.JWT_SECRET) { console.error('JWT_SECRET manquant dans .env'); process.exit(1); }

const app = express();
app.use(helmet());
app.use(cors({ origin: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',') }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));
app.use('/api/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { message: 'Trop de tentatives de connexion' } }));

app.get('/api/health', (_q, r) => r.json({ status: 'ok', service: 'MTEFOP Suivi des dossiers' }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/public', require('./routes/public'));
app.use('/api/dossiers', require('./routes/dossiers'));
app.use('/api/utilisateurs', require('./routes/users'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api', require('./routes/references'));

app.use((_q, r) => r.status(404).json({ message: 'Route introuvable' }));
app.use((err, _q, res, _n) => { console.error(err); res.status(500).json({ message: 'Erreur interne du serveur' }); });

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`API MTEFOP démarrée sur http://localhost:${PORT}`));
