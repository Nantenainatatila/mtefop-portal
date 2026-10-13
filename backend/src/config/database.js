require("dotenv").config();
const  { Pool } = require("pg");

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
});
pool.on("connect", () => {
    console.log("");
});
pool.on("error", (error) => {
    console.error("erreur de connexion e postgres:", error);
});
module.exports = pool;