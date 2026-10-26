import React from "react";
import { Routes, Route} from "react-router-dom";
import PublicLayourt from "./layourts/PublicLayourt";
import AdminLayourt from "./layourts/AdminLayourt";
import Accueil from "./pages/public/Accueil";
import Applicationspublic from "./pages/public/Applicationspublic";
import Missions from "./pages/public/Missions";
import Partenariat from "./pages/public/Partenariat";

import DashboardAdmin from "./pages/admin/DashboardAdmin";
import Application from "./pages/admin/Application";
import Login from "./pages/admin/Login";
import Erreur from "./pages/admin/Erreur";
import Parametre from "./pages/admin/Parametre";
import Sussess from "./pages/admin/Success";
import DemmandeCompte from "./pages/admin/DemandeCompte";
import GestionAdministration from "./pages/admin/GestionAdministration";
import AjouterApplication from "./pages/admin/AjouterApplication";
import DetailApplication from "./pages/admin/DetailApplication";

import PersonnelLayout from "./layourts/PersonnelLayout";
import AccueilPersonnel from "./pages/personnel/AccueilPersonnel";
import ApplicationPersonnel from "./pages/personnel/ApplicationPersonnel";

import ProtectRoutes from "../protectionRoute/ProtectRoute";
import SuperAdminRoute from "../protectionRoute/SuperAdminRoute";
import { Contact } from "lucide-react";

function App () {
  return(
    <Routes>
      {/** espace public */}
        <Route path="/" element={<PublicLayourt />}>
            <Route index element={<Accueil />} />
            <Route path="applicationspublic" element={<Applicationspublic />}/>
            <Route path="missions" element={<Missions /> } />
            <Route path="partenariat" element={<Partenariat />}/>
            <Route path="contact" element={<Contact />}/>
        </Route>

      {/** espace personnel */}
        <Route path="/personnel" element={<PersonnelLayout />}>
            <Route index element={<AccueilPersonnel />}/>
            <Route path="applicationpersonnel" element={<ApplicationPersonnel />}/>
        </Route>
      {/** espace connexion admin */}
        <Route path="/admin/login" element={<Login />}/>
        <Route path="/admin/demandeCompte" element={<DemmandeCompte />}/>
      {/**espace admin */}
        <Route element={<ProtectRoutes/>}>
          <Route path="/admin" element={<AdminLayourt />}>
              <Route index  element={<DashboardAdmin />}/>
              <Route path="erreur" element={<Erreur />}/>
              <Route path="application" element={<Application />}/>
              <Route path="parametre" element={<Parametre />}/>
              <Route path="success" element={<Sussess />}/>
              <Route path="ajouterApplication" element={<AjouterApplication />} />
              <Route path="ajouterApplication/:id" element={<AjouterApplication />} />
              <Route path="application/:id" element={<DetailApplication />}/>

              <Route element={<SuperAdminRoute/>}>
                <Route path="gestionAdministration" element={<GestionAdministration />} />
              </Route>
          </Route>
        </Route>
    </Routes>
    
  );
}
export default App; 