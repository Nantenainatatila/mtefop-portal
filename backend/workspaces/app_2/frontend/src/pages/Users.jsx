import { useEffect, useState } from 'react';
import api, { errMsg } from '../api';
import { useAuth } from '../AuthContext';
import { fmtDateTime } from '../components/StatusBadge';

const ROLES = { admin: 'Administrateur', directeur: 'Directeur', chef_service: 'Chef de service', agent: 'Agent' };
const EMPTY = { matricule: '', nom: '', prenom: '', email: '', telephone: '', mot_de_passe: '', role: 'agent', service_id: '', actif: 1 };

export default function Users() {
  const { user: me } = useAuth();
  const isAdmin = me.role === 'admin';
  const [list, setList] = useState([]);
  const [services, setServices] = useState([]);
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');
  const [journal, setJournal] = useState(null);

  const load = () => api.get('/utilisateurs').then((r) => setList(r.data));
  useEffect(() => { load(); api.get('/services').then((r) => setServices(r.data)); }, []);

  const save = async (e) => {
    e.preventDefault(); setError('');
    try {
      if (form.id) await api.put(`/utilisateurs/${form.id}`, form); else await api.post('/utilisateurs', form);
      setForm(null); load();
    } catch (err) { setError(errMsg(err)); }
  };
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <>
      <div className="page-head"><h2>Utilisateurs</h2>
        {isAdmin && <div>
          <button className="btn btn-light" onClick={() => api.get('/utilisateurs/journal/activite').then((r) => setJournal(r.data))}>📜 Journal d'activité</button>{' '}
          <button className="btn btn-primary" onClick={() => setForm({ ...EMPTY })}>➕ Nouvel utilisateur</button></div>}
      </div>

      {form && isAdmin && (
        <form className="panel form" onSubmit={save}>
          <h3>{form.id ? 'Modifier' : 'Nouvel'} utilisateur</h3>
          {error && <div className="alert alert-error">{error}</div>}
          <div className="row">
            <label>Nom *<input value={form.nom} onChange={set('nom')} required /></label>
            <label>Prénom<input value={form.prenom || ''} onChange={set('prenom')} /></label>
            <label>Matricule<input value={form.matricule || ''} onChange={set('matricule')} /></label>
          </div>
          <div className="row">
            <label>E-mail *<input type="email" value={form.email} onChange={set('email')} required disabled={!!form.id} /></label>
            <label>Téléphone<input value={form.telephone || ''} onChange={set('telephone')} /></label>
            <label>{form.id ? 'Nouveau mot de passe (optionnel)' : 'Mot de passe *'}
              <input type="password" value={form.mot_de_passe} onChange={set('mot_de_passe')} required={!form.id} minLength={form.id && !form.mot_de_passe ? 0 : 8} /></label>
          </div>
          <div className="row">
            <label>Rôle<select value={form.role} onChange={set('role')}>{Object.entries(ROLES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
            <label>Service<select value={form.service_id || ''} onChange={set('service_id')}><option value="">—</option>{services.map((s) => <option key={s.id} value={s.id}>{s.code} – {s.nom}</option>)}</select></label>
            <label>Statut<select value={form.actif} onChange={(e) => setForm({ ...form, actif: Number(e.target.value) })}><option value={1}>Actif</option><option value={0}>Désactivé</option></select></label>
          </div>
          <div className="actions"><button type="button" className="btn btn-light" onClick={() => setForm(null)}>Annuler</button><button className="btn btn-primary">Enregistrer</button></div>
        </form>
      )}

      <div className="panel nopad"><table className="table">
        <thead><tr><th>Nom</th><th>E-mail</th><th>Rôle</th><th>Service</th><th>Dernière connexion</th><th>État</th>{isAdmin && <th></th>}</tr></thead>
        <tbody>{list.map((u) => (
          <tr key={u.id}><td>{u.nom} {u.prenom}<br /><small className="muted">{u.matricule}</small></td><td>{u.email}</td><td>{ROLES[u.role]}</td>
            <td>{u.service_nom || '—'}</td><td>{fmtDateTime(u.derniere_connexion)}</td>
            <td><span className={`badge badge-${u.actif ? 'green' : 'red'}`}>{u.actif ? 'Actif' : 'Désactivé'}</span></td>
            {isAdmin && <td><button className="btn btn-light" onClick={() => setForm({ ...u, mot_de_passe: '' })}>Modifier</button></td>}</tr>
        ))}</tbody></table></div>

      {journal && (
        <div className="panel nopad"><h3 style={{ padding: '12px 16px 0' }}>Journal d'activité (200 dernières actions)</h3>
          <table className="table compact"><thead><tr><th>Date</th><th>Utilisateur</th><th>Action</th><th>Détails</th><th>IP</th></tr></thead>
            <tbody>{journal.map((j) => <tr key={j.id}><td>{fmtDateTime(j.created_at)}</td><td>{j.utilisateur}</td><td>{j.action}</td><td>{j.details}</td><td>{j.ip}</td></tr>)}</tbody></table></div>
      )}
    </>
  );
}
