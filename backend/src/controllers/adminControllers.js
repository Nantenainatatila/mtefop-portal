const pool = require("../config/database");

const  getAdmin  = async (req , res) => {
    try {
        const resultAdmin = await pool.query(`
        SELECT 
            id_admin,
            nom_admin,
            email_admin, 
            role_admin,
            statut_admin,
            actif,
            date_creation
        FROM administrations 
        WHERE role_admin = 'admin'
        ORDER BY date_creation DESC`);

        const data = resultAdmin.rows;
        res.json(data);
    } catch (error) {
        console.error("erreur de recuperation d'admin dans backend");
    }
};

const accepterAdmin = async (req , res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            `   UPDATE administrations
                SET 
                    statut_admin = 'active', 
                    actif = true,
                    date_modification = CURRENT_TIMESTAMP
                WHERE id_admin = $1
                RETURNING 
                    nom_admin,
                    email_admin,
                    role_admin,
                    statut_admin,
                    actif
            `, [id]
        );

        if (result.rows[0].length === 0 ) {
            return res.status(404).json({
                message: "Admin introuvable" 
            });
        }

        return res.status(200).json({
            message: "Damande accepté",
            administrateur: result.rows[0]
        });

    } catch (error) {
        console.error("erreur de l'acceptation d'admin", error);
        res.status(500).json({
            message: "erreur dans le serveur"
        });
    }
};

const refuserAdmin = async(req , res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            `
            UPDATE administrations
            SET 
                statut_admin = 'rejected',
                date_modification = CURRENT_TIMESTAMP
            WHERE id_admin = $1
            RETURNING
                id_admin,
                nom_admin,
                role_admin,
                email_admin,
                statut_admin,
                actif
            `, [id]
        );
        if (result.rows[0].length === 0) {
            return res.status(404).json({
                message: "Admin introuvable"
            });
        }
        return res.json({
            message: "Admin rejeté avec succes",
            administrateur: result.rows[0]
        });
    } catch (error) {
        console.error("Erreur de refusion d'admin dans le backend", error);
        res.status(500).json({
            message: "Erreur dans le server"
        });
    }
};

const deleteADmin = async (req ,res) => {
    const {id} = req.params;
    try {
        await pool.query(`
            DELETE FROM administrations WHERE id_admin = $1`, [id]
        );
        res.json({
            message: "Suppresion d'admin reussit"
        });
    } catch (error) {
        console.error("Erreur de suppresion d'admin dans backend", error);
        res.status(500).json({
            message: "Erreur de serveur"
        });
    }
};

const getCategorie = async (req , res) => {
    try {
        const response = await pool.query("SELECT * FROM categories ORDER BY id_cat");
        return res.json(response.rows);
    } catch (error) {
        console.error("erreur de recuperation de categories", error);
        res.status(500).json({
            message: "Une erreur est survenue dans le serveur"
        });
    }
};

module.exports = { 
    getAdmin, 
    accepterAdmin, 
    refuserAdmin,
    deleteADmin,
    getCategorie
};