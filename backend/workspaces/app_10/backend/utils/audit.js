const { pool } = require('../config/db');

// Journalisation : ne doit jamais faire échouer la requête principale
async function audit(req, action, { table = null, id = null, details = null, userId = null } = {}) {
  try {
    await pool.query(
      'INSERT INTO journal_audit (id_utilisateur, action, table_cible, id_cible, details, adresse_ip) VALUES (?,?,?,?,?,?)',
      [userId || req.user?.id_utilisateur || null, action, table, id, details ? JSON.stringify(details) : null, req.ip]
    );
  } catch (err) {
    console.error('Audit error:', err.message);
  }
}

module.exports = audit;
