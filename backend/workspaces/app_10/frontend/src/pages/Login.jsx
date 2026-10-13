import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { errMsg } from '../api/client';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ login: '', mot_de_passe: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [afficher, setAfficher] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(form.login.trim(), form.mot_de_passe);
      navigate('/', { replace: true });
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={submit}>
        <div className="brand-logo big">M</div>
        <h1>Gestion des congés</h1>
        <p className="muted">Ministère du Travail, de l'Emploi et de la Fonction Publique (MTEFoP)<br />Antananarivo</p>

        {error && <div className="alert alert-error">{error}</div>}

        <label>
          Identifiant
          <input autoFocus required value={form.login} onChange={(e) => setForm({ ...form, login: e.target.value })} autoComplete="username" />
        </label>
        <label>
          Mot de passe
          <input type="password" required value={form.mot_de_passe} onChange={(e) => setForm({ ...form, mot_de_passe: e.target.value })} autoComplete="current-password" />
        </label>
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Connexion…' : 'Se connecter'}</button>
        {afficher
          ? <ul>
              <li>Admin: Id: 'admin' et Password: 'admin123'</li>
              <li>Resources H. : Id: 'rh' et Password: 'rh123'</li>
              <li>Chef S. : Id: 'chef' et Password: 'chef123'</li>
              <li>Employée: Id: 'miora' et Password: 'miora123'</li>
            </ul>
          : ""
        }
        <button className="btn btn-primary btn-block" onClick={() => setAfficher(!afficher)}>{afficher ? `Masquer` : `Option de connexion`}</button>
      </form>
    </div>
  );
}
