const pool = require("../config/database");

//CREATION DE PRE-INSCRIPTION

const createAvantInscription = async (req , res) => {
    try {
        const {
            nom_complet_etudiant_avant,
            id_mention,
            id_niveau,
            numero_whatsapp
        } = req.body;

        if(!nom_complet_etudiant_avant || !id_mention || !id_niveau || !numero_whatsapp) {
            return res.status(400).json({
                message:"Tous  les champs sont obligatoires"
            });
        }
        const result = await pool.query(
            `INSERT INTO 
                avants_inscriptions(nom_complet_etudiant_avant, id_mention, id_niveau, numero_whatsapp)
            VALUES($1, $2, $3, $4)
            RETURNING *
            `,
            [
                nom_complet_etudiant_avant, id_mention, id_niveau, numero_whatsapp
            ]
        );
        res.status(201).json({
            message: "Pre-inscription cree avec succes",
            avant_inscripion: result.rows[0]
        });

       
    } catch (error) {
        console.error("Erreur de la creation de pre-inscription", error),
        res.status(500).json({
            message: "Erreur serveur"
        });
    }
};

//Get de preinscription

const getAvantInscription = async (req , res) => {
    try {
        const result = await pool.query(
            `
            SELECT 
                a.id_avant_inscription,
                a.nom_complet_etudiant_avant,
                a.numero_whatsapp,
                a.date_demande,
                a.statut,
                a.id_mention,
                m.nom_mention,
                a.id_niveau,
                n.nom_niveau
            FROM avants_inscriptions a
            JOIN mentions m
                ON a.id_mention = m.id_mention
            JOIN niveaux n
                ON a.id_niveau = n.id_niveau
            ORDER BY a.id_avant_inscription DESC
            `
        );
       
        res.json(result.rows[0]);

    } catch (error) {
        console.error("Erreur de recuperation de pre-inscription", error),
        res.status(500).json({
            message: "Erreur de serveur"
        });
    }
};


//Get par ID de pre-inscription

const getAvantInscriptionId = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            `
            SELECT 
                a.id_avant_inscription,
                a.nom_complet_etudiant_avant,
                a.numero_whatsapp,
                a.date_demande,
                a.statut,
                a.id_mention,
                m.nom_mention,
                a.id_niveau,
                n.nom_niveau
            FROM avants_inscriptions a
            JOIN mentions m
                ON a.id_mention = m.id_mention
            JOIN niveaux n
                ON a.id_niveau = n.id_niveau
            WHERE a.id_avant_inscription = $1
            `, [id]
        );
         if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Pre-inscription introuvable"
            });
        }
        res.json(result.rows);
    } catch (error) {
        console.error("Erreur de recuperation de pre-inscription par id", error),
        res.status(500).json({
            message: "Erreur de serveur"
        });
    }
};

//PUT VALIDATION
const validerAvantInscription = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            `UPDATE avants_inscriptions
             SET statut = 'validee'
             WHERE id_avant_inscription = $1
             AND statut = 'en_attente'
             RETURNING *`,
             [id]
        );
        if(result.rows.length === 0) {
            return res.status(404).json({
                message: "Pre-inscription introuvale"
            });
        }

        res.json({
            message: "Pre-inscription validée avec succes",
            avant_inscripion: result.rows[0]
        });
    } catch (error) {
        console.error("Erreur de validation de pre-inscription", error);
        res.status(500).json({
            message: "Erreur de serveur"
        });
    }
};

//PUT REFUSE

const refuseeAvantInscription = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            `UPDATE avants_inscriptions
             SET statut = 'refusee'
             WHERE id_avant_inscription = $1
             AND statut = 'en_attente'
             RETURNING *`,
             [id]
        );
        if(result.rows.length === 0) {
            return res.status(404).json({
                message: "Pre-inscription introuvale"
            });
        }

        res.json({
            message: "Pre-inscription refusée avec succes",
            avant_inscripion: result.rows[0]
        });
    } catch (error) {
        console.error("Erreur de refusion de pre-inscription", error);
        res.status(500).json({
            message: "Erreur de serveur"
        });
    }
};


module.exports = {
    createAvantInscription, 
    getAvantInscription, 
    getAvantInscriptionId, 
    validerAvantInscription,
    refuseeAvantInscription
};