// Discussion entre le client et l'admin à propos d'une commande.
// Les nouveaux messages sont récupérés automatiquement toutes les 5 secondes.
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { formatDate } from '../utils.js';
import Button from './Button.jsx';
import Icon from './Icon.jsx';
import Loader from './Loader.jsx';

export default function ChatBox({ orderId }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const boiteRef = useRef(null);

  const charger = useCallback(
    () =>
      api
        .get(`/orders/${orderId}/messages`)
        .then(setMessages)
        .catch((e) => setError(e.message)),
    [orderId]
  );

  useEffect(() => {
    charger().finally(() => setLoading(false));
    const timer = setInterval(charger, 5000);
    return () => clearInterval(timer);
  }, [charger]);

  // Descend automatiquement vers le dernier message
  useEffect(() => {
    if (boiteRef.current) {
      boiteRef.current.scrollTop = boiteRef.current.scrollHeight;
    }
  }, [messages.length]);

  async function envoyer(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    setError('');
    try {
      await api.post(`/orders/${orderId}/messages`, { content: text });
      setText('');
      await charger();
    } catch (erreur) {
      setError(erreur.message);
    } finally {
      setSending(false);
    }
  }

  if (loading) return <Loader text="Chargement de la discussion..." />;

  return (
    <div className="chat">
      <div className="chat-messages" ref={boiteRef}>
        {messages.length === 0 && <p className="muted center">Aucun message. Écrivez le premier !</p>}

        {messages.map((m) => (
          <div key={m.id} className={`bubble ${m.sender_id === user.id ? 'bubble-me' : 'bubble-other'}`}>
            <small className="bubble-name">
              {m.sender_role === 'admin' ? 'Admin' : m.sender_name}
            </small>
            <p>{m.content}</p>
            <small className="bubble-date">{formatDate(m.created_at)}</small>
          </div>
        ))}
      </div>

      {error && <p className="error">{error}</p>}

      <form className="chat-form" onSubmit={envoyer}>
        <input
          type="text"
          placeholder="Écrire un message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <Button type="submit" loading={sending} aria-label="Envoyer">
          <Icon name="send" size={18} />
        </Button>
      </form>
    </div>
  );
}
