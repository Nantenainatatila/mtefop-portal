import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Layout from './Layout';
import { Loading } from './State';

// Exige d'être connecté, et affiche le layout (menu + en-tête)
export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}

// Restreint un groupe de routes à certains rôles
export function RoleRoute({ roles }) {
  const { hasRole } = useAuth();
  if (!hasRole(...roles)) {
    return <div className="alert alert-error">Vous n'avez pas accès à cette page.</div>;
  }
  return <Outlet />;
}
