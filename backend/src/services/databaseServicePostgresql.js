const docker = require("../config/docker");
const pool = require("../config/database");
const fs = require("fs/promises");
const crypto = require("crypto");
const tar = require("tar");

// ============================================================
// UTILITAIRES
// ============================================================

const attendre = (ms) =>
    new Promise((resolve) => setTimeout(resolve, ms));

const obtenirVariable = (variables, nom) => {
    const prefixe = `${nom}=`;
    const ligne = (variables || []).find((v) => v.startsWith(prefixe));
    return ligne ? ligne.substring(prefixe.length) : null;
};

// Exécute une commande dans le conteneur et retourne { code, stdout, stderr, sortie }
const executerCommande = async (container, commande) => {
    const exec = await container.exec({
        Cmd: commande,
        AttachStdout: true,
        AttachStderr: true,
        Tty: false
    });

    const stream = await exec.start({ hijack: true, stdin: false });

    let stdout = "";
    let stderr = "";

    docker.modem.demuxStream(
        stream,
        { write: (d) => { stdout += d.toString("utf8"); } },
        { write: (d) => { stderr += d.toString("utf8"); } }
    );

    await new Promise((resolve, reject) => {
        stream.on("end", resolve);
        stream.on("close", resolve);
        stream.on("error", reject);
    });

    const resultat = await exec.inspect();

    return {
        code: resultat.ExitCode,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        sortie: [stdout.trim(), stderr.trim()].filter(Boolean).join("\n")
    };
};

// ============================================================
// RESEAU ET VOLUME
// ============================================================

const obtenirOuCreerNetwork = async (nomNetwork) => {
    const networks = await docker.listNetworks({
        filters: JSON.stringify({ name: [nomNetwork] })
    });

    const existant = networks.find((n) => n.Name === nomNetwork);

    if (existant) {
        console.log(`Réseau existant : ${nomNetwork}`);
        return docker.getNetwork(existant.Id);
    }

    console.log(`Création du réseau : ${nomNetwork}`);
    return await docker.createNetwork({ Name: nomNetwork, Driver: "bridge" });
};

const obtenirOuCreerVolume = async (nomVolume) => {
    const volumes = await docker.listVolumes({
        filters: JSON.stringify({ name: [nomVolume] })
    });

    if (volumes.Volumes && volumes.Volumes.length > 0) {
        console.log(`Volume existant : ${nomVolume}`);
        return volumes.Volumes[0];
    }

    console.log(`Création du volume : ${nomVolume}`);
    return await docker.createVolume({ Name: nomVolume });
};

// ============================================================
// SUPPRIMER L'ANCIENNE BASE (conteneur + volume)
// ============================================================

// Par défaut, chaque déploiement repart d'une base neuve : l'ancien
// conteneur ET son volume (donc toutes les données) sont supprimés.
// Pour conserver les données entre deux déploiements, définir
// REINITIALISER_BASE=false dans l'environnement du portail.
const REINITIALISER_BASE = process.env.REINITIALISER_BASE !== "false";

const supprimerAncienneBase = async (nomContainer, nomVolume) => {
    try {
        await docker
            .getContainer(nomContainer)
            .remove({ force: true, v: true });
        console.log(`Ancien conteneur supprimé : ${nomContainer}`);
    } catch (error) {
        if (error.statusCode !== 404) {
            throw error;
        }
        console.log(`Aucun ancien conteneur à supprimer : ${nomContainer}`);
    }

    try {
        await docker.getVolume(nomVolume).remove({ force: true });
        console.log(`Ancien volume supprimé : ${nomVolume}`);
    } catch (error) {
        if (error.statusCode !== 404) {
            throw error;
        }
        console.log(`Aucun ancien volume à supprimer : ${nomVolume}`);
    }
};

// ============================================================
// IMAGE POSTGRESQL
// ============================================================

const imagePostgresExiste = async () => {
    try {
        await docker.getImage("postgres:16-alpine").inspect();
        console.log("Image PostgreSQL déjà présente : postgres:16-alpine");
        return true;
    } catch (error) {
        console.log("Image PostgreSQL absente.");
        return false;
    }
};

const obtenirImagePostgreSQL = async () => {
    if (await imagePostgresExiste()) {
        return;
    }

    console.log("Téléchargement de l'image PostgreSQL : postgres:16-alpine");

    await new Promise((resolve, reject) => {
        docker.pull("postgres:16-alpine", (error, stream) => {
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
                    console.log("Image PostgreSQL téléchargée avec succès.");
                    resolve();
                },
                (event) => {
                    if (event.status) {
                        console.log(`[PostgreSQL] ${event.status}`);
                    }
                }
            );
        });
    });
};

// ============================================================
// ATTENDRE QUE POSTGRESQL SOIT PRET
// ============================================================

const attendrePostgreSQL = async (container, utilisateur, nomBase) => {
    console.log("Attente du démarrage de PostgreSQL...");

    for (let tentative = 1; tentative <= 30; tentative++) {
        try {
            console.log(`Test PostgreSQL ${tentative}/30...`);

            // IMPORTANT : test en TCP (-h 127.0.0.1), pas via le socket local.
            // Au premier démarrage, l'image postgres lance d'abord un serveur
            // TEMPORAIRE (socket uniquement) pour créer la base, puis l'arrête
            // et démarre le vrai serveur. pg_isready via le socket répondrait
            // "prêt" pendant cette phase, juste avant l'arrêt du serveur.
            // Le serveur temporaire n'écoute pas en TCP : seul le vrai répond ici.
            const r = await executerCommande(container, [
                "pg_isready",
                "-h",
                "127.0.0.1",
                "-p",
                "5432",
                "-U",
                utilisateur,
                "-d",
                nomBase
            ]);

            if (r.code === 0) {
                console.log("====== PostgreSQL est prêt =========");
                return true;
            }
        } catch (error) {
            console.log(`PostgreSQL pas encore prêt (${tentative}/30)`);
        }

        await attendre(1000);
    }

    throw new Error(
        "PostgreSQL n'est pas devenu disponible dans le délai prévu."
    );
};

// ============================================================
// VERIFIER / CREER LA BASE
// ============================================================

const requeteExistenceBase = (nomBase) =>
    `SELECT 1 FROM pg_database WHERE datname = '${nomBase.replace(/'/g, "''")}';`;

const assurerBaseExiste = async (container, utilisateur, nomBase) => {
    console.log(`Vérification de l'existence de la base ${nomBase}...`);

    const verifier = () =>
        executerCommande(container, [
            "psql", "-X", "-w", "-U", utilisateur, "-d", "postgres",
            "-t", "-A", "-c", requeteExistenceBase(nomBase)
        ]);

    const verification = await verifier();

    if (verification.code !== 0) {
        throw new Error(
            `Impossible de vérifier la base ${nomBase}. ` +
            `Erreur PostgreSQL : ${verification.stderr}`
        );
    }

    if (verification.stdout === "1") {
        console.log(`La base PostgreSQL ${nomBase} existe déjà.`);
        return true;
    }

    console.log(`Base ${nomBase} absente. Création en cours...`);

    const creation = await executerCommande(container, [
        "createdb", "-U", utilisateur, nomBase
    ]);

    if (creation.code !== 0) {
        // La base a peut-être été créée entre-temps
        const nouvelle = await verifier();

        if (nouvelle.code === 0 && nouvelle.stdout === "1") {
            console.log(`La base ${nomBase} existe désormais.`);
            return true;
        }

        throw new Error(
            `Échec de création de la base ${nomBase}. ` +
            `Code : ${creation.code}. Détail : ${creation.sortie}`
        );
    }

    console.log(`Base PostgreSQL ${nomBase} créée avec succès.`);
    return true;
};

// ============================================================
// LA BASE CONTIENT-ELLE DEJA DES TABLES ?
// ============================================================

const baseContientDesTables = async (container, utilisateur, nomBase) => {
    const r = await executerCommande(container, [
        "psql", "-X", "-w", "-U", utilisateur, "-d", nomBase,
        "-t", "-A", "-c",
        "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'"
    ]);

    if (r.code !== 0) {
        throw new Error(
            `Impossible de vérifier le contenu de la base ${nomBase} :\n${r.sortie}`
        );
    }

    const nombre = Number(r.stdout);
    console.log(`Tables présentes dans ${nomBase} : ${nombre}`);
    return nombre > 0;
};

// ============================================================
// EXECUTER UN FICHIER SQL
// ============================================================

const adapterSql = (sql, utilisateur) =>
    sql
        // OWNER TO <ancien rôle>;  ->  OWNER TO "<utilisateur de l'app>";
        .replace(
            /OWNER TO\s+(?:"[^"]+"|[a-zA-Z_][a-zA-Z0-9_$]*);/gi,
            `OWNER TO "${utilisateur}";`
        )
        // GRANT / REVOKE : les rôles d'origine n'existent pas dans le conteneur
        .replace(/^[ \t]*(?:GRANT|REVOKE)\s[^;]+;[ \t]*(?:\r?\n|$)/gim, "");

const executerFichierSQL = async (
    container,
    utilisateur,
    nomBase,
    cheminSql
) => {
    console.log("========== DEBUT EXECUTION SQL ==========");
    console.log("Fichier SQL :", cheminSql);

    const sqlOriginal = await fs.readFile(cheminSql, "utf8");
    const sql = adapterSql(sqlOriginal, utilisateur);

    if (!sql.trim()) {
        throw new Error("Le fichier SQL est vide.");
    }

    console.log("Taille SQL :", sql.length, "caractères");

    const dossierTemp = await fs.mkdtemp("/tmp/mtefop-pg-");
    const archive = `${dossierTemp}.tar`;

    try {
        await fs.writeFile(`${dossierTemp}/base.sql`, sql, "utf8");
        await tar.c({ cwd: dossierTemp, file: archive }, ["base.sql"]);

        await container.putArchive(await fs.readFile(archive), {
            path: "/tmp"
        });
        console.log("Fichier SQL copié dans le conteneur.");

        console.log("========== EXECUTION PSQL ==========");

        // --single-transaction : en cas d'erreur, tout est annulé
        // (jamais de base à moitié créée)
        const r = await executerCommande(container, [
            "psql",
            "-v", "ON_ERROR_STOP=1",
            "--single-transaction",
            "-U", utilisateur,
            "-d", nomBase,
            "-f", "/tmp/base.sql"
        ]);

        if (r.sortie) {
            console.log(`[PostgreSQL] ${r.sortie}`);
        }
        console.log("Code retour PostgreSQL :", r.code);

        if (r.code !== 0) {
            throw new Error(
                `Erreur pendant l'exécution du fichier SQL (code ${r.code}) :\n${r.sortie}`
            );
        }

        console.log("========== FICHIER SQL EXECUTE AVEC SUCCES ==========");
        return true;
    } finally {
        try {
            await fs.rm(dossierTemp, { recursive: true, force: true });
            await fs.rm(archive, { force: true });
        } catch (error) {
            console.log("Nettoyage temporaire impossible :", error.message);
        }
    }
};

// ============================================================
// CREER ET INITIALISER POSTGRESQL POUR UNE APPLICATION
// ============================================================

const creerPostgreSQL = async (application, detectionDatabase) => {
    const idApp = application.id_app;

    const nomContainer = `mtefop-app-${idApp}-postgres`;
    const nomVolume = `mtefop-app-${idApp}-postgres-data`;
    const nomNetwork = `mtefop-app-${idApp}-network`;
    const nomBase = `app_${idApp}`;
    const utilisateur = `app_${idApp}`;

    console.log("========== CREATION DE POSTGRESQL ================");

    if (!detectionDatabase || !detectionDatabase.chemin) {
        throw new Error("Aucun fichier SQL détecté pour PostgreSQL.");
    }

    await obtenirImagePostgreSQL();

    // Supprimer l'ancienne base (conteneur + volume) avant de la recréer
    if (REINITIALISER_BASE) {
        console.log("Réinitialisation : suppression de l'ancienne base...");
        await supprimerAncienneBase(nomContainer, nomVolume);
    }

    await obtenirOuCreerNetwork(nomNetwork);
    await obtenirOuCreerVolume(nomVolume);

    // --------------------------------------------------------
    // CONTENEUR EXISTANT ? (on relit son mot de passe réel)
    // --------------------------------------------------------

    let container = null;
    let motDePasse = null;

    try {
        const existant = docker.getContainer(nomContainer);
        const info = await existant.inspect();

        console.log("Ancien conteneur PostgreSQL trouvé.");

        motDePasse = obtenirVariable(info.Config?.Env, "POSTGRES_PASSWORD");

        if (!motDePasse) {
            throw new Error(
                `Le conteneur ${nomContainer} existe, ` +
                "mais la variable POSTGRES_PASSWORD est absente."
            );
        }

        if (!info.State.Running) {
            console.log("Démarrage du conteneur PostgreSQL existant...");
            await existant.start();
        }

        container = existant;
    } catch (error) {
        if (error.statusCode !== 404) {
            throw error;
        }
    }

    // --------------------------------------------------------
    // NOUVEAU CONTENEUR
    // --------------------------------------------------------

    if (!container) {
        console.log("Création d'un nouveau conteneur PostgreSQL...");

        motDePasse = crypto.randomBytes(24).toString("hex");

        container = await docker.createContainer({
            name: nomContainer,
            Image: "postgres:16-alpine",
            Env: [
                `POSTGRES_DB=${nomBase}`,
                `POSTGRES_USER=${utilisateur}`,
                `POSTGRES_PASSWORD=${motDePasse}`
            ],
            ExposedPorts: { "5432/tcp": {} },
            HostConfig: {
                Binds: [`${nomVolume}:/var/lib/postgresql/data`],
                NetworkMode: nomNetwork,
                RestartPolicy: { Name: "unless-stopped" }
            }
        });

        await container.start();
        console.log("Nouveau conteneur PostgreSQL créé et démarré.");
    }

    // --------------------------------------------------------
    // PRET -> BASE -> IMPORT SQL (seulement si la base est vide)
    // --------------------------------------------------------

    await attendrePostgreSQL(container, utilisateur, nomBase);

    await assurerBaseExiste(container, utilisateur, nomBase);

    if (await baseContientDesTables(container, utilisateur, nomBase)) {
        console.log(
            "Base déjà initialisée (tables présentes) : import SQL ignoré. " +
            "Pour réimporter, supprimez le conteneur et le volume de cette base."
        );
    } else {
        await executerFichierSQL(
            container,
            utilisateur,
            nomBase,
            detectionDatabase.chemin
        );
    }

    // --------------------------------------------------------
    // ENREGISTRER LES INFORMATIONS DANS LA BASE PRINCIPALE
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
            5432,
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
            `La base ${nomBase} a été initialisée, ` +
            "mais aucune ligne correspondante n'a été trouvée " +
            `dans application_database pour id_app=${idApp}.`
        );
    }

    console.log("Informations PostgreSQL enregistrées.");

    return {
        moteur: "postgresql",
        container_name: nomContainer,
        volume_name: nomVolume,
        network_name: nomNetwork,
        host: nomContainer,
        port: 5432,
        nom_db: nomBase,
        utilisateur: utilisateur,
        mot_de_passe: motDePasse,
        fichier_sql: detectionDatabase.chemin
    };
};

module.exports = { creerPostgreSQL };