const express = require("express");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

// --- Santé du backend ---
app.get("/api/health", (req, res) => {
    res.json({ statut: "ok", heure: new Date().toISOString() });
});

// --- Message simple pour tester le proxy nginx -> backend ---
app.get("/api/hello", (req, res) => {
    res.json({
        message: "Bonjour depuis le backend Node.js !",
        conteneur: process.env.HOSTNAME || "inconnu",
        node: process.version
    });
});

// --- Test de connexion à la base (connexion à la demande : ne bloque pas le démarrage) ---
app.get("/api/db", async (req, res) => {
    const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, DB_DIALECT } = process.env;

    if (!DB_HOST) {
        return res.json({
            connecte: false,
            message: "Aucune base configurée (variable DB_HOST absente)"
        });
    }

    try {
        let heureBase;

        if (DB_DIALECT === "postgres") {
            const { Client } = require("pg");
            const client = new Client({
                host: DB_HOST,
                port: Number(DB_PORT),
                user: DB_USER,
                password: DB_PASSWORD,
                database: DB_NAME,
                connectionTimeoutMillis: 3000
            });
            await client.connect();
            const r = await client.query("SELECT NOW() AS maintenant");
            heureBase = r.rows[0].maintenant;
            await client.end();
        } else {
            const mysql = require("mysql2/promise");
            const client = await mysql.createConnection({
                host: DB_HOST,
                port: Number(DB_PORT),
                user: DB_USER,
                password: DB_PASSWORD,
                database: DB_NAME,
                connectTimeout: 3000
            });
            const [rows] = await client.query("SELECT NOW() AS maintenant");
            heureBase = rows[0].maintenant;
            await client.end();
        }

        res.json({
            connecte: true,
            moteur: DB_DIALECT,
            hote: DB_HOST,
            base: DB_NAME,
            heure_base: heureBase
        });
    } catch (err) {
        res.json({ connecte: false, hote: DB_HOST, erreur: err.message });
    }
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Backend de test démarré sur le port ${PORT}`);
});
