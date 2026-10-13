CREATE TABLE IF NOT EXISTS messages (
    id INT PRIMARY KEY,
    texte VARCHAR(255) NOT NULL
);

-- Rejouable : le DELETE évite l'erreur de doublon lors d'un redéploiement
DELETE FROM messages WHERE id = 1;

INSERT INTO messages (id, texte) VALUES (1, 'Bonjour depuis la base de données');
