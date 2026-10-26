const router = require('express').Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('../config/db');
const { authenticate, authorize, log } = require('../middleware/auth');

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
const storage = multer.diskStorage({
  destination: (_r, _f, cb) => cb(null, UPLOAD_DIR),
  filename: (_r, file, cb) => cb(null, Date.now() + '-' + Math.round(Math.random() * 1e6) + path.extname(file.originalname)),
});
const ALLOWED = ['application/pdf', 'image/jpeg', 'image/png',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
const upload = multer({
  storage, limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_r, f, cb) => (ALLOWED.includes(f.mimetype) ? cb(null, true) : cb(new Error('Type de fichier non autorisé'))),
});

router.use(authenticate);

async function genererNumero(conn) {
  const annee = new Date().getFullYear();
  const [[{ n }]] = await conn.query('SELECT COUNT(*) AS n FROM dossiers WHERE numero LIKE ?', [`MTEFOP/${annee}/%`]);
  return `MTEFOP/${annee}/${String(n + 1).padStart(5, '0')}`;
}

// Un agent ne voit que les dossiers de son service ; admin/directeur voient tout
function portee(user) {
  if (['admin', 'directeur'].includes(user.role)) return { sql: '', params: [] };
  return { sql: ' AND (d.service_actuel_id = ? OR d.created_by = ?)', params: [user.service_id, user.id] };
}

// ---- Liste + recherche + filtres + pagination
router.get('/', async (req, res) => {
  try {
    const { q, statut, type_id, service_id, priorite, retard, page = 1, limit = 15 } = req.query;
    let where = ' WHERE 1=1';
    const params = [];
    if (q) { where += ' AND (d.numero LIKE ? OR d.objet LIKE ? OR d.demandeur_nom LIKE ? OR d.demandeur_cin LIKE ? OR d.demandeur_matricule LIKE ?)'; const l = `%${q}%`; params.push(l, l, l, l, l); }
    if (statut) { where += ' AND d.statut = ?'; params.push(statut); }
    if (type_id) { where += ' AND d.type_id = ?'; params.push(type_id); }
    if (service_id) { where += ' AND d.service_actuel_id = ?'; params.push(service_id); }
    if (priorite) { where += ' AND d.priorite = ?'; params.push(priorite); }
    if (retard === '1') where += " AND d.date_echeance < CURDATE() AND d.statut NOT IN ('valide','rejete','cloture')";
    const p = portee(req.user);
    where += p.sql; params.push(...p.params);

    const lim = Math.min(parseInt(limit) || 15, 100);
    const offset = (Math.max(parseInt(page) || 1, 1) - 1) * lim;
    const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM dossiers d ${where}`, params);
    const [rows] = await db.query(
      `SELECT d.*, t.libelle AS type_libelle, s.nom AS service_nom, s.code AS service_code,
              CONCAT(a.nom,' ',COALESCE(a.prenom,'')) AS agent_nom,
              (d.date_echeance < CURDATE() AND d.statut NOT IN ('valide','rejete','cloture')) AS en_retard
       FROM dossiers d
       JOIN types_dossier t ON t.id = d.type_id
       LEFT JOIN services s ON s.id = d.service_actuel_id
       LEFT JOIN utilisateurs a ON a.id = d.agent_responsable_id
       ${where} ORDER BY d.id DESC LIMIT ? OFFSET ?`, [...params, lim, offset]);
    res.json({ data: rows, total, page: Number(page), pages: Math.ceil(total / lim) });
  } catch (e) { console.error(e); res.status(500).json({ message: 'Erreur serveur' }); }
});

// ---- Détail
router.get('/:id', async (req, res) => {
  const [rows] = await db.query(
    `SELECT d.*, t.libelle AS type_libelle, s.nom AS service_nom,
            CONCAT(a.nom,' ',COALESCE(a.prenom,'')) AS agent_nom
     FROM dossiers d JOIN types_dossier t ON t.id = d.type_id
     LEFT JOIN services s ON s.id = d.service_actuel_id
     LEFT JOIN utilisateurs a ON a.id = d.agent_responsable_id WHERE d.id = ?`, [req.params.id]);
  if (!rows.length) return res.status(404).json({ message: 'Dossier introuvable' });
  const [mouvements] = await db.query(
    `SELECT m.*, s1.nom AS source_nom, s2.nom AS dest_nom, CONCAT(u.nom,' ',COALESCE(u.prenom,'')) AS utilisateur
     FROM mouvements m LEFT JOIN services s1 ON s1.id = m.service_source_id
     LEFT JOIN services s2 ON s2.id = m.service_dest_id LEFT JOIN utilisateurs u ON u.id = m.user_id
     WHERE m.dossier_id = ? ORDER BY m.id DESC`, [req.params.id]);
  const [documents] = await db.query(
    'SELECT id, nom_original, type_mime, taille, created_at FROM documents WHERE dossier_id = ? ORDER BY id DESC', [req.params.id]);
  res.json({ ...rows[0], mouvements, documents });
});

// ---- Création (enregistrement)
router.post('/', async (req, res) => {
  const conn = await db.getConnection();
  try {
    const b = req.body;
    if (!b.objet || !b.type_id || !b.demandeur_nom) return res.status(400).json({ message: 'Objet, type et demandeur obligatoires' });
    await conn.beginTransaction();
    const numero = await genererNumero(conn);
    const [[type]] = await conn.query('SELECT delai_jours, service_responsable_id FROM types_dossier WHERE id = ?', [b.type_id]);
    if (!type) { await conn.rollback(); return res.status(400).json({ message: 'Type de dossier invalide' }); }
    const reception = b.date_reception || new Date().toISOString().slice(0, 10);
    const echeance = b.date_echeance || new Date(new Date(reception).getTime() + type.delai_jours * 86400000).toISOString().slice(0, 10);
    const serviceInitial = req.user.service_id || type.service_responsable_id;

    const [r] = await conn.query(
      `INSERT INTO dossiers (numero, objet, description, type_id, demandeur_nom, demandeur_cin, demandeur_matricule,
        demandeur_telephone, demandeur_email, demandeur_adresse, statut, priorite, service_actuel_id,
        date_reception, date_echeance, created_by)
       VALUES (?,?,?,?,?,?,?,?,?,?, 'enregistre', ?,?,?,?,?)`,
      [numero, b.objet, b.description || null, b.type_id, b.demandeur_nom, b.demandeur_cin || null,
       b.demandeur_matricule || null, b.demandeur_telephone || null, b.demandeur_email || null,
       b.demandeur_adresse || null, b.priorite || 'normale', serviceInitial, reception, echeance, req.user.id]);
    await conn.query(
      `INSERT INTO mouvements (dossier_id, action, service_dest_id, statut_apres, commentaire, user_id)
       VALUES (?, 'enregistrement', ?, 'enregistre', 'Dossier enregistré', ?)`, [r.insertId, serviceInitial, req.user.id]);
    await conn.commit();
    await log(req.user.id, 'CREATION_DOSSIER', numero, req.ip);
    res.status(201).json({ id: r.insertId, numero });
  } catch (e) { await conn.rollback(); console.error(e); res.status(500).json({ message: 'Erreur serveur' }); }
  finally { conn.release(); }
});

// ---- Modification des informations
router.put('/:id', async (req, res) => {
  const b = req.body;
  await db.query(
    `UPDATE dossiers SET objet=?, description=?, type_id=?, demandeur_nom=?, demandeur_cin=?, demandeur_matricule=?,
       demandeur_telephone=?, demandeur_email=?, demandeur_adresse=?, priorite=?, date_echeance=? WHERE id=?`,
    [b.objet, b.description || null, b.type_id, b.demandeur_nom, b.demandeur_cin || null, b.demandeur_matricule || null,
     b.demandeur_telephone || null, b.demandeur_email || null, b.demandeur_adresse || null,
     b.priorite || 'normale', b.date_echeance || null, req.params.id]);
  await log(req.user.id, 'MODIFICATION_DOSSIER', `id=${req.params.id}`, req.ip);
  res.json({ message: 'Dossier mis à jour' });
});

// ---- Transmission à un autre service
router.post('/:id/transmettre', async (req, res) => {
  const { service_dest_id, commentaire } = req.body;
  if (!service_dest_id) return res.status(400).json({ message: 'Service destinataire requis' });
  const [rows] = await db.query('SELECT service_actuel_id FROM dossiers WHERE id = ?', [req.params.id]);
  if (!rows.length) return res.status(404).json({ message: 'Dossier introuvable' });
  await db.query(
    "UPDATE dossiers SET service_actuel_id=?, statut='transmis', agent_responsable_id=NULL WHERE id=?",
    [service_dest_id, req.params.id]);
  await db.query(
    `INSERT INTO mouvements (dossier_id, action, service_source_id, service_dest_id, statut_apres, commentaire, user_id)
     VALUES (?, 'transmission', ?, ?, 'transmis', ?, ?)`,
    [req.params.id, rows[0].service_actuel_id, service_dest_id, commentaire || null, req.user.id]);
  await log(req.user.id, 'TRANSMISSION_DOSSIER', `id=${req.params.id} -> service ${service_dest_id}`, req.ip);
  res.json({ message: 'Dossier transmis' });
});

// ---- Changement de statut
router.post('/:id/statut', async (req, res) => {
  const { statut, commentaire } = req.body;
  const valides = ['en_cours', 'en_attente', 'valide', 'rejete', 'cloture'];
  if (!valides.includes(statut)) return res.status(400).json({ message: 'Statut invalide' });
  if (['valide', 'rejete', 'cloture'].includes(statut) && req.user.role === 'agent')
    return res.status(403).json({ message: 'Seul un chef de service ou un directeur peut valider, rejeter ou clôturer' });
  const [rows] = await db.query('SELECT service_actuel_id FROM dossiers WHERE id = ?', [req.params.id]);
  if (!rows.length) return res.status(404).json({ message: 'Dossier introuvable' });
  const cloture = ['valide', 'rejete', 'cloture'].includes(statut);
  await db.query('UPDATE dossiers SET statut=?, date_cloture = ? WHERE id=?',
    [statut, cloture ? new Date().toISOString().slice(0, 10) : null, req.params.id]);
  await db.query(
    `INSERT INTO mouvements (dossier_id, action, service_source_id, statut_apres, commentaire, user_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [req.params.id, statut === 'cloture' ? 'cloture' : 'changement_statut', rows[0].service_actuel_id, statut, commentaire || null, req.user.id]);
  await log(req.user.id, 'CHANGEMENT_STATUT', `id=${req.params.id} -> ${statut}`, req.ip);
  res.json({ message: 'Statut mis à jour' });
});

// ---- Affectation à un agent
router.post('/:id/affecter', authorize('admin', 'directeur', 'chef_service'), async (req, res) => {
  const { agent_id } = req.body;
  await db.query("UPDATE dossiers SET agent_responsable_id=?, statut = IF(statut IN ('enregistre','transmis'),'en_cours',statut) WHERE id=?", [agent_id, req.params.id]);
  await db.query(
    `INSERT INTO mouvements (dossier_id, action, commentaire, user_id) VALUES (?, 'affectation', ?, ?)`,
    [req.params.id, `Affecté à l'agent #${agent_id}`, req.user.id]);
  res.json({ message: 'Dossier affecté' });
});

// ---- Observation
router.post('/:id/observation', async (req, res) => {
  if (!req.body.commentaire) return res.status(400).json({ message: 'Commentaire requis' });
  await db.query(`INSERT INTO mouvements (dossier_id, action, commentaire, user_id) VALUES (?, 'observation', ?, ?)`,
    [req.params.id, req.body.commentaire, req.user.id]);
  res.status(201).json({ message: 'Observation ajoutée' });
});

// ---- Pièces jointes
router.post('/:id/documents', (req, res) => {
  upload.array('fichiers', 10)(req, res, async (err) => {
    if (err) return res.status(400).json({ message: err.message });
    for (const f of req.files || []) {
      await db.query(
        'INSERT INTO documents (dossier_id, nom_original, nom_fichier, type_mime, taille, uploaded_by) VALUES (?,?,?,?,?,?)',
        [req.params.id, Buffer.from(f.originalname, 'latin1').toString('utf8'), f.filename, f.mimetype, f.size, req.user.id]);
    }
    await log(req.user.id, 'AJOUT_DOCUMENTS', `dossier=${req.params.id} (${(req.files || []).length})`, req.ip);
    res.status(201).json({ message: 'Documents ajoutés' });
  });
});

router.get('/documents/:docId/telecharger', async (req, res) => {
  const [rows] = await db.query('SELECT * FROM documents WHERE id = ?', [req.params.docId]);
  if (!rows.length) return res.status(404).json({ message: 'Document introuvable' });
  const file = path.join(UPLOAD_DIR, path.basename(rows[0].nom_fichier));
  if (!fs.existsSync(file)) return res.status(404).json({ message: 'Fichier manquant sur le serveur' });
  res.download(file, rows[0].nom_original);
});

router.delete('/documents/:docId', authorize('admin', 'directeur', 'chef_service'), async (req, res) => {
  const [rows] = await db.query('SELECT nom_fichier FROM documents WHERE id = ?', [req.params.docId]);
  if (rows.length) {
    fs.unlink(path.join(UPLOAD_DIR, path.basename(rows[0].nom_fichier)), () => {});
    await db.query('DELETE FROM documents WHERE id = ?', [req.params.docId]);
  }
  res.json({ message: 'Document supprimé' });
});

router.delete('/:id', authorize('admin'), async (req, res) => {
  await db.query('DELETE FROM dossiers WHERE id = ?', [req.params.id]);
  await log(req.user.id, 'SUPPRESSION_DOSSIER', `id=${req.params.id}`, req.ip);
  res.json({ message: 'Dossier supprimé' });
});

module.exports = router;
