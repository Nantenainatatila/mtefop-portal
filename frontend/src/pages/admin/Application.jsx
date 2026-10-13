import "../admin/css admin/application.css";
import { Link } from "react-router-dom";
import api from "../../../api/axios";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

function Application() {
    const [applications, setApplication] = useState([]);
    const navigate = useNavigate();

    // CHARGEENT APP

    const chargerApp = async() => {
        try {
            const response = await api.get("/applications");
           
            setApplication(response.data);
            
        } catch (error) {
            console.error("Erreur de recuperation de application frontend", error);
        }
    };


    //SUPPRESSION APP

    const supprimerApp = async(id_app) => {
        console.log("io gne id tadiavina:" , id_app);

        const confirmation = window.confirm("Voulez-vous supprimer cette application ?");

        if(!confirmation) {
            return;
        }
        console.log("confirmation ok");

        try {

            await api.delete(`/applications/${id_app}`);
            console.log("suppression ok");
            chargerApp();

        } catch (error) {
            console.error("Erreur de suppression", error);
        }
    };


    //modification APP

    const modifierApp = async(id_app) => {
        console.log("id:", id_app);
        navigate(`/admin/ajouterApplication/${id_app}`);
        
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
                            
                            <th>Cathegorie</th>
                            <th>Type</th>
                            <th>Base des données</th>
                            <th>Statut</th>
                            
                            <th>Source/URL</th>
                            
                            <th>Actions</th>
                        </tr>
                    </thead>

                    <tbody>
                        {applications.length > 0 ? (
                            applications.map((app) => (
                                <tr>
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
                                    <td>{app.nom_cat}</td>
                                    <td>{app.type_app}</td>
                                    <td>{app.moteur_db}</td>
                                    <td>
                                        {app.statut_app === "offline"?
                                        "Pas en ligne" 
                                        : app.statut_app === "online"? "En ligne" : "Erreur"}</td>
                                    <td>{app.type_app === "docker"? app.source_app : app.url_app}</td>
                                    
                                    <td>
                                        <button>Deployer</button>
                                        <button type="button" onClick={() => modifierApp(app.id_app)}>Modifier</button>
                                        <button type="button" onClick={() => supprimerApp(app.id_app)}>Supprimer</button>
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