const pg = require('pg');
const env = require('./env');

const { Pool, types } = pg;

// --- Conversions de types (équivalent dateStrings / decimalNumbers de mysql2) ---
types.setTypeParser(1700, (v) => (v === null ? null : parseFloat(v))); // NUMERIC -> number
types.setTypeParser(20, (v) => (v === null ? null : parseInt(v, 10))); // BIGINT (COUNT, SUM) -> number
types.setTypeParser(1082, (v) => v); // DATE -> texte 'YYYY-MM-DD'
types.setTypeParser(1114, (v) => v); // TIMESTAMP -> texte
types.setTypeParser(1184, (v) => v); // TIMESTAMPTZ -> texte

const pool = new Pool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Colonnes BOOLEAN du schéma PostgreSQL (MySQL utilisait TINYINT 0/1)
const BOOL_COLS = 'actif|lu|demi_journee_debut|demi_journee_fin|decompte_solde|jours_ouvrables|justificatif_requis';

/**
 * Traduit une requête écrite pour MySQL en SQL PostgreSQL.
 * Permet de garder le code des contrôleurs presque inchangé.
 */
function translate(sql) {
  let q = sql;

  // Fonctions MySQL -> PostgreSQL
  q = q.replace(/CURDATE\(\)/gi, 'CURRENT_DATE');
  q = q.replace(/IFNULL\(/gi, 'COALESCE(');
  q = q.replace(/DATEDIFF\(\s*\?\s*,\s*\?\s*\)/gi, '(?::date - ?::date)');
  q = q.replace(/\bYEAR\(([^()]+)\)/gi, 'EXTRACT(YEAR FROM $1)::int');
  q = q.replace(/\bMONTH\(([^()]+)\)/gi, 'EXTRACT(MONTH FROM $1)::int');
  q = q.replace(
    /FIELD\(\s*([\w.]+)\s*,\s*((?:'[^']*'\s*,?\s*)+)\)/gi,
    (_, col, list) => `array_position(ARRAY[${list.trim().replace(/,\s*$/, '')}]::text[], ${col}::text)`
  );

  // Booléens : actif = 1 -> actif = TRUE
  q = q.replace(new RegExp(`\\b((?:\\w+\\.)?(?:${BOOL_COLS}))\\s*=\\s*([01])\\b`, 'gi'), (_, c, v) =>
    `${c} = ${v === '1' ? 'TRUE' : 'FALSE'}`
  );

  // INSERT IGNORE -> ON CONFLICT DO NOTHING
  let ignore = false;
  if (/INSERT\s+IGNORE\s+INTO/i.test(q)) {
    q = q.replace(/INSERT\s+IGNORE\s+INTO/i, 'INSERT INTO');
    ignore = true;
  }

  // Backticks -> guillemets doubles, et ? -> $1, $2... (hors chaînes 'texte')
  let out = '';
  let n = 0;
  let inStr = false;
  for (let i = 0; i < q.length; i++) {
    const ch = q[i];
    if (ch === "'") inStr = !inStr;
    if (!inStr && ch === '?') out += `$${++n}`;
    else if (!inStr && ch === '`') out += '"';
    else out += ch;
  }
  q = out.trimEnd().replace(/;$/, '');

  if (ignore) q += ' ON CONFLICT DO NOTHING';

  // Pour obtenir insertId comme mysql2
  if (/^\s*INSERT\s/i.test(q) && !/\bRETURNING\b/i.test(q)) q += ' RETURNING *';

  return q;
}

// Formate le résultat comme mysql2 : [rows, fields] ou [{ insertId, affectedRows }, fields]
function format(res) {
  if (res.command === 'SELECT') return [res.rows, res.fields];
  const first = res.rows && res.rows[0];
  const header = {
    insertId: res.command === 'INSERT' && first ? Object.values(first)[0] : undefined,
    affectedRows: res.rowCount,
    rows: res.rows,
  };
  return [header, res.fields];
}

async function run(executor, sql, params = []) {
  const res = await executor.query(translate(sql), params);
  return format(res);
}

// API compatible mysql2 utilisée par les contrôleurs
const db = {
  query: (sql, params) => run(pool, sql, params),
  execute: (sql, params) => run(pool, sql, params),

  async getConnection() {
    const client = await pool.connect();
    return {
      query: (sql, params) => run(client, sql, params),
      execute: (sql, params) => run(client, sql, params),
      beginTransaction: () => client.query('BEGIN'),
      commit: () => client.query('COMMIT'),
      rollback: () => client.query('ROLLBACK'),
      release: () => client.release(),
    };
  },

  raw: pool, // pool pg natif si besoin
  end: () => pool.end(),
};

async function testConnection() {
  const client = await pool.connect();
  await client.query('SELECT 1');
  client.release();
}

module.exports = { pool: db, testConnection, translate };
