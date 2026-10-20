// Détail d'une voiture : infos, like, commande et commentaires
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { formatAriary, formatDate } from '../utils.js';
import Avatar from '../components/Avatar.jsx';
import Button from '../components/Button.jsx';
import CarImage from '../components/CarImage.jsx';
import LikeButton from '../components/LikeButton.jsx';
import Loader from '../components/Loader.jsx';

export default function CarDetail() {
  const { id } = useParams();
  const { user } = useAuth();

  const [car, setCar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Commande
  const [note, setNote] = useState('');
  const [ordering, setOrdering] = useState(false);
  const [ordered, setOrdered] = useState(false);
  const [orderError, setOrderError] = useState('');

  // Commentaire
  const [comment, setComment] = useState('');
  const [commenting, setCommenting] = useState(false);
  const [commentError, setCommentError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    api
      .get(`/cars/${id}`)
      .then(setCar)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, user?.id]);

  async function commander() {
    setOrdering(true);
    setOrderError('');
    try {
      await api.post('/orders', { car_id: car.id, note });
      setOrdered(true);
    } catch (e) {
      setOrderError(e.message);
    } finally {
      setOrdering(false);
    }
  }

  async function commenter(e) {
    e.preventDefault();
    if (!comment.trim()) return;
    setCommenting(true);
    setCommentError('');
    try {
      const nouveau = await api.post(`/cars/${id}/comments`, { content: comment });
      setCar((c) => ({
        ...c,
        comments: [nouveau, ...c.comments],
        comments_count: c.comments_count + 1,
      }));
      setComment('');
    } catch (e2) {
      setCommentError(e2.message);
    } finally {
      setCommenting(false);
    }
  }

  if (loading) return <Loader text="Chargement de la voiture..." />;
  if (error) {
    return (
      <div className="empty">
        <p className="error">{error}</p>
        <br />
        <Link to="/" className="btn">
          Retour à l’accueil
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link to="/" className="back-link">
        ← Retour aux voitures
      </Link>

      <div className="detail">
        <CarImage src={car.image} alt={car.name} />

        <div>
          <span className="tag">{car.brand_name}</span>
          <h1 className="page-title">{car.name}</h1>
          <p className="price price-big">{formatAriary(car.price)}</p>
          {car.year && <p className="muted">Année : {car.year}</p>}

          <p className="description">{car.description || 'Aucune description.'}</p>

          <div className="detail-actions">
            <LikeButton
              carId={car.id}
              liked={car.liked_by_me}
              count={car.likes_count}
              onChange={(liked, count) =>
                setCar((c) => ({ ...c, liked_by_me: liked, likes_count: count }))
              }
            />
          </div>

          {/* Zone de commande */}
          <section className="card panel">
            <h3>Commander cette voiture</h3>

            {!user && (
              <>
                <p className="muted">Connectez-vous pour passer une commande.</p>
                <br />
                <Link to="/connexion" className="btn btn-block">
                  Se connecter
                </Link>
              </>
            )}

            {user && user.role === 'admin' && (
              <p className="muted">L’administrateur ne peut pas commander.</p>
            )}

            {user && user.role === 'client' && !ordered && (
              <>
                <div className="field">
                  <label htmlFor="note">Message pour le vendeur (facultatif)</label>
                  <textarea
                    id="note"
                    rows="3"
                    placeholder="Ex : Je souhaite visiter la voiture ce week-end."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>
                {orderError && <p className="error">{orderError}</p>}
                <Button className="btn-block" loading={ordering} onClick={commander}>
                  Commander
                </Button>
              </>
            )}

            {user && user.role === 'client' && ordered && (
              <>
                <p className="success">Commande envoyée ! Le vendeur va vous répondre.</p>
                <br />
                <Link to="/mes-commandes" className="btn btn-outline btn-block">
                  Voir mes commandes
                </Link>
              </>
            )}
          </section>
        </div>
      </div>

      {/* Commentaires */}
      <section className="comments">
        <h2>Commentaires ({car.comments_count})</h2>

        {user ? (
          <form onSubmit={commenter} className="comment-form">
            <textarea
              rows="2"
              placeholder="Écrire un commentaire..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <Button type="submit" loading={commenting}>
              Publier
            </Button>
          </form>
        ) : (
          <p className="muted">
            <Link to="/connexion" className="underline">
              Connectez-vous
            </Link>{' '}
            pour commenter.
          </p>
        )}
        {commentError && <p className="error">{commentError}</p>}

        {car.comments.length === 0 && <p className="muted">Soyez le premier à commenter.</p>}

        {car.comments.map((c) => (
          <div className="comment" key={c.id}>
            <Avatar src={c.user_avatar} name={c.user_name} size={40} />
            <div>
              <strong>{c.user_name}</strong> <small className="muted">{formatDate(c.created_at)}</small>
              <p>{c.content}</p>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
