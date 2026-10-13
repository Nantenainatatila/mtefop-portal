import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute, { RoleRoute } from './components/ProtectedRoute';
import { MANAGERS, RH_ROLES } from './utils/constants';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import NouvelleDemande from './pages/NouvelleDemande';
import MesDemandes from './pages/MesDemandes';
import DemandeDetail from './pages/DemandeDetail';
import AValider from './pages/AValider';
import ToutesDemandes from './pages/ToutesDemandes';
import Planning from './pages/Planning';
import Employes from './pages/Employes';
import Soldes from './pages/Soldes';
import Parametres from './pages/Parametres';
import Notifications from './pages/Notifications';
import Profil from './pages/Profil';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route index element={<Dashboard />} />
        <Route path="nouvelle-demande" element={<NouvelleDemande />} />
        <Route path="mes-demandes" element={<MesDemandes />} />
        <Route path="demandes/:id" element={<DemandeDetail />} />
        <Route path="planning" element={<Planning />} />
        <Route path="soldes" element={<Soldes />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="profil" element={<Profil />} />

        <Route element={<RoleRoute roles={MANAGERS} />}>
          <Route path="a-valider" element={<AValider />} />
          <Route path="toutes-les-demandes" element={<ToutesDemandes />} />
          <Route path="employes" element={<Employes />} />
        </Route>

        <Route element={<RoleRoute roles={RH_ROLES} />}>
          <Route path="parametres" element={<Parametres />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
