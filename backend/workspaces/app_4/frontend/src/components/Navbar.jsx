// Barre de navigation : en haut sur grand écran, en bas sur téléphone
import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import Avatar from './Avatar.jsx';
import Icon from './Icon.jsx';

export default function Navbar() {
  const { user } = useAuth();
  const [unread, setUnread] = useState(0); // notifications non lues (admin)

  // L'admin voit un badge avec le nombre de nouvelles notifications.
  // On vérifie toutes les 10 secondes.
  useEffect(() => {
    if (!user || user.role !== 'admin') {
      setUnread(0);
      return;
    }
    const charger = () =>
      api
        .get('/admin/notifications')
        .then((data) => setUnread(data.unread))
        .catch(() => {});

    charger();
    const timer = setInterval(charger, 10000);
    window.addEventListener('notifications-changed', charger);
    return () => {
      clearInterval(timer);
      window.removeEventListener('notifications-changed', charger);
    };
  }, [user]);

  // Les liens changent selon le type de visiteur
  let liens;
  if (!user) {
    liens = [
      { to: '/', label: 'Accueil', icon: 'home', end: true },
      { to: '/connexion', label: 'Connexion', icon: 'user' },
    ];
  } else if (user.role === 'admin') {
    liens = [
      { to: '/admin', label: 'Statistiques', icon: 'chart', end: true },
      { to: '/admin/voitures', label: 'Voitures', icon: 'car' },
      { to: '/admin/commandes', label: 'Commandes', icon: 'bag', badge: unread },
      { to: '/profil', label: 'Profil', icon: 'user' },
    ];
  } else {
    liens = [
      { to: '/', label: 'Accueil', icon: 'home', end: true },
      { to: '/mes-commandes', label: 'Mes commandes', icon: 'bag' },
      { to: '/profil', label: 'Profil', icon: 'user' },
    ];
  }

  const afficherLien = (lien) => (
    <NavLink
      key={lien.to}
      to={lien.to}
      end={lien.end}
      className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
    >
      <span className="nav-icon">
        <Icon name={lien.icon} />
        {lien.badge > 0 && <span className="badge">{lien.badge}</span>}
      </span>
      <span>{lien.label}</span>
    </NavLink>
  );

  return (
    <>
      <header className="header">
        <div className="header-inner">
          <Link to="/" className="logo">
            <span className="logo-mark">
              <Icon name="car" size={20} />
            </span>
            Car Mada
          </Link>

          <nav className="nav-desktop">{liens.map(afficherLien)}</nav>

          <div className="header-right">
            {user ? (
              <Link to="/profil" aria-label="Mon profil">
                <Avatar src={user.avatar} name={user.name} size={38} />
              </Link>
            ) : (
              <Link to="/inscription" className="btn btn-sm">
                S’inscrire
              </Link>
            )}
          </div>
        </div>
      </header>

      <nav className="nav-mobile">{liens.map(afficherLien)}</nav>
    </>
  );
}
