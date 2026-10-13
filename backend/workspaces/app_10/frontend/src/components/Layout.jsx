import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { MANAGERS, RH_ROLES, ROLE_LABEL } from '../utils/constants';
import { Bell } from "lucide-react";

const NAV = [
  { to: '/', label: 'Tableau de bord', icon: '', end: true },
  { to: '/nouvelle-demande', label: 'Nouvelle demande', icon: '' },
  { to: '/mes-demandes', label: 'Mes demandes', icon: '' },
  { to: '/a-valider', label: 'À valider', icon: '', roles: MANAGERS },
  { to: '/toutes-les-demandes', label: 'Toutes les demandes', icon: '', roles: MANAGERS },
  { to: '/planning', label: 'Planning', icon: '' },
  { to: '/employes', label: 'Employés', icon: '', roles: MANAGERS },
  { to: '/soldes', label: 'Soldes de congés', icon: '' },
  { to: '/parametres', label: 'Paramètres', icon: '⚙️', roles: RH_ROLES },
];

export default function Layout({ children }) {
  const { user, logout, hasRole } = useAuth();
  const [open, setOpen] = useState(false);
  const [nonLues, setNonLues] = useState(0);
  const location = useLocation();

  useEffect(() => { setOpen(false); }, [location.pathname]);

  // Compteur de notifications, rafraîchi toutes les minutes
  useEffect(() => {
    let stop = false;
    const load = () =>
      api.get('/notifications', { params: { non_lues: 1 } })
        .then((r) => !stop && setNonLues(r.data.non_lues))
        .catch(() => {});
    load();
    const t = setInterval(load, 60000);
    return () => { stop = true; clearInterval(t); };
  }, [location.pathname]);

  return (
    <div className="app">
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-logo">M</div>
          <div>
            <strong>MTEFOP</strong>
            <small>Gestion des congés</small>
          </div>
        </div>
        <nav>
          {NAV.filter((n) => !n.roles || hasRole(...n.roles)).map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => (isActive ? 'active' : '')}>
              <span>{n.icon}</span> {n.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      {open && <div className="overlay" onClick={() => setOpen(false)} />}

      <div className="main">
        <header className="topbar">
          <button className="btn-icon burger" onClick={() => setOpen(!open)} aria-label="Menu">☰</button>
          <div className="spacer" />
          <Link to="/notifications" className="bell" title="Notifications">
            <Bell />{nonLues > 0 && <span className="bell-count">{nonLues > 99 ? '99+' : nonLues}</span>}
          </Link>
          <Link to="/profil" className="user-chip">
            <span className="avatar">{(user.prenom || user.nom || '?')[0]}</span>
            <span className="user-info">
              <strong>{user.prenom} {user.nom}</strong>
              <small>{ROLE_LABEL[user.role]}</small>
            </span>
          </Link>
          <button className="btn btn-light" onClick={logout}>Déconnexion</button>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
