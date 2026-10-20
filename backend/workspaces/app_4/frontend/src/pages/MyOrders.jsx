// Mes commandes (client) + discussion avec l'admin
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { STATUTS, formatAriary, formatDate } from '../utils.js';
import Button from '../components/Button.jsx';
import CarImage from '../components/CarImage.jsx';
import ChatBox from '../components/ChatBox.jsx';
import Icon from '../components/Icon.jsx';
import Loader from '../components/Loader.jsx';

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openChat, setOpenChat] = useState(null); // id de la commande dont la discussion est ouverte

  useEffect(() => {
    api
      .get('/orders/mine')
      .then(setOrders)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader text="Chargement de vos commandes..." />;

  return (
    <div>
      <h1 className="page-title">Mes commandes</h1>
      <p className="subtitle">Suivez vos commandes et discutez avec le vendeur.</p>

      {error && <p className="error">{error}</p>}

      {!error && orders.length === 0 && (
        <div className="empty">
          <p className="muted">Vous n’avez pas encore de commande.</p>
          <br />
          <Link to="/" className="btn">
            Voir les voitures
          </Link>
        </div>
      )}

      <div className="orders-grid">
        {orders.map((o) => (
          <article className="card order-card" key={o.id}>
            <div className="order-top">
              <CarImage src={o.image} alt={o.car_name} className="thumb" />
              <div className="order-info">
                <small className="muted">Commande #{o.id}</small>
                <h3>
                  <Link to={`/voitures/${o.car_id}`}>
                    {o.brand_name} {o.car_name}
                  </Link>
                </h3>
                <p className="price">{formatAriary(o.price)}</p>
                <small className="muted">{formatDate(o.created_at)}</small>
              </div>
            </div>

            <div className="order-bottom">
              <span className={`status status-${o.status}`}>{STATUTS[o.status]}</span>
              <Button
                className="btn-outline btn-sm"
                onClick={() => setOpenChat(openChat === o.id ? null : o.id)}
              >
                <Icon name="message" size={16} />
                {openChat === o.id ? 'Fermer' : 'Discuter'}
              </Button>
            </div>

            {openChat === o.id && <ChatBox orderId={o.id} />}
          </article>
        ))}
      </div>
    </div>
  );
}
