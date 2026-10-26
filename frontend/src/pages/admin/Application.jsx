import "../admin/css admin/application.css";
import { Link } from "react-router-dom";
import api from "../../../api/axios";
import { useState, useEffect } from "react";


function Application() {
    const [applications, setApplication] = useState([]);
    

    // CHARGEENT APP

    const chargerApp = async() => {
        try {
            const response = await api.get("/applications");
           
            setApplication(response.data);
            
        } catch (error) {
            console.error("Erreur de recuperation de application frontend", error);
        }
    };

    useEffect(() => {
        chargerApp();
    }, []);
    return(
        <div className="application-container">
            <div className="header-application">
                <h2>Listes des applications</h2>
                <Link className="btn-ajouter" to="/admin/ajouterApplication">Nouvelle application</Link>
            </div>
            
            <div className="application_grid">
                    {applications.length > 0 ? (
                            applications.map((app) => (
                                <div key={app.id_app} className="app-liste">
                                    <div className="tout-app">
                                        <div className="detail_app">
                                            <div className="header_detail">
                                                <div className="id_app">
                                                    {app.id_app}
                                                </div>
                                                <div className="icon_app">
                                                    {app.icone_app ? (
                                                    <img 
                                                        src={`http://localhost:5000/${app.icone_app}`}
                                                        className="application-icon"
                                                    />
                                                    ): (
                                                        <img 
                                                            src="A"
                                                            className="application-icon"
                                                        />
                                                    )}
                                            
                                                </div>
                                            </div>
                                            
                                            <div className="info_app">
                                                <span>Nom d'application</span>
                                                <strong>{app.nom_app}</strong>
                                            </div>
                                            <div className="info_app">
                                                <span>Nom de bouton</span>
                                                <strong>{app.nom_bouton_app}</strong>
                                            </div>
                                            <div className="info_app">
                                                <span>Destination</span>
                                                <strong>{app.nom_des}</strong>
                                            </div>
                                            <div className="info_app">
                                                <span>Type d'application</span>
                                                <strong>{app.type_app}</strong>
                                            </div>
                                            <div className="info_app">
                                                <span>Statut d'application</span>
                                                <strong  className={
                                                        app.statut_app === "error"
                                                        ?"erreur"
                                                        : app.statut_app === "offline"
                                                            ?"offline"
                                                            :"online"
                                                    }
                                                    id="liste"
                                                >
                                                    
                                                            {app.statut_app === "error"
                                                            ?"En Erreur"
                                                            : app.statut_app === "offline"
                                                                ?"Pas en ligne"
                                                                :"En ligne"
                                                            }
                                                </strong>
                                            </div>
                                        </div>
                                        <div >
                                             <button className="btn_detail">
                                                <Link to={`${app.id_app}`}>Plus le detail de depoloiement</Link>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ): (
                            <p>
                                Aucune application pour le moment
                            </p>
                        )}
            </div>
        </div>
    );
}
export default Application;