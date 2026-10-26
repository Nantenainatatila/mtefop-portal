import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import StatusBadge, { STATUTS, fmtDate } from '../components/StatusBadge';

function Bars({ items, labelKey, color = '#1d4ed8' }) {
  const max = Math.max(1, ...items.map((i) => i.n));
  return (
    <div className="bars">
      {items.length === 0 && <p className="muted">Aucune donnée</p>}
      {items.map((i) => (
        <div className="bar-row" key={i[labelKey]}>
          <span className="bar-label">{i[labelKey]}</span>
          <div className="bar-track"><div className="bar-fill" style={{ width: `${(i.n / max) * 100}%`, background: color }} /></div>
          <span className="bar-val">{i.n}</span>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const [d, setD] = useState(null);
  useEffect(() => { api.get('/dashboard').then((r) => setD(r.data)); }, []);
  if (!d) return <p>Chargement…</p>;
  const nb = (s) => d.par_statut.find((x) => x.statut === s)?.n || 0;

  return (
    <>
      <h2>Tableau de bord</h2>
      <div className="cards">
        <div className="stat"><span>Total dossiers</span><strong>{d.total}</strong></div>
        <div className="stat"><span>Reçus ce mois</span><strong>{d.ce_mois}</strong></div>
        <div className="stat"><span>En cours / transmis</span><strong>{nb('en_cours') + nb('transmis') + nb('enregistre')}</strong></div>
        <div className="stat danger"><span>En retard</span><strong>{d.en_retard}</strong></div>
        <div className="stat ok"><span>Validés</span><strong>{nb('valide')}</strong></div>
      </div>

      <div className="grid2">
        <section className="panel"><h3>Par statut</h3>
          <Bars items={d.par_statut.map((s) => ({ ...s, label: STATUTS[s.statut]?.[0] || s.statut }))} labelKey="label" />
        </section>
        <section className="panel"><h3>Par type de dossier</h3>
          <Bars items={d.par_type} labelKey="libelle" color="#7c3aed" />
        </section>
        <section className="panel"><h3>Dossiers en traitement par service</h3>
          <Bars items={d.par_service} labelKey="code" color="#059669" />
        </section>
        <section className="panel"><h3>Derniers dossiers</h3>
          <table className="table compact"><tbody>
            {d.recents.map((r) => (
              <tr key={r.id}>
                <td><Link to={`/dossiers/${r.id}`}>{r.numero}</Link><br /><small className="muted">{r.demandeur_nom}</small></td>
                <td><StatusBadge statut={r.statut} /></td><td>{fmtDate(r.date_reception)}</td>
              </tr>
            ))}
          </tbody></table>
        </section>
      </div>
    </>
  );
}
