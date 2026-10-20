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
                <Link className="btn-ajouter" to="/admin/ajouterApplication">Ajouter</Link>
            </div>
            
            <div className="application-table">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Icone</th>
                            <th>Nom </th>
                            <th>Nom du button</th>
                            <th>Type</th>
                            <th>Base des données</th>
                            <th>Statut</th>
                            <th>Actions</th>
                        </tr>
                    </thead>

                    <tbody>
                        {applications.length > 0 ? (
                            applications.map((app) => (
                                <tr key={app.id_app}>
                                    <td>{app.icone_app ? (
                                        <img 
                                            src={`http://localhost:5000/${app.icone_app}`}
                                            className="application-icon"
                                        />
                                        ): (
                                            "Aucun icone"
                                        )}</td>
                                    <td>{app.nom_app}</td>
                                    <td>{app.nom_bouton_app}</td>
                                    <td>{app.type_app}</td>
                                    <td>{app.moteur_db}</td>
                                    <td>
                                        {app.statut_app === "offline"?
                                        "Pas en ligne" 
                                        : app.statut_app === "online"? "En ligne" : "Erreur"}
                                    </td>
                                    
                                    
                                    <td>
                                        <Link to={`${app.id_app}`}>Plus des détails</Link>
                                    </td>
                                    
                                </tr>
                            ))
                        ): (
                            <tr>
                                <td colSpan={9}><center>Aucune application pour le moment</center></td>
                            </tr>
                        )}
                        
                        
                    </tbody>
                </table>
            </div>
        </div>
    );
}
export default Application;