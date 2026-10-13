import { useState } from 'react';
import api, { errMsg } from '../api/client';
import useApi from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import { Empty, ErrorBox, Loading } from '../components/State';
import { MANAGERS, RH_ROLES } from '../utils/constants';
import { fmtNum, nomComplet } from '../utils/format';

export default function Soldes() {
  const { hasRole } = useAuth();
  const toast = useToast();
  const isRH = hasRole(...RH_ROLES);
  const canPick = hasRole(...MANAGERS);

  const [annee, setAnnee] = useState(new Date().getFullYear());
  const [idEmploye, setIdEmploye] = useState('');
  const [edit, setEdit] = useState(null);
  const [init, setInit] = useState({ annee: new Date().getFullYear() + 1, reporter: false, plafond_report: 15 });

  const employes = useApi(() => (canPick ? api.get('/employes', { params: { limit: 100 } }) : Promise.resolve({ data: { data: [] } })), [canPick]);
  const { data, loading, error, reload } = useApi(
    () => api.get(idEmploye ? `/soldes/employe/${idEmploye}` : '/soldes/mes-soldes', { params: { annee } }),
    [annee, idEmploye]
  );

  const saveEdit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/soldes/${edit.id_solde}`, { droit: Number(edit.droit), report: Number(edit.report), pris: Number(edit.pris) });
      toast.success('Solde ajusté');
      setEdit(null);
      reload();
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  const initialiser = async (e) => {
    e.preventDefault();
    if (!window.confirm(`Ouvrir les soldes ${init.annee} pour tous les employés actifs ?`)) return;
    try {
      const { data: r } = await api.post('/soldes/initialiser', {
        annee: Number(init.annee), reporter: init.reporter, plafond_report: Number(init.plafond_report),
      });
      toast.success(`${r.data.soldes_crees} solde(s) créé(s)${init.reporter ? `, ${r.data.soldes_avec_report} avec report` : ''}`);
      reload();
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  const y = new Date().getFullYear();
  return (
    <>
      <div className="page-head"><h1>Soldes de congés</h1></div>

      <div className="filters">
        {canPick && (
          <select value={idEmploye} onChange={(e) => setIdEmploye(e.target.value)}>
            <option value="">— Mes soldes —</option>
            {employes.data?.map((e) => <option key={e.id_employe} value={e.id_employe}>{nomComplet(e)} ({e.matricule})</option>)}
          </select>
        )}
        <select value={annee} onChange={(e) => setAnnee(Number(e.target.value))}>
          {[y - 2, y - 1, y, y + 1].map((v) => <option key={v}>{v}</option>)}
        </select>
      </div>

      {loading ? <Loading /> : error ? <ErrorBox message={error} /> : data.length === 0 ? <Empty>Aucun solde ouvert pour {annee}.</Empty> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Type</th><th>Droit</th><th>Report</th><th>Pris</th><th>Reste</th>{isRH && <th />}</tr></thead>
            <tbody>
              {data.map((s) => (
                <tr key={s.id_solde}>
                  <td>{s.type_conge}</td>
                  <td>{fmtNum(s.droit)}</td>
                  <td>{fmtNum(s.report)}</td>
                  <td>{fmtNum(s.pris)}</td>
                  <td><b className={Number(s.reste) <= 0 ? 'text-danger' : ''}>{fmtNum(s.reste)}</b></td>
                  {isRH && <td className="row-actions"><button className="btn btn-light" onClick={() => setEdit({ ...s })}>Ajuster</button></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isRH && (
        <section className="card">
          <h3>Ouvrir une nouvelle année</h3>
          <p className="muted">Crée les soldes (congé annuel, permissions…) de tous les employés actifs. Les soldes déjà existants ne sont pas modifiés.</p>
          <form className="form-grid" onSubmit={initialiser}>
            <label>Année<input type="number" min={2000} max={2100} required value={init.annee} onChange={(e) => setInit({ ...init, annee: e.target.value })} /></label>
            <label className="check"><input type="checkbox" checked={init.reporter} onChange={(e) => setInit({ ...init, reporter: e.target.checked })} /> Reporter le reliquat du congé annuel</label>
            {init.reporter && (
              <label>Plafond du report (jours)<input type="number" min={0} max={60} step="0.5" value={init.plafond_report} onChange={(e) => setInit({ ...init, plafond_report: e.target.value })} /></label>
            )}
            <div className="full actions"><button className="btn btn-primary">Ouvrir les soldes</button></div>
          </form>
        </section>
      )}

      {edit && (
        <Modal title={`Ajuster : ${edit.type_conge} ${edit.annee}`} onClose={() => setEdit(null)}>
          <form className="form-grid" onSubmit={saveEdit}>
            {['droit', 'report', 'pris'].map((k) => (
              <label key={k} className="full" style={{ textTransform: 'capitalize' }}>
                {k}<input type="number" step="0.5" min={0} required value={edit[k]} onChange={(e) => setEdit({ ...edit, [k]: e.target.value })} />
              </label>
            ))}
            <div className="full actions">
              <button className="btn btn-primary">Enregistrer</button>
              <button type="button" className="btn btn-light" onClick={() => setEdit(null)}>Annuler</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
