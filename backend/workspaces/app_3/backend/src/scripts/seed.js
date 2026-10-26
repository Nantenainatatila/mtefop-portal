// Crée les comptes de démonstration + quelques dossiers d'exemple.
// Usage : npm run seed   (après avoir importé database/mtefop_dossiers.sql)
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../config/db');

(async () => {
  const [svc] = await db.query('SELECT id, code FROM services');
  const S = Object.fromEntries(svc.map((s) => [s.code, s.id]));
  const users = [
    ['ADM001', 'Administrateur', 'Système', 'admin@mtefop.gov.mg', 'admin', 'DSI'],
    ['DIR001', 'Rakoto', 'Jean', 'directeur@mtefop.gov.mg', 'directeur', 'SG'],
    ['CHF001', 'Rasoa', 'Marie', 'chef.drh@mtefop.gov.mg', 'chef_service', 'DRH'],
    ['AGT001', 'Andria', 'Hery', 'agent.bo@mtefop.gov.mg', 'agent', 'BO'],
    ['AGT002', 'Razafy', 'Voahangy', 'agent.dfp@mtefop.gov.mg', 'agent', 'DFP'],
  ];
  const hash = await bcrypt.hash('Mtefop@2026', 10);
  for (const [mat, nom, prenom, email, role, code] of users) {
    await db.query(
      `INSERT INTO utilisateurs (matricule, nom, prenom, email, mot_de_passe, role, service_id)
       VALUES (?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE nom=VALUES(nom)`,
      [mat, nom, prenom, email, hash, role, S[code]]);
  }
  const [[admin]] = await db.query("SELECT id FROM utilisateurs WHERE email='admin@mtefop.gov.mg'");
  const [types] = await db.query('SELECT id FROM types_dossier ORDER BY id LIMIT 3');
  const exemples = [
    ['Demande d\'intégration dans la fonction publique', 'RAKOTOMALALA Andry', '101 234 567 890', 'DFP', 'en_cours'],
    ['Demande d\'avancement d\'échelon', 'RANDRIANASOLO Fanja', '301 456 789 012', 'DRH', 'transmis'],
    ['Demande de mutation vers Toamasina', 'RAVELOSON Tiana', '201 987 654 321', 'BO', 'enregistre'],
  ];
  const [[{ n }]] = await db.query('SELECT COUNT(*) AS n FROM dossiers');
  if (n === 0) {
    for (let i = 0; i < exemples.length; i++) {
      const [objet, nom, cin, code, statut] = exemples[i];
      const numero = `MTEFOP/${new Date().getFullYear()}/${String(i + 1).padStart(5, '0')}`;
      const [r] = await db.query(
        `INSERT INTO dossiers (numero, objet, type_id, demandeur_nom, demandeur_cin, statut, service_actuel_id,
          date_reception, date_echeance, created_by)
         VALUES (?,?,?,?,?,?,?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 30 DAY), ?)`,
        [numero, objet, types[i].id, nom, cin.replace(/ /g, ''), statut, S[code], admin.id]);
      await db.query(
        `INSERT INTO mouvements (dossier_id, action, service_dest_id, statut_apres, commentaire, user_id)
         VALUES (?, 'enregistrement', ?, ?, 'Dossier enregistré (exemple)', ?)`, [r.insertId, S[code], statut, admin.id]);
    }
  }
  console.log('Comptes créés (mot de passe : Mtefop@2026) :');
  users.forEach((u) => console.log(` - ${u[3]}  [${u[4]}]`));
  console.log('Pensez à changer ces mots de passe en production !');
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
