const pool = require("../config/database");
const fs = require("fs/promises");
const path = require("path");
const AdmZip = require("adm-zip");
const { detecterMoteurSQL } = require("./detecterMoteurSQL");
const { envoyerMessage } = require("./envoyerMessageService");

// ==================================================
// RÉCUPÉRER UNE APPLICATION POUR LE DÉPLOIEMENT
// ==================================================
const obtenirAppPourDeploiement = async (io, id_app) => {

    envoyerMessage(io, "Debut de deploiement venat de service...", 1);

    const result = await pool.query(
        `
        SELECT
            a.id_app,
            a.id_cat,
            a.nom_app,
            a.nom_bouton_app,
            a.description_app,
            a.icone_app,
            a.type_app,
            a.url_app,
            a.source_app,
            a.visible_app,
            a.statut_app,
            a.port_app,
            a.date_creation,
            a.date_modification,
            ad.moteur_db

        FROM applications  a
        LEFT JOIN application_database ad
            ON ad.id_app = a.id_app
        WHERE a.id_app = $1
        `,
        [id_app]
    );
    if (result.rows.length === 0) {
        throw new Error(
            "Application introuvable."
        );
    }
    
    const application = result.rows[0];
    if (application.type_app !== "docker") {

        throw new Error(
            "Cette application ne nécessite pas de déploiement Docker."
        );
    }
    if (!application.source_app) {
        throw new Error(
            "Aucun fichier ZIP n'est associé à cette application."
        );
    }
    return application;
};
// ==================================================
// OBTENIR LE CHEMIN RÉEL DU ZIP
// ==================================================
const obtenirCheminZip = (source_app) => {
    if (!source_app) {
        return null;
    }
    // Si le chemin est déjà absolu
    if (path.isAbsolute(source_app)) {
        return source_app;
    }
    // Exemple :
    // uploads/applications/mon-app.zip
    //
    // devient :
    // /app/uploads/applications/mon-app.zip

    return path.join(
        process.cwd(),
        source_app
    );
};

//===================================================
//LIRE LE CONTENU D'UN DOSSIER
//===================================================
const lireContenuDossier = async (dossier) => {
    return await fs.readdir(
        dossier,
        {
            withFileTypes: true
        }
    );
};
//=================================
//SUPPRIMER TOUS LES NODES MODULES
//=====================
const supprimerNodeModules = async (dossier) => {
    const contenu = await fs.readdir(
        dossier,
        {
            withFileTypes: true
        }
    );

    for (const element of contenu) {
        const chemin = path.join(
            dossier,
            element.name
        );

        //si c'est un dossier
        if (element.isDirectory()) {

            //si le dossier s'appelle node_modules

            if (element.name === "node_modules") {
                console.log("Suppression node_modules :", chemin);

                await fs.rm(
                    chemin,
                    {
                        recursive: true,
                        force: true
                    }
                );
                continue;
            }

            // sinon on continue a chercher

            await supprimerNodeModules(chemin);
        } 
    }
}



// ==================================================
// PRÉPARER L'APPLICATION
// ==================================================
const preparerApplication = async (io, application) => {
    envoyerMessage(io, "Preparation d'application...", 2);
    // 1. CHEMIN DU ZIP
    const cheminZip =
        obtenirCheminZip(
            application.source_app
    );
    envoyerMessage(io, `Zip à utiliser: ${cheminZip}`, 3);
    console.log(
        "Zip à utiliser :",
        cheminZip
    );

    // ==========================================
    // 2. VÉRIFIER QUE LE ZIP EXISTE
    // ==========================================
    envoyerMessage(io, "Verification du fichier zip...", 4);
    try {
        await fs.access(
            cheminZip
        );
        console.log(
            "ZIP trouvé"
        );
    } catch (error) {

        console.error(
            "Erreur fs.access :",
            error
        );
        throw new Error(
            `Le fichier ZIP est introuvable : ${cheminZip}`
        );
    }
    // =========================================
    // 3. DOSSIER DE TRAVAIL
    // ==========================================
    envoyerMessage(io, "Creation d'espace de travail...", 5);
    const workspaceRoot =
        path.join(
            process.cwd(),
            "workspaces"
        );
    const workspace =
        path.join(
            workspaceRoot,
            `app_${application.id_app}`
        );
    console.log(
        "Workspace :",
        workspace
    );
    
    // ==========================================
    // 4. SUPPRIMER L'ANCIEN WORKSPACE
    // ==========================================
    await fs.rm(
        workspace,
        {
            recursive: true,
            force: true
        }
    );
    console.log(
        "Ancien workspace supprimé."
    );
    // ==========================================
    // 5. CRÉER LE NOUVEAU WORKSPACE
    // ==========================================
    await fs.mkdir(
        workspace,
        {
            recursive: true
        }
    );
    console.log(
        "Nouveau workspace créé"
    );
    envoyerMessage(io, `Espace de travail crée: ${workspace}`, 6);
    // ==========================================
    // 6. OUVRIR LE ZIP
    // ==========================================
    envoyerMessage(io, `Ouverture du fichier zip...`, 7);
    let zip;
    try { 
        zip = new AdmZip(
            cheminZip
        );
        console.log(
            "ZIP ouvert"
        );
    } catch (error) {
        console.error(
            "Erreur ouverture ZIP :",
            error
        );
        throw new Error(
            `Impossible d'ouvrir le fichier ZIP : ${error.message}`
        );
    }
    // ==========================================
    // 7. VÉRIFIER LES CHEMINS DU ZIP
    // ==========================================
    const entrees =
        zip.getEntries();
    console.log(
        "Nombre d'éléments dans le ZIP :",
        entrees.length
    );

    envoyerMessage(io, `Zip ouvert, nombre: ${entrees.length}`, 8);
    envoyerMessage(io, `Verification d'autorisation...`, 9);
    // Protection contre les chemins
    // qui sortiraient du workspace
    for (const entree of entrees) {
        const cheminEntree =
            path.resolve(
                workspace,
                entree.entryName
            );

        const workspaceAbsolu =
            path.resolve(
                workspace
            );


        if (
            cheminEntree !== workspaceAbsolu &&
            !cheminEntree.startsWith(
                workspaceAbsolu + path.sep
            )
        ) {

            throw new Error(
                `Entrée ZIP non autorisée : ${entree.entryName}`
            );
        }
    }


    // ==========================================
    // 8. EXTRAIRE LE ZIP
    // ==========================================
    envoyerMessage(io, `Extraction du fichier...`, 10);
    try {
        zip.extractAllTo(
            workspace,
            true
        );
        console.log(
            "ZIP extrait avec succès"
        );
        envoyerMessage(io, `Extraction terminée`, 11);

        await supprimerNodeModules(workspace);

        console.log("Tous les node_modules ont été supprimés");

    } catch (error) {
        console.error(
            "Erreur extraction ZIP :",
            error
        );

        throw new Error(
            `Erreur lors de l'extraction du ZIP ou le nettoyage de node_modules : ${error.message}`
        );
    }
    // 10. RETOURNER LES INFORMATIONS
    return {
        cheminZip,
        workspace
    };
};
//=====================================================

//TROUVER LE DOSSIER REEL DU PROJET

//===================================================

const trouveRacineProjet = async (workspace) => {
     
    const contenu = await lireContenuDossier(workspace);
    
    // CAS 1 les fichiers sont directements a la racine 
    const noms = contenu.map(
        (element) => 
            element.name
    );
    
    const contientFrontend = noms.includes("frontend");
    
    // FRONTEND OBLIGATOIRE
    if (!contientFrontend) {
        throw new Error("Structure du projet invalide, le dossier appélé 'frontend' est obligatoirement placé à la racine du fichier zip.");
    }
    console.log("frontend:", contientFrontend);

    return workspace;

};
// =================== ========================= =========================

//DETECTER LA TECNOLOGIE FRONTEND (react, angular, vue, html/css/jvascript)

// =================== ================================= =================

const detecterTechnologieFrontend = async (frontendPath) => {
    //verifier que le dossier existe
    try {
        await fs.access(frontendPath);
    } catch (error) {
        throw new Error("Le dossier frontend est introuvable. Le dossier frontend doit etre à la racine du zip");
    }

    const contenu = await lireContenuDossier(frontendPath);

    const noms = contenu.map(
        (element) => 
            element.name
        
    );
    //===============PACKAGE.JSON============================
    //========= ==================== ========================

    if (noms.includes("package.json")) {
        const packagePath = path.join(
            frontendPath,
            "package.json"
        );

        let packageJson;
        try {
            const packageContent = await fs.readFile(
                packagePath,
                "utf8"
            );
            packageJson = JSON.parse(packageContent);
        } catch (error) {
            throw new Error (`Impossible de lire le package json du frontend: ${error.message}`);
        }

        const dependencies = {
            ...(packageJson.dependencies || {}),
            ...(packageJson.devDependencies || {})
        };

        //===============ANGULAR ================================
        if (dependencies["@angular/core"] || dependencies["@angular/cli"]) {
            return {
                technologie: "Angular",
                fichier_detecte: "package.json"
            };
        }
        //=================VUES================================
        if (dependencies.vue || dependencies["@vue/cli-service"]) {
            return {
                technologie: "Vue",
                fichier_detecte: "package.json"
            };
        }

        //==================REACT==========================
        if (
            dependencies.react || 
            dependencies["@vitejs/plugin-react"] ||
            dependencies.next
        ) {
            return {
                technologie: "React",
                fichier_detecte: "package.json"
            };
        }

    }

    // ================== HTML/CSS/JAVASCRIPT==========================
    // ============== ================= ==============================
    const contientIndexHtml = noms.includes("index.html");
    
    const contientHtml = noms.some((nom) => 
        nom.toLowerCase().endsWith(".html")
    );

    if (contientIndexHtml || contientHtml) {
        return {
            technologie: "HTML/CSS/JavaScript",
            fichier_detecte: "index.html"
        }
    }

    //frontend inconu
    return {
        technologie: "inconue",
        fichier_detecte: null
    };
};
 
// ======================== ========================== ==

// DETECTER LE BACKEND (EXPRESS, NODE.JS, PYTHON, PHP)

// =====================================================
const detecterTechnologieBackend = async (backendPath) => {
    try {
        await fs.access(backendPath);
    } catch (error) {
        return null;
    }

    const contenu = await lireContenuDossier(backendPath);

    const noms = contenu.map(
        (element) => element.name
    );

    // ================ NODE.JS/EXPRESS=====================

    if (noms.includes("package.json")) {
        const packagePath = path.join(
            backendPath, 
            "package.json"
        );
        let packageJson;

        try {
            const packageContent = await fs.readFile(
                packagePath,
                "utf8"
            );
            packageJson = JSON.parse(packageContent);
        } catch (error) {
            throw new Error(`Impossible de lire le package.json du backend: ${error.message}`);
        }

        const dependencies = {
            ...(packageJson.dependencies || {}),
            ...(packageJson.dependencies || {})
        };

        // ===============EXPRESS=====================
        if (dependencies.express) {
            return {
                technologie: "Node.js",
                fichier_detecte: "package.json"
            };
        }
    }

    // =================PYTHON ==================================

    if (
        noms.includes("requirements.txt") ||
        noms.includes("manage.py")
    ) {
        return {
            technologie: "Python",
            fichier_detecte: noms.includes("requirements.txt")
                ? "requirements.txt"
                : "manage.py"
        };
    }

    // ================= PHP =============================

    if (noms.includes("composer.json") || noms.includes("index.php")) {
        return {
            technologie: "PHP",
            fichier_detecte : noms.includes("composer.json")
                ? "composer.json"
                : "index.php"
        };
    }

    // = ============== PYTHON PAR FICHER .PY =================

    const contientPython = noms.some(
        (nom) => nom.toLowerCase().endsWith(".py")
    );

    if (contientPython) {
        return {
            technologie: "Python",
            fichier_detecte: ".py"
        };
    }

    // ================= PHP PAR FICHIER .PHP ====================

    const contienPhp = noms.some(
        (nom) => nom.toLowerCase().endsWith(".php")
    );

    if (contienPhp) {
        return {
            technologie: "PHP",
            fichier_detecte: ".php"
        };
    }

    const contientJavaScript = noms.some(
        (nom) => nom.toLowerCase().endsWith(".js")
    );
    if (contientJavaScript) {
        return {
            technologie: "Node.js",
            fichier_detecte: ".js"
        };
    }

    return {
        technologie: "Inconnue",
        fichier_detecte: null 
    };
};

//==========================================================

//==================DATABASE (TROVER LE FICHIER SQL) =========================

//=========================================================

const trouverFichierSql = async (databasePath) => {
    try {
        await fs.access(databasePath);
    } catch (error) {
        throw new Error(`Vous choisit une base de données dans le formulaire mais 
            le dossier databse est abscent.Veuiller mettre un fichier de base de données dans le dossier 'database'
            à la racine de votre projet ou modifier ton application et choisir aucune base`);
    }

    const contenu = await lireContenuDossier(databasePath);

    const fichiersSQL = contenu.filter(
        (element) => element.isFile() && 
                    element.name
                        .toLowerCase()
                        .endsWith(".sql")
    );

    if (fichiersSQL.length === 0) {
        throw new Error (`Aucun fichier SQL trouvé.
            Veuiller mettre votre fichier sql dans le dossier "database" de votre projet`
        );
    }

    //on utilise le fichier sql trouvé pour l'instant
    const fichierSQL = fichiersSQL[0];

    return {
        nom: fichierSQL.name,
        chemin: path.join(
            databasePath,
            fichierSQL.name
        )
    };

};


//=================================================================

//========================== ANALYSER LA BASE DE DONNÉES========

// ===========================================================


const analyserBaseDeDonnees = async (io,projectRoot, moteurDB) => {
    envoyerMessage(io, `Analyse de base des données...`, 15);
    // =========================================
    // 1. AUCUNE BASE DE DONNÉES SÉLECTIONNÉE
    // =========================================
    if (!moteurDB || moteurDB.toLowerCase() === "aucune") {
        return null;
    }

    const moteurChoisi = String(moteurDB).trim().toLowerCase();

    const moteursAcceptes = [
        "postgres",
        "postgresql",
        "mysql",
        "mariadb"
    ];

    if (!moteursAcceptes.includes(moteurChoisi)) {
        throw new Error(
            `Moteur de base de données non supporté : ${moteurDB}`
        );
    }

    // =========================================
    // 2. RECHERCHER LE FICHIER SQL
    // =========================================
    const databasePath = path.join(projectRoot, "database");

    const fichierSQL = await trouverFichierSql(databasePath);

    console.log("Fichier SQL :", fichierSQL.nom);
    console.log("Chemin SQL :", fichierSQL.chemin);
    console.log("Moteur sélectionné :", moteurChoisi);
    envoyerMessage(io, `Technologie database: ${moteurChoisi}: ${fichierSQL.nom}`, 16);
    // =========================================
    // 3. DÉTECTER LE VRAI MOTEUR DU FICHIER
    // =========================================

    const resultatDetection = await detecterMoteurSQL(
        io,
        fichierSQL.chemin
    );

    const moteurDetecte = String(
        resultatDetection?.moteur || "inconnu"
    ).trim().toLowerCase();

    console.log("Moteur détecté dans le SQL :", moteurDetecte);
    console.log(
        "Raison de détection :",
        resultatDetection?.raison || "Aucune précision"
    );

    // =========================================
    // 4. NORMALISER LES MOTEURS
    // =========================================
    const normaliserMoteur = (moteur) => {
        if (moteur === "postgres") return "postgresql";
        return moteur;
    };

    const moteurNormalise = normaliserMoteur(moteurChoisi);
    const moteurDetecteNormalise = normaliserMoteur(moteurDetecte);

    // MySQL et MariaDB sont traités comme une même famille
    // pour ce contrôle de compatibilité.
    const familleMoteur = (moteur) => {
        if (moteur === "postgresql") return "postgresql";

        if (moteur === "mysql" || moteur === "mariadb") {
            return "mysql";
        }

        return "inconnu";
    };

    const familleChoisie = familleMoteur(moteurNormalise);
    const familleDetectee = familleMoteur(moteurDetecteNormalise);

    // =========================================
    // 5. REFUSER UN FICHIER INCOMPATIBLE
    // =========================================
    if (
        familleDetectee !== "inconnu" &&
        familleChoisie !== familleDetectee
    ) {
        const erreur = new Error(
            `Incompatibilité SQL : le moteur sélectionné est "${moteurChoisi}", ` +
            `mais le fichier "${fichierSQL.nom}" semble être destiné à ` +
            `"${moteurDetecte}". Veuillez sélectionner le bon moteur ` +
            `ou fournir un fichier SQL compatible.`
        );

        erreur.statusCode = 400;
        erreur.code = "INCOMPATIBILITE_MOTEUR_SQL";

        throw erreur;
    }

    // =========================================
    // 6. JOURNALISER UNE DÉTECTION INCERTAINE
    // =========================================
    if (familleDetectee === "inconnu") {
        console.warn(
            "Attention : impossible de déterminer avec certitude " +
            "le moteur SQL du fichier."
        );
    }

    // =========================================
    // 7. RETOURNER LES INFORMATIONS
    // =========================================
    return {
        moteur: moteurChoisi,
        moteur_detecte: moteurDetecte,
        type_fichier: "sql",
        fichier: fichierSQL.nom,
        chemin: fichierSQL.chemin
    };
};


//=======================================================================
// ============DETECTER LA STRUCTURE DU PROJET =======================

const detecterTechnologie = async (
    io,
    projectRoot,
    moteurDB = null
) => {
    console.log("========================");
    console.log("ANALYSE DU PROJET");

    envoyerMessage(io, `Analyse du projet...`, 12);
    console.log(
        "Racine:", projectRoot
    );
    
    const contenu = await lireContenuDossier(projectRoot);
    const noms = contenu.map(
        (element) => element.name
    );

    const contientFrontend = noms.includes("frontend");
    const contienBackend = noms.includes("backend");
    
    if (!contientFrontend) {
        throw new Error ('Le projet doit obligatoirement contenir de dossier "frontend".');
    }

    //=======================DETECTION FRONTEND ========================
    const frontendPath = path.join(
        projectRoot,
        "frontend"
    );
    const frontend = await detecterTechnologieFrontend(frontendPath);

    if (frontend.technologie === "inconnue") {
        throw new Error ("Technologie frontend inconnue. Utiliser react, Vue, Angular ou HTML/CSS/JavaScript");
    }

    console.log("Frontend:" , frontend.technologie);
    envoyerMessage(io, `Technologie frontend: ${frontend.technologie}`, 13);

    //=========================DETECTION BACKEND========================
    let backend = null;
    if (contienBackend) {
        const backendPath = path.join(
            projectRoot,
            "backend"
        );
        backend = await detecterTechnologieBackend(backendPath);

        if (!backend || backend.technologie === "inconnue") {
            throw new Error ("Technologie backend inconnue. Utiliser Node.js, Express, Pythpn ou PHP.");
        }

        console.log("Backend: ", backend.technologie);
        envoyerMessage(io, `Technologie backend: ${backend.technologie} || null`, 14);
    }

    // ======================DETECTION BASE DES DONNÉES=========================
    let database = null;
    if (moteurDB && moteurDB !== "aucune") {
        database = await analyserBaseDeDonnees(io,projectRoot, moteurDB);
        console.log("base des données:", database.moteur);
        console.log("fichier base:", database.chemin);

    }

    //================= FRONTEND SEULEMENY=====================================

    if (
        !contienBackend &&
        (!moteurDB || moteurDB === "aucune") 
    ) {
        return {
            type_projet: "C",
            desciption: "frontend seulement",
            frontend: {
                chemin: frontendPath,
                technologie: frontend.technologie,
                fichier_detecte: frontend.fichier_detecte
                
            },
            backend : null,
            database : null
        };
    }
        //================== BASE DES DONNÉES SANS BACKEND===========================

    if (
        !contienBackend && 
        (moteurDB && moteurDB !== "aucune")
    ) {
        throw new Error("Une base de données est selectionnée, mais aucun backend n'a été trouvé.");
    }

    //========================FRONTEND+ BACKEND+DATABASE =================================

    if (
        contienBackend &&
        moteurDB &&
        moteurDB !== "aucune"
    ) {
        return {
            type_projet: "B",
            desciption: "Frontend + Backend + Database",
            frontend : {
                chemin: frontendPath,
                technologie: frontend.technologie,
                fichier_detecte: frontend.fichier_detecte
            },
            backend : {
                chemin: path.join(projectRoot, "backend"),
                technologie: backend.technologie,
                fichier_detecte: backend.fichier_detecte
            },
            database
        };
    }

    // ======================= TYPE A FRONTEND + BACKEND ==================================

    if (contienBackend && 
        (!moteurDB || moteurDB === "aucune")
    ) {
        return {
            type_projet: "A",
            desciption: "Frontend + backend",
            frontend: {
                chemin : frontendPath,
                technologie: frontend.technologie,
                fichier_detecte: frontend.technologie
            },
            backend: {
                chemin: path.join(projectRoot, "backend"),
                technologie : backend.technologie,
                fichier_detecte: backend.fichier_detecte
            },
            database: null
        };
    }

    //STRUCTURE NON PRISE EN CHARGE

    throw new Error ("Structure du projet non pris en charge");
   
}
// ==================================================
// EXPORTS
// ==================================================

module.exports = {
    obtenirAppPourDeploiement,
    obtenirCheminZip,
    preparerApplication,
    lireContenuDossier,
    trouveRacineProjet,
    detecterTechnologieFrontend,
    detecterTechnologieBackend,
    trouverFichierSql,
    analyserBaseDeDonnees,
    detecterTechnologie,
    envoyerMessage
};