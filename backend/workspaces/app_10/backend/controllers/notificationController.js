const { pool } = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');

exports.list = asyncHandler(async (req, res) => {
  const nonLues = req.query.non_lues === '1';
  const [rows] = await pool.query(
    `SELECT * FROM notifications WHERE id_employe = ? ${nonLues ? 'AND lu = 0' : ''} ORDER BY created_at DESC LIMIT 100`,
    [req.user.id_employe]
  );
  const [[{ non_lues }]] = await pool.query('SELECT COUNT(*) AS non_lues FROM notifications WHERE id_employe = ? AND lu = 0', [
    req.user.id_employe,
  ]);
  res.json({ success: true, data: rows, non_lues });
});

exports.marquerLue = asyncHandler(async (req, res) => {
  await pool.query('UPDATE notifications SET lu = 1 WHERE id_notification = ? AND id_employe = ?', [req.params.id, req.user.id_employe]);
  res.json({ success: true });
});

exports.toutLire = asyncHandler(async (req, res) => {
  await pool.query('UPDATE notifications SET lu = 1 WHERE id_employe = ? AND lu = 0', [req.user.id_employe]);
  res.json({ success: true });
});
