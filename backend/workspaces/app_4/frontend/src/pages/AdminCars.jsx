// Admin : publier, modifier et supprimer des voitures
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { formatAriary } from '../utils.js';
import Button from '../components/Button.jsx';
import CarImage from '../components/CarImage.jsx';
import Icon from '../components/Icon.jsx';
import Loader from '../components/Loader.jsx';

const FORMULAIRE_VIDE = {
  brand_id: '',
  brand_name: '', // utilisé seulement si on choisit "Autre marque"
  name: '',
  price: '',
  year: '',
  description: '',
};

export default function AdminCars() {
  const [brands, setBrands] = useState([]);
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState(FORMULAIRE_VIDE);
  const [image, setImage] = useState(null);
  const [fileKey, setFileKey] = useState(0); // change pour vider le champ fichier
  const [editing, setEditing] = useState(null); // voiture en cours de modification (ou null)
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  // Met à jour un champ du formulaire : modifier('name', 'Toyota')
  const modifier = (champ, valeur) => setForm((f) => ({ ...f, [champ]: valeur }));

  function charger() {
    return Promise.all([api.get('/brands'), api.get('/cars')]).then(([b, c]) => {
      setBrands(b);
      setCars(c);
    });
  }

  useEffect(() => {
    charger()
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // Remet le formulaire à zéro (mode "publier")
  function reinitialiser() {
    setForm(FORMULAIRE_VIDE);
    setImage(null);
    setEditing(null);
    setFileKey((k) => k + 1);
  }

  // Clic sur "Modifier" : on remplit le formulaire avec les infos de la voiture
  function commencerModification(car) {
    setEditing(car);
    setForm({
      brand_id: String(car.brand_id),
      brand_name: '',
      name: car.name,
      price: String(car.price),
      year: car.year ? String(car.year) : '',
      description: car.description || '',
    });
    setImage(null);
    setFileKey((k) => k + 1);
    setMessage('');
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function annuler() {
    reinitialiser();
    setMessage('');
    setError('');
  }

  // Envoi du formulaire : publie une nouvelle voiture OU enregistre la modification
  async function envoyer(e) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');

    const formData = new FormData();
    formData.append('name', form.name);
    formData.append('price', form.price);
    formData.append('year', form.year);
    formData.append('description', form.description);
    if (form.brand_id === 'autre') formData.append('brand_name', form.brand_name);
    else formData.append('brand_id', form.brand_id);
    if (image) formData.append('image', image); // sinon, l'ancienne image est conservée

    try {
      if (editing) {
        await api.put(`/cars/${editing.id}`, formData);
        setMessage('Voiture modifiée avec succès');
      } else {
        await api.post('/cars', formData);
        setMessage('Voiture publiée avec succès');
      }
      reinitialiser();
      await charger();
    } catch (erreur) {
      setError(erreur.message);
    } finally {
      setSaving(false);
    }
  }

  async function supprimer(car) {
    if (!window.confirm(`Supprimer "${car.brand_name} ${car.name}" ?`)) return;
    setDeletingId(car.id);
    try {
      await api.del(`/cars/${car.id}`);
      if (editing && editing.id === car.id) reinitialiser();
      await charger();
    } catch (erreur) {
      setError(erreur.message);
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) return <Loader text="Chargement..." />;

  return (
    <div>
      <h1 className="page-title">Voitures</h1>
      <p className="subtitle">Publiez, modifiez ou supprimez vos voitures.</p>

      <div className="admin-cars">
        {/* Formulaire : publication ou modification */}
        <form className="card panel" onSubmit={envoyer}>
          <h3>{editing ? `Modifier : ${editing.brand_name} ${editing.name}` : 'Publier une voiture'}</h3>

          <div className="field">
            <label htmlFor="brand">Marque</label>
            <select
              id="brand"
              required
              value={form.brand_id}
              onChange={(e) => modifier('brand_id', e.target.value)}
            >
              <option value="">Choisir une marque...</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
              <option value="autre">+ Autre marque...</option>
            </select>
          </div>

          {form.brand_id === 'autre' && (
            <div className="field">
              <label htmlFor="brand_name">Nom de la nouvelle marque</label>
              <input
                id="brand_name"
                required
                value={form.brand_name}
                onChange={(e) => modifier('brand_name', e.target.value)}
              />
            </div>
          )}

          <div className="field">
            <label htmlFor="name">Nom de la voiture</label>
            <input
              id="name"
              required
              placeholder="Ex : Land Cruiser Prado"
              value={form.name}
              onChange={(e) => modifier('name', e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="price">Prix (en Ariary)</label>
            <input
              id="price"
              type="number"
              min="1"
              required
              placeholder="Ex : 45000000"
              value={form.price}
              onChange={(e) => modifier('price', e.target.value)}
            />
            {form.price > 0 && <small className="muted">{formatAriary(form.price)}</small>}
          </div>

          <div className="field">
            <label htmlFor="year">Année</label>
            <input
              id="year"
              type="number"
              min="1950"
              max="2100"
              placeholder="Ex : 2020"
              value={form.year}
              onChange={(e) => modifier('year', e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              rows="4"
              value={form.description}
              onChange={(e) => modifier('description', e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="image">{editing ? 'Changer l’image (facultatif)' : 'Image'}</label>
            <input
              key={fileKey}
              id="image"
              type="file"
              accept="image/*"
              onChange={(e) => setImage(e.target.files[0] || null)}
            />

            {image && (
              <>
                <span className="preview-label">Nouvelle image</span>
                <img className="preview" src={URL.createObjectURL(image)} alt="Aperçu" />
              </>
            )}
            {!image && editing && editing.image && (
              <>
                <span className="preview-label">Image actuelle</span>
                <img className="preview" src={editing.image} alt="Image actuelle" />
              </>
            )}
          </div>

          {message && <p className="success">{message}</p>}
          {error && <p className="error">{error}</p>}

          <div className="form-buttons">
            <Button type="submit" className="btn-block" loading={saving}>
              <Icon name={editing ? 'edit' : 'plus'} size={18} />
              {editing ? 'Enregistrer les modifications' : 'Publier'}
            </Button>

            {editing && (
              <Button type="button" className="btn-outline btn-block" onClick={annuler} disabled={saving}>
                Annuler
              </Button>
            )}
          </div>
        </form>

        {/* Liste des voitures publiées */}
        <section>
          <h3 className="list-title">Voitures publiées ({cars.length})</h3>
          <div className="rows">
            {cars.map((car) => (
              <div
                className={`card row-card ${editing && editing.id === car.id ? 'editing' : ''}`}
                key={car.id}
              >
                <CarImage src={car.image} alt={car.name} className="thumb" />
                <div className="row-info">
                  <small className="muted">{car.brand_name}</small>
                  <h4>
                    <Link to={`/voitures/${car.id}`}>{car.name}</Link>
                  </h4>
                  <p className="price">{formatAriary(car.price)}</p>
                  <small className="muted">
                    {car.likes_count} likes · {car.comments_count} commentaires
                  </small>
                </div>

                <div className="row-actions">
                  <Button
                    className="btn-outline btn-sm"
                    onClick={() => commencerModification(car)}
                    aria-label="Modifier"
                  >
                    <Icon name="edit" size={16} />
                  </Button>
                  <Button
                    className="btn-outline btn-sm"
                    loading={deletingId === car.id}
                    onClick={() => supprimer(car)}
                    aria-label="Supprimer"
                  >
                    <Icon name="trash" size={16} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
