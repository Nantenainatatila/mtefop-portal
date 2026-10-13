import { useState } from 'react';
import api, { errMsg } from '../../api/client';
import useApi from '../../hooks/useApi';
import { useToast } from '../../components/Toast';
import { Empty, ErrorBox, Loading } from '../../components/State';
import { fmtDate } from '../../utils/format';

export default function JoursFeries() {
  const toast = useToast();
  const [annee, setAnnee] = useState(new Date().getFullYear());
  const [f, setF] = useState({ date_ferie: '', libelle: '' });
  const { data, loading, error, reload } = useApi(() => api.get('/jours-feries', { params: { annee } }), [annee]);

  const add = async (e) => {
    e.preventDefault();
    try {
      await api.post('/jours-feries', f);
      toast.success('Jour férié ajouté');
      setF({ date_ferie: '', libelle: '' });
      reload();
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  const remove = async (j) => {
    if (!window.confirm(`Supprimer « ${j.libelle} » ?`)) return;
    try {
      await api.delete(`/jours-feries/${j.id_ferie}`);
      toast.success('Jour férié supprimé');
      reload();
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  const y = new Date().getFullYear();
  return (
    <>
      <div className="alert alert-info">Les jours fériés sont exclus du décompte des congés en jours ouvrables. Pensez à les saisir chaque année (dates mobiles : Pâques, Ascension, Pentecôte).</div>
      <div className="filters">
        <select value={annee} onChange={(e) => setAnnee(Number(e.target.value))}>
          {[y - 1, y, y + 1, y + 2].map((v) => <option key={v}>{v}</option>)}
        </select>
      </div>

      <form className="card inline-form" onSubmit={add}>
        <input type="date" required value={f.date_ferie} onChange={(e) => setF({ ...f, date_ferie: e.target.value })} />
        <input required placeholder="Libellé (ex : Fête de l'Indépendance)" value={f.libelle} onChange={(e) => setF({ ...f, libelle: e.target.value })} />
        <button className="btn btn-primary">Ajouter</button>
      </form>

      {loading ? <Loading /> : error ? <ErrorBox message={error} /> : data.length === 0 ? <Empty>Aucun jour férié saisi pour {annee}.</Empty> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Date</th><th>Libellé</th><th /></tr></thead>
            <tbody>
              {data.map((j) => (
                <tr key={j.id_ferie}>
                  <td>{fmtDate(j.date_ferie)}</td><td>{j.libelle}</td>
                  <td className="row-actions"><button className="btn btn-danger-light" onClick={() => remove(j)}>Supprimer</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
