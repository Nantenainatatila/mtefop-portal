const { pool } = require('../config/db');
const { ROLES } = require('../config/constants');

const isRH = (user) => [ROLES.ADMIN, ROLES.RH].includes(user.role);

// Périmètre de visibilité selon le rôle.
// Les requêtes doivent utiliser les alias : e = employes, s = services
function scopeClause(user) {
  if (isRH(user)) return { clause: '', params: [] };
  if (user.role === ROLES.DIRECTEUR) return { clause: ' AND s.id_direction = ?', params: [user.id_direction] };
  if (user.role === ROLES.CHEF_SERVICE) return { clause: ' AND e.id_service = ?', params: [user.id_service] };
  return { clause: ' AND e.id_employe = ?', params: [user.id_employe] };
}

async function peutAccederEmploye(user, idEmploye) {
  if (Number(idEmploye) === user.id_employe) return true;
  const { clause, params } = scopeClause(user);
  const [rows] = await pool.query(
    `SELECT 1 FROM employes e JOIN services s ON s.id_service = e.id_service WHERE e.id_employe = ? ${clause}`,
    [idEmploye, ...params]
  );
  return rows.length > 0;
}

module.exports = { isRH, scopeClause, peutAccederEmploye };
