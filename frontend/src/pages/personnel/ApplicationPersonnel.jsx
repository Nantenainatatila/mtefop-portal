import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../../../api/axios";

export default function ApplicationPersonnel() {
   const [appPersonnel, setAppPersonnel] = useState([]);
    const [chargement, setChargement] = useState(true);
    const [erreur, setErreur] = useState("");
    const navigate = useNavigate();

    const chargetAppPersonnel = async() => {

         try {
            setChargement(true);
            const response = await api.get("/personnels/personnel");
            setAppPersonnel(response.data);
            console.log("App:", response.data);

         } catch (err) {
            console.log("Erreur de recuperation");
            setErreur("Erreur de serveur");
         } finally {
            setChargement(false);
         }
    };

    useEffect(() => {
        chargetAppPersonnel();
    }, []);
   
    if (chargement) {
        return <h1>Chargement des applications...</h1>
    } 
    return(
            <div>
                <h3>Applications</h3>
                <div className="container_app_public">
                    {appPersonnel.length > 0
                        ?appPersonnel.map((app) => (
                            <div className="app" key={app.id_deploie}>
                                <div>
                                    <h3>{app.nom_app}</h3>
                                    <p>{app.description_app}</p>
                                    <button>
                                        <Link to={`${app.url_publique_deploie}`}>{app.nom_bouton_app}</Link>
                                    </button>
                                </div>
                                <div>
                                    {app.icone_app
                                    ?<img 
                                            src={`http://localhost:5000/${app.icone_app}`}
                                            className="application-icon"
                                    />
                                    
                                    : (
                                        "Aucun icone"
                                    )}
                                </div>
                                
                            </div>
                        ))
                        : <p>Aucune application</p>
                    }
                    <p>{erreur}</p>
                </div>
            
            </div>
        );
    
}