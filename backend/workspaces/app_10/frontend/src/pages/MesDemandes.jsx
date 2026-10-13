import { useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../api/client';
import useApi from '../hooks/useApi';
import { useToast } from '../components/Toast';
import StatusBadge from '../components/StatusBadge';
import { Empty, ErrorBox, Loading } from '../components/State';
import { STATUT_LABEL } from '../utils/constants';
import { fmtDate, fmtNum, today } from '../utils/format';

export default function MesDemandes() {
  const toast = useToast();
  const [statut, setStatut] = useState('');
  const [annee, setAnnee] = useState('');
  const { data, loading, error, reload } = useApi(
    () => api.get('/demandes/mes-demandes', { params: { statut: statut || undefined, annee: annee || undefined } }),
    [statut, annee]
  );

  const annulable = (d) => d.statut === 'EN_ATTENTE' || (d.statut === 'APPROUVE' && d.date_debut > today());

  const annuler = async (d) => {
    if (!window.confirm(`Annuler la demande ${d.reference} ?`)) return;
    try {
      await api.patch(`/demandes/${d.id_demande}/annuler`);
      toast.success('Demande annulée');
      reload();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const y = new Date().getFullYear();
  return (
    <>
      <div className="page-head">
        <h1>Mes demandes</h1>
        <Link className="btn btn-primary" to="/nouvelle-demande">➕ Nouvelle demande</Link>
      </div>

      <div className="filters">
        <select value={statut} onChange={(e) => setStatut(e.target.value)}>
          <option value="">Tous les statuts</option>
          {Object.entries(STATUT_LABEL).filter(([k]) => k !== 'BROUILLON').map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={annee} onChange={(e) => setAnnee(e.target.value)}>
          <option value="">Toutes les années</option>
          {[y - 1, y, y + 1].map((v) => <option key={v}>{v}</option>)}
        </select>
      </div>

      {loading ? <Loading /> : error ? <ErrorBox message={error} /> : data.length === 0 ? <Empty>Aucune demande.</Empty> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Référence</th><th>Type</th><th>Période</th><th>Jours</th><th>Statut</th><th>Demandée le</th><th /></tr></thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.id_demande}>
                  <td><Link to={`/demandes/${d.id_demande}`}>{d.reference}</Link></td>
                  <td>{d.type_conge}</td>
                  <td>{fmtDate(d.date_debut)} → {fmtDate(d.date_fin)}</td>
                  <td>{fmtNum(d.nb_jours)}</td>
                  <td><StatusBadge statut={d.statut} /></td>
                  <td>{fmtDate(d.date_demande)}</td>
                  <td className="row-actions">
                    <Link className="btn btn-light" to={`/demandes/${d.id_demande}`}>Voir</Link>
                    {annulable(d) && <button className="btn btn-danger-light" onClick={() => annuler(d)}>Annuler</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
