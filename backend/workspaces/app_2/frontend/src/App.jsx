import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import SuiviPublic from './pages/SuiviPublic';
import Dashboard from './pages/Dashboard';
import Dossiers from './pages/Dossiers';
import DossierForm from './pages/DossierForm';
import DossierDetail from './pages/DossierDetail';
import Users from './pages/Users';

function Private({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="center">Chargement…</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/suivi" element={<SuiviPublic />} />
      <Route element={<Private><Layout /></Private>}>
        <Route index element={<Dashboard />} />
        <Route path="dossiers" element={<Dossiers />} />
        <Route path="dossiers/nouveau" element={<DossierForm />} />
        <Route path="dossiers/:id" element={<DossierDetail />} />
        <Route path="dossiers/:id/modifier" element={<DossierForm />} />
        <Route path="utilisateurs" element={<Private roles={['admin', 'directeur']}><Users /></Private>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
