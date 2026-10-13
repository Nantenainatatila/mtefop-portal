import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import useApi from '../hooks/useApi';
import { ErrorBox, Loading } from '../components/State';
import { MOIS } from '../utils/constants';
import { fmtDate, pad } from '../utils/format';

// Vue mensuelle : une ligne par employé en congé, une colonne par jour
export default function Planning() {
  const now = new Date();
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const nbJours = new Date(ym.y, ym.m + 1, 0).getDate();
  const debut = `${ym.y}-${pad(ym.m + 1)}-01`;
  const fin = `${ym.y}-${pad(ym.m + 1)}-${pad(nbJours)}`;

  const { data, loading, error } = useApi(() => api.get('/demandes/planning', { params: { debut, fin } }), [debut, fin]);
  const feries = useApi(() => api.get('/jours-feries', { params: { annee: ym.y } }), [ym.y]);

  const ferieSet = useMemo(() => new Set((feries.data || []).map((f) => f.date_ferie.slice(0, 10))), [feries.data]);

  const lignes = useMemo(() => {
    const map = new Map();
    (data || []).forEach((d) => {
      if (!map.has(d.id_employe)) map.set(d.id_employe, { employe: d.employe, service: d.service, items: [] });
      map.get(d.id_employe).items.push(d);
    });
    return [...map.values()].sort((a, b) => a.employe.localeCompare(b.employe));
  }, [data]);

  const go = (delta) => {
    const d = new Date(ym.y, ym.m + delta, 1);
    setYm({ y: d.getFullYear(), m: d.getMonth() });
  };

  const jours = Array.from({ length: nbJours }, (_, i) => i + 1);

  return (
    <>
      <div className="page-head">
        <h1>Planning des congés</h1>
        <div className="actions">
          <button className="btn btn-light" onClick={() => go(-1)}>←</button>
          <strong className="month-label">{MOIS[ym.m]} {ym.y}</strong>
          <button className="btn btn-light" onClick={() => go(1)}>→</button>
          <button className="btn btn-light" onClick={() => setYm({ y: now.getFullYear(), m: now.getMonth() })}>Aujourd'hui</button>
        </div>
      </div>

      {loading ? <Loading /> : error ? <ErrorBox message={error} /> : (
        <div className="table-wrap">
          <table className="gantt">
            <thead>
              <tr>
                <th className="sticky-col">Employé</th>
                {jours.map((j) => {
                  const w = new Date(ym.y, ym.m, j).getDay();
                  const iso = `${ym.y}-${pad(ym.m + 1)}-${pad(j)}`;
                  return <th key={j} className={`${w === 0 || w === 6 ? 'we' : ''} ${ferieSet.has(iso) ? 'ferie' : ''}`}>{j}</th>;
                })}
              </tr>
            </thead>
            <tbody>
              {lignes.length === 0 && <tr><td colSpan={nbJours + 1} className="muted center">Personne en congé ce mois-ci.</td></tr>}
              {lignes.map((l) => (
                <tr key={l.employe}>
                  <td className="sticky-col"><strong>{l.employe}</strong><br /><small className="muted">{l.service}</small></td>
                  {jours.map((j) => {
                    const iso = `${ym.y}-${pad(ym.m + 1)}-${pad(j)}`;
                    const w = new Date(ym.y, ym.m, j).getDay();
                    const it = l.items.find((x) => x.date_debut <= iso && iso <= x.date_fin);
                    return (
                      <td key={j} className={`${w === 0 || w === 6 ? 'we' : ''} ${ferieSet.has(iso) ? 'ferie' : ''}`}>
                        {it && (
                          <Link to={`/demandes/${it.id_demande}`} className="gantt-cell" title={`${it.type_conge} · ${fmtDate(it.date_debut)} → ${fmtDate(it.date_fin)}`} />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="muted legend"><span className="lg we" /> Week-end <span className="lg ferie" /> Jour férié <span className="lg conge" /> En congé</p>
    </>
  );
}
