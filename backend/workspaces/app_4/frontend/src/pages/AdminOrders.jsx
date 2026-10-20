// Admin : boîte de commandes, notifications et discussion avec les clients
import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { STATUTS, formatAriary, formatDate } from '../utils.js';
import Avatar from '../components/Avatar.jsx';
import Button from '../components/Button.jsx';
import CarImage from '../components/CarImage.jsx';
import ChatBox from '../components/ChatBox.jsx';
import Icon from '../components/Icon.jsx';
import Loader from '../components/Loader.jsx';

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openChat, setOpenChat] = useState(null);
  const [marking, setMarking] = useState(false);

  // Récupère les commandes et les notifications
  const charger = useCallback(async () => {
    const [commandes, notifs] = await Promise.all([
      api.get('/orders'),
      api.get('/admin/notifications'),
    ]);
    setOrders(commandes);
    setNotifications(notifs.notifications);
  }, []);

  // Premier chargement, puis actualisation automatique toutes les 10 secondes
  useEffect(() => {
    charger()
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));

    const timer = setInterval(() => charger().catch(() => {}), 10000);
    return () => clearInterval(timer);
  }, [charger]);

  async function changerStatut(orderId, status) {
    try {
      await api.patch(`/orders/${orderId}/status`, { status });
      setOrders((liste) => liste.map((o) => (o.id === orderId ? { ...o, status } : o)));
    } catch (e) {
      setError(e.message);
    }
  }

  async function toutMarquerLu() {
    setMarking(true);
    try {
      await api.post('/admin/notifications/read-all');
      await charger();
      window.dispatchEvent(new Event('notifications-changed')); // met à jour le badge du menu
    } catch (e) {
      setError(e.message);
    } finally {
      setMarking(false);
    }
  }

  // Ouvre la discussion d'une commande et fait défiler jusqu'à elle
  function ouvrir(orderId) {
    setOpenChat(orderId);
    setTimeout(() => {
      const element = document.getElementById(`order-${orderId}`);
      if (element) element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }

  if (loading) return <Loader text="Chargement des commandes..." />;

  const nonLues = notifications.filter((n) => !n.is_read);

  return (
    <div>
      <h1 className="page-title">Boîte de commandes</h1>
      <p className="subtitle">Les commandes de vos clients et vos discussions.</p>

      {error && <p className="error">{error}</p>}

      {/* Notifications */}
      <section className="card panel notifications">
        <div className="notif-head">
          <h3>
            <Icon name="message" size={18} /> Notifications ({nonLues.length})
          </h3>
          {nonLues.length > 0 && (
            <Button className="btn-outline btn-sm" loading={marking} onClick={toutMarquerLu}>
              Tout marquer comme lu
            </Button>
          )}
        </div>

        {nonLues.length === 0 && <p className="muted">Aucune nouvelle notification.</p>}

        {nonLues.map((n) => (
          <div className="notif" key={n.id}>
            <div>
              <strong>{n.message}</strong>
              <br />
              <small className="muted">{formatDate(n.created_at)}</small>
            </div>
            {n.order_id && (
              <Button className="btn-sm" onClick={() => ouvrir(n.order_id)}>
                Ouvrir
              </Button>
            )}
          </div>
        ))}
      </section>

      {/* Commandes */}
      {orders.length === 0 && <div className="empty muted">Aucune commande pour le moment.</div>}

      <div className="orders-grid">
        {orders.map((o) => (
          <article className="card order-card" id={`order-${o.id}`} key={o.id}>
            <div className="order-top">
              <CarImage src={o.image} alt={o.car_name} className="thumb" />
              <div className="order-info">
                <small className="muted">Commande #{o.id}</small>
                <h3>
                  {o.brand_name} {o.car_name}
                </h3>
                <p className="price">{formatAriary(o.price)}</p>
                <small className="muted">{formatDate(o.created_at)}</small>
              </div>
            </div>

            <div className="client-line">
              <Avatar src={o.user_avatar} name={o.user_name} size={36} />
              <div>
                <strong>{o.user_name}</strong>
                <br />
                <small className="muted">{o.user_email}</small>
              </div>
            </div>

            {o.note && <p className="order-note">« {o.note} »</p>}

            <div className="order-bottom">
              <select
                value={o.status}
                onChange={(e) => changerStatut(o.id, e.target.value)}
                aria-label="Statut de la commande"
              >
                {Object.entries(STATUTS).map(([valeur, libelle]) => (
                  <option key={valeur} value={valeur}>
                    {libelle}
                  </option>
                ))}
              </select>

              <Button
                className="btn-outline btn-sm"
                onClick={() => (openChat === o.id ? setOpenChat(null) : ouvrir(o.id))}
              >
                <Icon name="message" size={16} />
                {openChat === o.id ? 'Fermer' : `Discuter (${o.messages_count})`}
              </Button>
            </div>

            {openChat === o.id && <ChatBox orderId={o.id} />}
          </article>
        ))}
      </div>
    </div>
  );
}
