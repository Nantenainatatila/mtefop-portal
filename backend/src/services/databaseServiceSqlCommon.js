const docker = require("../config/docker");
const pool = require("../config/database");
const fs = require("fs/promises");
const fsNode = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");
const tar = require("tar");

// ============================================================
// CONFIGURATION DES MOTEURS SQL
// ============================================================

const CONFIGURATIONS = {
    mysql: {
        moteur: "mysql",
        image: "mysql:8.4",
        suffixe: "mysql",
        port: 3306,
        client: "mysql",
        volumePath: "/var/lib/mysql",

        variables: {
            database: "MYSQL_DATABASE",
            user: "MYSQL_USER",
            password: "MYSQL_PASSWORD",
            rootPassword: "MYSQL_ROOT_PASSWORD"
        }
    },

    mariadb: {
        moteur: "mariadb",
        image: "mariadb:11",
        suffixe: "mariadb",
        port: 3306,
        client: "mariadb",
        volumePath: "/var/lib/mysql",

        variables: {
            database: "MARIADB_DATABASE",
            user: "MARIADB_USER",
            password: "MARIADB_PASSWORD",
            rootPassword: "MARIADB_ROOT_PASSWORD"
        }
    }
};

// Par défaut, chaque déploiement repart d'une base neuve : l'ancien conteneur
// ET son volume (donc toutes les données) sont supprimés. MySQL/MariaDB ne lisent
// les mots de passe qu'à la première initialisation d'un volume : un ancien volume
// réutilisé avec un nouveau conteneur provoque l'erreur 1045 "Access denied".
// Pour conserver les données, définir REINITIALISER_BASE=false dans l'environnement du portail.
const REINITIALISER_BASE = process.env.REINITIALISER_BASE !== "false";

// ============================================================
// UTILITAIRES
// ============================================================

const attendre = (ms) => {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
};

const genererMotDePasse = () => {
    return crypto.randomBytes(24).toString("hex");
};

const obtenirVariable = (variables, nom) => {
    const prefixe = `${nom}=`;

    const ligne = (variables || []).find((variable) =>
        variable.startsWith(prefixe)
    );

    return ligne
        ? ligne.substring(prefixe.length)
        : null;
};

// ============================================================
// CRÉER OU RÉCUPÉRER UN RÉSEAU DOCKER
// ============================================================

const obtenirOuCreerNetwork = async (nomNetwork) => {
    const networks = await docker.listNetworks({
        filters: JSON.stringify({
            name: [nomNetwork]
        })
    });

    const networkExistant = networks.find(
        (network) => network.Name === nomNetwork
    );

    if (networkExistant) {
        return docker.getNetwork(networkExistant.Id);
    }

    try {
        return await docker.createNetwork({
            Name: nomNetwork,
            Driver: "bridge"
        });
    } catch (error) {
        // Une autre opération a peut-être créé le réseau
        // entre la recherche et la création.
        const networksActualises = await docker.listNetworks({
            filters: JSON.stringify({
                name: [nomNetwork]
            })
        });

        const reseauCreeEntreTemps = networksActualises.find(
            (network) => network.Name === nomNetwork
        );

        if (reseauCreeEntreTemps) {
            return docker.getNetwork(reseauCreeEntreTemps.Id);
        }

        throw error;
    }
};

// ============================================================
// CRÉER OU RÉCUPÉRER UN VOLUME DOCKER
// ============================================================

const obtenirOuCreerVolume = async (nomVolume) => {
    const resultat = await docker.listVolumes({
        filters: JSON.stringify({
            name: [nomVolume]
        })
    });

    const volumeExistant = (resultat.Volumes || []).find(
        (volume) => volume.Name === nomVolume
    );

    if (volumeExistant) {
        return volumeExistant;
    }

    try {
        return await docker.createVolume({
            Name: nomVolume
        });
    } catch (error) {
        // Vérifier si le volume a été créé entre-temps.
        const volumesActualises = await docker.listVolumes({
            filters: JSON.stringify({
                name: [nomVolume]
            })
        });

        const volumeCreeEntreTemps = (
            volumesActualises.Volumes || []
        ).find((volume) => volume.Name === nomVolume);

        if (volumeCreeEntreTemps) {
            return volumeCreeEntreTemps;
        }

        throw error;
    }
};

// ============================================================
// SUPPRIMER L'ANCIENNE BASE (conteneur + volume)
// ============================================================

// Exécute une suppression. Retourne true si supprimé, false si elle
// n'existait déjà plus (404). Toute autre erreur est relancée.
const supprimerSiExiste = async (action) => {
    try {
        await action();
        return true;
    } catch (error) {
        if (error.statusCode === 404) {
            return false;
        }
        throw error;
    }
};

const supprimerAncienneBase = async (nomContainer, nomVolume) => {
    const conteneurSupprime = await supprimerSiExiste(() =>
        docker.getContainer(nomContainer).remove({ force: true, v: true })
    );
    console.log(
        conteneurSupprime
            ? `Ancien conteneur supprimé : ${nomContainer}`
            : `Aucun ancien conteneur à supprimer : ${nomContainer}`
    );

    const volumeSupprime = await supprimerSiExiste(() =>
        docker.getVolume(nomVolume).remove({ force: true })
    );
    console.log(
        volumeSupprime
            ? `Ancien volume supprimé : ${nomVolume}`
            : `Aucun ancien volume à supprimer : ${nomVolume}`
    );
};

// ============================================================
// VÉRIFIER SI UNE IMAGE DOCKER EXISTE
// ============================================================

const imageExiste = async (nomImage) => {
    try {
        await docker.getImage(nomImage).inspect();

        console.log(`Image Docker déjà présente : ${nomImage}`);

        return true;
    } catch (error) {
        return false;
    }
};

// ============================================================
// TÉLÉCHARGER UNE IMAGE DOCKER SI NÉCESSAIRE
// ============================================================

const obtenirImage = async (nomImage) => {
    if (await imageExiste(nomImage)) {
        return;
    }

    console.log(`Téléchargement de l'image Docker : ${nomImage}`);

    await new Promise((resolve, reject) => {
        docker.pull(nomImage, (error, stream) => {
            if (error) {
                reject(error);
                return;
            }

            docker.modem.followProgress(
                stream,
                (errorFinal) => {
                    if (errorFinal) {
                        reject(errorFinal);
                        return;
                    }

                    console.log(
                        `Image téléchargée avec succès : ${nomImage}`
                    );

                    resolve();
                },
                (event) => {
                    if (event.status) {
                        console.log(
                            `[${nomImage}] ${event.status}`
                        );
                    }
                }
            );
        });
    });
};

// ============================================================
// EXÉCUTER UNE COMMANDE DANS UN CONTENEUR DOCKER
// ============================================================

const executerCommande = async (
    container,
    commande,
    variablesEnvironnement = []
) => {
    const exec = await container.exec({
        Cmd: commande,
        Env: variablesEnvironnement,
        AttachStdout: true,
        AttachStderr: true,
        Tty: false
    });

    const stream = await exec.start({
        hijack: true,
        stdin: false
    });

    let sortie = "";
    let erreurSortie = "";

    const stdout = {
        write: (donnees) => {
            sortie += donnees.toString();
        }
    };

    const stderr = {
        write: (donnees) => {
            erreurSortie += donnees.toString();
        }
    };

    await new Promise((resolve, reject) => {
        let termine = false;

        const terminer = (error) => {
            if (termine) {
                return;
            }

            termine = true;

            if (error) {
                reject(error);
            } else {
                resolve();
            }
        };

        stream.on("end", () => terminer());
        stream.on("close", () => terminer());
        stream.on("error", (error) => terminer(error));

        docker.modem.demuxStream(
            stream,
            stdout,
            stderr
        );
    });

    const resultat = await exec.inspect();

    if (resultat.ExitCode !== 0) {
        const details = [
            sortie.trim(),
            erreurSortie.trim()
        ]
            .filter(Boolean)
            .join("\n");

        throw new Error(
            `La commande a échoué (code ${resultat.ExitCode}).` +
            (details ? `\n${details}` : "")
        );
    }

    return {
        sortie,
        erreurSortie,
        code: resultat.ExitCode
    };
};

// ============================================================
// VÉRIFIER SI UN CONTENEUR EST CONNECTÉ À UN RÉSEAU
// ============================================================

const verifierConnexionNetwork = async (
    container,
    network
) => {
    const inspectionContainer = await container.inspect();
    const inspectionNetwork = await network.inspect();

    const containerId = inspectionContainer.Id;
    const networkId = inspectionNetwork.Id;
    const networkName = inspectionNetwork.Name;

    // Première vérification : réseaux déclarés par le conteneur.
    const reseauxContainer =
        inspectionContainer.NetworkSettings?.Networks || {};

    const reseauTrouve = Object.entries(reseauxContainer).some(
        ([nom, details]) => {
            return (
                nom === networkName ||
                details.NetworkID === networkId
            );
        }
    );

    if (reseauTrouve) {
        return true;
    }

    // Deuxième vérification : conteneurs déclarés par le réseau.
    const conteneursNetwork = inspectionNetwork.Containers || {};

    const conteneurTrouve = Object.values(
        conteneursNetwork
    ).some((details) => {
        return details.Id === containerId;
    });

    return conteneurTrouve;
};

// ============================================================
// CONNECTER LE CONTENEUR AU RÉSEAU DOCKER
// ============================================================

const connecterAuNetwork = async (
    container,
    nomNetwork
) => {
    const network = await obtenirOuCreerNetwork(nomNetwork);

    // Inspecter le conteneur avant toute tentative de connexion.
    const inspectionContainer = await container.inspect();

    if (!inspectionContainer.State.Running) {
        throw new Error(
            `Le conteneur ${inspectionContainer.Name} ` +
            "doit être démarré avant sa connexion au réseau."
        );
    }

    // Vérification de la connexion existante.
    const dejaConnecte = await verifierConnexionNetwork(
        container,
        network
    );

    if (dejaConnecte) {
        console.log(
            `Le conteneur ${inspectionContainer.Name.replace("/", "")} ` +
            `est déjà connecté au réseau ${nomNetwork}.`
        );

        return network;
    }

    console.log(
        `Connexion du conteneur ` +
        `${inspectionContainer.Name.replace("/", "")} ` +
        `au réseau ${nomNetwork}...`
    );

    try {
        await network.connect({
            Container: inspectionContainer.Id
        });

        console.log(
            `Connexion au réseau ${nomNetwork} effectuée.`
        );

        return network;
    } catch (error) {
        // Docker peut renvoyer une erreur si une connexion existe
        // déjà ou si une autre opération vient de la créer.
        const message =
            error.json?.message || error.message || "";

        const connexionDejaExistante =
            message.includes("already exists in network") ||
            message.includes("endpoint with name") &&
            message.includes("already exists");

        if (connexionDejaExistante) {
            // Vérifier une nouvelle fois l'état réel.
            const connecteApresErreur =
                await verifierConnexionNetwork(
                    container,
                    network
                );

            if (connecteApresErreur) {
                console.log(
                    `Le conteneur est déjà connecté au réseau ` +
                    `${nomNetwork}. Poursuite du déploiement.`
                );

                return network;
            }

            /*
             * Docker signale un endpoint existant mais les inspections
             * ne confirment pas la connexion. On ne répète pas
             * network.connect() en boucle : on arrête proprement
             * avec un message explicite.
             */
            throw new Error(
                `Docker signale que l'endpoint du conteneur ` +
                `${inspectionContainer.Name.replace("/", "")} ` +
                `existe déjà dans ${nomNetwork}, mais la connexion ` +
                "n'a pas pu être confirmée. Vérifiez l'état du réseau Docker."
            );
        }

        throw error;
    }
};

// ============================================================
// ATTENDRE QUE MYSQL OU MARIADB SOIT PRÊT
// ============================================================

const attendreServeurSQL = async (
    container,
    utilisateur,
    motDePasse,
    nomBase,
    config
) => {
    console.log(
        `Attente du démarrage du serveur ${config.moteur.toUpperCase()}...`
    );

    let derniereErreur = null;

    for (let tentative = 1; tentative <= 60; tentative++) {
        try {
            await executerCommande(
                container,
                [
                    config.client,
                    "--protocol=TCP",
                    "-h",
                    "127.0.0.1",
                    "-P",
                    String(config.port),
                    "--user",
                    utilisateur,
                    "--database",
                    nomBase,
                    "--batch",
                    "--skip-column-names",
                    "-e",
                    "SELECT 1"
                ],
                [
                    `MYSQL_PWD=${motDePasse}`
                ]
            );

            console.log(
                `Serveur ${config.moteur.toUpperCase()} prêt.`
            );

            console.log(
                "Connexion de l'utilisateur applicatif vérifiée."
            );

            return true;
        } catch (error) {
            derniereErreur = error;

            if (tentative % 10 === 0) {
                console.log(
                    `Serveur SQL en attente (${tentative}/60).`
                );
            }
        }

        if (tentative < 60) {
            await attendre(1000);
        }
    }

    throw new Error(
        `Le serveur ${config.moteur.toUpperCase()} ou la connexion ` +
        "applicative n'est pas disponible après 60 secondes.\n" +
        `Dernière erreur : ${
            derniereErreur?.message || "Erreur inconnue"
        }`
    );
};

// ============================================================
// LA BASE CONTIENT-ELLE DÉJÀ DES TABLES ?
// (sert quand REINITIALISER_BASE=false : on ne rejoue pas le SQL)
// ============================================================

const baseContientDesTables = async (
    container,
    utilisateur,
    motDePasse,
    nomBase,
    config
) => {
    const resultat = await executerCommande(
        container,
        [
            config.client,
            "--protocol=TCP",
            "-h",
            "127.0.0.1",
            "-P",
            String(config.port),
            "--user",
            utilisateur,
            "--database",
            nomBase,
            "--batch",
            "--skip-column-names",
            "-e",
            "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE()"
        ],
        [
            `MYSQL_PWD=${motDePasse}`
        ]
    );

    const nombre = Number(resultat.sortie.trim());

    console.log(`Tables présentes dans ${nomBase} : ${nombre}`);

    return nombre > 0;
};

// ============================================================
// EXÉCUTER UN FICHIER SQL DANS MYSQL OU MARIADB
// ============================================================

const executerFichierSQL = async (
    container,
    utilisateur,
    motDePasse,
    nomBase,
    cheminSql,
    config
) => {
    if (!cheminSql) {
        throw new Error(
            "Le chemin du fichier SQL n'est pas fourni."
        );
    }

    console.log("Lecture du fichier SQL :", cheminSql);

    const sql = await fs.readFile(cheminSql, "utf8");

    if (!sql.trim()) {
        throw new Error("Le fichier SQL est vide.");
    }

    console.log(
        `Taille du fichier SQL : ${sql.length} caractères`
    );

    const dossierTemporaire = await fs.mkdtemp(
        path.join(os.tmpdir(), "mtefop-sql-")
    );

    const cheminSqlTemporaire = path.join(
        dossierTemporaire,
        "base.sql"
    );

    const cheminArchive = path.join(
        dossierTemporaire,
        "base.tar"
    );

    try {
        await fs.writeFile(
            cheminSqlTemporaire,
            sql,
            "utf8"
        );

        await tar.c(
            {
                cwd: dossierTemporaire,
                file: cheminArchive
            },
            ["base.sql"]
        );

        const archiveStream = fsNode.createReadStream(
            cheminArchive
        );

        await container.putArchive(
            archiveStream,
            {
                path: "/tmp"
            }
        );

        const resultat = await executerCommande(
            container,
            [
                "sh",
                "-c",
                'exec "$SQL_CLIENT" ' +
                '--protocol=TCP ' +
                '-h 127.0.0.1 ' +
                '-P "$DB_PORT" ' +
                '--user="$DB_USER" ' +
                '--database="$DB_NAME" ' +
                '< /tmp/base.sql'
            ],
            [
                `SQL_CLIENT=${config.client}`,
                `DB_PORT=${config.port}`,
                `DB_USER=${utilisateur}`,
                `DB_NAME=${nomBase}`,
                `MYSQL_PWD=${motDePasse}`
            ]
        );

        if (resultat.sortie.trim()) {
            console.log(
                "Sortie SQL :",
                resultat.sortie.trim()
            );
        }

        if (resultat.erreurSortie.trim()) {
            console.warn(
                "Avertissement SQL :",
                resultat.erreurSortie.trim()
            );
        }

        console.log("Fichier SQL exécuté avec succès.");

        return true;
    } catch (error) {
        throw new Error(
            `Erreur pendant l'importation du fichier SQL, veuiller verifier votre fichier sql: ${error.message}`
        );
    } finally {
        await fs.rm(
            dossierTemporaire,
            {
                recursive: true,
                force: true
            }
        );
    }
};

// ============================================================
// CRÉER OU RÉUTILISER UN CONTENEUR SQL
// ============================================================

const obtenirOuCreerConteneurSQL = async ({
    nomContainer,
    nomVolume,
    nomNetwork,
    config,
    nomBase,
    utilisateur
}) => {
    let container = docker.getContainer(nomContainer);
    let inspection = null;

    try {
        inspection = await container.inspect();
    } catch (error) {
        if (error.statusCode !== 404) {
            throw error;
        }

        inspection = null;
    }

    if (inspection) {
        console.log(
            `Réutilisation du conteneur existant ${nomContainer}.`
        );

        const envExistantes = inspection.Config?.Env || [];

        const motDePasse = obtenirVariable(
            envExistantes,
            config.variables.password
        );

        const motDePasseRoot = obtenirVariable(
            envExistantes,
            config.variables.rootPassword
        );

        if (!motDePasse || !motDePasseRoot) {
            throw new Error(
                `Le conteneur ${nomContainer} existe, mais ses ` +
                "variables de mot de passe sont absentes."
            );
        }

        if (!inspection.State.Running) {
            console.log(
                `Démarrage du conteneur existant ${nomContainer}...`
            );

            await container.start();
        }

        // IMPORTANT :
        // Le conteneur existant peut déjà être connecté au réseau.
        // connecterAuNetwork vérifie son état avant tout connect().
        await connecterAuNetwork(
            container,
            nomNetwork
        );

        return {
            container,
            motDePasse,
            motDePasseRoot
        };
    }

    // --------------------------------------------------------
    // Créer un nouveau conteneur
    // --------------------------------------------------------

    const motDePasse = genererMotDePasse();
    const motDePasseRoot = genererMotDePasse();

    const variables = [
        `${config.variables.database}=${nomBase}`,
        `${config.variables.user}=${utilisateur}`,
        `${config.variables.password}=${motDePasse}`,
        `${config.variables.rootPassword}=${motDePasseRoot}`
    ];

    /*
     * Le réseau est créé avant le conteneur.
     * NetworkMode connecte automatiquement le nouveau conteneur
     * à ce réseau. Il ne faut donc pas forcer une seconde connexion.
     */
    await obtenirOuCreerNetwork(nomNetwork);

    await obtenirOuCreerVolume(nomVolume);

    container = await docker.createContainer({
        name: nomContainer,

        Image: config.image,

        Env: variables,

        ExposedPorts: {
            [`${config.port}/tcp`]: {}
        },

        HostConfig: {
            Binds: [
                `${nomVolume}:${config.volumePath}`
            ],

            NetworkMode: nomNetwork,

            RestartPolicy: {
                Name: "unless-stopped"
            }
        }
    });

    await container.start();

    console.log(
        `Nouveau conteneur ${nomContainer} démarré.`
    );

    /*
     * Ne pas appeler network.connect() ici :
     * Docker a déjà connecté le conteneur via NetworkMode.
     */

    return {
        container,
        motDePasse,
        motDePasseRoot
    };
};

// ============================================================
// CRÉER ET INITIALISER UNE BASE MYSQL OU MARIADB
// ============================================================

const creerBaseSQL = async (
    application,
    detectionDatabase,
    configuration
) => {
    // --------------------------------------------------------
    // Vérifier les paramètres
    // --------------------------------------------------------

    if (!application || !application.id_app) {
        throw new Error(
            "L'identifiant de l'application est manquant."
        );
    }

    if (!detectionDatabase || !detectionDatabase.chemin) {
        throw new Error(
            "Aucun fichier SQL n'a été détecté pour cette application."
        );
    }

    // --------------------------------------------------------
    // Récupérer la configuration du moteur
    // --------------------------------------------------------

    const config = CONFIGURATIONS[
        configuration?.moteur
    ];

    if (!config) {
        throw new Error(
            `Moteur SQL non pris en charge : ${
                configuration?.moteur || "non défini"
            }.`
        );
    }

    // --------------------------------------------------------
    // Définir les noms des ressources
    // --------------------------------------------------------

    const idApp = application.id_app;

    const nomContainer =
        `mtefop-app-${idApp}-${config.suffixe}`;

    const nomVolume =
        `${nomContainer}-data`;

    const nomNetwork =
        `mtefop-app-${idApp}-network`;

    const nomBase =
        `app_${idApp}`;

    const utilisateur =
        `app_${idApp}`;

    console.log("==============================================");

    console.log(
        `INITIALISATION ${config.moteur.toUpperCase()}`
    );

    console.log("Conteneur :", nomContainer);
    console.log("Volume :", nomVolume);
    console.log("Réseau :", nomNetwork);
    console.log("Base :", nomBase);
    console.log("Utilisateur :", utilisateur);

    console.log("==============================================");

    // --------------------------------------------------------
    // Préparer l'image Docker
    // --------------------------------------------------------

    await obtenirImage(config.image);

    // --------------------------------------------------------
    // Supprimer l'ancienne base (conteneur + volume)
    // --------------------------------------------------------

    if (REINITIALISER_BASE) {
        console.log("Réinitialisation : suppression de l'ancienne base...");

        await supprimerAncienneBase(nomContainer, nomVolume);
    }

    // --------------------------------------------------------
    // Créer ou récupérer le conteneur
    // --------------------------------------------------------

    const resultatConteneur = await obtenirOuCreerConteneurSQL({
        nomContainer,
        nomVolume,
        nomNetwork,
        config,
        nomBase,
        utilisateur
    });

    const container = resultatConteneur.container;
    const motDePasse = resultatConteneur.motDePasse;

    // --------------------------------------------------------
    // Vérifier la connexion réseau
    // --------------------------------------------------------

    /*
     * Pour un conteneur existant, la fonction a déjà vérifié
     * la connexion dans obtenirOuCreerConteneurSQL().
     *
     * Pour un nouveau conteneur, NetworkMode l'a connecté
     * automatiquement lors de sa création.
     *
     * On vérifie seulement l'état ici : on ne force pas
     * une nouvelle connexion.
     */

    const network = await obtenirOuCreerNetwork(nomNetwork);

    const reseauConnecte = await verifierConnexionNetwork(
        container,
        network
    );

    if (!reseauConnecte) {
        await connecterAuNetwork(
            container,
            nomNetwork
        );
    }

    // --------------------------------------------------------
    // Attendre que le serveur SQL soit prêt
    // --------------------------------------------------------

    await attendreServeurSQL(
        container,
        utilisateur,
        motDePasse,
        nomBase,
        config
    );

    // --------------------------------------------------------
    // Importer le fichier SQL (seulement si la base est vide)
    // --------------------------------------------------------

    if (
        await baseContientDesTables(
            container,
            utilisateur,
            motDePasse,
            nomBase,
            config
        )
    ) {
        console.log(
            "Base déjà initialisée (tables présentes) : import SQL ignoré. " +
            "Pour réimporter, supprimez le conteneur et le volume de cette base."
        );
    } else {
        await executerFichierSQL(
            container,
            utilisateur,
            motDePasse,
            nomBase,
            detectionDatabase.chemin,
            config
        );
    }

    // --------------------------------------------------------
    // Enregistrer les informations dans PostgreSQL
    // --------------------------------------------------------

    const resultatMiseAJour = await pool.query(
        `
            UPDATE application_database
            SET
                host_db = $1,
                port_db = $2,
                nom_db = $3,
                utilisateur_db = $4,
                mot_de_passe_db = $5,
                container_name_db = $6,
                volume_name_db = $7,
                reseau_db = $8,
                actif = TRUE,
                date_modification = CURRENT_TIMESTAMP
            WHERE id_app = $9
            RETURNING id_app
        `,
        [
            nomContainer,
            config.port,
            nomBase,
            utilisateur,
            motDePasse,
            nomContainer,
            nomVolume,
            nomNetwork,
            idApp
        ]
    );

    if (resultatMiseAJour.rowCount === 0) {
        throw new Error(
            `La base ${nomBase} a été initialisée, mais aucune ligne ` +
            `correspondante n'a été trouvée dans application_database ` +
            `pour id_app=${idApp}.`
        );
    }

    console.log(
        `Informations ${config.moteur.toUpperCase()} ` +
        "enregistrées dans PostgreSQL."
    );

    // --------------------------------------------------------
    // Retourner les informations de la base
    // --------------------------------------------------------

    return {
        moteur: config.moteur,
        image: config.image,
        container_name: nomContainer,
        volume_name: nomVolume,
        network_name: nomNetwork,
        host: nomContainer,
        port: config.port,
        nom_db: nomBase,
        utilisateur,
        mot_de_passe: motDePasse,
        fichier_sql: detectionDatabase.chemin
    };
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
    CONFIGURATIONS,
    attendre,
    genererMotDePasse,
    obtenirOuCreerNetwork,
    obtenirOuCreerVolume,
    supprimerAncienneBase,
    imageExiste,
    obtenirImage,
    executerCommande,
    verifierConnexionNetwork,
    connecterAuNetwork,
    attendreServeurSQL,
    baseContientDesTables,
    executerFichierSQL,
    obtenirOuCreerConteneurSQL,
    creerBaseSQL
};