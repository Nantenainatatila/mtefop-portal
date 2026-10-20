const pool = require("../config/database");

//Get tous les étudiants

const getEtudiant = async(req , res) => {
    try {
        const result = await pool.query(
            `
                SELECT 
                    id_etudiant,
                    matricule,
                    nom_complet_etudiant,
                    TO_CHAR(date_naissance,
                    'YYYY-MM-DD') AS date_naisssance,
                    lieu_naissance,
                    photo_etudiant,
                    id_utilisateur
                    
                FROM etudiants
                ORDER BY id_etudiant
            `
        );
        res.json(result.rows);
    } catch (error) {
        console.error("erreur de recuperation touts etudiants", error);
        res.status(500).json({
            message: "erreur de serveur"
        });
    }
};

//get un etudiant par son id

const getEtudiantById = async (req , res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            `
            SELECT 
                id_etudiant,
                matricule,
                nom_complet_etudiant,
                TO_CHAR(date_naissance,'YYYY-MM-DD') AS date_naissance,
                lieu_naissance,
                photo_etudiant,
                id_utilisateur
            FROM etudiants
            WHERE id_etudiant = $1 
            `,
            [ id ]  

        );
        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Etudiant introuvable"
            });
        }
        res.json(result.rows[0]);

    } catch (error) {
        console.error("Erreur de recupration de l'etudiant par son id", error);
        res.status(500).json({
            message: "Erreur de serveur"
        });
    }
};

//Post creer un étudiant

const createEtudiant = async (req , res) => {
     try {
        const {
            nom_complet_etudiant, 
            date_naissance,
            lieu_naissance,
            photo_etudiant
        } = req.body;

        if(!nom_complet_etudiant || !date_naissance || !lieu_naissance) {
            return res.status(400).json({
                message: "le  nom, date et lieu de naissance sont obligatoire"
            });
        }
        const result = await pool.query(
            `
            INSERT INTO etudiants (
                nom_complet_etudiant,
                date_naissance,
                lieu_naissance,
                photo_etudiant) 
            VALUES ($1, $2, $3, $4)
            RETURNING *
            `, 
            [
                nom_complet_etudiant,
                date_naissance,
                lieu_naissance,
                photo_etudiant || null
            ]
        );
        res.status(201).json({
            message: "Étudiant créé avec succès",
            etudiant: result.rows[0]
        });
     } catch (error) {
        console.error("Erreur de l'insersion des l'étudiant", error);
        res.status(500).json({
            message: "Erreur de serveur"
        });
     }
};

//UPDATE POUR ETUDIANT

const updateEtudiant = async (req , res) => {
    try {
        const { id } = req.params;
        const {
            nom_complet_etudiant,
            date_naissance,
            lieu_naissance,
            photo_etudiant
        } = req.body;

        const result = await pool.query(
            `UPDATE etudiants
            SET
                nom_complet_etudiant = $1,
                date_naissance = $2,
                lieu_naissance = $3,
                photo_etudiant = $4
                

            WHERE id_etudiant = $5
            RETURNING *
            `, 
            [
                nom_complet_etudiant,
                date_naissance,
                lieu_naissance,
                photo_etudiant || null,
                id
            ]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Étudiant introuvable"
            });
        }
        res.json({
            message: "Etudiant modifié avec succès",
            etudiant: result.rows[0]
        });
    } catch (error) {
        console.error("Erreur de modification d'étudiant", error);
        res.status(500).json({
            message: "Erreur de serveur"
        });
    }
};


//SUPRESSION D'ETUDIANT
const deleteEtudiant = async (req , res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            `
            DELETE FROM etudiants
            WHERE id_etudiant = $1
            RETURNING *
            `, 
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Etudiant introuvable"
            });
        }
        res.json({
            message: "Etudiant supprimé avec succes"
        });
    } catch(error) {
        console.error("Erreur de suppression d'etudiant", error);
        res.status(500).json({
            message: "Erreur de serveur"
        });
    }
};




module.exports = {getEtudiant, getEtudiantById, createEtudiant, updateEtudiant, deleteEtudiant};

