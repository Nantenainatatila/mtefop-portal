import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../../api/axios";
import "./css admin/success.css";

function Success() {
    const [appDeploi, setAppDeploi] = useState([]);
    const [chargement, setChargement] = useState(true);

    const chargerAppSucces = async() => {
        try {
            setChargement(true);
            const response = await api.get("/success_failed/success");
            setAppDeploi(response.data);

        } catch (err) {
            console.log("Erreur de recuperation de app succes frontend");
        } finally {
            setChargement(false);
        }
    };

    useEffect(() => { chargerAppSucces() } , []);
    if (chargement) {
        return <p>Chargement en cours...</p>;
    }
    return(
        <div className="application-success">
            <div className="success-header">
                <h2>Deploiements en succès</h2>
            </div>
            <div className="application_grid">
                {appDeploi.length > 0 
                    ? (appDeploi.map((app) => (
                        <div className="app-liste">
                            <div className="tout_app">
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
                                        <span>Nom d'admin</span>
                                        <strong>{app.nom_admin}</strong>
                                    </div>
                                    <div className="info_app">
                                        <span>Nom d'application</span>
                                        <strong>{app.nom_app}</strong>
                                    </div>
                                    <div className="info_app">
                                        <span>Destination</span>
                                        <strong>{app.nom_des}</strong>
                                    </div>
                                    <div className="info_app">
                                        <span>Url public d'application</span>
                                        <strong><Link to={app.url_publique_deploie}>{app.url_publique_deploie}</Link></strong>
                                    </div>
                                    <div className="btn">
                                        <button className="btn_detail">
                                            <Link to={`/admin/application/${app.id_app}`}>Detail de deploiement</Link>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )))
                    :  "Aucun deploiement en sussès pour le moment"  
                }
            </div>
  
        </div>
    )
}
export default Success;