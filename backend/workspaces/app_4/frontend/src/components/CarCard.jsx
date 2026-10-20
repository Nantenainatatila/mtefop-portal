// Carte d'une voiture dans la liste (page d'accueil)
import { Link } from 'react-router-dom';
import { formatAriary } from '../utils.js';
import CarImage from './CarImage.jsx';
import LikeButton from './LikeButton.jsx';
import Icon from './Icon.jsx';

export default function CarCard({ car, onLikeChange }) {
  return (
    <article className="card car-card">
      <Link to={`/voitures/${car.id}`}>
        <CarImage src={car.image} alt={car.name} />
      </Link>

      <div className="car-card-body">
        <span className="tag">{car.brand_name}</span>
        <h3>
          <Link to={`/voitures/${car.id}`}>{car.name}</Link>
        </h3>
        <p className="price">{formatAriary(car.price)}</p>

        <div className="car-card-footer">
          <LikeButton
            carId={car.id}
            liked={car.liked_by_me}
            count={car.likes_count}
            onChange={(liked, count) => onLikeChange(car.id, liked, count)}
          />
          <Link to={`/voitures/${car.id}`} className="comment-link">
            <Icon name="message" size={20} />
            <span>{car.comments_count}</span>
          </Link>
          <Link to={`/voitures/${car.id}`} className="btn btn-sm">
            Voir
          </Link>
        </div>
      </div>
    </article>
  );
}
