const pool = require("../config/database");

const getNiveaux = async(req, res) => {
    try {
        const result = await pool.query(
            "SELECT id_niveau, nom_niveau FROM niveaux ORDER BY id_niveau"
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Erreur de recuperation de niveaux", error);
        res.status(500).json({
            message: "erreur de serveur"
        });
    }
}

module.exports = {getNiveaux};