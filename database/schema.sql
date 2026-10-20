-- ============================================================
-- PORTAIL MTEFOP : SCHEMA COMPLET PostgreSQL
-- ============================================================

BEGIN;

DROP TABLE IF EXISTS applications_logs CASCADE;
DROP TABLE IF EXISTS deploiements CASCADE;
DROP TABLE IF EXISTS application_database CASCADE;
DROP TABLE IF EXISTS applications CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS parametres CASCADE;
DROP TABLE IF EXISTS administrations CASCADE;

CREATE TABLE administrations (
    id_admin SERIAL PRIMARY KEY,
    nom_admin VARCHAR(100) NOT NULL,
    email_admin VARCHAR(150) NOT NULL UNIQUE,
    password_admin VARCHAR(255) NOT NULL,
    role_admin VARCHAR(30) NOT NULL DEFAULT 'admin',
    statut_admin VARCHAR(20) NOT NULL DEFAULT 'pending',
    actif BOOLEAN NOT NULL DEFAULT FALSE,
    date_creation TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    date_modification TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_admin_role CHECK (role_admin IN ('admin', 'super_admin')),
    CONSTRAINT chk_admin_statut CHECK (statut_admin IN ('pending', 'active', 'rejected', 'disabled'))
);

INSERT INTO administrations (nom_admin, email_admin, password_admin, role_admin, statut_admin, actif)
VALUES (
    'Nantenaina',
    'devnantenaina@gmail.com',
    '$2b$10$MDwiZf2M9.8A89Ac1e0Szuq1NEhVvSh9UcuTu.X/ZimOYmeXkRAjC',
    'super_admin',
    'active',
    TRUE
);

CREATE TABLE categories (
    id_cat SERIAL PRIMARY KEY,
    nom_cat VARCHAR(100) NOT NULL UNIQUE,
    description_cat TEXT,
    ordre_cat INTEGER NOT NULL DEFAULT 0,
    actif BOOLEAN NOT NULL DEFAULT TRUE,
    date_creation TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_categorie_ordre CHECK (ordre_cat >= 0)
);

INSERT INTO categories (nom_cat, description_cat, ordre_cat)
VALUES
    ('Administration', 'Applications administratives du MTEFOP', 1),
    ('Ressources humaines', 'Applications liées aux ressources humaines', 2),
    ('Services', 'Applications et services destinés aux utilisateurs', 3);

CREATE TABLE applications (
    id_app SERIAL PRIMARY KEY,
    id_cat INTEGER NOT NULL,
    nom_app VARCHAR(150) NOT NULL,
    nom_bouton_app VARCHAR(100) NOT NULL,
    description_app TEXT,
    icone_app VARCHAR(255),
    type_app VARCHAR(15) NOT NULL DEFAULT 'docker',
    url_app VARCHAR(255),
    url_publique_app VARCHAR(500),
    visible_app BOOLEAN NOT NULL DEFAULT FALSE,
    statut_app VARCHAR(20) NOT NULL DEFAULT 'offline',
    source_app VARCHAR(500),
    frontend_technologie_app VARCHAR(50),
    backend_technologie_app VARCHAR(50),
    version_app VARCHAR(50),
    port_app INTEGER,
    date_dernier_deploiement TIMESTAMP,
    message_statut_app TEXT,
    date_creation TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    date_modification TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_app_cat FOREIGN KEY (id_cat)
        REFERENCES categories(id_cat) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT chk_app_type CHECK (type_app IN ('docker', 'url')),
    CONSTRAINT chk_app_statut CHECK (statut_app IN ('online', 'offline', 'error')),
    CONSTRAINT chk_app_port CHECK (port_app IS NULL OR port_app BETWEEN 1 AND 65535)
);


CREATE UNIQUE INDEX uq_applications_url_publique
    ON applications (url_publique_app) WHERE url_publique_app IS NOT NULL;
CREATE INDEX idx_app_cat ON applications(id_cat);
CREATE INDEX idx_app_visible ON applications(visible_app);
CREATE INDEX idx_app_statut ON applications(statut_app);

CREATE TABLE application_database (
    id_db SERIAL PRIMARY KEY,
    id_app INTEGER NOT NULL UNIQUE,
    moteur_db VARCHAR(30) NOT NULL,
    host_db VARCHAR(255),
    port_db INTEGER,
    nom_db VARCHAR(100),
    utilisateur_db VARCHAR(100),
    mot_de_passe_db VARCHAR(255),
    container_name_db VARCHAR(100),
    volume_name_db VARCHAR(100),
    reseau_db VARCHAR(150),
    actif BOOLEAN NOT NULL DEFAULT TRUE,
    date_creation TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    date_modification TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_application_database_app FOREIGN KEY (id_app)
        REFERENCES applications(id_app) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT chk_application_database_moteur
        CHECK (moteur_db IN ('aucune', 'postgresql', 'mysql', 'mariadb')),
    CONSTRAINT chk_application_database_port
        CHECK (port_db IS NULL OR port_db BETWEEN 1 AND 65535)
);

CREATE TABLE deploiements (
    id_deploie SERIAL PRIMARY KEY,
    id_app INTEGER NOT NULL,
    id_admin INTEGER NOT NULL,
    image_frontend_deploie VARCHAR(255),
    image_backend_deploie VARCHAR(255),
    container_frontend_deploie VARCHAR(150),
    container_backend_deploie VARCHAR(150),
    reseau_deploie VARCHAR(150),
    port_frontend_deploie INTEGER,
    port_backend_deploie INTEGER,
    url_publique_deploie VARCHAR(500),
    type_projet_deploie VARCHAR(50),
    frontend_technologie_deploie VARCHAR(50),
    backend_technologie_deploie VARCHAR(50),
    moteur_db_deploie VARCHAR(30),
    erreur_deploie TEXT,
    statut_deploie VARCHAR(20) NOT NULL DEFAULT 'pending',
    message_deploie TEXT,
    started_at TIMESTAMP,
    finished_at TIMESTAMP,
    date_creation TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_deploie_app FOREIGN KEY (id_app)
        REFERENCES applications(id_app) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_deploie_admin FOREIGN KEY (id_admin)
        REFERENCES administrations(id_admin) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT chk_deploie_statut
        CHECK (statut_deploie IN ('pending', 'building', 'success', 'failed')),
    CONSTRAINT chk_deplois_dates
        CHECK (finished_at IS NULL OR started_at IS NULL OR finished_at >= started_at),
    CONSTRAINT chk_deploiement_port_frontend
        CHECK (port_frontend_deploie IS NULL OR port_frontend_deploie BETWEEN 1 AND 65535),
    CONSTRAINT chk_deploiement_port_backend
        CHECK (port_backend_deploie IS NULL OR port_backend_deploie BETWEEN 1 AND 65535)
);

CREATE INDEX idx_cat_app ON deploiements(id_app);
CREATE INDEX idx_deploi_admin ON deploiements(id_admin);
CREATE INDEX idx_deploiement_app_date ON deploiements(id_app, date_creation DESC);
CREATE INDEX idx_deploiement_statut ON deploiements(statut_deploie);

CREATE TABLE applications_logs (
    id_log SERIAL PRIMARY KEY,
    id_app INTEGER NOT NULL,
    id_deploie INTEGER,
    niveau_log VARCHAR(20) NOT NULL DEFAULT 'info',
    code_erreur_log VARCHAR(100),
    message_log TEXT NOT NULL,
    date_creation TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_log_app FOREIGN KEY (id_app)
        REFERENCES applications(id_app) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_log_deploiement FOREIGN KEY (id_deploie)
        REFERENCES deploiements(id_deploie) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT chk_log_niveau
        CHECK (niveau_log IN ('info', 'warning', 'error', 'success'))
);

CREATE INDEX idx_app_log_app ON applications_logs(id_app);
CREATE INDEX idx_logs_deploiement ON applications_logs(id_deploie);
CREATE INDEX idx_logs_app_date ON applications_logs(id_app, date_creation DESC);

CREATE TABLE parametres (
    id_parmetre SERIAL PRIMARY KEY,
    cle_parametre VARCHAR(100) NOT NULL UNIQUE,
    valeur_parametre TEXT,
    description_parametre TEXT,
    date_modification TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO parametres (cle_parametre, valeur_parametre, description_parametre)
VALUES
    ('nom_site', 'Portail MTEFOP', 'Nom affiché sur le portail'),
    ('maintenance', 'false', 'Active ou désactive le mode maintenance'),
    ('logo', '/uploads/logo.png', 'Chemin du logo du portail'),
    ('public_host', '', 'Nom de domaine ou adresse publique du serveur'),
    ('public_scheme', 'https', 'Protocole public utilisé par les applications'),
    ('public_port', '443', 'Port HTTPS public du serveur'),
    ('docker_network_prefix', 'mtefop-app', 'Préfixe des réseaux Docker dédiés aux applications')
ON CONFLICT (cle_parametre) DO NOTHING;

COMMIT;

-- Vérification du résultat
SELECT 'administrations' AS table_name, COUNT(*) AS nombre_lignes FROM administrations
UNION ALL SELECT 'categories', COUNT(*) FROM categories
UNION ALL SELECT 'applications', COUNT(*) FROM applications
UNION ALL SELECT 'application_database', COUNT(*) FROM application_database
UNION ALL SELECT 'deploiements', COUNT(*) FROM deploiements
UNION ALL SELECT 'applications_logs', COUNT(*) FROM applications_logs
UNION ALL SELECT 'parametres', COUNT(*) FROM parametres
ORDER BY table_name;