const fs = require("fs/promises");
const path = require("path");
const docker = require("../config/docker");

// ============================================================
// CONSTANTES
// ============================================================

// Port interne écouté par chaque type de backend
const PORTS_BACKEND = {
    "Node.js": 5000,
    "Express": 5000,
    "Python": 8000,
    "PHP": 80
};

// Port interne de chaque moteur de base de données
const PORTS_DB = {
    mysql: 3306,
    mariadb: 3306,
    postgresql: 5432,
    postgres: 5432
};

// Préfixe des routes API : le frontend appelle /api/... et nginx redirige vers le backend
const PREFIXE_API = "/api/";

// ============================================================
// TEMPLATES DOCKERFILE
// ============================================================

const DOCKERFILE_FRONTEND_NPM = `
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./

RUN if [ -f package-lock.json ]; then \\
        npm ci --include=dev --no-audit --no-fund; \\
    else \\
        npm install --include=dev --no-audit --no-fund; \\
    fi

COPY . .

RUN npm run build

RUN mkdir -p /output

RUN if [ -d "dist" ]; then \\
        cp -r dist/. /output/; \\
    elif [ -d "build" ]; then \\
        cp -r build/. /output/; \\
    else \\
        echo "Impossible de trouver le dossier de build frontend."; \\
        exit 1; \\
    fi


FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build /output /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
`;

const DOCKERFILE_FRONTEND_HTML = `
FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY . /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
`;

const DOCKERFILE_BACKEND_NODE = `
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN if [ -f package-lock.json ]; then \\
        npm ci --omit=dev --no-audit --no-fund; \\
    else \\
        npm install --omit=dev --no-audit --no-fund; \\
    fi

COPY . .

ENV PORT=5000

EXPOSE 5000

CMD ["npm", "start"]
`;

const DOCKERFILE_BACKEND_PYTHON = `
FROM python:3.12-slim

WORKDIR /app

COPY . .

RUN if [ -f requirements.txt ]; then \\
        pip install --no-cache-dir --root-user-action=ignore -r requirements.txt; \\
    fi

ENV PORT=8000

EXPOSE 8000

CMD ["python", "app.py"]
`;

const DOCKERFILE_BACKEND_PHP = `
FROM php:8.3-apache

WORKDIR /var/www/html

COPY . /var/www/html/

RUN a2enmod rewrite

EXPOSE 80

CMD ["apache2-foreground"]
`;

// ============================================================
// NGINX (généré dynamiquement : proxy /api vers le backend)
// ============================================================

/**
 * Le navigateur ne peut pas joindre "mtefop-app-5-backend" (nom interne Docker).
 * Le frontend appelle donc /api/... (même origine) et nginx relaie vers le backend
 * à l'intérieur du réseau Docker. Pas de CORS, pas de port backend à exposer.
 */
const genererNginxConfig = (backend) => {
    const proxy = backend
        ? `
    location ${PREFIXE_API} {
        resolver 127.0.0.11 valid=10s;
        set $backend_upstream http://${backend.hote}:${backend.port};
        proxy_pass $backend_upstream;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
`
        : "";

    return `
server {
    listen 80;
    server_name _;
    client_max_body_size 50m;

    root /usr/share/nginx/html;
    index index.html;
${proxy}
    location / {
        try_files $uri $uri/ /index.html;
    }
}
`;
};

// ============================================================
// DOCKERIGNORE
// ============================================================

const DOCKERIGNORE_FRONTEND = `
node_modules
dist
build
.git
.gitignore
Dockerfile
.dockerignore
npm-debug.log
`;

const DOCKERIGNORE_BACKEND_NODE = `
node_modules
.git
.gitignore
Dockerfile
.dockerignore
npm-debug.log
`;

const DOCKERIGNORE_BACKEND_PYTHON = `
__pycache__
*.pyc
.venv
venv
.git
.gitignore
Dockerfile
.dockerignore
`;

const DOCKERIGNORE_BACKEND_PHP = `
.git
.gitignore
Dockerfile
.dockerignore
`;

// ============================================================
// UTILITAIRES
// ============================================================

const ecrireFichier = async (chemin, contenu) => {
    // On retire l'indentation éventuelle et on termine par un saut de ligne
    const propre = contenu.replace(/^[ \t]+/gm, "").trim();
    await fs.writeFile(chemin, propre + "\n", "utf8");
};

const nomsApplication = (idApp) => {
    const base = `mtefop-app-${idApp}`.toLowerCase();
    return {
        base,
        reseau: `${base}-network`, // même réseau que celui créé par databaseService
        conteneurFrontend: `${base}-frontend`,
        conteneurBackend: `${base}-backend`,
        imageFrontend: `${base}-frontend:latest`,
        imageBackend: `${base}-backend:latest`
    };
};

const pause = (ms) => new Promise((r) => setTimeout(r, ms));

// ============================================================
// GÉNÉRATION DES DOCKERFILES
// ============================================================

const genererDockerfileFrontend = async (frontendPath, technologie, nginxConfig) => {
    let dockerfile;

    if (technologie === "HTML/CSS/JavaScript") {
        dockerfile = DOCKERFILE_FRONTEND_HTML;
    } else if (["React", "Vue", "Angular"].includes(technologie)) {
        dockerfile = DOCKERFILE_FRONTEND_NPM;
    } else {
        throw new Error(`Technologie frontend non supportée : ${technologie}`);
    }

    await ecrireFichier(path.join(frontendPath, "Dockerfile"), dockerfile);
    await ecrireFichier(path.join(frontendPath, ".dockerignore"), DOCKERIGNORE_FRONTEND);
    await ecrireFichier(path.join(frontendPath, "nginx.conf"), nginxConfig);

    return path.join(frontendPath, "Dockerfile");
};

const genererDockerfileBackend = async (backendPath, technologie) => {
    let dockerfile;
    let dockerignore;

    if (technologie === "Node.js" || technologie === "Express") {
        dockerfile = DOCKERFILE_BACKEND_NODE;
        dockerignore = DOCKERIGNORE_BACKEND_NODE;
    } else if (technologie === "Python") {
        dockerfile = DOCKERFILE_BACKEND_PYTHON;
        dockerignore = DOCKERIGNORE_BACKEND_PYTHON;
    } else if (technologie === "PHP") {
        dockerfile = DOCKERFILE_BACKEND_PHP;
        dockerignore = DOCKERIGNORE_BACKEND_PHP;
    } else {
        throw new Error(`Technologie backend non supportée : ${technologie}`);
    }

    await ecrireFichier(path.join(backendPath, "Dockerfile"), dockerfile);
    await ecrireFichier(path.join(backendPath, ".dockerignore"), dockerignore);

    return path.join(backendPath, "Dockerfile");
};

const genererDockerfiles = async (projectRoot, detection, { idApp }) => {
    const noms = nomsApplication(idApp);
    const resultat = { frontend: null, backend: null };

    // Le backend est généré en premier : nginx a besoin de son nom et de son port
    if (detection.backend) {
        resultat.backend = await genererDockerfileBackend(
            detection.backend.chemin,
            detection.backend.technologie
        );
    }

    if (detection.frontend) {
        const backendInfo = detection.backend
            ? {
                  hote: noms.conteneurBackend,
                  port: PORTS_BACKEND[detection.backend.technologie]
              }
            : null;

        resultat.frontend = await genererDockerfileFrontend(
            detection.frontend.chemin,
            detection.frontend.technologie,
            genererNginxConfig(backendInfo)
        );
    }

    console.log("Dockerfiles générés");
    return resultat;
};

// ============================================================
// BUILD DES IMAGES
// ============================================================

const construireImage = async (dossier, nomImage) => {
    console.log("==========================");
    console.log("BUILD DOCKER");
    console.log("dossier:", dossier);
    console.log("Nom image:", nomImage);

    try {
        const stream = await docker.buildImage(
            { context: dossier, src: ["."] },
            { t: nomImage, nocache: true }
        );

        await new Promise((resolve, reject) => {
            docker.modem.followProgress(
                stream,
                (err, output) => {
                    console.log("FIN BUILD");
                    if (err) return reject(err);

                    const erreurDocker = output.find((e) => e.error);
                    if (erreurDocker) return reject(new Error(erreurDocker.error));

                    resolve(output);
                },
                (event) => {
                    if (event.stream) process.stdout.write(event.stream);
                    if (event.error) console.error("DOCKER ERROR:", event.error);
                }
            );
        });

        console.log(`Image Docker créée avec succès : ${nomImage}`);
        return { nom_image: nomImage, succes: true };
    } catch (err) {
        console.error(`Erreur build ${nomImage}`, err);
        throw new Error(
            `Erreur pendant la construction de l'image ${nomImage} : ${err.message}`
        );
    }
};

const construireImages = async (projectRoot, detection, idApp) => {
    const noms = nomsApplication(idApp);
    const resultat = { frontend: null, backend: null };

    if (detection.frontend) {
        resultat.frontend = await construireImage(
            detection.frontend.chemin,
            noms.imageFrontend
        );
    }
    if (detection.backend) {
        resultat.backend = await construireImage(
            detection.backend.chemin,
            noms.imageBackend
        );
    }
    return resultat;
};

// ============================================================
// RÉSEAU
// ============================================================

const assurerReseau = async (nomReseau, idApp) => {
    const reseaux = await docker.listNetworks({ filters: { name: [nomReseau] } });
    const existant = reseaux.find((r) => r.Name === nomReseau);
    if (existant) return docker.getNetwork(existant.Id);

    await docker.createNetwork({
        Name: nomReseau,
        Driver: "bridge",
        Labels: { "mtefop.app": String(idApp) }
    });
    return docker.getNetwork(nomReseau);
};

/**
 * Rattache un conteneur déjà existant (ex: la base de données) au réseau de l'app.
 * Idempotent : ne plante pas s'il est déjà connecté.
 */
const connecterAuReseau = async (nomReseau, nomConteneur, alias) => {
    const reseau = docker.getNetwork(nomReseau);
    try {
        await reseau.connect({
            Container: nomConteneur,
            EndpointConfig: { Aliases: alias ? [alias] : [] }
        });
    } catch (err) {
        const dejaConnecte =
            err.statusCode === 403 || /already exists/i.test(err.message || "");
        if (!dejaConnecte) throw err;
    }
};

// ============================================================
// CONTENEURS
// ============================================================

const supprimerConteneur = async (nom) => {
    try {
        await docker.getContainer(nom).remove({ force: true });
    } catch (err) {
        if (err.statusCode !== 404) throw err;
    }
};

/**
 * Crée et démarre un conteneur sur le réseau de l'app.
 * Si publier = true, Docker choisit un port libre sur l'hôte et on le lit ensuite.
 */
const creerEtDemarrerConteneur = async ({
    nom,
    image,
    reseau,
    env = [],
    portInterne,
    publier = false,
    idApp,
    role
}) => {
    await supprimerConteneur(nom); // redéploiement propre

    const cle = `${portInterne}/tcp`;

    const conteneur = await docker.createContainer({
        name: nom,
        Image: image,
        Env: env,
        Labels: { "mtefop.app": String(idApp), "mtefop.role": role },
        ExposedPorts: { [cle]: {} },
        HostConfig: {
            NetworkMode: reseau,
            RestartPolicy: { Name: "unless-stopped" },
            PortBindings: publier ? { [cle]: [{ HostPort: "" }] } : {}
        },
        NetworkingConfig: {
            EndpointsConfig: { [reseau]: { Aliases: [nom] } }
        }
    });

    await conteneur.start();

    let portHote = null;
    if (publier) {
        const info = await conteneur.inspect();
        const bindings = info.NetworkSettings.Ports[cle];
        portHote = bindings && bindings[0] ? Number(bindings[0].HostPort) : null;
    }

    return { nom, portHote };
};

/**
 * Vérifie que le conteneur tourne encore quelques secondes après le démarrage.
 * Sinon, remonte les dernières lignes de log dans l'erreur.
 */
const verifierDemarrage = async (nom, delaiMs = 4000) => {
    await pause(delaiMs);
    const conteneur = docker.getContainer(nom);
    const info = await conteneur.inspect();

    if (!info.State.Running || info.State.Restarting) {
        const logs = await conteneur.logs({ stdout: true, stderr: true, tail: 30 });
        throw new Error(
            `Le conteneur ${nom} s'est arrêté (code ${info.State.ExitCode}).\n${logs
                .toString("utf8")
                .replace(/[^\x09\x0A\x20-\x7E\u00A0-\uFFFF]/g, "")}`
        );
    }
};

// ============================================================
// VARIABLES D'ENVIRONNEMENT DU BACKEND (connexion à la base)
// ============================================================

/**
 * baseDeDonnees = {
 *   moteur: "postgresql" | "mysql" | "mariadb",
 *   conteneur: "mtefop-app-5-mysql",   // nom du conteneur de la base
 *   utilisateur, motDePasse, nom        // identifiants créés par databaseService
 * }
 */
const construireEnvBackend = (baseDeDonnees, portBackend) => {
    const env = [`PORT=${portBackend}`, "NODE_ENV=production"];
    if (!baseDeDonnees) return env;

    const moteur = baseDeDonnees.moteur.toLowerCase();
    const port = PORTS_DB[moteur];
    const hote = baseDeDonnees.conteneur; // résolu par le DNS interne Docker
    const user = encodeURIComponent(baseDeDonnees.utilisateur);
    const pass = encodeURIComponent(baseDeDonnees.motDePasse);
    const nom = baseDeDonnees.nom;
    const estPostgres = moteur === "postgresql" || moteur === "postgres";

    env.push(
        `DB_HOST=${hote}`,
        `DB_PORT=${port}`,
        `DB_USER=${baseDeDonnees.utilisateur}`,
        `DB_PASSWORD=${baseDeDonnees.motDePasse}`,
        `DB_NAME=${nom}`,
        `DB_DIALECT=${estPostgres ? "postgres" : moteur}`,
        `DATABASE_URL=${estPostgres ? "postgresql" : "mysql"}://${user}:${pass}@${hote}:${port}/${nom}`
    );

    if (estPostgres) {
        env.push(
            `PGHOST=${hote}`,
            `PGPORT=${port}`,
            `PGUSER=${baseDeDonnees.utilisateur}`,
            `PGPASSWORD=${baseDeDonnees.motDePasse}`,
            `PGDATABASE=${nom}`
        );
    }
    return env;
};

// ============================================================
// DÉPLOIEMENT COMPLET
// ============================================================

// ============================================================
// BASE DE DONNÉES : vérification et attente de disponibilité
// ============================================================

// Exécute une commande dans un conteneur et renvoie true si elle réussit (code 0)
const executerSonde = async (conteneur, cmd) => {
    const exec = await conteneur.exec({ Cmd: cmd, AttachStdout: true, AttachStderr: true });
    const stream = await exec.start({});
    await new Promise((resolve) => {
        stream.on("end", resolve);
        stream.on("close", resolve);
        stream.resume();
    });
    const resultat = await exec.inspect();
    return resultat.ExitCode === 0;
};

/**
 * Vérifie que les infos de la base sont complètes, que son conteneur existe,
 * qu'il tourne (sinon il est démarré) et qu'il accepte les connexions.
 */
const verifierBaseDeDonnees = async (baseDeDonnees) => {
    const manquants = ["moteur", "conteneur", "nom", "utilisateur", "motDePasse"].filter(
        (champ) => !baseDeDonnees[champ]
    );
    if (manquants.length) {
        throw new Error(
            `Informations de la base incomplètes, champ(s) manquant(s) : ${manquants.join(", ")}`
        );
    }

    const moteur = baseDeDonnees.moteur.toLowerCase();
    if (!PORTS_DB[moteur]) {
        throw new Error(`Moteur de base non supporté : ${baseDeDonnees.moteur}`);
    }

    const conteneur = docker.getContainer(baseDeDonnees.conteneur);

    let info;
    try {
        info = await conteneur.inspect();
    } catch (err) {
        if (err.statusCode === 404) {
            throw new Error(`Le conteneur de base ${baseDeDonnees.conteneur} n'existe pas`);
        }
        throw err;
    }

    if (!info.State.Running) {
        console.log(`Démarrage du conteneur de base ${baseDeDonnees.conteneur}`);
        await conteneur.start();
    }

    const estPostgres = moteur === "postgresql" || moteur === "postgres";
    const sonde = estPostgres
        ? ["pg_isready", "-U", baseDeDonnees.utilisateur]
        : [
              "sh",
              "-c",
              "mysqladmin ping -h 127.0.0.1 --silent || mariadb-admin ping -h 127.0.0.1 --silent"
          ];

    for (let essai = 1; essai <= 30; essai++) {
        try {
            if (await executerSonde(conteneur, sonde)) {
                console.log(`Base ${baseDeDonnees.conteneur} prête`);
                return;
            }
        } catch (_) {
            /* conteneur pas encore prêt, on réessaie */
        }
        await pause(1000);
    }
    throw new Error(
        `La base ${baseDeDonnees.conteneur} n'accepte pas encore les connexions après 30 s`
    );
};

/**
 * Pipeline complet : Dockerfiles -> images -> réseau -> DB -> backend -> frontend.
 * Retourne l'URL à ouvrir dans le navigateur.
 */
const deployerApplication = async ({
    idApp,
    projectRoot,
    detection,
    baseDeDonnees,
    hotePublic = process.env.PUBLIC_HOST || "localhost"
}) => {
    const noms = nomsApplication(idApp);

    // 1. Dockerfiles + images
    await genererDockerfiles(projectRoot, detection, { idApp });
    await construireImages(projectRoot, detection, idApp);

    // 2. Réseau dédié à l'application
    await assurerReseau(noms.reseau, idApp);

    // 3. La base de données rejoint le réseau (alias "db" en plus de son nom)
    if (baseDeDonnees) {
        await verifierBaseDeDonnees(baseDeDonnees);
        await connecterAuReseau(noms.reseau, baseDeDonnees.conteneur, "db");
        console.log(`Base ${baseDeDonnees.conteneur} connectée au réseau ${noms.reseau}`);
    }

    let backend = null;
    let frontend = null;

    // 4. Backend (non publié si un frontend existe : accessible via /api)
    if (detection.backend) {
        const portBackend = PORTS_BACKEND[detection.backend.technologie];

        backend = await creerEtDemarrerConteneur({
            nom: noms.conteneurBackend,
            image: noms.imageBackend,
            reseau: noms.reseau,
            env: construireEnvBackend(baseDeDonnees, portBackend),
            portInterne: portBackend,
            publier: !detection.frontend, // backend seul (ex: PHP) => on le publie
            idApp,
            role: "backend"
        });
        await verifierDemarrage(noms.conteneurBackend);
    }

    // 5. Frontend (publié sur un port libre de l'hôte)
    if (detection.frontend) {
        frontend = await creerEtDemarrerConteneur({
            nom: noms.conteneurFrontend,
            image: noms.imageFrontend,
            reseau: noms.reseau,
            portInterne: 80,
            publier: true,
            idApp,
            role: "frontend"
        });
        await verifierDemarrage(noms.conteneurFrontend, 2000);
    }

    const portPublic = (frontend && frontend.portHote) || (backend && backend.portHote);

    return {
        succes: true,
        url: portPublic ? `http://${hotePublic}:${portPublic}` : null,
        port: portPublic,
        reseau: noms.reseau,
        conteneurs: {
            frontend: frontend ? frontend.nom : null,
            backend: backend ? backend.nom : null,
            base: baseDeDonnees ? baseDeDonnees.conteneur : null
        }
    };
};

// ============================================================
// ARRÊT / SUPPRESSION
// ============================================================

const arreterApplication = async (idApp, baseDeDonnees) => {
    const noms = nomsApplication(idApp);

    await supprimerConteneur(noms.conteneurFrontend);
    await supprimerConteneur(noms.conteneurBackend);

    // Le réseau et la base appartiennent à databaseService : on les laisse en place.
    // (la base et ses données survivent à l'arrêt de l'application)
    return { succes: true };
};

// ============================================================
// EXPORT
// ============================================================

module.exports = {
    genererDockerfiles,
    construireImage,
    construireImages,
    deployerApplication,
    arreterApplication
};