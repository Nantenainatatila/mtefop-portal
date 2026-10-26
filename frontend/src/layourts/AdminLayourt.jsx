import { useEffect, useState } from "react";
import api from "../../api/axios";
import { useNavigate } from "react-router-dom";
import "./layourt.css";
import { LogOut } from "lucide-react";
import { NavLink as Link, Outlet, useLocation } from "react-router-dom";
function AdminLayourt() {
    const [menuOuvert, setMenuOuvert] = useState(false);
    const fermerMenu = () => {
        setMenuOuvert(false);
    };
    const navigate = useNavigate();
    const location = useLocation();
    const [nombreErreur, setNombreErreur] = useState(0);

    // Nombre des applications en erreur (rechargé à chaque changement de page)
    useEffect(() => {
        api.get("/success_failed/failed")
            .then((response) => {
                setNombreErreur(Array.isArray(response.data) ? response.data.length : 0);
            })
            .catch(() => setNombreErreur(0));
    }, [location.pathname]);
    const deconnexion = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("utilisateur");
        navigate("/admin/login");
    };

    const utilisateur = JSON.parse(
        localStorage.getItem("utilisateur")
    );
    const token = localStorage.getItem("token");
    console.log("token", token);
    console.log("utlisateur", utilisateur);
    const role = utilisateur?.role_admin;

    console.log("role:", role);

    return(
        <div className="layout">
            <header className="header">
                <div className="navbar-logo">
                    <h2> MTEFOP</h2>
                </div>
                {/** */}
                <button 
                    className={`menu-toggle ${menuOuvert ? "ouvert" : ""}`}
                    onClick={() => setMenuOuvert(!menuOuvert)}
                    aria-label="Ouvrir ou fermer le menu"
                >
                        <span></span>
                        <span></span>
                        <span></span>
                </button>
                <nav className={`navbar-menu ${menuOuvert ? "menu-ouvert": ""}`}>
                    <div className="nav_link">
                        
                        <Link to="/admin" end onClick={fermerMenu}>Dashboard</Link>
                        
                        <Link to="/admin/application" onClick={fermerMenu}>Toute les applications</Link>

                        <Link to="/admin/success" onClick={fermerMenu}>Deploiement en uccès</Link>

                        <Link to="/admin/erreur" onClick={fermerMenu} className="lien-erreur">
                            Deploiement en erreur
                            {nombreErreur > 0 && (
                                <span className="badge-erreur">{nombreErreur}</span>
                            )}
                        </Link>
                
                        {role === "super_admin" && (
                            <>
                                <Link to="/admin/gestionAdministration" onClick={fermerMenu}>Gestion d'administration</Link>
                            </>
                        )

                        }
                    </div>
                    <div className="class-logout">
                        <button className="logout" onClick={deconnexion}>
                            <LogOut fontSize={10}/> <span>Deconnexion</span>
                        </button>
                    </div>
                    
                </nav>
            </header>
            <main className="main-content" onClick={fermerMenu}>
                <Outlet />
            </main>

           
        </div>
    );
}
export default AdminLayourt;