import { useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../api';
import StatusBadge, { fmtDate, fmtDateTime } from '../components/StatusBadge';

const ACTIONS = { enregistrement: 'Dossier enregistré', transmission: 'Transmis au service', changement_statut: 'Changement de statut', affectation: 'Pris en charge', cloture: 'Dossier clôturé' };

export default function SuiviPublic() {
  const [numero, setNumero] = useState('');
  const [verif, setVerif] = useState('');
  const [res, setRes] = useState(null);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault(); setError(''); setRes(null);
    try { setRes((await api.post('/public/suivi', { numero, verification: verif })).data); }
    catch (err) { setError(errMsg(err)); }
  };

  return (
    <div className="login-page">
      <div className="login-card wide">
        <div className="logo big">M</div>
        <h1>Suivi de dossier</h1>
        <p className="muted">MTEFOP – Madagascar</p>
        <form onSubmit={submit}>
          <label>Numéro de dossier
            <input placeholder="MTEFOP/2026/00001" value={numero} onChange={(e) => setNumero(e.target.value)} required />
          </label>
          <label>N° CIN ou téléphone du demandeur
            <input value={verif} onChange={(e) => setVerif(e.target.value)} required />
          </label>
          <button className="btn btn-primary">Rechercher</button>
        </form>
        {error && <div className="alert alert-error">{error}</div>}
        {res && (
          <div className="result">
            <h3>{res.numero} <StatusBadge statut={res.statut} /></h3>
            <p><strong>{res.objet}</strong><br /><span className="muted">{res.type_libelle}</span></p>
            <p>Service actuel : <strong>{res.service_nom || '—'}</strong><br />
              Reçu le {fmtDate(res.date_reception)} · Échéance prévue : {fmtDate(res.date_echeance)}</p>
            <ul className="timeline">
              {res.etapes.map((e, i) => (
                <li key={i}><b>{ACTIONS[e.action] || e.action}{e.service_nom ? ` : ${e.service_nom}` : ''}</b><small>{fmtDateTime(e.created_at)}</small></li>
              ))}
            </ul>
          </div>
        )}
        <p className="center"><Link to="/login">← Espace agents</Link></p>
      </div>
    </div>
  );
}
