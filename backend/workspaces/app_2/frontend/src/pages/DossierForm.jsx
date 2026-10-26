import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api, { errMsg } from '../api';
import { PRIORITES } from '../components/StatusBadge';

const EMPTY = { objet: '', description: '', type_id: '', priorite: 'normale', demandeur_nom: '', demandeur_cin: '',
  demandeur_matricule: '', demandeur_telephone: '', demandeur_email: '', demandeur_adresse: '', date_reception: '', date_echeance: '' };

export default function DossierForm() {
  const { id } = useParams();
  const nav = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [types, setTypes] = useState([]);
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/types').then((r) => setTypes(r.data));
    if (id) api.get(`/dossiers/${id}`).then((r) => setForm({ ...EMPTY, ...Object.fromEntries(Object.entries(r.data).map(([k, v]) => [k, v ?? ''])) }));
  }, [id]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault(); setError('');
    try {
      let dossierId = id;
      if (id) await api.put(`/dossiers/${id}`, form);
      else dossierId = (await api.post('/dossiers', form)).data.id;
      if (files.length) {
        const fd = new FormData();
        files.forEach((f) => fd.append('fichiers', f));
        await api.post(`/dossiers/${dossierId}/documents`, fd);
      }
      nav(`/dossiers/${dossierId}`);
    } catch (err) { setError(errMsg(err)); }
  };

  return (
    <form onSubmit={submit} className="panel form">
      <h2>{id ? 'Modifier le dossier' : 'Enregistrer un nouveau dossier'}</h2>
      {error && <div className="alert alert-error">{error}</div>}

      <fieldset><legend>Dossier</legend>
        <label>Objet *<input value={form.objet} onChange={set('objet')} required /></label>
        <div className="row">
          <label>Type de dossier *
            <select value={form.type_id} onChange={set('type_id')} required>
              <option value="">— Choisir —</option>{types.map((t) => <option key={t.id} value={t.id}>{t.libelle}</option>)}
            </select></label>
          <label>Priorité
            <select value={form.priorite} onChange={set('priorite')}>
              {Object.entries(PRIORITES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
        </div>
        <div className="row">
          <label>Date de réception<input type="date" value={form.date_reception?.slice(0, 10)} onChange={set('date_reception')} /></label>
          <label>Date d'échéance <small className="muted">(auto selon le type)</small>
            <input type="date" value={form.date_echeance?.slice(0, 10)} onChange={set('date_echeance')} /></label>
        </div>
        <label>Description<textarea rows="3" value={form.description} onChange={set('description')} /></label>
      </fieldset>

      <fieldset><legend>Demandeur</legend>
        <div className="row">
          <label>Nom et prénoms *<input value={form.demandeur_nom} onChange={set('demandeur_nom')} required /></label>
          <label>N° CIN<input value={form.demandeur_cin} onChange={set('demandeur_cin')} /></label>
          <label>Matricule (solde)<input value={form.demandeur_matricule} onChange={set('demandeur_matricule')} /></label>
        </div>
        <div className="row">
          <label>Téléphone<input value={form.demandeur_telephone} onChange={set('demandeur_telephone')} /></label>
          <label>E-mail<input type="email" value={form.demandeur_email} onChange={set('demandeur_email')} /></label>
        </div>
        <label>Adresse<input value={form.demandeur_adresse} onChange={set('demandeur_adresse')} /></label>
      </fieldset>

      <fieldset><legend>Pièces jointes (PDF, images, Word, Excel – 10 Mo max)</legend>
        <input type="file" multiple onChange={(e) => setFiles([...e.target.files])} />
      </fieldset>

      <div className="actions">
        <button type="button" className="btn btn-light" onClick={() => nav(-1)}>Annuler</button>
        <button className="btn btn-primary">{id ? 'Enregistrer' : 'Enregistrer le dossier'}</button>
      </div>
    </form>
  );
}
