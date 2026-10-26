const {
    creerBaseSQL
} = require("./databaseServiceSqlCommon");

// ============================================================
// CRÉER ET INITIALISER UNE BASE MYSQL
// ============================================================

const creerMySQL = async (
    application,
    detectionDatabase
) => {
    console.log(
        "========== INITIALISATION MYSQL =========="
    );

    return await creerBaseSQL(
        application,
        detectionDatabase,
        {
            moteur: "mysql",
            image: "mysql:8.4",
            suffixe: "mysql"
        }
    );
};

// ============================================================
// EXPORTER
// ============================================================

module.exports = {
    creerMySQL
};