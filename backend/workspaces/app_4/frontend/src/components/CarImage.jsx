// Image d'une voiture. S'il n'y a pas d'image, on affiche une icône à la place.
import Icon from './Icon.jsx';

export default function CarImage({ src, alt, className = '' }) {
  if (src) {
    return <img className={`car-img ${className}`} src={src} alt={alt} loading="lazy" />;
  }
  return (
    <div className={`car-img car-img-empty ${className}`}>
      <Icon name="car" size={48} />
    </div>
  );
}
