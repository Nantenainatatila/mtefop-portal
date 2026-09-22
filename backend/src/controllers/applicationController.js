const pool = require("../config/database");
const fs = require("fs").promises;

//get app 
const getApplication = async (req , res) => {
    try {
        const result = await pool.query(
            `SELECT 
                a.id_app,
                a.id_cat,
                a.nom_app,
                a.nom_bouton_app,
                a.type_app,
                a.statut_app,
                a.url_app,
                a.source_app,
                a.description_app,
                a.icone_app,
                c.id_cat,
                c.nom_cat
            FROM applications a
            INNER JOIN categories c
                ON c.id_cat = a.id_cat
            `
        );
        return res.json(result.rows);
    } catch (error) {
        console.error("Erreur de recuperation d'application dans backend", error);
    }
};

//ajjouter application

const ajouterApplication = async (req , res) => {
        
    try {
        const {
            id_cat,
            nom_app,
            nom_bouton_app,
            description_app,
            type_app,
            url_app
        } = req.body;

        
        if (
            !id_cat || !nom_app || !nom_bouton_app || !description_app || !type_app
        ) {
            return res.status(400).json({
                message: "Tous les champs sont obligatoires"
            });
        }
        //recuperation de source

        let source_app = null;
        if (type_app === "docker") {
            if (!req.files || !req.files.fichier_app) {
                return res.status(400).json({
                    message: "Le fichier zip est obligatoire"
                });
            }
            source_app = req.files
                .fichier_app[0]
                .path;
        }

        //recuperation de icone

        let icone_app = null;
        if (req.files && req.files.icone_app) {
            icone_app = req.files
                .icone_app[0]
                .path;
        }


        const exiteNomApp = await pool.query(`SELECT id_app, nom_app FROM 
            applications WHERE nom_app = $1 `, [nom_app]);
        
        const exiteNomBoutonApp = await pool.query(`SELECT id_app, nom_bouton_app FROM 
            applications WHERE  nom_bouton_app = $1`, [nom_bouton_app]);
        
        
        if (exiteNomApp.rows.length > 0) {
            return res.status(409).json({
                message: `Le nom d'application ${nom_app} existe déja`
            });
        }

        if (exiteNomBoutonApp.rows.length > 0) {
            return res.status(409).json({
                message: `Le nom de bouton ${nom_bouton_app} existe déja`
            });
        }

        await pool.query(
            `INSERT 
                INTO applications (
                    id_cat,
                    nom_app,
                    nom_bouton_app,
                    description_app,
                    icone_app,
                    type_app,
                    url_app,
                    source_app
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [
                    Number(id_cat),
                    nom_app,
                    nom_bouton_app,
                    description_app, 
                    icone_app, 
                    type_app, 
                    url_app || null, 
                    source_app
                ]
        );

        res.status(201).json({
            message: "Application enregistré"
        });
    } catch (error) {
        console.error("Erreur d'enregistrement d'application backend", error);
        res.status(404).json({
            message: "Erreur dans le serveur"
        });
    }
};


//supprimer Application
const deleteApp = async(req, res) => {
    try {
        const {id} = req.params;

        const application = await pool.query(
            `SELECT 
                id_app,
                nom_app,
                source_app,
                icone_app
            FROM applications
            WHERE id_app = $1`, [id] 
        );
        if (application.rows.length === 0) {
            res.status(404).json({
                message: "Application introuvable"
            });
        }

        const app = application.rows[0];
        console.log("app à supprimer:", app);
        await pool.query("DELETE FROM applications WHERE id_app = $1", [id]);
        
        if (app.source_app) {
            try {
                await fs.unlink(app.source_app);
                console.log("zip supprimé:", app.source_app);
            } catch (error) {
                if (error.code === "ENOENT") {
                    console.log(

                        "ZIP deja abscent", app.source_app
                    );
                } else {
                    console.error("erreur de suppression de zip", error),
                    error.message
                };
            }
        }
        if (app.icone_app) {
            try {
                await fs.unlink(app.icone_app);
                console.log("icone supprimé:", app.icone_app);
            } catch (error) {
                if (error.code === "ENOENT") {
                    console.error("Fichier image abscent");
                } else {
                    console.error("erreur de suppression de icone"),
                    error.message
                }
            }
            
        } 
        res.json({
            message: `Suppression de id ${id} ok`
        });
   
    } catch (error) {
        console.error("erreur de suppression d'application", error);
        return res.status(500).json({
            message: "Erreru interne du serveur"
        });
    }
     
};

//get par ID application

const getAppId = async (req, res) => {
    const {id} = req.params;

    try {
        const response = await pool.query(`
                SELECT 
                a.id_app,
                a.id_cat,
                a.nom_app,
                a.nom_bouton_app,
                a.type_app,
                a.statut_app,
                a.url_app,
                a.source_app,
                a.description_app,
                a.icone_app,
                c.id_cat,
                c.nom_cat
            FROM applications a
            INNER JOIN categories c
                ON c.id_cat = a.id_cat
            WHERE id_app = $1
            `, [id]
        );
        if (response.rows.length === 0) {
            return res.status(404).json({
                message:"Id Introuvable"
            });
        }

        res.json({
            message: "trouvé",
            donnee: response.rows[0]
        });
        
    } catch (error) {
        console.error("Erreur de recuperation de app par son id", error);
    }
};

//Modification d'aaplication
const modifierApp = async (req, res) => {
    console.log("FILES:", req.files);
    res.json({
        message: `Files: ${req.files}`
    });
};


module.exports = {
    ajouterApplication, 
    getApplication,
    deleteApp,
    getAppId,
    modifierApp
};