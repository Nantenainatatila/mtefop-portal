--Base des donnés--
--CREATE DATABASE gestion_ecole_db;--

--annee scolaire
CREATE TABLE annees_scolaires(
    id_annee SERIAL PRIMARY KEY,
    annee VARCHAR(9) NOT NULL UNIQUE,

    CONSTRAINT chk_annee_format 
        CHECK (annee ~ '^[0-9]{4}-[0-9]{4}$')
);
--niveaux--

CREATE TABLE niveaux(
    id_niveau SERIAL PRIMARY KEY,
    nom_niveau VARCHAR(100) NOT NULL UNIQUE
);

--MENTIONS--

CREATE TABLE mentions (
    id_mention SERIAL PRIMARY KEY,
    nom_mention VARCHAR(150) NOT NULL UNIQUE
);

--ROLES--
CREATE TABLE roles(
    id_role SERIAL PRIMARY KEY,
    nom_role VARCHAR(50) NOT NULL UNIQUE
);



--Utilisateurs

CREATE TABLE utilisateurs (
    id_utilisateur SERIAL PRIMARY KEY,
    nom_complet_utilisateur VARCHAR(200) NOT NULL,
    mot_de_passe VARCHAR(255) NOT NULL,
    id_role INTEGER NOT NULL,
    email VARCHAR (225) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_utilisateur_role
        FOREIGN KEY (id_role)
        REFERENCES roles(id_role)
        ON DELETE RESTRICT
);

--====================================================--


--CREATION DE SEQUENCE MATRICULE AUTOMATIQUE

CREATE SEQUENCE matricule_etudiant_seq 
START WITH 1 
INCREMENT BY 1;

--ETUDIANTS

CREATE TABLE etudiants(
    id_etudiant SERIAL PRIMARY KEY,
    matricule VARCHAR(20) UNIQUE NOT NULL,
    nom_complet_etudiant VARCHAR(200) NOT NULL,
    date_naissance DATE NOT NULL,
    lieu_naissance VARCHAR(150),
    photo_etudiant TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    id_utilisateur INTEGER,

    CONSTRAINT fk_etudiant_utilisateur 
    FOREIGN KEY (id_utilisateur)
    REFERENCES utilisateurs(id_utilisateur)
);

--//fONCTION PÔUR LE MATRICULE

CREATE OR REPLACE FUNCTION generer_matricule_etudiant()
RETURNS TRIGGER AS $$
BEGIN
    NEW.matricule :=
        'ETU-' || LPAD(
            nextval('matricule_etudiant_seq')::TEXT, 4, '0'
        );
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_matricule_etudiant
BEFORE INSERT ON etudiants
FOR EACH ROW
EXECUTE FUNCTION generer_matricule_etudiant();


--======================================================--


--AVANTS INSCRIPTIONS-- a rectifie


CREATE TABLE avants_inscriptions(
    id_avant_inscription SERIAL PRIMARY KEY,
    nom_complet_etudiant_avant VARCHAR(200) NOT NULL,
    id_mention INTEGER NOT NULL,
    id_niveau INTEGER NOT NULL,
    numero_whatsapp VARCHAR(30) NOT NULL,
    statut VARCHAR(30) NOT NULL DEFAULT 'en_attente',
    date_demande TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    
    CONSTRAINT fk_avant_inscription_mention
        FOREIGN KEY (id_mention)
        REFERENCES mentions(id_mention)
        ON DELETE RESTRICT,

    CONSTRAINT fk_avant_inscription_niveau
        FOREIGN KEY (id_niveau)
        REFERENCES niveaux(id_niveau)
        ON DELETE RESTRICT,

    CONSTRAINT chk_statut_avant_inscription 
        CHECK(
            statut IN (
                'en_attente',
                'validee',
                'refusee',
                'compte_cree'
            )
        )
    
);

--droit d'inscription



CREATE TABLE droits_inscriptions (
    id_droit_inscription SERIAL PRIMARY KEY,
    date_paiement DATE NOT NULL DEFAULT CURRENT_DATE,
    montant_paye NUMERIC(12,2) NOT NULL DEFAULT 0,
    reste_droit NUMERIC(12,2) NOT NULL DEFAULT 0,

    CONSTRAINT chk_montant_droit
        CHECK (montant_paye >= 0),

    CONSTRAINT chk_reste_droit
        CHECK (reste_droit >= 0)
);

--inscriptions--


CREATE TABLE inscriptions(
    id_inscription SERIAL PRIMARY KEY,
    id_avant_inscription INTEGER,
    id_etudiant INTEGER NOT NULL,
    id_annee INTEGER NOT NULL,
    id_mention INTEGER NOT NULL,
    id_niveau INTEGER NOT NULL,
    id_droit_inscription INTEGER NOT NULL,
    date_inscription DATE NOT NULL DEFAULT CURRENT_DATE,

    CONSTRAINT fk_inscription_avant
        FOREIGN KEY (id_avant_inscription)
        REFERENCES avants_inscriptions(id_avant_inscription)
        ON DELETE SET NULL,

    CONSTRAINT fk_inscription_etudiant
        FOREIGN KEY (id_etudiant)
        REFERENCES etudiants(id_etudiant)
        ON DELETE CASCADE,

    CONSTRAINT fk_inscription_annee
        FOREIGN KEY (id_annee)
        REFERENCES annees_scolaires(id_annee)
        ON DELETE RESTRICT,

    CONSTRAINT fk_inscription_mention
        FOREIGN KEY (id_mention)
        REFERENCES mentions(id_mention)
        ON DELETE RESTRICT,

    CONSTRAINT fk_inscription_niveau
        FOREIGN KEY (id_niveau)
        REFERENCES niveaux(id_niveau)
        ON DELETE RESTRICT,

    CONSTRAINT fk_inscription_droit
        FOREIGN KEY (id_droit_inscription)
        REFERENCES droits_inscriptions(id_droit_inscription)
        ON DELETE SET NULL,

    CONSTRAINT unique_inscription_etudiant_annee
        UNIQUE (id_etudiant, id_annee)

);

--type examen--


CREATE TABLE types_examens(
    id_type_examen SERIAL PRIMARY KEY,
    type_examen VARCHAR(100) NOT NULL,
    id_niveau INTEGER NOT NULL,

    CONSTRAINT fk_type_examen
        FOREIGN KEY (id_niveau)
        REFERENCES niveaux(id_niveau)
        on DELETE CASCADE,

    CONSTRAINT unique_type_examen_niveau
        UNIQUE (type_examen, id_niveau)
);

--examens

CREATE TABLE examens(
    id_examen SERIAL PRIMARY KEY,
    date_examen DATE NOT NULL,
    id_type_examen INTEGER NOT NULL,

    CONSTRAINT fk_examen_type
        FOREIGN KEY (id_type_examen)
        REFERENCES types_examens(id_type_examen)
        ON DELETE CASCADE
);

--MATIERES--
CREATE TABLE matieres (
    id_matiere SERIAL PRIMARY KEY,
    nom_matiere VARCHAR(150) NOT NULL,

    coefficient NUMERIC(5,2) NOT NULL DEFAULT 1,

    CONSTRAINT chk_coefficient 
        CHECK (coefficient > 0),

    CONSTRAINT unique_nom_matiere 
        UNIQUE (nom_matiere)
);

--matiere par mention et niveau

CREATE TABLE matieres_mentions(
    id_matiere_mention SERIAL PRIMARY KEY,
    id_mention INTEGER NOT NULL,
    id_matiere INTEGER NOT NULL,
    id_niveau INTEGER NOT NULL,

    CONSTRAINT fk_mm_mention
        FOREIGN KEY (id_mention)
        REFERENCES mentions(id_mention)
        ON DELETE CASCADE,

    CONSTRAINT fk_mm_matiere
        FOREIGN KEY (id_matiere)
        REFERENCES matieres(id_matiere)
        ON DELETE CASCADE,

    CONSTRAINT fk_mm_niveau
        FOREIGN KEY (id_niveau)
        REFERENCES niveaux(id_niveau)
        ON DELETE CASCADE,

    CONSTRAINT unique_matiere_niveau
        UNIQUE (id_mention, id_matiere, id_niveau)
);

--NOTES--


CREATE TABLE notes (
    id_note SERIAL PRIMARY KEY,
    id_inscription INTEGER NOT NULL,
    id_matiere INTEGER NOT NULL,
    id_examen INTEGER NOT NULL,
    note NUMERIC(5,2) NOT NULL,

    CONSTRAINT fk_note_inscription
        FOREIGN KEY (id_inscription)
        REFERENCES inscriptions(id_inscription)
        ON DELETE CASCADE,

    CONSTRAINT fk_note_matiere
        FOREIGN KEY (id_matiere)
        REFERENCES matieres(id_matiere)
        ON DELETE RESTRICT,

    CONSTRAINT fk_note_examen
        FOREIGN KEY (id_examen)
        REFERENCES examens(id_examen)
        ON DELETE CASCADE,

    CONSTRAINT chk_note
        CHECK (NOTE > 0 AND note <= 20),

    CONSTRAINT unique_nom
        UNIQUE (id_inscription, id_matiere, id_examen)
);

--ECOLAGE--

CREATE TABLE ecolages (
    id_ecolage SERIAL PRIMARY KEY,
    id_inscription INTEGER NOT NULL,
    montant_paye NUMERIC(12,2) NOT NULL DEFAULT 0,
    reste NUMERIC(12,2) NOT NULL DEFAULT 0,

    CONSTRAINT fk_ecolage_inscription
        FOREIGN KEY (id_inscription)
        REFERENCES inscriptions(id_inscription)
        ON DELETE CASCADE,

    CONSTRAINT chk_ecolage_montant
        CHECK (montant_paye >= 0),

    CONSTRAINT chk_ecolage_reste
        CHECK (reste >= 0)
);

--PAIEMENT ECOLAGE

CREATE TABLE paiements_ecolages (
    id_paiement SERIAL PRIMARY KEY,
    id_ecolage INTEGER NOT NULL,
    date_paiement DATE NOT NULL DEFAULT CURRENT_DATE,
    montant NUMERIC(12,2) NOT NULL,

    CONSTRAINT fk_paiement_ecolage
        FOREIGN KEY (id_ecolage)
        REFERENCES ecolages(id_ecolage)
        ON DELETE CASCADE,

    CONSTRAINT chk_paiement_montant
        CHECK (montant > 0)
);



--MESSAGES--


CREATE TABLE messages (
    id_message SERIAL PRIMARY KEY,
    date_publication TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    id_mention INTEGER,
    id_niveau INTEGER,
    id_role INTEGER NOT NULL,
    objet VARCHAR(200) NOT NULL,
    texte_message TEXT NOT NULL,

    CONSTRAINT fk_message_mention
        FOREIGN KEY (id_mention)
        REFERENCES mentions(id_mention)
        ON DELETE SET NULL,


    CONSTRAINT fk_message_role
        FOREIGN KEY (id_role)
        REFERENCES roles(id_role)
        ON DELETE RESTRICT
);


