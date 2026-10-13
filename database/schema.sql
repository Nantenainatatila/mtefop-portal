
-- ===================TABLE ADMINISTRATION===========--
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
    CONSTRAINT chk_admin_role
        CHECK (role_admin IN ('admin', 'super_admin')),

    CONSTRAINT chk_admin_statut
        CHECK (statut_admin IN ('pending', 'active', 'rejected', 'disabled'))
);

INSERT INTO administrations (
    nom_admin,
    email_admin,
    password_admin,
    role_admin,
    statut_admin,
    actif
    )
    VALUES (
        'Nantenaina', 
        'devnantenaina@gmail.com', 
        '$2b$10$MDwiZf2M9.8A89Ac1e0Szuq1NEhVvSh9UcuTu.X/ZimOYmeXkRAjC', 
        'super_admin',
        'active',
        TRUE
    );


--==================TABLE CATEGORIER======================-----------
CREATE TABLE categories (
    id_cat SERIAL PRIMARY KEY,
    nom_cat VARCHAR(100) NOT NULL UNIQUE,
    description_cat TEXT,
    ordre_cat INTEGER NOT NULL DEFAULT 0,
    actif BOOLEAN NOT NULL DEFAULT TRUE,
    date_creation TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_categorie_ordre
        CHECK (ordre_cat >= 0) 
);

--======================TABLE APPLICATION====================---------
CREATE TABLE applications (
    id_app SERIAL PRIMARY KEY,
    id_cat INTEGER NOT NULL,

    nom_app VARCHAR(150) NOT NULL,
    nom_bouton_app VARCHAR(100) NOT NULL,
    description_app TEXT,
    icone_app VARCHAR(255),

    type_app VARCHAR(15) NOT NULL  DEFAULT 'docker',
    url_app VARCHAR(255),


    visible_app BOOLEAN NOT NULL DEFAULT FALSE,
    statut_app VARCHAR(20) NOT NULL DEFAULT 'offline',
    source_app VARCHAR(500),
    technologie_app VARCHAR(30),
    version_app VARCHAR(50),

    container_name_app VARCHAR(100),
    port_app INTEGER,

    date_creation TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    date_modification TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    --clé etranger
    CONSTRAINT fk_app_cat
        FOREIGN KEY (id_cat)
        REFERENCES categories(id_cat)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    --TYPE D'APP AUTURISÉ
    CONSTRAINT chk_app_type
        CHECK (type_app IN ('docker', 'url')),
 
    --Statut autorisé
    CONSTRAINT chk_app_statut
        CHECK (statut_app IN ('online','offline','error')),

    --Le port doit etre validé
    CONSTRAINT chk_app_port
        CHECK (
            port_app IS NULL 
            OR port_app BETWEEN 1 AND 65535
        )
);

--====================TABLE APPLICATION_DATABASE====================-----

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

    actif BOOLEAN NOT NULL DEFAULT TRUE,

    date_creation TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    date_modification TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_application_database_app
        FOREIGN KEY (id_app)
        REFERENCES applications(id_app)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT chk_application_database_moteur
        CHECK (
            moteur_db IN (
                'aucune',
                'postgresql',
                'mysql',
                'mariadb',
                'mongodb'
            )
        ),

    CONSTRAINT chk_application_database_port
        CHECK (
            port_db BETWEEN 1 AND 65535
        )
);

--==============TABLE DEPLOIEMENT==================================---
CREATE TABLE deploiements (
    id_deploie SERIAL PRIMARY KEY,
    id_app INTEGER NOT NULL,
    id_admin INTEGER NOT NULL,

    source_deploie VARCHAR(500),
    image_docker_deploie VARCHAR(255),

    statut_deploie VARCHAR(20) NOT NULL DEFAULT 'pending',
    message_deploie TEXT,
    started_at TIMESTAMP,
    finished_at TIMESTAMP,
    date_creation TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,


    CONSTRAINT fk_deploie_app
        FOREIGN KEY (id_app)
        REFERENCES applications(id_app)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_deploie_admin
        FOREIGN KEY (id_admin)
        REFERENCES administrations(id_admin)
        ON UPDATE CASCADE
        ON DELETE CASCADE,


    CONSTRAINT chk_deploie_statut
        CHECK (
            statut_deploie IN (
                'pending',
                'building',
                'success',
                'failed'
            )
        ),

    CONSTRAINT chk_deplois_dates
        CHECK(
            finished_at IS NULL
            OR started_at IS NULL
            OR finished_at >= started_at
        )
);

--======================TABLE  APPLICATIO LOG=============================
CREATE TABLE applications_logs (
    id_log SERIAL PRIMARY KEY,
    id_app INTEGER NOT NULL,
    niveau_log VARCHAR(20) NOT NULL DEFAULT 'info',
    message_log TEXT NOT NULL,
    date_creation TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_log_app
        FOREIGN KEY (id_app)
        REFERENCES applications(id_app)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT chk_log_niveau
        CHECK(
            niveau_log IN (
                'info',
                'warning',
                'error',
                'success'
            )
        )
);

--===============TABLE PARAMETRE===============================
CREATE TABLE parametres (
    id_parmetre SERIAL PRIMARY KEY,
    cle_parametre VARCHAR(100) NOT NULL UNIQUE,
    valeur_parametre TEXT,
    description_parametre TEXT,
    date_modification TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

--=======================INDEX====================
--rechercher rapide des app par categorie
CREATE INDEX idx_app_cat
    ON applications(id_cat);

--rechercher rapide des app visible
CREATE INDEX idx_app_visible
    ON applications(visible_app);

--recherche rapide des app par statu
CREATE INDEX idx_app_statut
    ON applications(statut_app);

--recherche rapide des depoiements d'un app 
CREATE INDEX idx_cat_app
    ON deploiements(id_app);

--recherche rapide des deploiement effectue par un admin
CREATE INDEX idx_deploi_admin
    ON deploiements(id_admin);

--recherche rapide des logs d'une app
CREATE INDEX idx_app_log_app
    ON applications_logs(id_app);


--===================donnee initial=================================
INSERT INTO categories (nom_cat, description_cat, ordre_cat)
VALUES
    ('Administration', 'Applications administratives du MTEFOP', 1),
    ('Ressources humaines', 'Applications liées aux ressources humaines', 2),
    ('Services', 'Applications et services destinés aux utilisateurs', 3);


-- Paramètres initiaux du portail
INSERT INTO parametres (cle_parametre, valeur_parametre, description_parametre)
VALUES
    ('nom_site', 'Portail MTEFOP', 'Nom affiché sur le portail'),
    ('maintenance', 'false', 'Active ou désactive le mode maintenance'),
    ('logo', '/uploads/logo.png', 'Chemin du logo du portail');