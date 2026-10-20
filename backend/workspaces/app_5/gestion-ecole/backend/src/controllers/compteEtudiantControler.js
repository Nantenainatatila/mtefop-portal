const pool = require("../config/database");
const bcrypt = require("bcryptjs");

const creerCompteEtudiant = async(req , res) => {
    const client = await pool.connect();
    try {
        const {
            id_avant_inscription,
            date_naissance,
            lieu_naissance,
            photo_etudiant,
            email,
            mot_de_passe
        } = req.body;

        //Verifier les champs
        if(
            !id_avant_inscription ||
            !date_naissance ||
            !lieu_naissance ||
            !email ||
            !mot_de_passe 
        ) {
            return res.status(400).json({
                message: "Tous les champs sont obligatoires"
            });
        }
        await  client.query("BEGIN");
        //RECUPERER LA PRE-INSCRIPTION
        const avantResult = await client.query(
            `SELECT * FROM avants_inscriptions
                WHERE id_avant_inscription = $1
            `,
            [id_avant_inscription]
        );
        if (avantResult.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({
                message:"Pre-inscription introuvlae"
            });
        }
        const avant = avantResult.rows[0];
        //Verifie que les preinscription est validée
        if (avant.statut !== 'validee') {
            await client.query("ROLLBACK");
            return res.status(400).json({
                message: "Cette pre-incription n'est pas validée. Creation de compte impossible"
            });
        }
        
        //verifier si l'email existe deja
        const emailResult = await client.query(
            `SELECT id_utilisateur FROM utilisateurs WHERE email = $1`, [email]
        );
        if (emailResult.rows.length > 0) {
            await client.query("ROLLBACK");
            return res.status(409).json({
                message: "cet email est deja utilisé"
            });
        }
        //Recuperer le role Etudiant

        const roleResult = await client.query(
            `
            SELECT id_role FROM roles WHERE LOWER(nom_role) = LOWER('ETUDIANT')`
        );
        if (roleResult.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(500).json({
                message: "Le role ETUDIANT n'existe pas dans la base"
            });
        }

        const id_role = roleResult.rows[0].id_role;

        //Hacher le mot de passe
        const motDePasseHash = await bcrypt.hash(mot_de_passe, 10);

        //CRETION D'ETUDIANT
        const etudiantResult = await client.query(
            `INSERT INTO etudiants(
                nom_complet_etudiant,
                date_naissance,
                lieu_naissance,
                photo_etudiant
                )
            VALUES($1, $2, $3, $4)
            RETURNING *`,
            [
                avant.nom_complet_etudiant_avant,
                date_naissance,
                lieu_naissance,
                photo_etudiant || null
            ]
        );
        const etudiant = etudiantResult.rows[0];

        //CREATION D'UTILISATEU
        const utilisateurResult = await client.query(
            `INSERT INTO utilisateurs (
                nom_complet_utilisateur,
                mot_de_passe,
                id_role,
                email
                )
            VALUES ($1, $2, $3, $4)
            RETURNING id_utilisateur, 
                nom_complet_utilisateur,
                id_role,
                email
            `, 
            [
                avant.nom_complet_etudiant_avant,
                motDePasseHash,
                id_role,
                email
            ]
        );
        const utilisateur = utilisateurResult.rows[0];

        //Relier l'etudiant a son role

        await client.query(
            `
            UPDATE etudiants 
            SET id_utilisateur = $1,
                updated_at = CURRENT_TIMESTAMP
                WHERE id_etudiant = $2`,
                [
                    utilisateur.id_utilisateur,
                    etudiant.id_etudiant
                ]
        );
        
        //Marque la pre-inscription
        await client.query(
            `UPDATE avants_inscriptions
            SET statut = 'compte_cree'
            WHERE id_avant_inscription = $1
            `,
            [id_avant_inscription]
        );

        //VALIDER TOUS LES TRANSACTION
        await client.query("COMMIT");

        res.status(201).json({
            message: "Compte etudiant crée avec succès",
            etudiant: {
                id_etudiant:etudiant.id_etudiant,
                matricule: etudiant.matricule,
                nom_complet_etudiant: etudiant.nom_complet_etudiant,
                date_naissance: etudiant.date_naissance,
                lieu_naissance: etudiant.lieu_naissance,
                photo_etudiant: etudiant.photo_etudiant
            },
            utilisateur: {
                id_utilisateur: utilisateur.id_utilisateur,
                nom_complet_utilisateur: utilisateur.nom_complet_utilisateur,
                email: utilisateur.email,
                id_role: utilisateur.id_role
            }
        });

    } catch (error) {
        await client.query("ROLLBACK");
        console.error("eRREUR DE CREATION DE COMPTE ÉTUDIANT", error);
        res.status(500).json({
            message: "Erreur serveur lors de creation de compte"
        });
    } finally {
        client.release();
    }
};

module.exports = {creerCompteEtudiant};