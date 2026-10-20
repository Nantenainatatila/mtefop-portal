// Tableau de bord admin : statistiques
import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { STATUTS } from '../utils.js';
import Loader from '../components/Loader.jsx';

// Liste avec barres : plus la valeur est grande, plus la barre est longue
function BarList({ title, items }) {
  const max = Math.max(1, ...items.map((i) => i.total));

  return (
    <section className="card panel">
      <h3>{title}</h3>
      {items.length === 0 && <p className="muted">Pas encore de données.</p>}
      {items.map((item, index) => (
        <div className="bar-row" key={item.key}>
          <div className="bar-label">
            <span>
              {index + 1}. {item.label}
            </span>
            <strong>{item.total}</strong>
          </div>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${(item.total / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </section>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/admin/stats')
      .then(setStats)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="error">{error}</p>;
  if (!stats) return <Loader text="Calcul des statistiques..." />;

  // Transforme les lignes de voitures en éléments pour BarList
  const voitures = (liste) =>
    liste.map((c) => ({ key: c.id, label: `${c.brand_name} ${c.name}`, total: c.total }));

  const enAttente = stats.ordersByStatus.find((s) => s.status === 'pending');

  const cartes = [
    { label: 'Clients', value: stats.totals.clients },
    { label: 'Voitures', value: stats.totals.cars },
    { label: 'Commandes', value: stats.totals.orders },
    { label: 'En attente', value: enAttente ? enAttente.total : 0 },
    { label: 'Likes', value: stats.totals.likes },
    { label: 'Commentaires', value: stats.totals.comments },
  ];

  return (
    <div>
      <h1 className="page-title">Statistiques</h1>
      <p className="subtitle">Vue d’ensemble de votre plateforme.</p>

      <div className="stats">
        {cartes.map((c) => (
          <div className="card stat" key={c.label}>
            <strong>{c.value}</strong>
            <span>{c.label}</span>
          </div>
        ))}
      </div>

      <div className="panels">
        <BarList title="Voitures les plus commandées" items={voitures(stats.mostOrdered)} />
        <BarList title="Voitures les plus likées" items={voitures(stats.mostLiked)} />
        <BarList title="Voitures les plus commentées" items={voitures(stats.mostCommented)} />
        <BarList
          title="Commandes par statut"
          items={stats.ordersByStatus.map((s) => ({
            key: s.status,
            label: STATUTS[s.status],
            total: s.total,
          }))}
        />
      </div>
    </div>
  );
}
