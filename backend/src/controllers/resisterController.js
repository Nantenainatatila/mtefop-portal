const bycript = require("bcrypt");

const pool  = require("../config/database");

const register = async (req , res) => {
    try {
        const { 
            nom_admin, email_admin, password_admin
        } = req.body;

        if (!nom_admin || !email_admin || !password_admin ) {
            return res.status(401).json({
                message: "Tous les champs sont obligatoires"
            });
        }

        const emailExiste = await pool.query(
            `SELECT id_admin FROM administrations WHERE email_admin = $1`, [email_admin]
        );
       
        

        if (emailExiste.rows.length > 0) {
            return res.status(409).json({
                message: "Cet email existe deja"
            });
        }

        const motDePassHash = await bycript.hash(
            password_admin,
            10
        );
        
        await pool.query(  
            `INSERT INTO administrations(
                    nom_admin, email_admin, password_admin
                )
            VALUES ($1, $2, $3)`, [
                    nom_admin, email_admin, motDePassHash 
                ]
        );
        res.status(201).json({
            message: "Demande envoyé, veuiller attendre que le super-admin accepte votre demande avant de se connecter",
        });
    } catch (error) {
        console.log("erreur dans la creation de compte");
        res.status(404).json({
            message: "Erreur total dans le server"
        });
    }
};

module.exports = {register};