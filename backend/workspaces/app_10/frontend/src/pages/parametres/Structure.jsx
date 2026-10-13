import { useState } from 'react';
import api, { errMsg } from '../../api/client';
import useApi from '../../hooks/useApi';
import { useToast } from '../../components/Toast';
import Modal from '../../components/Modal';
import { ErrorBox, Loading } from '../../components/State';

export default function Structure() {
  const toast = useToast();
  const directions = useApi(() => api.get('/structure/directions'), []);
  const services = useApi(() => api.get('/structure/services'), []);
  const postes = useApi(() => api.get('/structure/postes'), []);

  const [dForm, setDForm] = useState(null);
  const [sForm, setSForm] = useState(null);
  const [poste, setPoste] = useState('');

  const save = async (fn, ok, after) => {
    try { await fn(); toast.success(ok); after(); } catch (err) { toast.error(errMsg(err)); }
  };

  const saveDirection = (e) => {
    e.preventDefault();
    const { id_direction, code, nom } = dForm;
    save(
      () => (id_direction ? api.put(`/structure/directions/${id_direction}`, { code, nom }) : api.post('/structure/directions', { code, nom })),
      'Direction enregistrée', () => { setDForm(null); directions.reload(); services.reload(); }
    );
  };
  const saveService = (e) => {
    e.preventDefault();
    const { id_service, id_direction, code, nom } = sForm;
    const body = { id_direction: Number(id_direction), code, nom };
    save(
      () => (id_service ? api.put(`/structure/services/${id_service}`, body) : api.post('/structure/services', body)),
      'Service enregistré', () => { setSForm(null); services.reload(); }
    );
  };
  const addPoste = (e) => {
    e.preventDefault();
    save(() => api.post('/structure/postes', { libelle: poste }), 'Poste ajouté', () => { setPoste(''); postes.reload(); });
  };

  if (directions.loading || services.loading || postes.loading) return <Loading />;
  if (directions.error || services.error || postes.error) return <ErrorBox message={directions.error || services.error || postes.error} />;

  return (
    <div className="grid-2">
      <section className="card">
        <div className="page-head"><h3>Directions</h3><button className="btn btn-primary" onClick={() => setDForm({ code: '', nom: '' })}>➕</button></div>
        <ul className="plain list-lines">
          {directions.data.map((d) => (
            <li key={d.id_direction}>
              <span><b>{d.code}</b> — {d.nom}</span>
              <button className="btn btn-light" onClick={() => setDForm({ ...d })}>Modifier</button>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <div className="page-head"><h3>Services</h3><button className="btn btn-primary" onClick={() => setSForm({ id_direction: directions.data[0]?.id_direction || '', code: '', nom: '' })}>➕</button></div>
        <ul className="plain list-lines">
          {services.data.map((s) => (
            <li key={s.id_service}>
              <span><b>{s.code}</b> — {s.nom}<br /><small className="muted">{s.direction}</small></span>
              <button className="btn btn-light" onClick={() => setSForm({ ...s })}>Modifier</button>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h3>Postes</h3>
        <form className="inline-form" onSubmit={addPoste}>
          <input required placeholder="Nouveau poste" value={poste} onChange={(e) => setPoste(e.target.value)} />
          <button className="btn btn-primary">Ajouter</button>
        </form>
        <ul className="plain list-lines">{postes.data.map((p) => <li key={p.id_poste}>{p.libelle}</li>)}</ul>
      </section>

      {dForm && (
        <Modal title={dForm.id_direction ? 'Modifier la direction' : 'Nouvelle direction'} onClose={() => setDForm(null)}>
          <form className="form-grid" onSubmit={saveDirection}>
            <label className="full">Code *<input required value={dForm.code} onChange={(e) => setDForm({ ...dForm, code: e.target.value })} /></label>
            <label className="full">Nom *<input required value={dForm.nom} onChange={(e) => setDForm({ ...dForm, nom: e.target.value })} /></label>
            <div className="full actions"><button className="btn btn-primary">Enregistrer</button></div>
          </form>
        </Modal>
      )}
      {sForm && (
        <Modal title={sForm.id_service ? 'Modifier le service' : 'Nouveau service'} onClose={() => setSForm(null)}>
          <form className="form-grid" onSubmit={saveService}>
            <label className="full">Direction *
              <select required value={sForm.id_direction} onChange={(e) => setSForm({ ...sForm, id_direction: e.target.value })}>
                {directions.data.map((d) => <option key={d.id_direction} value={d.id_direction}>{d.nom}</option>)}
              </select>
            </label>
            <label className="full">Code *<input required value={sForm.code} onChange={(e) => setSForm({ ...sForm, code: e.target.value })} /></label>
            <label className="full">Nom *<input required value={sForm.nom} onChange={(e) => setSForm({ ...sForm, nom: e.target.value })} /></label>
            <div className="full actions"><button className="btn btn-primary">Enregistrer</button></div>
          </form>
        </Modal>
      )}
    </div>
  );
}
