import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import useApi from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { Empty, ErrorBox, Loading } from '../components/State';
import StatusBadge from '../components/StatusBadge';
import { MANAGERS, MOIS } from '../utils/constants';
import { fmtNum } from '../utils/format';

export default function Dashboard() {
  const { user, hasRole } = useAuth();
  const manager = hasRole(...MANAGERS);
  const [annee, setAnnee] = useState(new Date().getFullYear());
  const { data, loading, error } = useApi(() => api.get('/dashboard', { params: { annee } }), [annee]);

  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} />;

  const parMois = Array.from({ length: 12 }, (_, i) => data.conges_par_mois.find((m) => m.mois === i + 1) || { mois: i + 1, nb: 0, jours: 0 });
  const maxJours = Math.max(1, ...parMois.map((m) => Number(m.jours)));

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Bonjour {user.prenom || user.nom} </h1>
          <p className="muted">{user.poste ? `${user.poste} · ` : ''}{user.service} · {user.direction}</p>
        </div>
        <select value={annee} onChange={(e) => setAnnee(Number(e.target.value))}>
          {[annee - 1, annee, annee + 1].filter((v, i, a) => a.indexOf(v) === i).map((y) => <option key={y}>{y}</option>)}
        </select>
      </div>

      <div className="cards">
        {manager && <div className="stat"><span>Effectif</span><strong>{data.effectif}</strong></div>}
        <div className="stat warn"><span>Demandes en attente</span><strong>{data.demandes_en_attente}</strong></div>
        <div className="stat info"><span>En congé aujourd'hui</span><strong>{data.en_conge_aujourdhui}</strong></div>
        {manager && (
          <Link to="/a-valider" className="stat ok">
            <span>À valider par moi</span><strong>{data.a_valider_par_moi}</strong>
          </Link>
        )}
      </div>

      <div className="grid-2">
        <section className="card">
          <h3>Mes soldes {annee}</h3>
          {data.mes_soldes.length === 0 ? (
            <Empty>Aucun solde ouvert pour {annee}. Contactez la DRH.</Empty>
          ) : (
            data.mes_soldes.map((s) => {
              const total = Number(s.droit) + Number(s.report);
              const pct = total ? Math.min(100, (Number(s.pris) / total) * 100) : 0;
              return (
                <div key={s.type_conge} className="solde">
                  <div className="solde-top">
                    <strong>{s.type_conge}</strong>
                    <span><b>{fmtNum(s.reste)}</b> j restants / {fmtNum(total)}</span>
                  </div>
                  <div className="progress"><div style={{ width: `${pct}%` }} /></div>
                  <small className="muted">Pris : {fmtNum(s.pris)} j{Number(s.report) > 0 ? ` · dont report ${fmtNum(s.report)} j` : ''}</small>
                </div>
              );
            })
          )}
          <Link className="btn btn-primary" to="/nouvelle-demande">Poser un congé</Link>
        </section>

        <section className="card">
          <h3>Demandes {annee} par statut</h3>
          {data.demandes_par_statut.length === 0 ? (
            <Empty />
          ) : (
            <ul className="plain">
              {data.demandes_par_statut.map((s) => (
                <li key={s.statut}><StatusBadge statut={s.statut} /> <strong>{s.nb}</strong></li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="card">
        <h3>Jours de congés approuvés par mois ({annee})</h3>
        <div className="bars">
          {parMois.map((m) => (
            <div key={m.mois} className="bar-col" title={`${MOIS[m.mois - 1]} : ${fmtNum(m.jours)} j (${m.nb} demande(s))`}>
              <span className="bar-val">{Number(m.jours) ? fmtNum(m.jours) : ''}</span>
              <div className="bar" style={{ height: `${(Number(m.jours) / maxJours) * 100}%` }} />
              <span className="bar-lbl">{MOIS[m.mois - 1].slice(0, 3)}</span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
