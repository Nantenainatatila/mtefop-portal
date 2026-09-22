import React from "react";
import { Routes, Route} from "react-router-dom";
import PublicLayourt from "./layourts/PublicLayourt";
import AdminLayourt from "./layourts/AdminLayourt";
import DashboardPublic from "./pages/public/DashboardPublic";
import Application from "./pages/admin/Application";
import Information from "./pages/public/Information";
import DashboardAdmin from "./pages/admin/DashboardAdmin";
import Login from "./pages/admin/Login";
import Logs from "./pages/admin/Logs";
import Parametre from "./pages/admin/Parametre";
import Deploiement from "./pages/admin/Deploiement";
import Service from "./pages/public/Sarvices";
import Partenariat from "./pages/public/Partenariat";
import DemmandeCompte from "./pages/admin/DemandeCompte";
import GestionAdministration from "./pages/admin/GestionAdministration";
import AjouterApplication from "./pages/admin/AjouterApplication";

import ProtectRoutes from "../protectionRoute/ProtectRoute";
import SuperAdminRoute from "../protectionRoute/SuperAdminRoute";

function App () {
  return(
    <Routes>
      {/** espace public */}
        <Route path="/" element={<PublicLayourt />}>
            <Route index element={<DashboardPublic />} />
            <Route path="information" element={<Information />}/>
            <Route path="service" element={<Service /> } />
            <Route path="partenariat" element={<Partenariat />}/>
        </Route>
      {/** espace connexion admin */}
        <Route path="/admin/login" element={<Login />}/>
        <Route path="/admin/demandeCompte" element={<DemmandeCompte />}/>
      {/**espace admin */}
        <Route element={<ProtectRoutes/>}>
          <Route path="/admin" element={<AdminLayourt />}>
              <Route index  element={<DashboardAdmin />}/>
              <Route  path="logs" element={<Logs />}/>
              <Route path="application" element={<Application />}/>
              <Route path="parametre" element={<Parametre />}/>
              <Route path="deploiement" element={<Deploiement />}/>
              <Route path="ajouterApplication" element={<AjouterApplication />} />
              <Route path="ajouterApplication/:id" element={<AjouterApplication />} />

              <Route element={<SuperAdminRoute/>}>
                <Route path="gestionAdministration" element={<GestionAdministration />} />
              </Route>
          </Route>
        </Route>
    </Routes>
    
  );
}
export default App; 