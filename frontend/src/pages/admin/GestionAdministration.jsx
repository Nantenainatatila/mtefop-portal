import { useState, useEffect } from "react";
import api from "../../../api/axios";
import "./css admin/gestionAdmin.css";
import { Trash2,X,Check } from "lucide-react";

function GestionAdministration() {
    const [admins, setAdmins] = useState([]);
    const formatDate = (date) => {
        if (!date) return "-";

        const nouvelleDate = new Date(date);

        return nouvelleDate.toLocaleString("fr-FR", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit"
                            });
        
    }
  
    //===============CHARGER LES ADMIN======================
    const recupererAdmin = async() => {
            try {
                const response = await api.get("/administrations");
                setAdmins(response.data);

                console.log("donne:",response.data);

            } catch (error) {
                console.error("erreur de recuperation d'admin dans frontend", error);
            }
        };

    //================ACCEPTER LA DEMANDE=======================

    const accepter = async(id_admin) => {
        try {
            await api.put(
                `/administrations/${id_admin}/accepter`, 
            );
            recupererAdmin();
        } catch(error) {
            console.error("erreur pendant l'accetation d'admin", error);
        }
    }; 

    const refuser = async(id_admin) => {
        try {
            await api.put(`administrations/${id_admin}/refuser`);
            recupererAdmin();
        } catch(error) {
            console.error("erreur de refusion d'admin frontend", error);
        }
    };

    const deleteAdmin = async(id_admin) => {
        const confirmation = window.confirm("Voulez-vous vraiment supprimer cette admin?");
        if (!confirmation) {
            return;
        }
        try {
            await api.delete(
                `administrations/${id_admin}`
            );

            recupererAdmin();
        } catch (error) {
            console.error("Erreur de suppression admin dans frontend", error);
        }
    };
    
    useEffect (() => {
        recupererAdmin();
    }, []);

    
    return (
        <div className="application-container">
            <div className="header-application">
                <h2>Gestion des administrations</h2>
            </div>
            <div className="application-table">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Nom</th>
                            <th>Email</th>
                            <th>Statut</th>
                            <th>Date de demande</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {admins.length > 0 ? (
                            admins.map((admin) => (
                                <tr key={admin.id_admin}>
                                    <td>{admin.nom_admin}</td>
                                    <td>{admin.email_admin}</td>
                                    <td className={admin.statut_admin === "rejected"? 
                                    "rejeter" : 
                                    admin.statut_admin === "active"? "accepter" : "enattente"}>
                                        {admin.statut_admin === "pending"
                                        ?"En attente"
                                        : admin.statut_admin === "rejected"
                                            ?"Refusé"
                                            :"Accepté"
                                        }
                                    </td>
                                    <td>{formatDate(admin.date_creation)}</td>
                                    <td className={admin.statut_admin === "pending"? "non-vu" : "pending"}>
                                        <div >
                                            <div className="actions-buttons">
                                                    <button 
                                                        type="button" 
                                                        onClick={() => 
                                                            accepter(admin.id_admin)
                                                        }
                                                        className="action-button-accepter"
                                                        disabled={admin.statut_admin !== "pending"}
                                                    >
                                                        <Check />
                                                        <span>Accepter</span>
                                                    </button>
                                                    <button 
                                                        className="action-button-refuser" 
                                                        type="button" onClick={()=>
                                                        refuser(admin.id_admin)}
                                                        disabled={admin.statut_admin !== "pending"}
                                                    >
                                                            <X  />
                                                            <span>Refuser</span>
                                                    </button>

                                                <button className="action-button-supprimer" type="button" onClick={() => 
                                                    deleteAdmin(admin.id_admin)}
                                                >
                                                    <Trash2 />Supprimer
                                                </button>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ):(
                            <tr>
                                <td colSpan={5}>
                                    <center>Aucune administration pour le moment</center>
                                </td>
                                
                            </tr>
                        )}
                        
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default GestionAdministration;