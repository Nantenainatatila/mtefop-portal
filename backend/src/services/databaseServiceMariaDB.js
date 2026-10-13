const {
    creerBaseSQL
} = require("./databaseServiceSqlCommon");

// ============================================================
// CRÉER ET INITIALISER UNE BASE MARIADB
// ============================================================

const creerMariaDB = async (
    application,
    detectionDatabase
) => {
    console.log(
        "========== INITIALISATION MARIADB =========="
    );

    return await creerBaseSQL(
        application,
        detectionDatabase,
        {
            moteur: "mariadb",
            image: "mariadb:11",
            suffixe: "mariadb"
        }
    );
};

// ============================================================
// EXPORTER
// ============================================================

module.exports = {
    creerMariaDB
};