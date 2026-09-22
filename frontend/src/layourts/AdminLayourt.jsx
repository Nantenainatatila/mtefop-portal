import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./layourt.css";
import { LogOut } from "lucide-react";
import { Link, Outlet } from "react-router-dom";
function AdminLayourt() {
    const [menuOuvert, setMenuOuvert] = useState(false);
    const fermerMenu = () => {
        setMenuOuvert(false);
    };
    const navigate = useNavigate();
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
                        
                        <Link to="/admin" onClick={fermerMenu}>Dashboard</Link>
                        
                        <Link to="/admin/application" onClick={fermerMenu}>Application </Link>

                        <Link to="/admin/deploiement" onClick={fermerMenu}>Deploiement</Link>

                        <Link to="/admin/logs" onClick={fermerMenu}>Logs des applications</Link>
                
                        <Link to="/admin/parametre" onClick={fermerMenu}>Parametre</Link>

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