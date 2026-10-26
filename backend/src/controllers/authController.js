const bycript = require("bcrypt");
const jwt = require("jsonwebtoken");

const pool = require("../config/database");

const login = async (req , res) => {
    try {
        const { email_admin, password_admin } = req.body;

        if(!email_admin || !password_admin) {
            return res.status(400).json({
                message: "L'adresse email et le mot de passe sont obligatoire"
            });
        }

        const result = await pool.query(
            `
                SELECT 
                    id_admin,
                    nom_admin,
                    email_admin,
                    password_admin,
                    role_admin,
                    statut_admin,
                    actif
                FROM administrations
                WHERE email_admin = $1
            `,
            [email_admin]
        );

        if(result.rows.length === 0 ) {
            return res.status(402).json({
                message: "Email incorrect"
            });
        }

        const admin = result.rows[0];

        //comparer le mot passe
        const passwordCorrect = await bycript.compare(
            password_admin,
            admin.password_admin
        );
        

        if (!passwordCorrect) {
            return res.status(402).json({
                message: "Mot de passe incorrect"
            });

        }
       
        //verifier que le compte actif
        if (admin.statut_admin === "rejected") {
            return res.status(403).json({
                message: "Desole, votre compte a été refusé"
            });
        } else if (admin.statut_admin === "pending") {
            return res.status(403).json({
                message: "Desole, votre compte est en attente"
            });
        } else if (admin.statut_admin === "desabled") {
            return res.status(403).json({
                message: "Desole, votre compte a éé desactivé"
            });
        }

        //construction de token
        const token = jwt.sign(
            {
                id_admin: admin.id_admin,
                email_admin: admin.email_admin,
                role_admin: admin.role_admin
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "7d"
            }
        );

         
        //utilisateur
        const utilisateur = {
            id_admin: admin.id_admin,
            nom_admin: admin.nom_admin,
            email_admin: admin.email_admin,
            role_admin: admin.role_admin,
            statut_admin: admin.statut_admin,
            actif: admin.actif
        };
        
        return res.status(200).json({
            message: "connexion ok",
            token,
            utilisateur
        });

        
    } catch (error) {
        console.error("erreur login", error);
        res.status(404).json({
            message: "Erreur total du serveur"
        });
    } 
};

module.exports = {login};