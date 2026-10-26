import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import StatusBadge, { PRIORITES, STATUTS, fmtDate } from '../components/StatusBadge';

export default function Dossiers() {
  const [f, setF] = useState({ q: '', statut: '', type_id: '', service_id: '', retard: '' });
  const [page, setPage] = useState(1);
  const [res, setRes] = useState({ data: [], total: 0, pages: 1 });
  const [types, setTypes] = useState([]);
  const [services, setServices] = useState([]);

  useEffect(() => {
    api.get('/types').then((r) => setTypes(r.data));
    api.get('/services').then((r) => setServices(r.data));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      const params = Object.fromEntries(Object.entries({ ...f, page }).filter(([, v]) => v !== ''));
      api.get('/dossiers', { params }).then((r) => setRes(r.data));
    }, 250);
    return () => clearTimeout(t);
  }, [f, page]);

  const set = (k) => (e) => { setPage(1); setF({ ...f, [k]: e.target.type === 'checkbox' ? (e.target.checked ? '1' : '') : e.target.value }); };

  return (
    <>
      <div className="page-head"><h2>Dossiers <small className="muted">({res.total})</small></h2>
        <Link className="btn btn-primary" to="/dossiers/nouveau">➕ Nouveau dossier</Link></div>

      <div className="filters">
        <input placeholder="Rechercher : N°, objet, nom, CIN, matricule…" value={f.q} onChange={set('q')} />
        <select value={f.statut} onChange={set('statut')}><option value="">Tous statuts</option>
          {Object.entries(STATUTS).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}</select>
        <select value={f.type_id} onChange={set('type_id')}><option value="">Tous types</option>
          {types.map((t) => <option key={t.id} value={t.id}>{t.libelle}</option>)}</select>
        <select value={f.service_id} onChange={set('service_id')}><option value="">Tous services</option>
          {services.map((s) => <option key={s.id} value={s.id}>{s.code} – {s.nom}</option>)}</select>
        <label className="check"><input type="checkbox" checked={f.retard === '1'} onChange={set('retard')} /> En retard</label>
      </div>

      <div className="panel nopad"><table className="table">
        <thead><tr><th>N° dossier</th><th>Objet</th><th>Demandeur</th><th>Service actuel</th><th>Statut</th><th>Échéance</th></tr></thead>
        <tbody>
          {res.data.map((d) => (
            <tr key={d.id} className={d.en_retard ? 'late' : ''}>
              <td><Link to={`/dossiers/${d.id}`}><strong>{d.numero}</strong></Link>
                {d.priorite !== 'normale' && <span className="prio"> ⚑ {PRIORITES[d.priorite]}</span>}</td>
              <td>{d.objet}<br /><small className="muted">{d.type_libelle}</small></td>
              <td>{d.demandeur_nom}</td>
              <td>{d.service_code || '—'}</td>
              <td><StatusBadge statut={d.statut} /></td>
              <td>{fmtDate(d.date_echeance)}{d.en_retard ? ' ⚠️' : ''}</td>
            </tr>
          ))}
          {res.data.length === 0 && <tr><td colSpan="6" className="center muted">Aucun dossier trouvé</td></tr>}
        </tbody>
      </table></div>

      <div className="pager">
        <button className="btn btn-light" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Précédent</button>
        <span>Page {page} / {res.pages || 1}</span>
        <button className="btn btn-light" disabled={page >= res.pages} onClick={() => setPage(page + 1)}>Suivant →</button>
      </div>
    </>
  );
}
