import "../admin/css admin/ajouterApp.css";
import { useNavigate, Link, useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import api from "../../../api/axios";
import { FileArchive } from "lucide-react";


function AjouterApplication () {
    const navigate = useNavigate();

    const {id} = useParams();
    const ModeModification = Boolean(id);


    const [categories, setCategories] = useState([]);
    const [iconeApp, setIconeApp] = useState(null);
    const [fichierApp, setFichierApp] = useState(null);
    

    const [formData, setFormData] = useState({
        id_cat: "",
        nom_app: "",
        nom_bouton_app: "",
        description_app: "",
        type_app: "",
        url_app: "",
        moteur_db: ""
    });
    
    const [erreur, setErreur] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");


    const chargerCat = async() => {
        try {
            const result = await api.get("/administrations/categories");
            setCategories(result.data);
            
        } catch (error) {
            console.log("erreur de recuperation de cathegories dans react", error);
            setErreur("Une erreur est survenue dans le serveur");
        }
    };

    useEffect(() => {
        if(!id) {
            setFormData({
                id_cat: "",
                nom_app: "",
                nom_bouton_app: "",
                description_app: "",
                type_app: "",
                url_app: "",
                moteur_db: ""
            });
            setCategories([]);
            setIconeApp(null);
            setFichierApp(null);
            chargerCat();
        } else {
            
            api.get(`applications/${id}`)
            .then(response => {
                const donnee = response.data;
                setFormData({
                    id_cat: donnee.donnee.id_cat,
                    nom_app: donnee.donnee.nom_app,
                    nom_bouton_app: donnee.donnee.nom_bouton_app,
                    description_app: donnee.donnee.description_app,
                    type_app: donnee.donnee.type_app,
                    url_app: donnee.donnee.url_app,
                    moteur_db: donnee.donnee.moteur_db
                });
            })
            .catch (error => {
                console.error("erreur de recuperation app par id", error);
            });
        }
        
            
    },[id]);

    const handleChange = (e) => {
        const {name, value , type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === "checkbox"
                ? checked
                : value
        });
    };

    const handleFichierChange = (e) => {
        const fichier = e.target.files[0];
        if (!fichier) {
            setFichierApp(null);
            return;
        }

        if (!fichier.name
            .toLowerCase()
            .endsWith(".zip")
        ) {
            setErreur("Le fichier de l'application doit etre au format zip");
            e.target.value = "";
            setFichierApp(null);
            return;
        }

        setErreur("");
        setFichierApp(fichier);
    };

    const handleIconeChange = (e) => {
        const fichier = e.target.files[0];
        if (!fichier) {
            setIconeApp(null);
            return;
        }
        const typesAutorises = [
            "image/png",
            "image/jpeg",
            "image/jpg",
            "image/webp",
            "image/svg+xml"
        ];

        if (!typesAutorises.includes(fichier.type)) {
            setErreur("L'icône doit être une image PNG, JPG, JPEG, WEBP ou SVG");
            e.target.value = "";
            setIconeApp(null);
            return;
        }

        setErreur("");
        setIconeApp(fichier);

    };
    

    const enregistrerApp = async(e) => {
        e.preventDefault();
        setErreur("");
        setMessage("");
        setLoading(true);

            try {
                if (!formData.nom_app.trim()) {
               setErreur("Veuiller remplir le champ nom d'application");
                    setLoading(false);
                    return;
                }
            
                if (!formData.nom_bouton_app.trim()) {
                    setErreur("Veuiller remplir le champ nom du bouton");
                    setLoading(false);
                    return;
                }


                if (!formData.id_cat) {
                    setErreur("Veuiller selectionner la cathegorie");
                    setLoading(false);
                    return;
                }

                if (!formData.type_app) {
                    setErreur("Veuiller selectionner le type d'application");
                    setLoading(false);
                    return;
                }

            
                if (formData.type_app === "docker" && !fichierApp) {
                    setErreur("Veuiller selectionner le fichier ZIP de l'application");
                    setLoading(false);
                    return;
                }

                if(formData.type_app === "url" && !formData.url_app.trim()) {
                    setErreur("Veuiller remplir l'url de l'application");
                    setLoading(false);
                    return;
                }

                // ===============FORM DATA ================
                const data = new FormData();

                data.append("id_cat", formData.id_cat);
                data.append("nom_app", formData.nom_app);
                data.append("nom_bouton_app", formData.nom_bouton_app);
                data.append("description_app", formData.description_app);
                data.append("type_app", formData.type_app);
                data.append("url_app", formData.url_app);
                data.append("moteur_db", formData.moteur_db);

                if (fichierApp) {
                    data.append("fichier_app", fichierApp);
                }
                if (iconeApp) {
                    data.append("icone_app", iconeApp);
                }    
                
                // CHOIX

                if (ModeModification) {
                    const response1 = await api.put(`applications/${id}`, data);
                    setMessage(response1.data.message);
                    navigate(`/admin/application/${id}`);

                } else {
                //================API=========================
                    const response2 = await api.post("/applications", data);
                    setMessage(response2.data.message);
                }
                setErreur("");
                setFormData({
                    id_cat: "",
                    nom_app: "",
                    nom_bouton_app: "",
                    description_app: "",
                    type_app: "",
                    url_app: "",
                    moteur_db: ""
                });
                setIconeApp(null);
                setFichierApp(null);
                
            
        } catch (error) {
            console.error("Erreur d'enregistrement d'application frontend", error);
            setErreur(error.response?.data?.message || "Erreur total dans le serveur");
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        chargerCat(); 
    }, []);

    return (
        <div className="app-page">
        
                <form className="ajout-form">
                    
                    <div className="container">
                        <div className="ajout-header"><br />
                            <h3>{ModeModification? "Modifier une application" : "Ajouter une application"}</h3>
                        </div>
                        <div className="box">
                            <div className="container1">
                                
                                <div className="input-group-ajout">
                                    <div className="label">
                                        <label htmlFor="">Nom d'application: </label>
                                    </div>
                                    <div>
                                        <input 
                                            type="text"
                                            name="nom_app"
                                            placeholder=" Nom d'application"
                                            value={formData.nom_app}
                                            onChange={handleChange}
                                        />
                                    </div>
                                    
                                </div>
                                <div className="input-group-ajout">
                                    <div className="label">
                                        <label htmlFor="">Nom de bouton: </label>
                                    </div>
                                    
                                    <input 
                                        type="text"
                                        name="nom_bouton_app"
                                        placeholder="Nom du bouton"
                                        value={formData.nom_bouton_app}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div className="input-group-ajout">
                                    <div className="label">
                                        <label htmlFor="">Description: </label>
                                    </div>
                                    
                                    <textarea 
                                        type="text"
                                        placeholder="Description" 
                                        name="description_app"
                                        value={formData.description_app}
                                        onChange={handleChange}
                                        rows={4}
                                    />
                                </div>
                                <div className="input-group-ajout1">
                                    <div className="label">
                                        <FileArchive size={25}/>
                                        <label htmlFor="">Icone: </label>
                                    </div>
                                
                                    <input 
                                        type="file"
                                        accept=".png,.jpg,.jpeg,.webp,.svg"
                                        onChange={handleIconeChange}
                                    />
                                    {iconeApp && (
                                            <p>
                                                icone selectionnée:
                                                {" "}
                                                {iconeApp.name}
                                            </p>
                                        )}
                                    
                                </div>
                            </div>

                            <div className="container1">
                                <div className="input-group-ajout">
                                    <div className="label">
                                        <label htmlFor="">Cathegogie: </label>
                                    </div>
                                    
                                    <select name="id_cat" value={formData.id_cat} onChange={handleChange}>
                                        <option value="">-- Choisir la cathegorie  -- </option>
                                        {categories.map((cat) => (
                                        <option key={cat.id_cat} value={cat.id_cat} >{cat.nom_cat}</option>
                                        ))}
                                    </select>
                                </div>
                                
                                <div className="input-group-ajout">
                                    <div className="label">
                                        <label htmlFor="">Type d'application: </label>
                                    </div>
                                    
                                        <select 
                                            value={formData.type_app}
                                            name="type_app"
                                            onChange={handleChange}
                                        >   <option value="">-- Choisir son type --</option>
                                            <option value="docker">Application à deployer</option>
                                            <option value="url">Application externe URL</option>
                                        </select>
                                </div>

                                {formData.type_app === "url" && (
                                    
                                        <div className="input-group-ajout">
                                            <div className="label">
                                                <label htmlFor="">URL d'application: </label>
                                            </div>
                                            
                                            <input 
                                                type="url" 
                                                id="url_app"
                                                name="url_app"
                                                placeholder="URL de l'application"
                                                value={formData.url_app}
                                                onChange={handleChange}
                                            />
                                        </div>
                                    
                                )}

                                {formData.type_app == "docker" && (
                                    <div>
                                        <div className="input-group-ajout">
                                            <div className="label">
                                                <label htmlFor="">Base des donnés</label>
                                            </div>
                                            <select 
                                                name="moteur_db" 
                                                value={formData.moteur_db}
                                                onChange={handleChange}
                                            >
                                                <option value="">--Base des données--</option>
                                                <option value="aucune">Aucune base</option>
                                                <option value="postgresql">PostgresSQL</option>
                                                <option value="mysql">MySQL</option>
                                                <option value="mariadb">MariaDB</option>
                                                
                                            </select>
                                        </div>
                                        <div className="input-group-ajout1">
                                            <div className="label">
                                                <FileArchive size={25}/>
                                                <label htmlFor="" >Fichier ZIP: </label>
                                            </div>
                                            
                                            <input 
                                                type="file" 
                                                accept=".zip"
                                                onChange={handleFichierChange}
                                            />
                                        
                                            
                                        
                                    
                                                {fichierApp && (
                                                        <p>
                                                            Fichier selectionné:
                                                            {" "}
                                                            {fichierApp.name}
                                                        </p>
                                                    )}
                                        </div>
                                        
                                    </div>
                                    
                                )}
                            </div>
                        </div>
                        <div className="erreur-message">
                            {erreur? (
                                <p>{erreur}</p>
                            ): (<p className="message">{message}</p>)}
                    </div>
                    <div className="button">
                        <div className="button1">
                            {loading? (
                                <button className="ajout-button" type="submit" disabled>
                                    <span>Enregistrement...</span>
                                </button>
                            ): (
                                <button className="ajout-button" type="submit" onClick={enregistrerApp}>
                                    <span>{ModeModification? "Enregistrer la modification": "Enregistrer"}</span>
                                </button>
                            )}
                            <Link 
                                className="button-retour" 
                                to={ModeModification?`/admin/application/${id}`: "/admin/application"}
                            >
                                    Retour
                            </Link>
                        </div>
                        
                    </div>
                    </div>
                       
                </form>
            
        </div>
    );
}
export default AjouterApplication;