// Mon profil : modifier le nom / l'image et se déconnecter
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import Avatar from '../components/Avatar.jsx';
import Button from '../components/Button.jsx';
import Icon from '../components/Icon.jsx';

export default function Profile() {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState(user.name);
  const [avatar, setAvatar] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function enregistrer(e) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');

    const formData = new FormData();
    formData.append('name', name);
    if (avatar) formData.append('avatar', avatar);

    try {
      const misAJour = await api.put('/auth/me', formData);
      setUser(misAJour);
      setAvatar(null);
      setMessage('Profil mis à jour');
    } catch (erreur) {
      setError(erreur.message);
    } finally {
      setSaving(false);
    }
  }

  function deconnexion() {
    logout();
    navigate('/');
  }

  return (
    <div className="narrow">
      <h1 className="page-title">Mon profil</h1>
      <p className="subtitle">
        {user.email} · {user.role === 'admin' ? 'Administrateur' : 'Client'}
      </p>

      <form className="card panel" onSubmit={enregistrer}>
        <div className="avatar-picker">
          <Avatar
            src={avatar ? URL.createObjectURL(avatar) : user.avatar}
            name={name}
            size={84}
          />
          <div className="field">
            <label htmlFor="avatar">Changer l’image de profil</label>
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

        {message && <p className="success">{message}</p>}
        {error && <p className="error">{error}</p>}

        <Button type="submit" className="btn-block" loading={saving}>
          Enregistrer
        </Button>
      </form>

      <br />
      <Button className="btn-outline btn-block" onClick={deconnexion}>
        <Icon name="logout" size={18} /> Se déconnecter
      </Button>
    </div>
  );
}
