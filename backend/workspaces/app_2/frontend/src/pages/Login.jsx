import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { errMsg } from '../api';

export default function Login() {
  const { user, login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try { await login(email, pwd); nav('/'); }
    catch (err) { setError(errMsg(err)); }
    finally { setBusy(false); }
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={submit}>
        <div className="logo big">M</div>
        <h1>République de Madagascar</h1>
        <p className="muted">Ministère du Travail, de l'Emploi et de la Fonction Publique<br />Système de suivi des dossiers</p>
        {error && <div className="alert alert-error">{error}</div>}
        <label>Adresse e-mail
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        </label>
        <label>Mot de passe
          <input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} required />
        </label>
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Connexion…' : 'Se connecter'}</button>
        <p className="center"><Link to="/suivi">🔎 Suivre mon dossier (usager)</Link></p>
      </form>
    </div>
  );
}
