// Connexion à PostgreSQL
require('dotenv').config();
const { Pool, types } = require('pg');

// Par défaut, "pg" renvoie les BIGINT (prix, COUNT(*)...) sous forme de texte.
// Cette ligne les convertit en vrais nombres pour simplifier le code.
types.setTypeParser(20, (valeur) => parseInt(valeur, 10));

const pool = new Pool({
    user: process.env.DB_USER || "postgres",
    host: process.env.DB_HOST || "localhost",
    database: process.env.DB_NAME || "car_mada",
    password: process.env.DB_PASSWORD || "postgres",
    port: Number(process.env.DB_PORT) || 5432
});

module.exports = pool;
