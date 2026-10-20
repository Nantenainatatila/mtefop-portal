// Protège une page : <ProtectedRoute role="admin"><MaPage /></ProtectedRoute>
// - pas connecté      -> redirigé vers la connexion
// - mauvais rôle      -> redirigé vers l'accueil
import { Navigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import Loader from './Loader.jsx';

export default function ProtectedRoute({ role, children }) {
  const { user, loading } = useAuth();

  if (loading) return <Loader />;
  if (!user) return <Navigate to="/connexion" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;

  return children;
}
