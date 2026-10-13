const { pool } = require('../config/db');

// db peut être le pool ou une connexion de transaction
async function notify(db, idEmploye, message, lien = null) {
  await (db || pool).query('INSERT INTO notifications (id_employe, message, lien) VALUES (?,?,?)', [
    idEmploye,
    message,
    lien,
  ]);
}

module.exports = notify;
