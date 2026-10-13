const { pool } = require('../config/db');
const { ROLES, STATUT, NIVEAUX } = require('../config/constants');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const audit = require('../utils/audit');
const notify = require('../utils/notify');
const { paginate } = require('../utils/helpers');
const { isRH, scopeClause } = require('../utils/scope');

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

// Nombre de jours décomptés (ouvrables ou calendaires selon le type, demi-journées incluses)
async function calculerNbJours(conn, type, debut, fin, demiDebut, demiFin) {
  let n;
  if (type.jours_ouvrables) {
    const [[r]] = await conn.query('SELECT fn_jours_ouvrables(?, ?) AS n', [debut, fin]);
    n = Number(r.n);
  } else {
    const [[r]] = await conn.query('SELECT DATEDIFF(?, ?) + 1 AS n', [fin, debut]);
    n = Number(r.n);
  }
  if (demiDebut) n -= 0.5;
  if (demiFin && !(debut === fin && demiDebut)) n -= 0.5;
  return n;
}

async function resteDisponible(conn, idEmploye, idType, annee, lock = false) {
  const [[s]] = await conn.query(
    `SELECT (droit + report - pris) AS reste FROM soldes_conges
      WHERE id_employe = ? AND id_type = ? AND annee = ? ${lock ? 'FOR UPDATE' : ''}`,
    [idEmploye, idType, annee]
  );
  if (!s) return null;
  const [[p]] = await conn.query(
    `SELECT IFNULL(SUM(nb_jours), 0) AS pending FROM demandes_conges
      WHERE id_employe = ? AND id_type = ? AND statut = 'EN_ATTENTE' AND YEAR(date_debut) = ?`,
    [idEmploye, idType, annee]
  );
  return { reste: Number(s.reste), enAttente: Number(p.pending) };
}

const SELECT_DEMANDE = `
  SELECT d.id_demande, d.reference, d.id_employe, e.matricule,
         CONCAT(e.nom, ' ', IFNULL(e.prenom, '')) AS employe,
         s.id_service, s.nom AS service, s.id_direction, dr.nom AS direction,
         t.id_type, t.code AS type_code, t.libelle AS type_conge,
         d.date_debut, d.date_fin, d.nb_jours, d.demi_journee_debut, d.demi_journee_fin,
         d.motif, d.adresse_conge, d.justificatif, d.id_interim,
         CONCAT(i.nom, ' ', IFNULL(i.prenom, '')) AS interim,
         d.statut, d.date_demande
    FROM demandes_conges d
    JOIN employes e   ON e.id_employe = d.id_employe
    JOIN services s   ON s.id_service = e.id_service
    JOIN directions dr ON dr.id_direction = s.id_direction
    JOIN types_conges t ON t.id_type = d.id_type
    LEFT JOIN employes i ON i.id_employe = d.id_interim`;

/* ------------------------------------------------------------------ */
/* Consultation                                                        */
/* ------------------------------------------------------------------ */

exports.mesDemandes = asyncHandler(async (req, res) => {
  const { statut, annee } = req.query;
  const where = ['d.id_employe = ?'];
  const params = [req.user.id_employe];
  if (statut) { where.push('d.statut = ?'); params.push(statut); }
  if (annee) { where.push('YEAR(d.date_debut) = ?'); params.push(annee); }

  const [rows] = await pool.query(`${SELECT_DEMANDE} WHERE ${where.join(' AND ')} ORDER BY d.date_demande DESC`, params);
  res.json({ success: true, data: rows });
});

exports.list = asyncHandler(async (req, res) => {
  const { statut, annee, id_service, id_employe, id_type } = req.query;
  const { page, limit, offset } = paginate(req.query);
  const where = ['1=1'];
  const params = [];
  if (statut) { where.push('d.statut = ?'); params.push(statut); }
  if (annee) { where.push('YEAR(d.date_debut) = ?'); params.push(annee); }
  if (id_service) { where.push('e.id_service = ?'); params.push(id_service); }
  if (id_employe) { where.push('d.id_employe = ?'); params.push(id_employe); }
  if (id_type) { where.push('d.id_type = ?'); params.push(id_type); }

  const scope = scopeClause(req.user);
  const whereSql = where.join(' AND ') + scope.clause;
  const allParams = [...params, ...scope.params];

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM demandes_conges d
       JOIN employes e ON e.id_employe = d.id_employe
       JOIN services s ON s.id_service = e.id_service
      WHERE ${whereSql}`,
    allParams
  );
  const [rows] = await pool.query(`${SELECT_DEMANDE} WHERE ${whereSql} ORDER BY d.date_demande DESC LIMIT ? OFFSET ?`, [
    ...allParams, limit, offset,
  ]);
  res.json({ success: true, data: rows, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

// Demandes en attente de MA décision (le niveau précédent doit être validé)
exports.aValider = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    `${SELECT_DEMANDE}
      JOIN validations v ON v.id_demande = d.id_demande AND v.decision = 'EN_ATTENTE'
     WHERE d.statut = 'EN_ATTENTE'
       AND d.id_employe <> ?
       AND (v.id_valideur = ? OR (v.niveau = ? AND ? = 1))
       AND NOT EXISTS (SELECT 1 FROM validations v2
                        WHERE v2.id_demande = v.id_demande AND v2.niveau < v.niveau AND v2.decision = 'EN_ATTENTE')
     ORDER BY d.date_demande`,
    [req.user.id_employe, req.user.id_employe, NIVEAUX.RH, isRH(req.user) ? 1 : 0]
  );
  res.json({ success: true, data: rows });
});

exports.getOne = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(`${SELECT_DEMANDE} WHERE d.id_demande = ?`, [req.params.id]);
  if (!rows.length) throw new ApiError(404, 'Demande introuvable');
  const demande = rows[0];

  const [validations] = await pool.query(
    `SELECT v.niveau, v.decision, v.commentaire, v.date_decision, v.id_valideur,
            CONCAT(e.nom, ' ', IFNULL(e.prenom, '')) AS valideur
       FROM validations v JOIN employes e ON e.id_employe = v.id_valideur
      WHERE v.id_demande = ? ORDER BY v.niveau`,
    [demande.id_demande]
  );

  const u = req.user;
  const autorise =
    demande.id_employe === u.id_employe ||
    isRH(u) ||
    validations.some((v) => v.id_valideur === u.id_employe) ||
    (u.role === ROLES.CHEF_SERVICE && demande.id_service === u.id_service) ||
    (u.role === ROLES.DIRECTEUR && demande.id_direction === u.id_direction);
  if (!autorise) throw new ApiError(403, 'Accès refusé à cette demande');

  res.json({ success: true, data: { ...demande, validations } });
});

/* ------------------------------------------------------------------ */
/* Création                                                            */
/* ------------------------------------------------------------------ */

exports.create = asyncHandler(async (req, res) => {
  const {
    id_type, date_debut, date_fin, motif, adresse_conge, justificatif, id_interim,
    demi_journee_debut = 0, demi_journee_fin = 0,
  } = req.body;

  // Un agent RH/ADMIN peut saisir une demande pour un autre employé
  const idEmploye = isRH(req.user) && req.body.id_employe ? Number(req.body.id_employe) : req.user.id_employe;
  if (id_interim && Number(id_interim) === idEmploye) throw new ApiError(400, "L'intérimaire ne peut pas être le demandeur");

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [[emp]] = await conn.query('SELECT id_employe, sexe, id_superieur, actif FROM employes WHERE id_employe = ?', [idEmploye]);
    if (!emp || !emp.actif) throw new ApiError(404, 'Employé introuvable ou inactif');

    const [[type]] = await conn.query('SELECT * FROM types_conges WHERE id_type = ? AND actif = 1', [id_type]);
    if (!type) throw new ApiError(404, 'Type de congé introuvable');
    if (type.sexe_requis && type.sexe_requis !== emp.sexe) {
      throw new ApiError(400, `Le type « ${type.libelle} » n'est pas applicable à cet employé`);
    }
    if (type.justificatif_requis && !justificatif && !isRH(req.user)) {
      throw new ApiError(400, `Un justificatif est requis pour le type « ${type.libelle} »`);
    }

    const [[{ today }]] = await conn.query('SELECT CURDATE() AS today');
    if (date_debut < today && !type.justificatif_requis && !isRH(req.user)) {
      throw new ApiError(400, 'La date de début ne peut pas être dans le passé');
    }

    const nbJours = await calculerNbJours(conn, type, date_debut, date_fin, demi_journee_debut, demi_journee_fin);
    if (nbJours <= 0) throw new ApiError(400, 'La période ne contient aucun jour décomptable (week-end / jour férié)');
    if (type.duree_max && nbJours > type.duree_max) {
      throw new ApiError(400, `Durée maximale pour « ${type.libelle} » : ${type.duree_max} jours`);
    }

    // Chevauchement avec une autre demande en cours ou approuvée
    const [overlap] = await conn.query(
      `SELECT reference FROM demandes_conges
        WHERE id_employe = ? AND statut IN ('EN_ATTENTE','APPROUVE') AND date_debut <= ? AND date_fin >= ?`,
      [idEmploye, date_fin, date_debut]
    );
    if (overlap.length) throw new ApiError(409, `Chevauchement avec la demande ${overlap[0].reference}`);

    // Contrôle du solde
    if (type.decompte_solde) {
      const annee = Number(date_debut.slice(0, 4));
      if (annee !== Number(date_fin.slice(0, 4))) {
        throw new ApiError(400, 'Une demande décomptée du solde ne peut pas chevaucher deux années : faites deux demandes');
      }
      const solde = await resteDisponible(conn, idEmploye, id_type, annee, true);
      if (!solde) throw new ApiError(400, `Aucun solde ${annee} pour « ${type.libelle} ». Contactez la DRH.`);
      const dispo = solde.reste - solde.enAttente;
      if (nbJours > dispo) {
        throw new ApiError(400, `Solde insuffisant : ${dispo} jour(s) disponible(s), ${nbJours} demandé(s)`);
      }
    }

    const [ins] = await conn.query(
      `INSERT INTO demandes_conges
        (id_employe, id_type, date_debut, date_fin, nb_jours, demi_journee_debut, demi_journee_fin,
         motif, adresse_conge, justificatif, id_interim, statut)
       VALUES (?,?,?,?,?,?,?,?,?,?,?, 'EN_ATTENTE')`,
      [idEmploye, id_type, date_debut, date_fin, nbJours, demi_journee_debut ? 1 : 0, demi_journee_fin ? 1 : 0,
       motif || null, adresse_conge || null, justificatif || null, id_interim || null]
    );
    const idDemande = ins.insertId;

    // Circuit de validation : N1 = supérieur direct, N3 = RH (ou ADMIN à défaut)
    const circuit = [];
    if (emp.id_superieur && emp.id_superieur !== idEmploye) circuit.push([NIVEAUX.CHEF, emp.id_superieur]);
    const [rh] = await conn.query(
      `SELECT u.id_employe FROM utilisateurs u JOIN employes e ON e.id_employe = u.id_employe
        WHERE u.role IN ('RH','ADMIN') AND u.actif = 1 AND e.actif = 1 AND u.id_employe <> ?
        ORDER BY FIELD(u.role, 'RH', 'ADMIN'), u.id_utilisateur LIMIT 1`,
      [idEmploye]
    );
    if (rh.length) circuit.push([NIVEAUX.RH, rh[0].id_employe]);
    if (!circuit.length) throw new ApiError(500, 'Aucun valideur configuré pour cet employé');

    for (const [niveau, idValideur] of circuit) {
      await conn.query('INSERT INTO validations (id_demande, niveau, id_valideur) VALUES (?,?,?)', [idDemande, niveau, idValideur]);
    }

    const [[created]] = await conn.query('SELECT reference FROM demandes_conges WHERE id_demande = ?', [idDemande]);
    await notify(conn, circuit[0][1], `Nouvelle demande de congé ${created.reference} à valider`, `/demandes/${idDemande}`);

    await conn.commit();
    await audit(req, 'CREATION', { table: 'demandes_conges', id: idDemande, details: { nb_jours: nbJours } });
    res.status(201).json({ success: true, data: { id_demande: idDemande, reference: created.reference, nb_jours: nbJours } });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

/* ------------------------------------------------------------------ */
/* Décision (approbation / refus)                                      */
/* ------------------------------------------------------------------ */

exports.decider = asyncHandler(async (req, res) => {
  const idDemande = Number(req.params.id);
  const { decision, commentaire } = req.body;
  if (decision === 'REFUSE' && !commentaire) throw new ApiError(400, 'Un commentaire est obligatoire pour un refus');

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [[dem]] = await conn.query(
      `SELECT d.*, t.decompte_solde FROM demandes_conges d
         JOIN types_conges t ON t.id_type = d.id_type WHERE d.id_demande = ? FOR UPDATE`,
      [idDemande]
    );
    if (!dem) throw new ApiError(404, 'Demande introuvable');
    if (dem.statut !== STATUT.EN_ATTENTE) throw new ApiError(409, `Demande déjà ${dem.statut.toLowerCase()}`);
    if (dem.id_employe === req.user.id_employe) throw new ApiError(403, 'Vous ne pouvez pas valider votre propre demande');

    const [pending] = await conn.query(
      "SELECT * FROM validations WHERE id_demande = ? AND decision = 'EN_ATTENTE' ORDER BY niveau",
      [idDemande]
    );
    const current = pending[0];
    if (!current) throw new ApiError(409, 'Aucune validation en attente');

    const autorise = current.id_valideur === req.user.id_employe || (current.niveau === NIVEAUX.RH && isRH(req.user));
    if (!autorise) throw new ApiError(403, "Ce n'est pas à vous de statuer sur cette demande à ce stade");

    // On enregistre la personne qui a réellement décidé
    await conn.query(
      'UPDATE validations SET decision = ?, commentaire = ?, date_decision = NOW(), id_valideur = ? WHERE id_validation = ?',
      [decision, commentaire || null, req.user.id_employe, current.id_validation]
    );

    let statutFinal = STATUT.EN_ATTENTE;
    if (decision === 'REFUSE') {
      statutFinal = STATUT.REFUSE;
    } else if (pending.length === 1) {
      // Dernier niveau approuvé : contrôle final du solde puis approbation (le trigger décompte)
      if (dem.decompte_solde) {
        const solde = await resteDisponible(conn, dem.id_employe, dem.id_type, Number(dem.date_debut.slice(0, 4)), true);
        if (!solde || solde.reste < Number(dem.nb_jours)) throw new ApiError(409, 'Solde insuffisant au moment de la validation');
      }
      statutFinal = STATUT.APPROUVE;
    }

    if (statutFinal !== STATUT.EN_ATTENTE) {
      await conn.query('UPDATE demandes_conges SET statut = ? WHERE id_demande = ?', [statutFinal, idDemande]);
      await notify(
        conn, dem.id_employe,
        `Votre demande ${dem.reference} a été ${statutFinal === STATUT.APPROUVE ? 'approuvée' : 'refusée'}`,
        `/demandes/${idDemande}`
      );
    } else {
      await notify(conn, pending[1].id_valideur, `Demande ${dem.reference} à valider (niveau suivant)`, `/demandes/${idDemande}`);
    }

    await conn.commit();
    await audit(req, `DECISION_${decision}`, { table: 'demandes_conges', id: idDemande, details: { commentaire } });
    res.json({ success: true, data: { statut: statutFinal } });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

/* ------------------------------------------------------------------ */
/* Annulation                                                          */
/* ------------------------------------------------------------------ */

exports.annuler = asyncHandler(async (req, res) => {
  const idDemande = Number(req.params.id);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[dem]] = await conn.query(
      'SELECT *, (date_debut > CURDATE()) AS future FROM demandes_conges WHERE id_demande = ? FOR UPDATE',
      [idDemande]
    );
    if (!dem) throw new ApiError(404, 'Demande introuvable');

    const proprietaire = dem.id_employe === req.user.id_employe;
    if (!proprietaire && !isRH(req.user)) throw new ApiError(403, 'Accès refusé');
    if (![STATUT.EN_ATTENTE, STATUT.APPROUVE].includes(dem.statut)) {
      throw new ApiError(409, `Impossible d'annuler une demande ${dem.statut.toLowerCase()}`);
    }
    if (dem.statut === STATUT.APPROUVE && !dem.future && !isRH(req.user)) {
      throw new ApiError(409, 'Un congé déjà commencé ne peut être annulé que par la DRH');
    }

    await conn.query("UPDATE demandes_conges SET statut = 'ANNULE' WHERE id_demande = ?", [idDemande]); // le trigger restitue les jours
    if (!proprietaire) await notify(conn, dem.id_employe, `Votre demande ${dem.reference} a été annulée par la DRH`, `/demandes/${idDemande}`);

    await conn.commit();
    await audit(req, 'ANNULATION', { table: 'demandes_conges', id: idDemande });
    res.json({ success: true, message: 'Demande annulée' });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

// Planning : qui est en congé sur une période (dans le périmètre de l'utilisateur)
exports.planning = asyncHandler(async (req, res) => {
  const { debut, fin } = req.query;
  const scope = scopeClause(req.user);
  const [rows] = await pool.query(
    `${SELECT_DEMANDE}
     WHERE d.statut = 'APPROUVE' AND d.date_debut <= ? AND d.date_fin >= ? ${scope.clause}
     ORDER BY d.date_debut`,
    [fin, debut, ...scope.params]
  );
  res.json({ success: true, data: rows });
});
