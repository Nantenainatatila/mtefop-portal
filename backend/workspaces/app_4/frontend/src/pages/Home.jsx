// Page d'accueil : le "fil" des voitures (public)
import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import CarCard from '../components/CarCard.jsx';
import Icon from '../components/Icon.jsx';
import Loader from '../components/Loader.jsx';

export default function Home() {
  const { user } = useAuth();
  const [brands, setBrands] = useState([]);
  const [cars, setCars] = useState([]);
  const [brand, setBrand] = useState(''); // marque choisie ('' = toutes)
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Liste des marques (une seule fois)
  useEffect(() => {
    api.get('/brands').then(setBrands).catch(() => {});
  }, []);

  // Liste des voitures : recharge quand la marque, la recherche ou l'utilisateur change
  useEffect(() => {
    let annule = false;
    setLoading(true);
    setError('');

    // Petite pause pendant la frappe pour ne pas appeler le serveur à chaque lettre
    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      if (brand) params.set('brand', brand);
      if (search.trim()) params.set('search', search.trim());

      api
        .get(`/cars?${params}`)
        .then((data) => !annule && setCars(data))
        .catch((e) => !annule && setError(e.message))
        .finally(() => !annule && setLoading(false));
    }, search ? 300 : 0);

    return () => {
      annule = true;
      clearTimeout(timer);
    };
  }, [brand, search, user?.id]);

  // Met à jour le like d'une voiture sans recharger toute la liste
  function changerLike(carId, liked, count) {
    setCars((liste) =>
      liste.map((c) => (c.id === carId ? { ...c, liked_by_me: liked, likes_count: count } : c))
    );
  }

  return (
    <div>
      <h1 className="page-title">Trouvez votre voiture</h1>
      <p className="subtitle">Les meilleures offres de voitures, prix en Ariary.</p>

      <div className="search-box">
        <Icon name="search" size={20} />
        <input
          type="search"
          placeholder="Rechercher une voiture ou une marque..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="chips">
        <button className={`chip ${brand === '' ? 'active' : ''}`} onClick={() => setBrand('')}>
          Toutes
        </button>
        {brands.map((b) => (
          <button
            key={b.id}
            className={`chip ${String(b.id) === String(brand) ? 'active' : ''}`}
            onClick={() => setBrand(b.id)}
          >
            {b.name}
          </button>
        ))}
      </div>

      {loading && <Loader text="Chargement des voitures..." />}

      {!loading && error && <p className="error">{error}</p>}

      {!loading && !error && cars.length === 0 && (
        <div className="empty">Aucune voiture trouvée.</div>
      )}

      {!loading && !error && cars.length > 0 && (
        <div className="grid-cars">
          {cars.map((car) => (
            <CarCard key={car.id} car={car} onLikeChange={changerLike} />
          ))}
        </div>
      )}
    </div>
  );
}
