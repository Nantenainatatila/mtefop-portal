const pool = require("../config/database");
const recuperAppPersonnel = async (req ,res) => {
    try {
        const response = await pool.query(
            `
            SELECT
                d.id_deploie,
                d.id_admin,
                d.id_app,
                d.image_backend_deploie,
                d.image_frontend_deploie,
                d.container_frontend_deploie,
                d.container_backend_deploie,
                d.reseau_deploie,
                d.port_frontend_deploie,
                d.port_backend_deploie,
                d.url_publique_deploie,
                d.type_projet_deploie,
                d.frontend_technologie_deploie,
                d.backend_technologie_deploie,
                d.moteur_db_deploie,
                d.erreur_deploie,
                d.statut_deploie,
                d.message_deploie,
                d.date_creation,

                ad.id_admin,
                ad.nom_admin,

                a.id_app,
                a.id_cat,
                a.id_des,
                a.nom_app,
                a.nom_bouton_app,
                a.description_app,
                a.icone_app,
                a.type_app,
                a.source_app,
                
                c.nom_cat,
                c.id_cat


            FROM deploiements d
            INNER JOIN applications a
                ON a.id_app = d.id_app
            INNER JOIN administrations ad
                ON ad.id_admin = d.id_admin

            INNER JOIN categories c
                ON c.id_cat = a.id_cat

            WHERE d.statut_deploie = $1 AND a.id_des = 1
                `, ['success']
        );
        return res.json(response.rows);
    } catch (error) {
        console.log("Erreur de recuperation des applications pour les personnels");
        res.status(500).json({
            message: "Erreur de recuperation des applications pour les personnels"
        });
    }
}

const recuperAppPublic = async (req ,res) => {
    try {
        const response = await pool.query(
            `
            SELECT
                d.id_deploie,
                d.id_admin,
                d.id_app,
                d.image_backend_deploie,
                d.image_frontend_deploie,
                d.container_frontend_deploie,
                d.container_backend_deploie,
                d.reseau_deploie,
                d.port_frontend_deploie,
                d.port_backend_deploie,
                d.url_publique_deploie,
                d.type_projet_deploie,
                d.frontend_technologie_deploie,
                d.backend_technologie_deploie,
                d.moteur_db_deploie,
                d.erreur_deploie,
                d.statut_deploie,
                d.message_deploie,
                d.date_creation,

                ad.id_admin,
                ad.nom_admin,

                a.id_app,
                a.id_cat,
                a.id_des,
                a.nom_app,
                a.nom_bouton_app,
                a.description_app,
                a.icone_app,
                a.type_app,
                a.source_app,
                
                c.nom_cat,
                c.id_cat


            FROM deploiements d
            INNER JOIN applications a
                ON a.id_app = d.id_app
            INNER JOIN administrations ad
                ON ad.id_admin = d.id_admin

            INNER JOIN categories c
                ON c.id_cat = a.id_cat

            WHERE d.statut_deploie = $1 AND a.id_des = 2
                `, ['success']
        );
        return res.json(response.rows);
    } catch (error) {
        console.log("Erreur de recuperation des applications pour les publics");
        res.status(500).json({
            message: "Erreur de recuperation des applications pour les publics"
        });
    }
}

module.exports = { 
    recuperAppPersonnel,
    recuperAppPublic
};