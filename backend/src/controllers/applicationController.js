const { error } = require("console");
const pool = require("../config/database");
const fs = require("fs").promises;
const path = require("path");

//get app 
const getApplication = async (req , res) => {
    try {
        const result = await pool.query(
            `SELECT 
                d.id_db,
                d.moteur_db,
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

            FROM application_database d
            INNER JOIN applications a
                ON a.id_app = d.id_app
            INNER JOIN categories c
                ON c.id_cat = a.id_cat
            `
        );
        return res.json(result.rows);
    } catch (error) {
        console.error("Erreur de recuperation d'application dans backend", error);
    }
};

//ajouter application

const ajouterApplication = async (req , res) => {
        
    try {
        const {
            id_cat,
            nom_app,
            nom_bouton_app,
            description_app,
            type_app,
            url_app,
            moteur_db
        } = req.body;

        
        if (
            !id_cat || !nom_app || !nom_bouton_app || !description_app || !type_app || !moteur_db
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
        if (req.files && req.files.icone_app && req.files.icone_app.length > 0) {
            icone_app = `uploads/applications/${req.files.icone_app[0].filename}`
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

        const resultApp = await pool.query(
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
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING id_app`
                ,
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

        const id_app = resultApp.rows[0].id_app;

        await pool.query(
            `INSERT INTO application_database(id_app, moteur_db)
                VALUES ($1, $2)
            `, [id_app, moteur_db || null]
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
        const workspace = path.join(
            process.cwd(),
            "workspaces",
            `app_${id}`
        );

        await fs.rm(workspace, {
            recursive: true,
            force: true
        });

        console.log("Workspace supprimé");

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
                console.log("icone supprimé:");
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
                d.id_db,
                d.moteur_db,
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

            FROM application_database d
            INNER JOIN applications a
                ON a.id_app = d.id_app
            INNER JOIN categories c
                ON c.id_cat = a.id_cat
            WHERE a.id_app = $1
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
    
    try {
        const {id} = req.params;
        const {
            id_cat,
            nom_app,
            nom_bouton_app,
            description_app,
            type_app,
            url_app,
            moteur_db
        } = req.body;

        const appExiste = await pool.query(`SELECT * 
             FROM applications WHERE id_app = $1`, [id]
        );

       
        if (appExiste.rows.length === 0) {
            return res.status(404).json({
                message: "Application introuvable"
            });
        }

        //TROUVER L'ID DB

        const resultDB = await pool.query(`
            SELECT id_db, id_app FROM application_database WHERE id_app = $1`, [id]
        );
        if (resultDB.rows.length === 0) {
            return res.status(404).json({
                message: "Aucune type de base correspond a cette app"
            });
        }
        const database = resultDB.rows[0];
        const id_db = database.id_db;

        const application = appExiste.rows[0];

        if (
            !id_cat ||
            !nom_app ||
            !nom_bouton_app ||
            !type_app ||
            !moteur_db
        ) {
            return res.status(400).json({
                message: "Tous les champs sont obligatoires"
            });
        }
        const nomAppExiste = await pool.query(`
            SELECT id_app FROM applications 
                WHERE nom_app = $1 AND id_app <> $2`, [nom_app, id]
        );
        if (nomAppExiste.rows.length > 0) {
            return res.status(409).json({
                message: `Le nom d'application ${nom_app} existe déja`
            });
        }
        const nomBoutonExiste = await pool.query(`
            SELECT id_app FROM applications 
                WHERE nom_bouton_app = $1 AND id_app <> $2`, [nom_bouton_app, id]
        );
        if (nomBoutonExiste.rows.length > 0) {
            return res.status(409).json({
                message: `Le nom de bouton ${nom_bouton_app} existe déja`
            });
        }

        let source_app = application.source_app;
        let icone_app = application.icone_app;

        if (req.files && req.files.fichier_app && req.files.fichier_app.length > 0) {
            source_app = req.files.fichier_app[0].path;
        }
        if (req.files && req.files.icone_app && req.files.icone_app.length > 0) {
            icone_app = `uploads/applications/${req.files.icone_app[0].filename}`;
        }

        if (type_app === "url") {
            source_app = null;
        }
        if (type_app === "docker" && !source_app) {
            return res.status(409).json({
                message :"Le fichier zip est obligatoire"
            });
        }

        const result = await pool.query(`
            UPDATE applications
                SET
                    id_cat = $1,
                    nom_app = $2,
                    nom_bouton_app = $3,
                    description_app = $4,
                    icone_app = $5,
                    type_app = $6,
                    url_app = $7,
                    source_app = $8,
                    date_modification = CURRENT_TIMESTAMP

                WHERE id_app = $9
                RETURNING *`,
            [
                id_cat,
                nom_app,
                nom_bouton_app,
                description_app,
                icone_app,
                type_app,
                type_app === "url"? url_app || null : null,
                source_app, 
                id
            ]
        );
        
        if (result) {
            await pool.query(
                `
                UPDATE application_database
                    SET id_app = $1, moteur_db = $2, date_modification = CURRENT_TIMESTAMP
                    WHERE id_db = $3
                    RETURNING *
                `,[
                    id,moteur_db,id_db
                ]
            )
        }

        if (application.source_app && application.source_app !== source_app) {
            

            try {
                await fs.unlink(application.source_app);
                console.log("Ancien zip supprimé");
            } catch (error) {
                if (error && error.code === "ENOENT") {
                    console.log("Ancien ZIP deja abscent");
                }else {
                    console.error("Erreur de suppression de l'ancien zip", error);
                }
            }
        }
         if (application.icone_app && application.icone_app !== icone_app) {
            
            try {
                await fs.unlink(application.icone_app);
                console.log("Ancien icone supprimé");
            } catch (error) {
                if (error && error.code === "ENOENT") {
                    console.log("Ancien icone deja abscent");
                }else {
                    console.error("Erreur de suppression de l'ancien icone", error);
                }
            }
        }

        return res.status(200).json({
            message: "Application modifé avec succès",
            application: result.rows[0]
        });

    } catch (error) {
        console.error("Erreur de modification d'application backend");
        res.status(500).json({
            message: "Erreur total dans le serveur"
        });
    }
};


module.exports = {
    ajouterApplication, 
    getApplication,
    deleteApp,
    getAppId,
    modifierApp
};