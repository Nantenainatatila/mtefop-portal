const {
    obtenirAppPourDeploiement,
    preparerApplication,
    trouveRacineProjet,
    detecterTechnologie
} = require("../services/deploiementService");

const docker = require("../config/docker");
const  pool  = require("../config/database");
const {
    deployerApplication
} = require("../services/dockerService");

const {
    initialiserBaseDeDonnees
} = require("../services/databaseService");
 
const recupererApp = async (req, res) => {

   const io = req.app.get("io");
    const { id, idAdmin } = req.params;
    try {
        
        if (!id) {
            return res.status(400).json({
                message: "L'identifiant de l'application est obligatoire"
            });
        }
         if (!idAdmin) {
            return res.status(400).json({
                message: "L'identifiant de l'admin est obligatoire"
            });
        }

        console.log("==========================");
        console.log("DEBUT DU DEPLOIEMENT APPLICATION");

        const deploiementExiste = await pool.query(
            `SELECT id_app,id_deploie FROM deploiements WHERE id_app = $1`, [id]
        );
        
        if (deploiementExiste.rows.length > 0) {
            await pool.query(`UPDATE deploiements SET id_admin = $1 WHERE id_app = $2`, [idAdmin, id]);
            console.log("deploiement déjà existe, mise à jour");
        } else {
            await pool.query(
                `INSERT INTO deploiements(
                    id_app,
                    id_admin
                )
                    VALUES ($1,$2)
                `, 
                [
                    id,
                    idAdmin,
                ]
            );
            console.log("Insertion dans la table deploiements ok");
        }
        
        // 1. RÉCUPÉRER L'APPLICATION
        const application = await obtenirAppPourDeploiement(io, id);
        console.log("Application trouvée");

        console.log("moteur DB:", application.moteur_db);

        // 2. EXTRACTION DU ZIP
        console.log("Début d'extraction");
        const preparation = await preparerApplication(io, application);
        console.log("Extraction terminée");

        // 3. RACINE DU PROJET
        const projectRoot = await trouveRacineProjet(preparation.workspace);
        console.log("Racine du projet:", projectRoot);

        // 4. DÉTECTION DES TECHNOLOGIES
        console.log("Détection des technologies");


        const detection = await detecterTechnologie(
            io,
            projectRoot,
            application.moteur_db
        );
        console.log("Détection terminée");

        console.log("Type de projet:", detection.desciption);
        console.log("Frontend:", detection.frontend?.technologie || "aucune");

        console.log("Backend:", detection.backend?.technologie || "aucune");


        console.log("Database:", detection.database?.moteur || "aucune");

        // 5. INITIALISER LA BASE DE DONNÉES (le conteneur doit exister avant le déploiement)

        let databaseResult = null;

        if (application.moteur_db && application.moteur_db !== "aucune") {


            databaseResult = await initialiserBaseDeDonnees(
                io,
                application,
                detection.database
            );
            console.log("Base de données initialisée");
        }

        // 6. DÉPLOIEMENT : Dockerfiles -> images -> réseau -> conteneurs -> URL
        
        let baseDeDonnees = null;
        if (databaseResult) {
            console.log(
                "Champs renvoyés par initialiserBaseDeDonnees:",
                Object.keys(databaseResult)
            );
 
            baseDeDonnees = {
                moteur: application.moteur_db, // "postgresql" | "mysql" | "mariadb"
                conteneur: databaseResult.container_name,
                nom: databaseResult.nom_db,
                utilisateur:
                    databaseResult.utilisateur ??
                    databaseResult.user_db ??
                    databaseResult.db_user ??
                    databaseResult.user ??
                    databaseResult.username,
                motDePasse:
                    databaseResult.mot_de_passe ??
                    databaseResult.password_db ??
                    databaseResult.db_password ??
                    databaseResult.password
            };
        }


        const deploiement = await deployerApplication({
            io,
            idApp: application.id_app,
            projectRoot,
            detection,
            baseDeDonnees
        });

        const resultApp = await pool.query(
            `
            UPDATE 
                applications 
            SET 
                url_publique_app = $1,
                visible_app = true,
                statut_app = 'online',
                frontend_technologie_app = $2,
                backend_technologie_app = $3,
                version_app = '1.0',
                port_app = $4,
                message_statut_app = 'Deploiement reussit',
                date_dernier_deploiement = CURRENT_TIMESTAMP

            WHERE id_app = $5
            `,
            [
                deploiement.url || null,
                detection.frontend?.technologie || null,
                detection.backend?.technologie || null,
                deploiement.port || null,
                id
            ]
        );
        if (resultApp.rowCount === 0) {
            return res.status(500).json({
                message: "Erreur de mise à jour de la table application"
            });
        }
        console.log("Table application mis à jour");
        
        const resultDeploiement = await pool.query(
            `
                UPDATE 
                    deploiements
                SET
                    id_admin = $1,
                    url_publique_deploie = $2,
                    type_projet_deploie = $3,
                    frontend_technologie_deploie = $4,
                    backend_technologie_deploie = $5,
                    moteur_db_deploie = $6,
                    statut_deploie = 'success',
                    message_deploie = 'Deploiement terminé'

                WHERE id_app = $7
            `, [
                idAdmin,
                deploiement.url,
                detection.desciption, 
                detection.frontend?.technologie,
                detection.backend?.technologie || null,
                application.moteur_db,
                id
            ]
        );

        if (resultDeploiement.rowCount === 0) {
            return res.status(500).json({
                message: "Id deploiement introuvable"
            });
        }
        console.log("Table deploiement mis à jour");

        console.log("Application déployée :", deploiement.url);

        // 7. RÉPONSE
        return res.json({
            message: "Déploiement terminé avec succès",
            application: {
                id_app: application.id_app,
                nom_app: application.nom_app,
                moteur_db: application.moteur_db
            },
            projet: {
                type: detection.desciption,
                frontend: detection.frontend
                    ? {
                          technologie: detection.frontend.technologie,
                          fichier_detecte: detection.frontend.fichier_detecte
                      }
                    : null,
                backend: detection.backend
                    ? {
                          technologie: detection.backend.technologie,
                          fichier_detecte: detection.backend.fichier_detecte
                      }
                    : null,
                database: detection.database
                    ? {
                          moteur: detection.database.moteur,
                          type_fichier: detection.database.type_fichier,
                          fichier: detection.database.fichier
                      }
                    : null
            },
            deploiement: {
                url: deploiement.url,
                port: deploiement.port,
                reseau: deploiement.reseau,
                conteneurs: deploiement.conteneurs
            },
            containerDatabase: databaseResult
                ? {
                      container: databaseResult.container_name,
                      base: databaseResult.nom_db
                  }
                : null
        });
    } catch (error) {
        console.error("Erreur pour le déploiement", error);

        await pool.query(`
            UPDATE applications SET 
                message_statut_app = $1,
                statut_app = 'error',
                url_publique_app = $2
            WHERE id_app = $3`, 
            [
                error.message || "Erreur inconue",
                null,
                id
            ]
        );
        await pool.query(`
            UPDATE deploiements SET
                erreur_deploie = $1,
                statut_deploie = $2,
                message_deploie = $3,
                url_publique_deploie = $4

            WHERE id_app = $5
                `, [
                    error.message || "Erreur inconue",
                    'failed',
                    error.message || 'Erreur inconnue',
                    null,
                    id
                ]
        );
        console.log("Les tables sont mis à jour pour les erreurs");

        return res.status(500).json({
            message: error.message
        });
    }
};

const recupererDeploiement = async (req, res) => {
    const {id} = req.params;
     if (!id) {
            return res.status(400).json({
                message: "L'identifiant de deploiement est obligatoire"
            });
        }
    try {
        const result = await pool.query(
            `
            SELECT 
                id_app,
                id_admin,
                image_frontend_deploie,
                image_backend_deploie,
                container_frontend_deploie,
                container_backend_deploie,
                reseau_deploie,
                port_frontend_deploie,
                port_backend_deploie,
                url_publique_deploie,
                type_projet_deploie,
                frontend_technologie_deploie,
                backend_technologie_deploie,
                moteur_db_deploie,
                erreur_deploie,
                statut_deploie,
                message_deploie,
                date_creation 
            FROM deploiements
            WHERE id_app = $1 
            
            `, [id]
        );
        if (result.rows.length === 0) {
            return res.json({
                message: "Aucun deploieement non trouvée pour cette app"
            });
        } else {
            return res.json(result.rows[0]);
        }
    } catch (error) {
        console.log("Erreur de recuperation de deploiements backend", error);
        res.status(500).json({
            message: "Erreur de recuperation de données des deploiements backend"
        });
    }
};

//RECUPERER LES DEPLOIEMENTS SEULEMENT EN SUCCES
const recupererDeploiementSuccess = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                d.id_deploie,
                d.id_admin,
                d.id_app,
                d.image_backend_deploie,
                d.image_frontend_deploie,
                d.container_frontend_deploie,
                d.container_backend_deploie,
                d.reseau_deploie,
                d.port_frontend_deploie,
                d.port_backend_deploie,
                d.url_publique_deploie,
                d.type_projet_deploie,
                d.frontend_technologie_deploie,
                d.backend_technologie_deploie,
                d.moteur_db_deploie,
                d.erreur_deploie,
                d.statut_deploie,
                d.message_deploie,
                d.date_creation,

                ad.id_admin,
                ad.nom_admin,

                a.id_app,
                a.id_cat,
                a.id_des,
                a.nom_app,
                a.nom_bouton_app,
                a.description_app,
                a.icone_app,
                a.type_app,
                a.source_app,
                
                c.nom_cat,
                c.id_cat,
                des.id_des,
                des.nom_des


            FROM deploiements d
            INNER JOIN applications a
                ON a.id_app = d.id_app
            INNER JOIN administrations ad
                ON ad.id_admin = d.id_admin

            INNER JOIN categories c
                ON c.id_cat = a.id_cat

            INNER JOIN destinations des
                ON des.id_des = a.id_des

            WHERE d.statut_deploie = $1 
                `, ['success']
        );
        return res.json(result.rows);

    } catch (error) {
        console.log("Erreur de recuperation de deploiement en succes", error);
        return res.status(500).json({
            message: "Erreur de recuperation de deploiement en succès"
        });
    }
};

//RECUPERER LES DEPLOIEMENTS SEULEMENT EN SUCCES
const recupererDeploiementFailed = async (req, res) => {
   
    try {
        const result = await pool.query(`
            SELECT
                d.id_deploie,
                d.id_admin,
                d.id_app,
                d.image_backend_deploie,
                d.image_frontend_deploie,
                d.container_frontend_deploie,
                d.container_backend_deploie,
                d.reseau_deploie,
                d.port_frontend_deploie,
                d.port_backend_deploie,
                d.url_publique_deploie,
                d.type_projet_deploie,
                d.frontend_technologie_deploie,
                d.backend_technologie_deploie,
                d.moteur_db_deploie,
                d.erreur_deploie,
                d.statut_deploie,
                d.message_deploie,
                d.date_creation,

                ad.id_admin,
                ad.nom_admin,

                a.id_app,
                a.id_cat,
                a.id_des,
                a.nom_app,
                a.nom_bouton_app,
                a.description_app,
                a.icone_app,
                a.type_app,
                a.source_app,
                
                c.nom_cat,
                c.id_cat,
                des.id_des,
                des.nom_des


            FROM deploiements d
            INNER JOIN applications a
                ON a.id_app = d.id_app
            INNER JOIN administrations ad
                ON ad.id_admin = d.id_admin

            INNER JOIN categories c
                ON c.id_cat = a.id_cat

            INNER JOIN destinations des
                ON des.id_des = a.id_des
                
            WHERE d.statut_deploie = $1
                `, ['failed']
        );
        if (result.rows.length === 0) {
            return res.status(409).json({
                message: "Aucun deploiement failed"
            });
        }
        return res.json(result.rows);
        

    } catch (error) {
        console.log("Erreur de recuperation de deploiement en erreur", error);
        return res.status(500).json({
            message: "Erreur de recuperation de deploiement en erreur"
        });
    }
};

// suppression de deploiemùents

//supprimer Application
const deleteDeploie = async(req, res) => {
    try {
        const {id} = req.params;
        console.log("id:", id);
        const deploiement = await pool.query(
            `SELECT 
                id_deploie
            FROM deploiements
            WHERE id_deploie = $1`, [id] 
        );
        if (deploiement.rows.length === 0) {
            res.status(404).json({
                message: "Deploiements introuvable"
            });
        }

        const deploie = deploiement.rows[0];
        console.log("deploiements à supprimer:", deploie);
        await pool.query("DELETE FROM deploiements WHERE id_deploie = $1", [id]);
        
        res.json({
            message: `Suppression de id ${id} ok`
        });
   
    } catch (error) {
        console.error("erreur de suppression de deploiement", error);
        return res.status(500).json({
            message: "Erreur interne du serveur"
        });
    }
     
};
module.exports = { 
    recupererApp,
    recupererDeploiement ,
    recupererDeploiementSuccess,
    recupererDeploiementFailed,
    deleteDeploie
};