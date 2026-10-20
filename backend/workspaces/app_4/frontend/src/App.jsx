// Définition des pages (routes) de l'application
import { Link, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import TopBar from './components/TopBar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

import Home from './pages/Home.jsx';
import CarDetail from './pages/CarDetail.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Profile from './pages/Profile.jsx';
import MyOrders from './pages/MyOrders.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import AdminCars from './pages/AdminCars.jsx';
import AdminOrders from './pages/AdminOrders.jsx';

function NotFound() {
  return (
    <div className="empty">
      <h2>Page introuvable</h2>
      <p className="muted">Cette page n’existe pas.</p>
      <br />
      <Link to="/" className="btn">
        Retour à l’accueil
      </Link>
    </div>
  );
}

export default function App() {
  return (
    <>
      <TopBar />
      <Navbar />

      <main className="container">
        <Routes>
          {/* Pages publiques */}
          <Route path="/" element={<Home />} />
          <Route path="/voitures/:id" element={<CarDetail />} />
          <Route path="/connexion" element={<Login />} />
          <Route path="/inscription" element={<Register />} />

          {/* Pages pour toute personne connectée */}
          <Route
            path="/profil"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />

          {/* Pages du client */}
          <Route
            path="/mes-commandes"
            element={
              <ProtectedRoute role="client">
                <MyOrders />
              </ProtectedRoute>
            }
          />

          {/* Pages de l'admin */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute role="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/voitures"
            element={
              <ProtectedRoute role="admin">
                <AdminCars />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/commandes"
            element={
              <ProtectedRoute role="admin">
                <AdminOrders />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </>
  );
}
