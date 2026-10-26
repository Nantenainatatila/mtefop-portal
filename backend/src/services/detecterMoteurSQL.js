const { envoyerMessage } = require("./envoyerMessageService");
const fs = require("fs/promises");

/**
 * Détecte le moteur probable à partir du contenu SQL.
 * Retourne : postgresql, mysql, mariadb ou inconnu.
 */
async function detecterMoteurSQL(io,cheminSql) {
    envoyerMessage(io, `Verification du fichier ${cheminSql} en cours...`, 17);
    const contenu = await fs.readFile(cheminSql, "utf8");

    // Normaliser le texte pour faciliter la détection.
    const debut = contenu.slice(0, 256 * 1024);
    const sql = debut.toLowerCase();

    // Signatures caractéristiques d'un dump PostgreSQL.
    const signaturesPostgreSQL = [
        /--\s*postgresql database dump/i,
        /^\s*\\restrict\s+\S+/m,
        /pg_catalog\./i,
        /set standard_conforming_strings\s*=/i,
        /::regclass\b/i
    ];

    const estPostgreSQL = signaturesPostgreSQL.some(
        signature => signature.test(debut)
    );

    if (estPostgreSQL) {
        return {
            moteur: "postgresql",
            confiance: "forte",
            raison: "Le fichier contient des signatures PostgreSQL."
        };
    }

    // Signatures fréquentes des dumps MySQL.
    const signaturesMySQL = [
        /\/\*!\d{5}/,
        /\bauto_increment\b/i,
        /\bengine\s*=\s*innodb\b/i
    ];

    const nombreSignaturesMySQL = signaturesMySQL.filter(
        signature => signature.test(sql)
    ).length;

    if (nombreSignaturesMySQL >= 2) {
        return {
            moteur: "mysql",
            confiance: "moyenne",
            raison: "Plusieurs signatures MySQL ont été détectées."
        };
    }

    // MariaDB et MySQL partagent de nombreuses syntaxes.
    // Ne pas prétendre distinguer les deux avec certitude
    // à partir d'un SQL générique.
    return {
        moteur: "inconnu",
        confiance: "faible",
        raison: "Le contenu ne permet pas d'identifier le moteur avec certitude."
    };
}

module.exports = { detecterMoteurSQL };
