// Construit les morceaux d'un UPDATE à partir des champs autorisés présents dans body
function buildUpdate(body, allowed) {
  const fields = [];
  const values = [];
  for (const key of allowed) {
    if (body[key] !== undefined) {
      fields.push(`\`${key}\` = ?`);
      values.push(body[key] === '' ? null : body[key]);
    }
  }
  return { fields, values };
}

function paginate(query) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100);
  return { page, limit, offset: (page - 1) * limit };
}

module.exports = { buildUpdate, paginate };
