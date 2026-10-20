-- =====================================================================
--  Base de données : plateforme e-commerce de voitures (PostgreSQL)
--
--  Utilisation :
--    1) Créer la base :        createdb car_platform
--    2) Importer ce fichier :  psql -U postgres -d car_platform -f car_platform.sql
--
--  Comptes de démonstration (à changer en production) :
--    Admin  : admin@car.mg   / admin123
--    Client : client@car.mg  / client123
--
--  Tous les prix sont en Ariary (Ar), sans décimales.
-- =====================================================================

-- On supprime les anciennes tables pour pouvoir relancer le fichier à volonté
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS likes CASCADE;
DROP TABLE IF EXISTS cars CASCADE;
DROP TABLE IF EXISTS brands CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ---------------------------------------------------------------------
-- UTILISATEURS : clients et admin (le champ "role" fait la différence)
-- ---------------------------------------------------------------------
CREATE TABLE users (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  email       VARCHAR(150) NOT NULL UNIQUE,
  password    VARCHAR(255) NOT NULL,                 -- mot de passe crypté (bcrypt)
  role        VARCHAR(10)  NOT NULL DEFAULT 'client' CHECK (role IN ('client', 'admin')),
  avatar      VARCHAR(255),                          -- image de profil (facultative)
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- MARQUES : Toyota, Peugeot...
-- ---------------------------------------------------------------------
CREATE TABLE brands (
  id    SERIAL PRIMARY KEY,
  name  VARCHAR(80) NOT NULL UNIQUE
);

-- ---------------------------------------------------------------------
-- VOITURES publiées par l'admin
-- ---------------------------------------------------------------------
CREATE TABLE cars (
  id           SERIAL PRIMARY KEY,
  brand_id     INTEGER NOT NULL REFERENCES brands(id),
  name         VARCHAR(120) NOT NULL,
  price        BIGINT NOT NULL CHECK (price > 0),    -- prix en Ariary
  year         INTEGER,
  description  TEXT NOT NULL DEFAULT '',
  image        VARCHAR(255),                         -- ex : /uploads/123456.jpg
  created_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- LIKES : un utilisateur ne peut liker qu'une seule fois la même voiture
-- ---------------------------------------------------------------------
CREATE TABLE likes (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  car_id      INTEGER NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, car_id)
);

-- ---------------------------------------------------------------------
-- COMMENTAIRES sous les voitures
-- ---------------------------------------------------------------------
CREATE TABLE comments (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  car_id      INTEGER NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- COMMANDES : un client commande une voiture
--   pending = en attente | confirmed = confirmée
--   delivered = livrée   | cancelled = annulée
-- ---------------------------------------------------------------------
CREATE TABLE orders (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  car_id      INTEGER NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  status      VARCHAR(15) NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'confirmed', 'delivered', 'cancelled')),
  note        TEXT NOT NULL DEFAULT '',              -- message du client à la commande
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- MESSAGES : discussion client <-> admin à propos d'une commande
-- ---------------------------------------------------------------------
CREATE TABLE messages (
  id          SERIAL PRIMARY KEY,
  order_id    INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  sender_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- NOTIFICATIONS pour l'admin (nouvelle commande, nouveau message)
-- ---------------------------------------------------------------------
CREATE TABLE notifications (
  id          SERIAL PRIMARY KEY,
  order_id    INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  message     VARCHAR(255) NOT NULL,
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Index pour accélérer les recherches les plus fréquentes
CREATE INDEX idx_cars_brand      ON cars(brand_id);
CREATE INDEX idx_likes_car       ON likes(car_id);
CREATE INDEX idx_comments_car    ON comments(car_id);
CREATE INDEX idx_orders_user     ON orders(user_id);
CREATE INDEX idx_messages_order  ON messages(order_id);

-- =====================================================================
--  DONNÉES DE DÉMONSTRATION
-- =====================================================================

INSERT INTO users (name, email, password, role) VALUES
  ('Administrateur', 'admin@car.mg',  '$2a$10$edmlS6lnsk.wtXWpb.nC9usSFQZRlD1X5FOyeSPDqV/w5TspOmLW2', 'admin'),
  ('Rakoto Jean',    'client@car.mg', '$2a$10$Cj6JHCUqxVOgp4Xc4YmYSevaqkliLTnti5/JoqwHXO5hAkEga/Ox.', 'client');

INSERT INTO brands (name) VALUES
  ('Toyota'), ('Peugeot'), ('Hyundai'), ('Renault'), ('Kia'), ('Nissan'), ('Suzuki'), ('Ford');

INSERT INTO cars (brand_id, name, price, year, description) VALUES
  (1, 'Land Cruiser Prado', 185000000, 2019, 'SUV robuste et confortable, 7 places, diesel, boîte automatique. Idéal pour les longs trajets et les pistes.'),
  (1, 'Hilux Double Cabine', 140000000, 2020, 'Pick-up 4x4 diesel, très fiable, parfait pour le travail comme pour la famille.'),
  (1, 'RAV4', 95000000, 2018, 'SUV compact essence, économique, intérieur spacieux, climatisation automatique.'),
  (2, '208', 45000000, 2019, 'Citadine moderne, faible consommation, écran tactile et caméra de recul.'),
  (2, '3008', 78000000, 2018, 'SUV élégant, diesel, grand coffre, très bon confort sur route.'),
  (3, 'Tucson', 85000000, 2019, 'SUV familial, essence, 5 places, sièges en cuir et toit ouvrant.'),
  (3, 'i10', 38000000, 2020, 'Petite citadine facile à garder en ville, très économique en carburant.'),
  (4, 'Duster', 62000000, 2019, 'SUV polyvalent et solide, haute garde au sol, parfait pour les routes difficiles.'),
  (5, 'Sportage', 98000000, 2020, 'SUV moderne, diesel, boîte automatique, garantie constructeur restante.'),
  (7, 'Swift', 42000000, 2020, 'Citadine agile et légère, essence, boîte manuelle, très peu de kilomètres.'),
  (8, 'Ranger', 150000000, 2019, 'Pick-up 4x4 puissant, diesel, cabine double, idéal pour les chantiers.');

-- Quelques likes, un commentaire et une commande pour voir le tableau de bord vivant
INSERT INTO likes (user_id, car_id) VALUES (2, 1), (2, 3), (2, 4), (1, 1), (1, 6);
INSERT INTO comments (user_id, car_id, content) VALUES
  (2, 1, 'Magnifique voiture ! Est-ce que le prix est négociable ?');
INSERT INTO orders (user_id, car_id, note) VALUES
  (2, 1, 'Bonjour, je souhaite voir la voiture ce week-end.');
INSERT INTO messages (order_id, sender_id, content) VALUES
  (1, 2, 'Bonjour, est-ce possible de visiter samedi matin ?');
INSERT INTO notifications (order_id, message) VALUES
  (1, 'Rakoto Jean a commandé Toyota Land Cruiser Prado'),
  (1, 'Rakoto Jean a écrit un message (commande #1)');