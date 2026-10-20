// Bouton "J'aime". Si le visiteur n'est pas connecté, on l'envoie vers la connexion.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import Icon from './Icon.jsx';

export default function LikeButton({ carId, liked, count, onChange }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (!user) return navigate('/connexion');
    setBusy(true);
    try {
      const data = await api.post(`/cars/${carId}/like`);
      onChange(data.liked, data.likes_count);
    } catch (erreur) {
      // on ignore : l'état du like reste inchangé
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      className={`like-btn ${liked ? 'liked' : ''}`}
      onClick={toggle}
      disabled={busy}
      aria-label="J'aime"
    >
      <Icon name="heart" size={20} filled={liked} />
      <span>{count}</span>
    </button>
  );
}
