// Page de connexion
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import Button from '../components/Button.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function envoyer(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const user = await login(email, password);
      navigate(user.role === 'admin' ? '/admin' : '/'); // l'admin va sur son tableau de bord
    } catch (erreur) {
      setError(erreur.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="narrow">
      <h1 className="page-title">Connexion</h1>
      <p className="subtitle">Content de vous revoir !</p>

      <form className="card panel" onSubmit={envoyer}>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="password">Mot de passe</label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && <p className="error">{error}</p>}

        <Button type="submit" className="btn-block" loading={loading}>
          Se connecter
        </Button>
      </form>

      <p className="center muted switch-text">
        Pas encore de compte ?{' '}
        <Link to="/inscription" className="underline">
          Créer mon profil
        </Link>
      </p>
    </div>
  );
}
