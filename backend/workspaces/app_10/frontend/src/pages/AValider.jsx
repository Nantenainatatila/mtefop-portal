import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import useApi from '../hooks/useApi';
import Modal from '../components/Modal';
import DecisionForm from '../components/DecisionForm';
import { Empty, ErrorBox, Loading } from '../components/State';
import { fmtDate, fmtNum } from '../utils/format';

export default function AValider() {
  const { data, loading, error, reload } = useApi(() => api.get('/demandes/a-valider'), []);
  const [sel, setSel] = useState(null);

  return (
    <>
      <div className="page-head"><h1>Demandes à valider</h1></div>
      {loading ? <Loading /> : error ? <ErrorBox message={error} /> : data.length === 0 ? <Empty> Aucune demande en attente de votre décision.</Empty> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Référence</th><th>Employé</th><th>Service</th><th>Type</th><th>Période</th><th>Jours</th><th /></tr></thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.id_demande}>
                  <td><Link to={`/demandes/${d.id_demande}`}>{d.reference}</Link></td>
                  <td>{d.employe}<br /><small className="muted">{d.matricule}</small></td>
                  <td>{d.service}</td>
                  <td>{d.type_conge}</td>
                  <td>{fmtDate(d.date_debut)} → {fmtDate(d.date_fin)}</td>
                  <td>{fmtNum(d.nb_jours)}</td>
                  <td className="row-actions">
                    <Link className="btn btn-light" to={`/demandes/${d.id_demande}`}>Détails</Link>
                    <button className="btn btn-primary" onClick={() => setSel(d)}>Statuer</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {sel && (
        <Modal title={`Demande ${sel.reference}`} onClose={() => setSel(null)}>
          <p>
            <b>{sel.employe}</b> demande un <b>{sel.type_conge}</b> du <b>{fmtDate(sel.date_debut)}</b> au <b>{fmtDate(sel.date_fin)}</b> ({fmtNum(sel.nb_jours)} jour(s)).
          </p>
          {sel.motif && <p className="muted">Motif : {sel.motif}</p>}
          <DecisionForm idDemande={sel.id_demande} onDone={() => { setSel(null); reload(); }} />
        </Modal>
      )}
    </>
  );
}
