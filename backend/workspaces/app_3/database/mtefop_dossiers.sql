-- =====================================================================
-- MTEFOP Madagascar - Système de suivi des dossiers en ligne
-- Base de données MySQL 8+ / MariaDB 10.4+
-- Import : mysql -u root -p < database/mtefop_dossiers.sql
-- =====================================================================


-- ---------------------------------------------------------------------
-- Services / Directions du ministère
-- ---------------------------------------------------------------------
CREATE TABLE services (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,
  nom VARCHAR(150) NOT NULL,
  description VARCHAR(255) NULL,
  actif TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Utilisateurs (agents du ministère)
-- roles : admin | directeur | chef_service | agent
-- ---------------------------------------------------------------------
CREATE TABLE utilisateurs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  matricule VARCHAR(30) NULL UNIQUE,
  nom VARCHAR(100) NOT NULL,
  prenom VARCHAR(100) NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  telephone VARCHAR(30) NULL,
  mot_de_passe VARCHAR(255) NOT NULL,
  role ENUM('admin','directeur','chef_service','agent') NOT NULL DEFAULT 'agent',
  service_id INT NULL,
  actif TINYINT(1) NOT NULL DEFAULT 1,
  derniere_connexion DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Types de dossiers (avec délai de traitement standard en jours)
-- ---------------------------------------------------------------------
CREATE TABLE types_dossier (
  id INT AUTO_INCREMENT PRIMARY KEY,
  libelle VARCHAR(150) NOT NULL UNIQUE,
  delai_jours INT NOT NULL DEFAULT 30,
  service_responsable_id INT NULL,
  CONSTRAINT fk_type_service FOREIGN KEY (service_responsable_id) REFERENCES services(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Dossiers
-- ---------------------------------------------------------------------
CREATE TABLE dossiers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  numero VARCHAR(30) NOT NULL UNIQUE,              -- ex : MTEFOP/2026/00001
  objet VARCHAR(255) NOT NULL,
  description TEXT NULL,
  type_id INT NOT NULL,
  demandeur_nom VARCHAR(150) NOT NULL,
  demandeur_cin VARCHAR(20) NULL,
  demandeur_matricule VARCHAR(30) NULL,            -- matricule solde (fonctionnaire)
  demandeur_telephone VARCHAR(30) NULL,
  demandeur_email VARCHAR(150) NULL,
  demandeur_adresse VARCHAR(255) NULL,
  statut ENUM('enregistre','en_cours','en_attente','transmis','valide','rejete','cloture')
         NOT NULL DEFAULT 'enregistre',
  priorite ENUM('normale','urgente','tres_urgente') NOT NULL DEFAULT 'normale',
  service_actuel_id INT NULL,
  agent_responsable_id INT NULL,
  date_reception DATE NOT NULL,
  date_echeance DATE NULL,
  date_cloture DATE NULL,
  created_by INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_dossier_type FOREIGN KEY (type_id) REFERENCES types_dossier(id),
  CONSTRAINT fk_dossier_service FOREIGN KEY (service_actuel_id) REFERENCES services(id) ON DELETE SET NULL,
  CONSTRAINT fk_dossier_agent FOREIGN KEY (agent_responsable_id) REFERENCES utilisateurs(id) ON DELETE SET NULL,
  CONSTRAINT fk_dossier_creator FOREIGN KEY (created_by) REFERENCES utilisateurs(id) ON DELETE SET NULL,
  INDEX idx_statut (statut),
  INDEX idx_service (service_actuel_id),
  INDEX idx_echeance (date_echeance)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Mouvements / historique de circulation du dossier
-- ---------------------------------------------------------------------
CREATE TABLE mouvements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  dossier_id INT NOT NULL,
  action ENUM('enregistrement','transmission','changement_statut','affectation','observation','cloture') NOT NULL,
  service_source_id INT NULL,
  service_dest_id INT NULL,
  statut_apres VARCHAR(30) NULL,
  commentaire TEXT NULL,
  user_id INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_mvt_dossier FOREIGN KEY (dossier_id) REFERENCES dossiers(id) ON DELETE CASCADE,
  CONSTRAINT fk_mvt_src FOREIGN KEY (service_source_id) REFERENCES services(id) ON DELETE SET NULL,
  CONSTRAINT fk_mvt_dst FOREIGN KEY (service_dest_id) REFERENCES services(id) ON DELETE SET NULL,
  CONSTRAINT fk_mvt_user FOREIGN KEY (user_id) REFERENCES utilisateurs(id) ON DELETE SET NULL,
  INDEX idx_mvt_dossier (dossier_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Pièces jointes
-- ---------------------------------------------------------------------
CREATE TABLE documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  dossier_id INT NOT NULL,
  nom_original VARCHAR(255) NOT NULL,
  nom_fichier VARCHAR(255) NOT NULL,
  type_mime VARCHAR(100) NULL,
  taille INT NULL,
  uploaded_by INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_doc_dossier FOREIGN KEY (dossier_id) REFERENCES dossiers(id) ON DELETE CASCADE,
  CONSTRAINT fk_doc_user FOREIGN KEY (uploaded_by) REFERENCES utilisateurs(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Journal d'activité (audit)
-- ---------------------------------------------------------------------
CREATE TABLE journal_activite (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  action VARCHAR(100) NOT NULL,
  details VARCHAR(500) NULL,
  ip VARCHAR(60) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_journal_user (user_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Données de référence
-- ---------------------------------------------------------------------
INSERT INTO services (code, nom, description) VALUES
 ('BO',   'Bureau d''Ordre / Courrier', 'Réception et enregistrement des dossiers'),
 ('SG',   'Secrétariat Général', 'Secrétariat Général du Ministère'),
 ('DRH',  'Direction des Ressources Humaines', 'Gestion de carrière des agents'),
 ('DFP',  'Direction de la Fonction Publique', 'Recrutement, intégration, statut'),
 ('DT',   'Direction du Travail', 'Relations professionnelles, inspection du travail'),
 ('DE',   'Direction de l''Emploi', 'Emploi, formation professionnelle'),
 ('DAJ',  'Direction des Affaires Juridiques', 'Avis et contentieux'),
 ('DAF',  'Direction des Affaires Financières', 'Budget, solde, pensions'),
 ('DSI',  'Direction des Systèmes d''Information', 'Informatique du Ministère'),
 ('CAB',  'Cabinet du Ministre', 'Décision finale / signature');

INSERT INTO types_dossier (libelle, delai_jours, service_responsable_id) VALUES
 ('Recrutement / Intégration', 60, (SELECT id FROM services WHERE code='DFP')),
 ('Avancement (échelon / classe)', 45, (SELECT id FROM services WHERE code='DRH')),
 ('Mutation / Affectation', 30, (SELECT id FROM services WHERE code='DRH')),
 ('Congé / Disponibilité', 15, (SELECT id FROM services WHERE code='DRH')),
 ('Retraite / Pension', 90, (SELECT id FROM services WHERE code='DAF')),
 ('Autorisation de licenciement', 30, (SELECT id FROM services WHERE code='DT')),
 ('Litige / Conflit du travail', 45, (SELECT id FROM services WHERE code='DT')),
 ('Agrément (bureau de placement, formation)', 60, (SELECT id FROM services WHERE code='DE')),
 ('Avis juridique', 20, (SELECT id FROM services WHERE code='DAJ')),
 ('Courrier administratif / Autre', 15, (SELECT id FROM services WHERE code='BO'));
 
 INSERT INTO utilisateurs (matricule, nom, prenom, email, mot_de_passe, role, service_id)
       VALUES ('ADM001', 'Administrateur', 'Système', 'admin@mgail.com','4515', 'admin', 9),('DIR001', 'Rakoto', 'Jean', 'directeur@gmail.com','4515', 'directeur', 2),('CHF001', 'Rasoa', 'Marie', 'chef@gmail.com','4515', 'chef_service', 3),('AGT001', 'Andria', 'Hery', 'agent1@gmail.com','4515', 'agent', 1),('AGT002', 'Razafy', 'Voahangy', 'agent2@gmail.com','4515', 'agent', 4);

-- Les comptes utilisateurs (admin, etc.) sont créés par : cd backend && npm run seed
