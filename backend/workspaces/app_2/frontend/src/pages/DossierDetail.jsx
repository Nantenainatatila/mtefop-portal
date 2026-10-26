import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { errMsg } from '../api';
import { useAuth } from '../AuthContext';
import StatusBadge, { PRIORITES, fmtDate, fmtDateTime } from '../components/StatusBadge';

const ACTIONS = { enregistrement: '📥 Enregistrement', transmission: '📤 Transmission', changement_statut: '🔄 Statut', affectation: '👤 Affectation', observation: '💬 Observation', cloture: '🔒 Clôture' };

export default function DossierDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [d, setD] = useState(null);
  const [services, setServices] = useState([]);
  const [agents, setAgents] = useState([]);
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [dest, setDest] = useState('');
  const [comm, setComm] = useState('');
  const [statut, setStatut] = useState('');
  const [agent, setAgent] = useState('');
  const [files, setFiles] = useState([]);

  const load = useCallback(() => api.get(`/dossiers/${id}`).then((r) => setD(r.data)), [id]);
  useEffect(() => { load(); api.get('/services').then((r) => setServices(r.data)); }, [load]);
  useEffect(() => { if (d?.service_actuel_id) api.get('/utilisateurs/agents', { params: { service_id: d.service_actuel_id } }).then((r) => setAgents(r.data)); }, [d?.service_actuel_id]);

  const run = async (fn, ok) => {
    try { await fn(); setMsg({ type: 'ok', text: ok }); setComm(''); await load(); }
    catch (e) { setMsg({ type: 'error', text: errMsg(e) }); }
  };

  const telecharger = async (doc) => {
    const r = await api.get(`/dossiers/documents/${doc.id}/telecharger`, { responseType: 'blob' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(r.data); a.download = doc.nom_original; a.click();
  };

  if (!d) return <p>Chargement…</p>;
  const manager = ['admin', 'directeur', 'chef_service'].includes(user.role);
  const closed = ['valide', 'rejete', 'cloture'].includes(d.statut);

  return (
    <>
      <div className="page-head">
        <h2>{d.numero} <StatusBadge statut={d.statut} /></h2>
        <div>
          <button className="btn btn-light" onClick={() => window.print()}>🖨️ Imprimer</button>{' '}
          <Link className="btn btn-light" to={`/dossiers/${id}/modifier`}>✏️ Modifier</Link>{' '}
          {user.role === 'admin' && <button className="btn btn-danger" onClick={() => window.confirm('Supprimer définitivement ce dossier ?') && api.delete(`/dossiers/${id}`).then(() => nav('/dossiers'))}>Supprimer</button>}
        </div>
      </div>
      {msg.text && <div className={`alert alert-${msg.type === 'ok' ? 'ok' : 'error'}`}>{msg.text}</div>}

      <div className="grid2">
        <section className="panel">
          <h3>{d.objet}</h3>
          <dl className="dl">
            <dt>Type</dt><dd>{d.type_libelle}</dd>
            <dt>Priorité</dt><dd>{PRIORITES[d.priorite]}</dd>
            <dt>Service actuel</dt><dd>{d.service_nom || '—'}</dd>
            <dt>Agent responsable</dt><dd>{d.agent_nom?.trim() || 'Non affecté'}</dd>
            <dt>Réception</dt><dd>{fmtDate(d.date_reception)}</dd>
            <dt>Échéance</dt><dd>{fmtDate(d.date_echeance)}</dd>
            {d.date_cloture && <><dt>Clôture</dt><dd>{fmtDate(d.date_cloture)}</dd></>}
          </dl>
          {d.description && <p>{d.description}</p>}
          <h4>Demandeur</h4>
          <dl className="dl">
            <dt>Nom</dt><dd>{d.demandeur_nom}</dd>
            <dt>CIN</dt><dd>{d.demandeur_cin || '—'}</dd>
            <dt>Matricule</dt><dd>{d.demandeur_matricule || '—'}</dd>
            <dt>Contact</dt><dd>{[d.demandeur_telephone, d.demandeur_email].filter(Boolean).join(' · ') || '—'}</dd>
            <dt>Adresse</dt><dd>{d.demandeur_adresse || '—'}</dd>
          </dl>
        </section>

        <section className="panel no-print">
          <h3>Actions</h3>
          {!closed && (<>
            <label>Transmettre à un service
              <div className="inline">
                <select value={dest} onChange={(e) => setDest(e.target.value)}><option value="">— Service —</option>
                  {services.filter((s) => s.id !== d.service_actuel_id).map((s) => <option key={s.id} value={s.id}>{s.code} – {s.nom}</option>)}</select>
                <button className="btn btn-primary" disabled={!dest} onClick={() => run(() => api.post(`/dossiers/${id}/transmettre`, { service_dest_id: dest, commentaire: comm }), 'Dossier transmis')}>Transmettre</button>
              </div></label>
            {manager && <label>Affecter à un agent
              <div className="inline">
                <select value={agent} onChange={(e) => setAgent(e.target.value)}><option value="">— Agent —</option>
                  {agents.map((a) => <option key={a.id} value={a.id}>{a.nom} {a.prenom}</option>)}</select>
                <button className="btn btn-light" disabled={!agent} onClick={() => run(() => api.post(`/dossiers/${id}/affecter`, { agent_id: agent }), 'Dossier affecté')}>Affecter</button>
              </div></label>}
          </>)}
          <label>Changer le statut
            <div className="inline">
              <select value={statut} onChange={(e) => setStatut(e.target.value)}><option value="">— Statut —</option>
                <option value="en_cours">En cours</option><option value="en_attente">En attente</option>
                {user.role !== 'agent' && <><option value="valide">Validé</option><option value="rejete">Rejeté</option><option value="cloture">Clôturé</option></>}</select>
              <button className="btn btn-light" disabled={!statut} onClick={() => run(() => api.post(`/dossiers/${id}/statut`, { statut, commentaire: comm }), 'Statut mis à jour')}>Appliquer</button>
            </div></label>
          <label>Commentaire / observation
            <textarea rows="2" value={comm} onChange={(e) => setComm(e.target.value)} placeholder="Joint à la transmission ou au changement de statut" /></label>
          <button className="btn btn-light" disabled={!comm} onClick={() => run(() => api.post(`/dossiers/${id}/observation`, { commentaire: comm }), 'Observation ajoutée')}>Ajouter seulement l'observation</button>
        </section>
      </div>

      <div className="grid2">
        <section className="panel"><h3>Historique de circulation</h3>
          <ul className="timeline">
            {d.mouvements.map((m) => (
              <li key={m.id}>
                <b>{ACTIONS[m.action]}{m.source_nom || m.dest_nom ? ` : ${m.source_nom || ''}${m.source_nom && m.dest_nom ? ' → ' : ''}${m.dest_nom || ''}` : ''}</b>
                {m.commentaire && <p>{m.commentaire}</p>}
                <small>{fmtDateTime(m.created_at)} · {m.utilisateur?.trim() || 'Système'}</small>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel no-print"><h3>Pièces jointes</h3>
          {d.documents.length === 0 && <p className="muted">Aucun document</p>}
          <ul className="docs">
            {d.documents.map((doc) => (
              <li key={doc.id}>
                <a href="#!" onClick={(e) => { e.preventDefault(); telecharger(doc); }}>📎 {doc.nom_original}</a>
                <small>{Math.round(doc.taille / 1024)} Ko · {fmtDate(doc.created_at)}</small>
                {manager && <button className="link-danger" onClick={() => window.confirm('Supprimer ce document ?') && run(() => api.delete(`/dossiers/documents/${doc.id}`), 'Document supprimé')}>✕</button>}
              </li>
            ))}
          </ul>
          <div className="inline">
            <input type="file" multiple onChange={(e) => setFiles([...e.target.files])} />
            <button className="btn btn-light" disabled={!files.length} onClick={() => run(async () => {
              const fd = new FormData(); files.forEach((f) => fd.append('fichiers', f));
              await api.post(`/dossiers/${id}/documents`, fd); setFiles([]);
            }, 'Documents ajoutés')}>Téléverser</button>
          </div>
        </section>
      </div>
    </>
  );
}
