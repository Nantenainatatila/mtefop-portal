import { useState } from "react";
import "./layourt.css";
import { Link, Outlet } from "react-router-dom";
function PublicLayourt() {
    const [menuOuvert, setMenuOuvert] = useState(false);
        const fermerMenu = () => {
            setMenuOuvert(false);
        };
    return (
        <div className="layout">
            <header className="header">
                
                    <div className="navbar-logo">
                        <h2>MTEFOP</h2>
                    </div>

                    {/**☰ */}
                    <button 
                        className={`menu-toggle ${menuOuvert ? "ouvert" : ""}`}
                        onClick={() => setMenuOuvert(!menuOuvert)}
                        aria-label="Ouvrir ou fermer le menu">
                            <span></span>
                            <span></span>
                            <span></span>
                    </button>

                    <nav className={`navbar-menu ${menuOuvert ? "menu-ouvert" : ""}`}>
                        <Link to="/" onClick={fermerMenu}>Dashboard</Link>
                        
                        <Link to="/information" onClick={fermerMenu}>Information</Link>
                        
                        <Link to="/service" onClick={fermerMenu}>Service</Link>
                        
                        <Link to="/partenariat" onClick={fermerMenu}>Partenariat</Link>
                    </nav>
                    
            </header>

            <main className="main-content" onClick={fermerMenu}> 
                <Outlet />
            </main>

            <footer className="footer">
                <span>
                    © {new Date().getFullYear()} MTEFOP
                </span>
                <span>
                    Portal Web MTEFOP
                </span>
                
            </footer>
        </div>
    );

}
export default PublicLayourt;