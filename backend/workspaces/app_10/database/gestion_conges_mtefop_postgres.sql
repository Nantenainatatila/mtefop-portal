

-- =====================================================================
-- Projet : Gestion des congés - MTEFoP, Antananarivo
-- SGBD   : PostgreSQL 12+
-- Usage  : psql -U postgres -f gestion_conges_mtefop_postgres.sql
-- =====================================================================



-- ---------------------------------------------------------------------
-- 1. STRUCTURE ORGANISATIONNELLE
-- ---------------------------------------------------------------------
CREATE TABLE directions (
  id_direction  SERIAL PRIMARY KEY,
  code          VARCHAR(20)  NOT NULL UNIQUE,
  nom           VARCHAR(150) NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE services (
  id_service    SERIAL PRIMARY KEY,
  id_direction  INT NOT NULL,
  code          VARCHAR(20)  NOT NULL UNIQUE,
  nom           VARCHAR(150) NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_service_direction FOREIGN KEY (id_direction)
    REFERENCES directions(id_direction) ON DELETE RESTRICT
);

CREATE TABLE postes (
  id_poste   SERIAL PRIMARY KEY,
  libelle    VARCHAR(120) NOT NULL UNIQUE
);

-- ---------------------------------------------------------------------
-- 2. EMPLOYÉS
-- ---------------------------------------------------------------------
CREATE TABLE employes (
  id_employe      SERIAL PRIMARY KEY,
  matricule       VARCHAR(20)  NOT NULL UNIQUE,
  cin             VARCHAR(20)  NULL UNIQUE,
  nom             VARCHAR(80)  NOT NULL,
  prenom          VARCHAR(80)  NULL,
  sexe            CHAR(1) NOT NULL CHECK (sexe IN ('M','F')),
  date_naissance  DATE NULL,
  date_embauche   DATE NOT NULL,
  email           VARCHAR(120) NULL UNIQUE,
  telephone       VARCHAR(20)  NULL,
  statut          VARCHAR(15) NOT NULL DEFAULT 'FONCTIONNAIRE'
                  CHECK (statut IN ('FONCTIONNAIRE','ECD','EFA','STAGIAIRE')),
  id_service      INT NOT NULL,
  id_poste        INT NULL,
  id_superieur    INT NULL,            -- supérieur hiérarchique direct
  actif           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_emp_service  FOREIGN KEY (id_service)   REFERENCES services(id_service),
  CONSTRAINT fk_emp_poste    FOREIGN KEY (id_poste)     REFERENCES postes(id_poste),
  CONSTRAINT fk_emp_sup      FOREIGN KEY (id_superieur) REFERENCES employes(id_employe) ON DELETE SET NULL
);

CREATE TABLE utilisateurs (
  id_utilisateur  SERIAL PRIMARY KEY,
  id_employe      INT NOT NULL UNIQUE,
  login           VARCHAR(50)  NOT NULL UNIQUE,
  mot_de_passe    VARCHAR(255) NOT NULL,   -- hash (password_hash en PHP)
  role            VARCHAR(15) NOT NULL DEFAULT 'EMPLOYE'
                  CHECK (role IN ('ADMIN','RH','DIRECTEUR','CHEF_SERVICE','EMPLOYE')),
  actif           BOOLEAN NOT NULL DEFAULT TRUE,
  derniere_connexion TIMESTAMP NULL,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_emp FOREIGN KEY (id_employe) REFERENCES employes(id_employe) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
-- 3. TYPES DE CONGÉS ET SOLDES
-- ---------------------------------------------------------------------
CREATE TABLE types_conges (
  id_type         SERIAL PRIMARY KEY,
  code            VARCHAR(20)  NOT NULL UNIQUE,
  libelle         VARCHAR(100) NOT NULL,
  jours_par_an    NUMERIC(5,1) NULL,        -- droit annuel (NULL = pas de quota annuel)
  duree_max       INT NULL,                 -- durée max par demande (jours)
  decompte_solde  BOOLEAN NOT NULL DEFAULT TRUE,  -- TRUE = déduit du solde annuel
  jours_ouvrables BOOLEAN NOT NULL DEFAULT TRUE,  -- TRUE = ne compte pas week-ends/fériés
  justificatif_requis BOOLEAN NOT NULL DEFAULT FALSE,
  sexe_requis     CHAR(1) NULL CHECK (sexe_requis IN ('M','F')),
  actif           BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE soldes_conges (
  id_solde     SERIAL PRIMARY KEY,
  id_employe   INT NOT NULL,
  id_type      INT NOT NULL,
  annee        INT NOT NULL CHECK (annee BETWEEN 2000 AND 2100),
  droit        NUMERIC(5,1) NOT NULL DEFAULT 0,   -- droit de l'année
  report       NUMERIC(5,1) NOT NULL DEFAULT 0,   -- reporté de l'année précédente
  pris         NUMERIC(5,1) NOT NULL DEFAULT 0,
  CONSTRAINT uq_solde UNIQUE (id_employe, id_type, annee),
  CONSTRAINT fk_solde_emp  FOREIGN KEY (id_employe) REFERENCES employes(id_employe) ON DELETE CASCADE,
  CONSTRAINT fk_solde_type FOREIGN KEY (id_type)    REFERENCES types_conges(id_type)
);

-- ---------------------------------------------------------------------
-- 4. DEMANDES ET WORKFLOW DE VALIDATION
-- ---------------------------------------------------------------------
CREATE TABLE demandes_conges (
  id_demande      SERIAL PRIMARY KEY,
  reference       VARCHAR(30) NULL UNIQUE,         -- ex: CG-2026-0001
  id_employe      INT NOT NULL,
  id_type         INT NOT NULL,
  date_debut      DATE NOT NULL,
  date_fin        DATE NOT NULL,
  nb_jours        NUMERIC(5,1) NOT NULL,           -- jours décomptés
  demi_journee_debut BOOLEAN NOT NULL DEFAULT FALSE,
  demi_journee_fin   BOOLEAN NOT NULL DEFAULT FALSE,
  motif           VARCHAR(255) NULL,
  adresse_conge   VARCHAR(255) NULL,
  justificatif    VARCHAR(255) NULL,               -- chemin du fichier
  id_interim      INT NULL,                        -- remplaçant pendant l'absence
  statut          VARCHAR(15) NOT NULL DEFAULT 'EN_ATTENTE'
                  CHECK (statut IN ('BROUILLON','EN_ATTENTE','APPROUVE','REFUSE','ANNULE')),
  date_demande    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_dates CHECK (date_fin >= date_debut),
  CONSTRAINT fk_dem_emp     FOREIGN KEY (id_employe) REFERENCES employes(id_employe) ON DELETE CASCADE,
  CONSTRAINT fk_dem_type    FOREIGN KEY (id_type)    REFERENCES types_conges(id_type),
  CONSTRAINT fk_dem_interim FOREIGN KEY (id_interim) REFERENCES employes(id_employe) ON DELETE SET NULL
);
CREATE INDEX idx_dem_emp    ON demandes_conges (id_employe);
CREATE INDEX idx_dem_statut ON demandes_conges (statut);
CREATE INDEX idx_dem_dates  ON demandes_conges (date_debut, date_fin);

CREATE TABLE validations (
  id_validation  SERIAL PRIMARY KEY,
  id_demande     INT NOT NULL,
  niveau         SMALLINT NOT NULL,                -- 1 = chef de service, 2 = directeur, 3 = RH
  id_valideur    INT NOT NULL,
  decision       VARCHAR(10) NOT NULL DEFAULT 'EN_ATTENTE'
                 CHECK (decision IN ('EN_ATTENTE','APPROUVE','REFUSE')),
  commentaire    VARCHAR(255) NULL,
  date_decision  TIMESTAMP NULL,
  CONSTRAINT uq_val UNIQUE (id_demande, niveau),
  CONSTRAINT fk_val_dem  FOREIGN KEY (id_demande)  REFERENCES demandes_conges(id_demande) ON DELETE CASCADE,
  CONSTRAINT fk_val_user FOREIGN KEY (id_valideur) REFERENCES employes(id_employe)
);

-- ---------------------------------------------------------------------
-- 5. JOURS FÉRIÉS, NOTIFICATIONS, AUDIT
-- ---------------------------------------------------------------------
CREATE TABLE jours_feries (
  id_ferie  SERIAL PRIMARY KEY,
  date_ferie DATE NOT NULL UNIQUE,
  libelle    VARCHAR(100) NOT NULL
);

CREATE TABLE notifications (
  id_notification SERIAL PRIMARY KEY,
  id_employe      INT NOT NULL,
  message         VARCHAR(255) NOT NULL,
  lien            VARCHAR(255) NULL,
  lu              BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notif_emp FOREIGN KEY (id_employe) REFERENCES employes(id_employe) ON DELETE CASCADE
);

CREATE TABLE journal_audit (
  id_audit       BIGSERIAL PRIMARY KEY,
  id_utilisateur INT NULL,
  action         VARCHAR(50)  NOT NULL,            -- CONNEXION, CREATION, MODIFICATION...
  table_cible    VARCHAR(50)  NULL,
  id_cible       INT NULL,
  details        TEXT NULL,
  adresse_ip     VARCHAR(45) NULL,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------
-- 6. FONCTION : calcul des jours ouvrables (hors week-end et fériés)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_jours_ouvrables(p_debut DATE, p_fin DATE)
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  v_total INT := 0;
  v_cur   DATE := p_debut;
BEGIN
  WHILE v_cur <= p_fin LOOP
    -- EXTRACT(ISODOW) : 1=lundi ... 6=samedi, 7=dimanche
    IF EXTRACT(ISODOW FROM v_cur) NOT IN (6,7)
       AND NOT EXISTS (SELECT 1 FROM jours_feries WHERE date_ferie = v_cur) THEN
      v_total := v_total + 1;
    END IF;
    v_cur := v_cur + INTERVAL '1 day';
  END LOOP;
  RETURN v_total;
END;
$$;

-- ---------------------------------------------------------------------
-- 7. TRIGGERS : mise à jour automatique des soldes et de la référence
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_demande_reference_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.reference IS NULL THEN
    NEW.reference := 'CG-' || EXTRACT(YEAR FROM CURRENT_DATE)::INT || '-' ||
        LPAD(((SELECT COALESCE(MAX(id_demande),0) + 1 FROM demandes_conges))::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_demande_reference
BEFORE INSERT ON demandes_conges
FOR EACH ROW EXECUTE FUNCTION trg_demande_reference_fn();

CREATE OR REPLACE FUNCTION trg_demande_statut_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_decompte BOOLEAN;
BEGIN
  SELECT decompte_solde INTO v_decompte FROM types_conges WHERE id_type = NEW.id_type;

  -- Approbation : on déduit du solde
  IF OLD.statut <> 'APPROUVE' AND NEW.statut = 'APPROUVE' AND v_decompte THEN
    UPDATE soldes_conges
       SET pris = pris + NEW.nb_jours
     WHERE id_employe = NEW.id_employe
       AND id_type    = NEW.id_type
       AND annee      = EXTRACT(YEAR FROM NEW.date_debut)::INT;
  END IF;

  -- Annulation d'un congé déjà approuvé : on restitue les jours
  IF OLD.statut = 'APPROUVE' AND NEW.statut = 'ANNULE' AND v_decompte THEN
    UPDATE soldes_conges
       SET pris = GREATEST(pris - NEW.nb_jours, 0)
     WHERE id_employe = NEW.id_employe
       AND id_type    = NEW.id_type
       AND annee      = EXTRACT(YEAR FROM NEW.date_debut)::INT;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_demande_statut
AFTER UPDATE ON demandes_conges
FOR EACH ROW EXECUTE FUNCTION trg_demande_statut_fn();

-- ---------------------------------------------------------------------
-- 8. VUES UTILES
-- ---------------------------------------------------------------------
CREATE VIEW v_soldes AS
SELECT s.id_solde, e.matricule, (e.nom || ' ' || COALESCE(e.prenom,'')) AS employe,
       t.libelle AS type_conge, s.annee, s.droit, s.report, s.pris,
       (s.droit + s.report - s.pris) AS reste
FROM soldes_conges s
JOIN employes e ON e.id_employe = s.id_employe
JOIN types_conges t ON t.id_type = s.id_type;

CREATE VIEW v_demandes AS
SELECT d.id_demande, d.reference, e.matricule,
       (e.nom || ' ' || COALESCE(e.prenom,'')) AS employe,
       sv.nom AS service, dr.nom AS direction,
       t.libelle AS type_conge, d.date_debut, d.date_fin, d.nb_jours,
       d.statut, d.date_demande
FROM demandes_conges d
JOIN employes e   ON e.id_employe = d.id_employe
JOIN services sv  ON sv.id_service = e.id_service
JOIN directions dr ON dr.id_direction = sv.id_direction
JOIN types_conges t ON t.id_type = d.id_type;

-- Personnel actuellement en congé (planning du jour)
CREATE VIEW v_en_conge_aujourdhui AS
SELECT * FROM v_demandes
WHERE statut = 'APPROUVE' AND CURRENT_DATE BETWEEN date_debut AND date_fin;

-- ---------------------------------------------------------------------
-- 9. DONNÉES INITIALES
-- ---------------------------------------------------------------------
INSERT INTO directions (code, nom) VALUES
('CAB',  'Cabinet du Ministre'),
('SG',   'Secrétariat Général'),
('DRH',  'Direction des Ressources Humaines'),
('DAF',  'Direction des Affaires Financières'),
('DGFP', 'Direction Générale de la Fonction Publique'),
('DSI',  'Direction des Systèmes d''Information'),
('DGT',  'Direction Générale du Travail et des Lois Sociales'),
('DGPE', 'Direction Générale de la Promotion de l''Emploi');

INSERT INTO services (id_direction, code, nom) VALUES
(3, 'SRH-GP', 'Service de la Gestion du Personnel'),
(3, 'SRH-FC', 'Service de la Formation et des Carrières'),
(4, 'SAF-CB', 'Service de la Comptabilité et du Budget'),
(6, 'SSI-DEV','Service Développement et Maintenance'),
(2, 'SG-SEC', 'Secrétariat Particulier'),
(1, 'CAB-SEC','Secrétariat du Cabinet');

INSERT INTO postes (libelle) VALUES
('Ministre'), ('Secrétaire Général'), ('Directeur'), ('Chef de Service'),
('Responsable RH'), ('Comptable'), ('Informaticien'), ('Secrétaire'), ('Agent administratif');

-- Types de congés (valeurs par défaut à valider avec la DRH / textes en vigueur)
INSERT INTO types_conges
(code, libelle, jours_par_an, duree_max, decompte_solde, jours_ouvrables, justificatif_requis, sexe_requis) VALUES
('ANNUEL',   'Congé annuel',                    30,   30,  TRUE,  FALSE, FALSE, NULL),
('MALADIE',  'Congé de maladie',                NULL, NULL,FALSE, FALSE, TRUE,  NULL),
('MATERNITE','Congé de maternité',              NULL, 98,  FALSE, FALSE, TRUE,  'F'),
('PATERNITE','Congé de paternité',              NULL, 10,  FALSE, FALSE, TRUE,  'M'),
('PERMISSION','Permission exceptionnelle',      10,   10,  TRUE,  TRUE,  TRUE,  NULL),
('FORMATION','Congé de formation',              NULL, NULL,FALSE, FALSE, TRUE,  NULL),
('SANS_SOLDE','Congé sans solde',               NULL, NULL,FALSE, FALSE, FALSE, NULL);

-- Jours fériés Madagascar 2026 (à vérifier / compléter chaque année)
INSERT INTO jours_feries (date_ferie, libelle) VALUES
('2026-01-01','Jour de l''An'),
('2026-03-29','Commémoration de l''Insurrection de 1947'),
('2026-04-06','Lundi de Pâques'),
('2026-05-01','Fête du Travail'),
('2026-05-14','Ascension'),
('2026-05-25','Lundi de Pentecôte'),
('2026-06-26','Fête de l''Indépendance'),
('2026-08-15','Assomption'),
('2026-11-01','Toussaint'),
('2026-12-25','Noël');

-- Employés de démonstration
INSERT INTO employes (matricule, nom, prenom, sexe, date_embauche, email, statut, id_service, id_poste, id_superieur) VALUES
('ADM001','RAKOTO','Jean',   'M','2015-03-02','admin@mtefop.gov.mg',  'FONCTIONNAIRE',4,7,NULL),
('RH001', 'RASOA',  'Hanta', 'F','2012-09-10','rh@mtefop.gov.mg',     'FONCTIONNAIRE',1,5,NULL),
('CS001', 'ANDRIA', 'Tahina','M','2010-01-15','chef.srh@mtefop.gov.mg','FONCTIONNAIRE',1,4,NULL),
('EMP001','RABE',   'Miora', 'F','2018-06-01','miora@mtefop.gov.mg',  'FONCTIONNAIRE',1,9,3),
('EMP002','RANDRIA','Fidy',  'M','2020-02-03','fidy@mtefop.gov.mg',   'ECD',          3,6,3);

-- Comptes (remplacer les mots de passe par de vrais hash : password_hash() en PHP)
INSERT INTO utilisateurs (id_employe, login, mot_de_passe, role) VALUES
(1,'admin', '$2a$10$cZO5I3yE.I/ooTqeKGkV1.simf0xVuD1GfjJXHB9uy6UyhIv9k.ce', 'ADMIN'),
(2,'rh',    '$2a$10$zIx9IdhVytvsK7xDQdEBgOiluD.i6U/PahF7j9XG6KlHzgyD.RWvG', 'RH'),
(3,'chef',  '$2a$10$ndAWl5f/ipBzLge46ipicudCybZEfkdeWfiWR/nfR0ELD6Ig684l6', 'CHEF_SERVICE'),
(4,'miora', '$2a$10$4P8l9WqMw/vck95EFTVdYu610NfgyFAxd6ac.yhPJMbkywIV9kl6a', 'EMPLOYE'),
(5,'fidy',  '$2a$10$rJg7dYXJdbj/W69uDGeEoehvt8znYfeqsWzL4Nj64h0nbNUoX1LCG', 'EMPLOYE');

-- Soldes 2026 : congé annuel et permission pour tous
INSERT INTO soldes_conges (id_employe, id_type, annee, droit)
SELECT e.id_employe, t.id_type, 2026, t.jours_par_an
FROM employes e
JOIN types_conges t ON t.jours_par_an IS NOT NULL;

-- Exemple de demande
INSERT INTO demandes_conges (id_employe, id_type, date_debut, date_fin, nb_jours, motif)
VALUES (4, 1, '2026-12-21', '2026-12-31', 11, 'Congé de fin d''année');

INSERT INTO validations (id_demande, niveau, id_valideur) VALUES
(1, 1, 3),   -- chef de service
(1, 3, 2);   -- RH

-- ======================== FIN DU SCRIPT ==============================

