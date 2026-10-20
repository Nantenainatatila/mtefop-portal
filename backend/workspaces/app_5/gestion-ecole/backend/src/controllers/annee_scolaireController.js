const pool = require("../config/database");

const getAnneeScolaire = async(req, res) => {
    try {
        const result = await pool.query(
            "SELECT (id_annee, annee) FROM annees_scolaires ORDER BY id_annee"
        );
        res.json(result.rows);
    } catch(error) {
        console.error("erreur de recuperation d'anne scolaires");
        res.status(500).json({
            message: "Erreur de serveur"
        });
    }
};
module.exports = {getAnneeScolaire};