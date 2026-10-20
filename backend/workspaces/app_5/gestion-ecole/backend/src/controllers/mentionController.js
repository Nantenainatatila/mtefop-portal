const pool = require("../config/database");
const getMentions = async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT id_mention, nom_mention FROM mentions ORDER BY id_mention"
        );
        res.json(result.rows);
    } catch (error) {
        console.error("erreur de recuperation de mentions", error);

        res.status(500).json({
            message:"erreur de serveur"
        });
    }
};

module.exports = {getMentions};