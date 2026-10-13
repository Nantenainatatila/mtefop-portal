import { useState } from 'react';
import api, { errMsg } from '../api/client';
import useApi from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import { Empty, ErrorBox, Loading } from '../components/State';
import { ROLES, ROLE_LABEL, RH_ROLES, STATUT_EMPLOYE } from '../utils/constants';
import { nomComplet } from '../utils/format';

const VIDE = {
  matricule: '', cin: '', nom: '', prenom: '', sexe: 'M', date_naissance: '', date_embauche: '',
  email: '', telephone: '', statut: 'FONCTIONNAIRE', id_service: '', id_poste: '', id_superieur: '',
};

export default function Employes() {
  const { hasRole } = useAuth();
  const toast = useToast();
  const canEdit = hasRole(...RH_ROLES);
  const isAdmin = hasRole(ROLES.ADMIN);

  const [q, setQ] = useState('');
  const [service, setService] = useState('');
  const [actif, setActif] = useState('1');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(null);      // null | { id?: number }
  const [compte, setCompte] = useState(null);  // employé dont on gère le compte

  const params = { q: q || undefined, id_service: service || undefined, actif, page, limit: 15 };
  const list = useApi(() => api.get('/employes', { params }), [JSON.stringify(params)]);
  const services = useApi(() => api.get('/structure/services'), []);

  const toggle = async (e) => {
    const action = e.actif ? 'desactiver' : 'reactiver';
    if (!window.confirm(`${e.actif ? 'Désactiver' : 'Réactiver'} ${nomComplet(e)} ?`)) return;
    try {
      await api.patch(`/employes/${e.id_employe}/${action}`);
      toast.success(e.actif ? 'Employé désactivé' : 'Employé réactivé');
      list.reload();
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  return (
    <>
      <div className="page-head">
        <h1>Employés</h1>
        {canEdit && <button className="btn btn-primary" onClick={() => setForm({})}>➕ Nouvel employé</button>}
      </div>

      <div className="filters">
        <input placeholder="Rechercher (nom, prénom, matricule)…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        <select value={service} onChange={(e) => { setService(e.target.value); setPage(1); }}>
          <option value="">Tous les services</option>
          {services.data?.map((s) => <option key={s.id_service} value={s.id_service}>{s.nom}</option>)}
        </select>
        <select value={actif} onChange={(e) => { setActif(e.target.value); setPage(1); }}>
          <option value="1">Actifs</option><option value="0">Inactifs</option><option value="all">Tous</option>
        </select>
      </div>

      {list.loading ? <Loading /> : list.error ? <ErrorBox message={list.error} /> : list.data.length === 0 ? <Empty>Aucun employé.</Empty> : (
        <>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Matricule</th><th>Nom</th><th>Poste</th><th>Service</th><th>Statut</th><th>Contact</th>{canEdit && <th />}</tr></thead>
              <tbody>
                {list.data.map((e) => (
                  <tr key={e.id_employe} className={e.actif ? '' : 'inactive'}>
                    <td>{e.matricule}</td>
                    <td><strong>{nomComplet(e)}</strong></td>
                    <td>{e.poste || '—'}</td>
                    <td>{e.service}<br /><small className="muted">{e.direction}</small></td>
                    <td>{e.statut}</td>
                    <td>{e.email || '—'}<br /><small className="muted">{e.telephone || ''}</small></td>
                    {canEdit && (
                      <td className="row-actions">
                        <button className="btn btn-light" onClick={() => setForm({ id: e.id_employe })}>Modifier</button>
                        {isAdmin && <button className="btn btn-light" onClick={() => setCompte(e)}>Compte</button>}
                        <button className={`btn ${e.actif ? 'btn-danger-light' : 'btn-light'}`} onClick={() => toggle(e)}>{e.actif ? 'Désactiver' : 'Réactiver'}</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination pagination={list.pagination} onChange={setPage} />
        </>
      )}

      {form && <EmployeForm id={form.id} services={services.data || []} onClose={() => setForm(null)} onSaved={() => { setForm(null); list.reload(); }} />}
      {compte && <CompteForm employe={compte} onClose={() => setCompte(null)} />}
    </>
  );
}

function EmployeForm({ id, services, onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState(VIDE);
  const [c, setC] = useState({ login: '', mot_de_passe: '', role: ROLES.EMPLOYE });
  const [busy, setBusy] = useState(false);
  const { hasRole } = useAuth();

  const postes = useApi(() => api.get('/structure/postes'), []);
  const sups = useApi(() => api.get('/employes', { params: { limit: 100 } }), []);
  const detail = useApi(
    () => (id ? api.get(`/employes/${id}`) : Promise.resolve({ data: { data: null } })),
    [id]
  );

  // Pré-remplissage en modification
  const [loaded, setLoaded] = useState(false);
  if (id && detail.data && !loaded) {
    const d = detail.data;
    setF(Object.fromEntries(Object.keys(VIDE).map((k) => [k, d[k] ?? ''])));
    setLoaded(true);
  }

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (id) {
        await api.put(`/employes/${id}`, f);
        toast.success('Employé mis à jour');
      } else {
        const payload = { ...f };
        if (c.login) payload.compte = c;
        await api.post('/employes', payload);
        toast.success('Employé créé');
      }
      onSaved();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={id ? 'Modifier l\'employé' : 'Nouvel employé'} onClose={onClose} wide>
      {id && detail.loading ? <Loading /> : (
        <form className="form-grid" onSubmit={submit}>
          <label>Matricule *<input required value={f.matricule} onChange={set('matricule')} /></label>
          <label>CIN<input value={f.cin} onChange={set('cin')} /></label>
          <label>Nom *<input required value={f.nom} onChange={set('nom')} /></label>
          <label>Prénom<input value={f.prenom} onChange={set('prenom')} /></label>
          <label>Sexe *
            <select value={f.sexe} onChange={set('sexe')}><option value="M">Masculin</option><option value="F">Féminin</option></select>
          </label>
          <label>Statut
            <select value={f.statut} onChange={set('statut')}>{STATUT_EMPLOYE.map((s) => <option key={s}>{s}</option>)}</select>
          </label>
          <label>Date de naissance<input type="date" value={f.date_naissance} onChange={set('date_naissance')} /></label>
          <label>Date d'embauche *<input type="date" required value={f.date_embauche} onChange={set('date_embauche')} /></label>
          <label>Email<input type="email" value={f.email} onChange={set('email')} /></label>
          <label>Téléphone<input value={f.telephone} onChange={set('telephone')} /></label>
          <label>Service *
            <select required value={f.id_service} onChange={set('id_service')}>
              <option value="">— Choisir —</option>
              {services.map((s) => <option key={s.id_service} value={s.id_service}>{s.nom}</option>)}
            </select>
          </label>
          <label>Poste
            <select value={f.id_poste} onChange={set('id_poste')}>
              <option value="">—</option>
              {postes.data?.map((p) => <option key={p.id_poste} value={p.id_poste}>{p.libelle}</option>)}
            </select>
          </label>
          <label className="full">Supérieur hiérarchique <span className="muted">(valide en premier les demandes)</span>
            <select value={f.id_superieur} onChange={set('id_superieur')}>
              <option value="">— Aucun —</option>
              {sups.data?.filter((s) => s.id_employe !== id).map((s) => <option key={s.id_employe} value={s.id_employe}>{nomComplet(s)} ({s.matricule})</option>)}
            </select>
          </label>

          {!id && (
            <fieldset className="full fieldset">
              <legend>Compte de connexion (facultatif)</legend>
              <div className="form-grid">
                <label>Identifiant<input value={c.login} onChange={(e) => setC({ ...c, login: e.target.value })} minLength={3} /></label>
                <label>Mot de passe <span className="muted">(8 car. min.)</span>
                  <input type="password" value={c.mot_de_passe} minLength={8} required={!!c.login} onChange={(e) => setC({ ...c, mot_de_passe: e.target.value })} />
                </label>
                <label>Rôle
                  <select value={c.role} onChange={(e) => setC({ ...c, role: e.target.value })}>
                    {Object.values(ROLES).filter((r) => r !== ROLES.ADMIN || hasRole(ROLES.ADMIN)).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                  </select>
                </label>
              </div>
            </fieldset>
          )}

          <div className="full actions">
            <button className="btn btn-primary" disabled={busy}>{busy ? 'Enregistrement…' : 'Enregistrer'}</button>
            <button type="button" className="btn btn-light" onClick={onClose}>Annuler</button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function CompteForm({ employe, onClose }) {
  const toast = useToast();
  const [c, setC] = useState({ login: '', mot_de_passe: '', role: ROLES.EMPLOYE });
  const detail = useApi(() => api.get(`/employes/${employe.id_employe}`), [employe.id_employe]);
  const [loaded, setLoaded] = useState(false);
  if (detail.data && !loaded) {
    setC({ login: detail.data.login || '', mot_de_passe: '', role: detail.data.role || ROLES.EMPLOYE });
    setLoaded(true);
  }
  const existe = !!detail.data?.login;

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/employes/${employe.id_employe}/compte`, { login: c.login || undefined, mot_de_passe: c.mot_de_passe || undefined, role: c.role });
      toast.success('Compte enregistré');
      onClose();
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  return (
    <Modal title={`Compte de ${nomComplet(employe)}`} onClose={onClose}>
      {detail.loading ? <Loading /> : (
        <form className="form-grid" onSubmit={submit}>
          <label className="full">Identifiant<input required value={c.login} onChange={(e) => setC({ ...c, login: e.target.value })} minLength={3} /></label>
          <label className="full">Mot de passe {existe && <span className="muted">(laisser vide pour ne pas changer)</span>}
            <input type="password" minLength={8} required={!existe} value={c.mot_de_passe} onChange={(e) => setC({ ...c, mot_de_passe: e.target.value })} />
          </label>
          <label className="full">Rôle
            <select value={c.role} onChange={(e) => setC({ ...c, role: e.target.value })}>
              {Object.values(ROLES).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
            </select>
          </label>
          <div className="full actions">
            <button className="btn btn-primary">Enregistrer</button>
            <button type="button" className="btn btn-light" onClick={onClose}>Annuler</button>
          </div>
        </form>
      )}
    </Modal>
  );
}
