const {
    obtenirAppPourDeploiement,
    preparerApplication,
    trouveRacineProjet,
    detecterTechnologie
} = require("../services/deploiementService");

const {
    deployerApplication
} = require("../services/dockerService");

const {
    initialiserBaseDeDonnees
} = require("../services/databaseService");

const recupererApp = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({
                message: "L'identifiant de l'application est obligatoire"
            });
        }

        console.log("==========================");
        console.log("DEBUT DU DEPLOIEMENT APPLICATION");

        // 1. RÉCUPÉRER L'APPLICATION
        const application = await obtenirAppPourDeploiement(id);
        console.log("Application trouvée");
        console.log("moteur DB:", application.moteur_db);

        // 2. EXTRACTION DU ZIP
        console.log("Début d'extraction");
        const preparation = await preparerApplication(application);
        console.log("Extraction terminée");

        // 3. RACINE DU PROJET
        const projectRoot = await trouveRacineProjet(preparation.workspace);
        console.log("Racine du projet:", projectRoot);

        // 4. DÉTECTION DES TECHNOLOGIES
        console.log("Détection des technologies");
        const detection = await detecterTechnologie(
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
                application,
                detection.database
            );
            console.log("Base de données initialisée");
        }

        // 6. DÉPLOIEMENT : Dockerfiles -> images -> réseau -> conteneurs -> URL
        //
        // ÉTAPE 1 : baseDeDonnees = null (on teste d'abord frontend + backend).
        // ÉTAPE 2 : on passera les infos de connexion issues de databaseResult :
        //
        // const baseDeDonnees = databaseResult && {
        //     moteur: application.moteur_db,          // "postgresql" | "mysql" | "mariadb"
        //     conteneur: databaseResult.container_name,
        //     nom: databaseResult.nom_db,
        //     utilisateur: databaseResult.utilisateur, // à vérifier selon ce que renvoie databaseService
        //     motDePasse: databaseResult.mot_de_passe
        // };
        const baseDeDonnees = null;

        const deploiement = await deployerApplication({
            idApp: application.id_app,
            projectRoot,
            detection,
            baseDeDonnees
        });
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
        return res.status(500).json({
            message: error.message
        });
    }
};

module.exports = { recupererApp };