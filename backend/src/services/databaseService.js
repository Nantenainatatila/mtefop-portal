const {
    creerPostgreSQL
} = require("./databaseServicePostgresql");

const {
    creerMySQL
} = require("./databaseServiceMysql");
const {
    creerMariaDB
} = require("./databaseServiceMariaDB");
const { envoyerMessage } = require("./envoyerMessageService");
// ============================================================
// INITIALISER LA BASE DE DONNÉES D'UNE APPLICATION
// ============================================================

const initialiserBaseDeDonnees = async (
    io,
    application,
    detectionDatabase
) => {
    envoyerMessage(io, `Initialisation de base des données...`, 19);
    if (!application) {
        throw new Error(
            "Aucune application fournie."
        );
    }

    const moteur = String(
        application.moteur_db 
    )
        .trim()
        .toLowerCase();
    console.log(
        "================================================"
    );
    console.log(
        "INITIALISATION DE LA BASE DE DONNÉES"
    );
    console.log(
        "Application :",
        application.id_app
    );
    console.log(
        "Moteur sélectionné :",
        moteur
    );
    console.log(
        "================================================"
    );

    // ========================================================
    // AUCUNE BASE DE DONNÉES
    // ========================================================

    if (
        !moteur ||
        moteur === "aucune"
    ) {
        console.log(
            "Aucune base de données à initialiser."
        );

        return null;
    }
    // ========================================================
    // VÉRIFIER LE FICHIER SQL
    // ========================================================

    if (
        !detectionDatabase ||
        !detectionDatabase.chemin
    ) {
        throw new Error(
            "Aucun fichier SQL détecté pour cette application."
        );
    }

    // ========================================================
    // SÉLECTIONNER LE SERVICE APPROPRIÉ
    // ========================================================

    switch (moteur) {
        case "postgresql":
            return await creerPostgreSQL(
                application,
                detectionDatabase
            );

        case "mysql":
            return await creerMySQL(
                application,
                detectionDatabase
            );

        case "mariadb":
            return await creerMariaDB(
                application,
                detectionDatabase
            );

        default:
            throw new Error(
                `Le moteur de base de données "${moteur}" n'est pas pris en charge.`
            );
    }
};

// ============================================================
// EXPORTER LE SERVICE
// ============================================================

module.exports = {
    initialiserBaseDeDonnees
};