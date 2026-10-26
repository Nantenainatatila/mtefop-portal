import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

const ROLES = { admin: 'Administrateur', directeur: 'Directeur', chef_service: 'Chef de service', agent: 'Agent' };

export default function Layout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="logo">M</div>
          <div><strong>MTEFOP</strong><small>Suivi des dossiers</small></div>
        </div>
        <nav>
          <NavLink to="/" end>📊 Tableau de bord</NavLink>
          <NavLink to="/dossiers">📁 Dossiers</NavLink>
          <NavLink to="/dossiers/nouveau">➕ Nouveau dossier</NavLink>
          {['admin', 'directeur'].includes(user.role) && <NavLink to="/utilisateurs">👥 Utilisateurs</NavLink>}
          <a href="/suivi" target="_blank" rel="noreferrer">🔎 Suivi public</a>
        </nav>
        <div className="userbox">
          <div><strong>{user.nom} {user.prenom}</strong></div>
          <small>{ROLES[user.role]}{user.service_nom ? ` · ${user.service_nom}` : ''}</small>
          <button className="btn btn-light" onClick={() => { logout(); nav('/login'); }}>Déconnexion</button>
        </div>
      </aside>
      <main className="content"><Outlet /></main>
    </div>
  );
}
