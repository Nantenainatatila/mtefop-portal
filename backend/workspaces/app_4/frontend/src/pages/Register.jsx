// Création du profil client (l'image de profil est facultative)
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import Avatar from '../components/Avatar.jsx';
import Button from '../components/Button.jsx';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [avatar, setAvatar] = useState(null); // fichier image choisi (ou null)
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function envoyer(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    // FormData permet d'envoyer du texte ET un fichier
    const formData = new FormData();
    formData.append('name', name);
    formData.append('email', email);
    formData.append('password', password);
    if (avatar) formData.append('avatar', avatar);

    try {
      await register(formData);
      navigate('/');
    } catch (erreur) {
      setError(erreur.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="narrow">
      <h1 className="page-title">Créer mon profil</h1>
      <p className="subtitle">Pour commander, liker et commenter.</p>

      <form className="card panel" onSubmit={envoyer}>
        <div className="avatar-picker">
          <Avatar src={avatar ? URL.createObjectURL(avatar) : null} name={name || '?'} size={84} />
          <div className="field">
            <label htmlFor="avatar">Image de profil (facultatif)</label>
            <input
              id="avatar"
              type="file"
              accept="image/*"
              onChange={(e) => setAvatar(e.target.files[0] || null)}
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="name">Nom</label>
          <input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>

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
          <label htmlFor="password">Mot de passe (6 caractères minimum)</label>
          <input
            id="password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && <p className="error">{error}</p>}

        <Button type="submit" className="btn-block" loading={loading}>
          Créer mon profil
        </Button>
      </form>

      <p className="center muted switch-text">
        Déjà un compte ?{' '}
        <Link to="/connexion" className="underline">
          Se connecter
        </Link>
      </p>
    </div>
  );
}
