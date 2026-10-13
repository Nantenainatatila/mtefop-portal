import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import useApi from '../hooks/useApi';
import StatusBadge from '../components/StatusBadge';
import Pagination from '../components/Pagination';
import { Empty, ErrorBox, Loading } from '../components/State';
import { STATUT_LABEL } from '../utils/constants';
import { fmtDate, fmtNum } from '../utils/format';

export default function ToutesDemandes() {
  const [f, setF] = useState({ statut: '', annee: '', id_service: '', id_type: '' });
  const [page, setPage] = useState(1);
  const params = { ...Object.fromEntries(Object.entries(f).filter(([, v]) => v)), page, limit: 20 };

  const { data, loading, error, pagination } = useApi(() => api.get('/demandes', { params }), [JSON.stringify(params)]);
  const services = useApi(() => api.get('/structure/services'), []);
  const types = useApi(() => api.get('/types-conges', { params: { tous: 1 } }), []);

  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setPage(1); };
  const y = new Date().getFullYear();

  return (
    <>
      <div className="page-head"><h1>Toutes les demandes</h1></div>
      <div className="filters">
        <select value={f.statut} onChange={set('statut')}>
          <option value="">Tous les statuts</option>
          {Object.entries(STATUT_LABEL).filter(([k]) => k !== 'BROUILLON').map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={f.annee} onChange={set('annee')}>
          <option value="">Toutes les années</option>
          {[y - 1, y, y + 1].map((v) => <option key={v}>{v}</option>)}
        </select>
        <select value={f.id_service} onChange={set('id_service')}>
          <option value="">Tous les services</option>
          {services.data?.map((s) => <option key={s.id_service} value={s.id_service}>{s.nom}</option>)}
        </select>
        <select value={f.id_type} onChange={set('id_type')}>
          <option value="">Tous les types</option>
          {types.data?.map((t) => <option key={t.id_type} value={t.id_type}>{t.libelle}</option>)}
        </select>
      </div>

      {loading ? <Loading /> : error ? <ErrorBox message={error} /> : data.length === 0 ? <Empty>Aucune demande trouvée.</Empty> : (
        <>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Référence</th><th>Employé</th><th>Service</th><th>Type</th><th>Période</th><th>Jours</th><th>Statut</th></tr></thead>
              <tbody>
                {data.map((d) => (
                  <tr key={d.id_demande}>
                    <td><Link to={`/demandes/${d.id_demande}`}>{d.reference}</Link></td>
                    <td>{d.employe}<br /><small className="muted">{d.matricule}</small></td>
                    <td>{d.service}</td>
                    <td>{d.type_conge}</td>
                    <td>{fmtDate(d.date_debut)} → {fmtDate(d.date_fin)}</td>
                    <td>{fmtNum(d.nb_jours)}</td>
                    <td><StatusBadge statut={d.statut} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination pagination={pagination} onChange={setPage} />
        </>
      )}
    </>
  );
}
