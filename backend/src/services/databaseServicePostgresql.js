const docker = require("../config/docker");
const pool = require("../config/database");
const fs = require("fs/promises");
const crypto = require("crypto");
const { stdin } = require("process");
const tar = require("tar");

//=====================ATTENDRE============================
const attendre = (ms) => {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    })
};

//===================CREER OU RECUPERER UN RESEAU===============
const obtenirOuCreerNetwork = async (nomNetwork) => {
    const networks = await docker.listNetworks({
        filters:JSON.stringify({
            name: [nomNetwork]
        })
    });
    if (networks.length > 0) {
        return docker.getNetwork(networks[0].Id);
    }
    return await docker.createNetwork({
        Name: nomNetwork,
        Driver: "bridge"
    });
};

// ====================CREER OU RECUPERER UN VOLUME================
const obtenierOuCreerVolume = async (nomVolume) => {
    const volumes = await docker.listVolumes({
        filters: JSON.stringify({
            name: [nomVolume]
        })
    });
    if (volumes.Volumes && volumes.Volumes.length > 0) {
        return volumes.Volumes[0];
    }
    return await docker.createVolume({
        Name: nomVolume
    });
};
//======================VERIFIER SI L'IMAGE POSTGRESQL EXISTE ==================
const imagePostgresExiste = async () => {

    try {

        const image = docker.getImage(
            "postgres:16-alpine"
        );

        await image.inspect();

        console.log(
            "Image PostgreSQL déjà présente : postgres:16-alpine"
        );

        return true;

    } catch (error) {

        console.log(
            "Image PostgreSQL absente."
        );

        return false;
    }
};
// ============================================================
// TELECHARGER L'IMAGE POSTGRESQL
// ============================================================

const obtenirImagePostgreSQL = async () => {

    const existe = await imagePostgresExiste();

    if (existe) {
        return;
    }

    console.log(
        "Téléchargement de l'image PostgreSQL : postgres:16-alpine"
    );

    await new Promise((resolve, reject) => {

        docker.pull(
            "postgres:16-alpine",
            (error, stream) => {

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
                            "Image PostgreSQL téléchargée avec succès."
                        );

                        resolve();
                    },

                    (event) => {

                        if (event.status) {

                            console.log(
                                `[PostgreSQL] ${event.status}`
                            );
                        }
                    }
                );
            }
        );
    });
};
//======================ATTENDRE POSTGRESQL=========================
const attendrePostgreSQL = async(
    container,
    utilisateur,
    nomBase
) => {
    console.log("Attente du demarrage de postgreSQL...");


    for (
        let tentative = 1;
        tentative <= 30;
        tentative++
    ) {
        try {
            console.log(`Test PotsgreSQL dans ${tentative}/30...`)
            const exec = 
                await container.exec({
                    Cmd: [
                        "pg_isready",
                        "-U",
                        utilisateur,
                        "-d",
                        nomBase
                    ],
                    AttachStdout: true,
                    AttachStderr: true
                });
                
                const stream = await exec.start({
                    hijack: true,
                    stdin: false
                });
                await new Promise(
                    (
                        resolve,
                        reject
                     ) => {
                        stream.on("data", (data) => {
                            console.log(`[pg_isready] ${data.toString()}`);
                        })
                        stream.on("end", resolve);
                        stream.on("close", resolve);
                        stream.on("error", reject);
                    }
                );

                const resultat = await exec.inspect();
                if (resultat.ExitCode === 0) {
                    console.log("======Postgres est pret=========");
                    return true;
                }
        } catch (error) {
            console.log(`
                PostgresSQL pas encore pret (${tentative}/30)`
            );
        }

        await attendre(1000);
    }
    throw new Error(
        "PostgreSQL n'est pas devenu disponible dans le delai prévu."
    );
};
//EXECUTION D'UN FICHIER SQL DANS POSTGRESSQL================
const executerFichierSQL = async (
    container,
    utilisateur,
    nomBase,
    cheminSql
) => {

    console.log(
        "========== DEBUT EXECUTION SQL =========="
    );

    console.log(
        "Fichier SQL :",
        cheminSql
    );

    // Lire le fichier SQL
    const sql = await fs.readFile(
        cheminSql,
        "utf8"
    );

    if (!sql.trim()) {
        throw new Error(
            "Le fichier SQL est vide"
        );
    }

    console.log(
        "Taille SQL :",
        sql.length,
        "caractères"
    );

    //================================================================
    // CREER UN FICHIER TEMPORAIRE SUR LE BACKEND
    //================================================================

    const fichierTemporaire =
        `/tmp/base-${Date.now()}.sql`;

    await fs.writeFile(
        fichierTemporaire,
        sql,
        "utf8"
    );

    console.log(
        "Fichier SQL temporaire créé :",
        fichierTemporaire
    );

    //================================================================
    // CREER UNE ARCHIVE TAR
    //================================================================

    const dossierTemp =
        `/tmp/sql-${Date.now()}`;

    await fs.mkdir(
        dossierTemp,
        {
            recursive: true
        }
    );

    const fichierDansDossier =
        `${dossierTemp}/base.sql`;

    await fs.copyFile(
        fichierTemporaire,
        fichierDansDossier
    );

    console.log(
        "Préparation de l'archive SQL..."
    );

    const archive =
        `${dossierTemp}.tar`;

    await tar.c(
        {
            cwd: dossierTemp,
            file: archive
        },
        ["base.sql"]
    );

    console.log(
        "Archive SQL créée :",
        archive
    );

    //================================================================
    // COPIER L'ARCHIVE DANS LE CONTENEUR
    //================================================================

    console.log(
        "Copie de base.sql dans le conteneur..."
    );

    const archiveBuffer =
        await fs.readFile(archive);

    await container.putArchive(
        archiveBuffer,
        {
            path: "/tmp"
        }
    );

    console.log(
        "Fichier SQL copié dans le conteneur."
    );
    //================================================================
    // EXECUTER PSQL
    //================================================================
    console.log(
        "========== EXECUTION PSQL =========="
    );

    const exec = await container.exec({
        Cmd: [
            "psql",
            "-v",
            "ON_ERROR_STOP=1",
            "-U",
            utilisateur,
            "-d",
            nomBase,
            "-f",
            "/tmp/base.sql"
        ],
        AttachStdout: true,
        AttachStderr: true
    });

    const stream = await exec.start({
        hijack: true,
        stdin: false
    });

    await new Promise(
        (
            resolve,
            reject
        ) => {

            stream.on(
                "data",
                (data) => {
                    console.log(
                        `[PostgreSQL] ${data.toString()}`
                    );
                }
            );

            stream.on(
                "end",
                resolve
            );

            stream.on(
                "close",
                resolve
            );

            stream.on(
                "error",
                reject
            );
        }
    );

    //================================================================
    // VERIFIER LE CODE DE RETOUR
    //================================================================

    const resultat =
        await exec.inspect();

    console.log(
        "Code retour PostgreSQL :",
        resultat.ExitCode
    );

    if (resultat.ExitCode !== 0) {

        throw new Error(
            `Erreur pendant l'exécution du fichier SQL. Code : ${resultat.ExitCode}`
        );

    }

    console.log(
        "========== FICHIER SQL EXECUTE AVEC SUCCES =========="
    );

    //================================================================
    // NETTOYAGE
    //================================================================

    try {

        await fs.rm(
            fichierTemporaire,
            {
                force: true
            }
        );

        await fs.rm(
            dossierTemp,
            {
                recursive: true,
                force: true
            }
        );

        await fs.rm(
            archive,
            {
                force: true
            }
        );

    } catch (error) {

        console.log(
            "Nettoyage temporaire impossible :",
            error.message
        );

    }

    return true;
};

//==================CREER ET INITIALISER POSTGRES======================
const creerPostgreSQL = async(
    application,
    detectionDatabase
) => {
    const idApp = application.id_app;
    const nomContainer = `mtefop-app-${idApp}-postgres`;
    const nomVolume = `mtefop-app-${idApp}-postgres-data`;
    const nomNetwork = `mtefop-app-${idApp}-network`;
    const nomBase = `app_${idApp}`;
    const utilisateur = `app_${idApp}`;
    //Mot de passe aleatoire
    const motDePasse = 
        crypto
            .randomBytes(24)
            .toString("hex");
    console.log("==========REATION DE POSTGRESQL================");

     //verifier le fichier SQL
    if (
        !detectionDatabase ||
        !detectionDatabase.chemin
    ) {
        throw new Error("Aucun fichier SQL détécté pour POSTGRESSQL");
    }
    //reseau et volume
    await obtenirImagePostgreSQL();

    await obtenirOuCreerNetwork(nomNetwork);
    
    await obtenierOuCreerVolume(nomVolume);

    //verifier un ancier container
     
    let ancierContainer = null;
    try {
        ancierContainer = docker.getContainer(nomContainer);
        const info = await ancierContainer.inspect();
        console.log("Ancien container PostgreSQL Trouvé");

        //s'il existe deja , on le reutilise
        if (!info.State.Running) {
            await ancierContainer.start();
        }
    } catch (error) {
        ancierContainer = null;
    }
    let container;
    //creer le container
    if (ancierContainer) {
        container = ancierContainer;
    } else {
        container = await docker.createContainer({
            name: nomContainer,
            Image: "postgres:16-alpine",
            Env: [
                `POSTGRES_DB=${nomBase}`,
                `POSTGRES_USER=${utilisateur}`,
                `POSTGRES_PASSWORD=${motDePasse}`
            ],

            ExposedPorts: {
                "5432/tcp": {}
            },
            HostConfig: {
                Binds: [
                    `${nomVolume}:/var/lib/postgresql/data`
                ],
                NetworkMode: nomNetwork
            }
        });
        await container.start();
    }
    console.log("Container postgres demarré");

    
    //Attendre postgresql
    await attendrePostgreSQL(
        container,
        utilisateur,
        nomBase
    );

   
    //EXECUTER LE SQL
    await executerFichierSQL(
        container,
        utilisateur,
        nomBase,
        detectionDatabase.chemin
    );

    //Enregistrer les informaions en DB

    await pool.query(
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
                    actif = true,
                    date_modification = CURRENT_TIMESTAMP
                WHERE id_app = $8
        `, [
            nomContainer,
            5432,
            nomBase,
            utilisateur,
            motDePasse,
            nomContainer,
            nomVolume,
            idApp
        ]
    );
    console.log("INFORMATION PostgreSQL enregistrées");

    return {
        moteur: "postgreSQL",
        container_name: nomContainer,
        volume_name: nomVolume,
        networks_name: nomNetwork,
        host: nomContainer,
        port: 5432,
        nom_db: nomBase,
        utilisateur: utilisateur,
        fichier_sql: detectionDatabase.chemin
    };

};

module.exports = { creerPostgreSQL }