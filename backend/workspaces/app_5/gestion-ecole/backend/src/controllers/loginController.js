const pool = require("../config/database");

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const login = async(req , res) => {
    try {
        const {
            email,
            mot_de_passe
        } = req.body;

        if (!email || !mot_de_passe) {
            return res.status(400).json({
                message: "Tous les champs sont obligatoires"
            });
        }
        const result = await pool.query(
            `
                SELECT 
                    u.id_utilisateur,
                    u.nom_complet_utilisateur,
                    u.mot_de_passe,
                    u.email,
                    r.id_role,
                    r.nom_role,
                    e.id_etudiant,
                    e.matricule,
                    e.date_naissance,
                    e.lieu_naissance,
                    e.photo_etudiant
                FROM utilisateurs u
                JOIN roles r
                    ON u.id_role = r.id_role
                LEFT JOIN etudiants e
                    ON e.id_utilisateur = u.id_utilisateur
                WHERE u.email = $1
            `,
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                message: "Email incorrect"
            });
        }
        const utilisateur = result.rows[0];

        //verification de mot de passe
        const motDePasseCorrect = await bcrypt.compare(
            mot_de_passe,
            utilisateur.mot_de_passe
        );
        if(!motDePasseCorrect) {
            return res.status(401).json({
                message: "Mot de passe incorrect"
            })
        }

        //TPKEN
        const token = jwt.sign(
            {
                id_utilisateur: utilisateur.id_utilisateur,
                id_role: utilisateur.id_role,
                email: utilisateur.email
            },
            process.env.JWT_SECRET,
            {
                expiresIn:"1d"
            }
        );
        res.json({
            message: "Connexion reussi",
            token,
            utilisateur: {
                id_utilisateur: utilisateur.id_utilisateur,
                nom_complet: utilisateur.nom_complet_utilisateur,
                email: utilisateur.email,
                id_role: utilisateur.id_role,
                nom_role: utilisateur.nom_role,
                id_etudiant: utilisateur.id_etudiant,
                matricule: utilisateur.matricule,
                date_naissance: utilisateur.date_naissance,
                lieu_naissance: utilisateur.lieu_naissance,
                photo_etudiant: utilisateur.photo_etudiant
            }
        });
    } catch (error) {
        console.error("Erreur de login", error);
        res.status(500).json({
            message: "Erreur de serveur dans login"
        });
    }
};

module.exports = {login};