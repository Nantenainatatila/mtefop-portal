import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Mail,
    Lock,
    LogIn,
    Eye,
    EyeOff
} from "lucide-react";
import { Link } from "react-router-dom";
import "./css admin/Login.css";
import api from "../../../api/axios";


function Login() {
    const [erreur, setErreur] = useState("");
    const [motDePasseVisible, setMotDePasseVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const [email_admin, setEmailAdmin] = useState("");
    const [password_admin, setPasswordAdmin] = useState("");
    const navigate = useNavigate();

    
    const handleSubmit = async (e) => {
        e.preventDefault();
        setErreur("");
        setLoading(true);

        try {
            if (!email_admin || !password_admin) {
                return (setErreur("Tous les champs sont obligatoires"));
            }
            console.log("email:", email_admin);
            
            const response = await api.post("/auth/login", {
                email_admin,
                password_admin
            });
            const donnee = response.data;

            

            localStorage.setItem("token", donnee.token);
            localStorage.setItem("utilisateur", JSON.stringify(donnee.utilisateur));
            
            console.log("token et utilisateur:", donnee.token, donnee.utilisateur);
            
            navigate("/admin");

        } catch (error) {
              setErreur(
                error.response?.data?.message || "Erreur total dans le serveur"
            );
        } finally {
            setLoading(false);
        }
    }
    return (
        <div className="login-page">

            <div className="login-card">

                {/* =========================
                    LOGO / TITRE
                ========================= */}
                <div className="login-header">

                    <div className="login-logo">
                        MTEFOP
                    </div>

                    <h1>
                        Administration
                    </h1>

                    <p>
                        Connectez-vous à votre espace administrateur
                    </p>

                </div>


                {/* =========================
                    FORMULAIRE
                ========================= */}
                <form className="login-form" onSubmit={handleSubmit}>

                    {/* EMAIL */}
                    <div className="input-group">

                        <Mail className="input-icon" size={20} />

                        <input
                            type="email"
                            id="email"
                            value={email_admin}
                            placeholder=" "
                            autoComplete="email"
                            onChange={(e) => setEmailAdmin(e.target.value)}
                        />

                        <label htmlFor="email">
                            Adresse e-mail
                        </label>

                    </div>


                    {/* MOT DE PASSE */}
                    <div className="input-group">

                        <Lock className="input-icon" size={20} />

                        <input
                            type={motDePasseVisible ? "text" : "password"}
                            id="password"
                            placeholder=" "
                            value={password_admin}
                            autoComplete="current-password"
                            onChange={(e) => setPasswordAdmin(e.target.value)}
                        />

                        <label htmlFor="password">
                            Mot de passe
                        </label>


                        {/* AFFICHER / MASQUER */}
                        <button
                            type="button"
                            className="password-toggle"
                            onClick={() =>
                                setMotDePasseVisible(!motDePasseVisible)
                            }
                            aria-label={
                                motDePasseVisible
                                    ? "Masquer le mot de passe"
                                    : "Afficher le mot de passe"
                            }
                        >
                            {motDePasseVisible ? (
                                <EyeOff size={19} />
                            ) : (
                                <Eye size={19} />
                            )}
                        </button>

                    </div>
                
                    
                    {erreur && (
                        <div className="login-erreur">
                            {erreur}
                        </div>
                    )}

                    {/* =========================
                        BOUTON CONNEXION
                    ========================= */}
                    <button
                        type="submit"
                        className="login-button"
                        disabled={loading}
                    >
                        <LogIn size={20} />

                        {loading? (
                            <span>
                                Connection...
                            </span>
                        ) : (
                            <span>
                                Se connecter
                            </span>
                        )}
                        
                    </button>

                </form>
                
                
                <div className="login-link">
                    <p>Vous n'avez pas encore un compte? <Link to="/admin/demandeCompte">Creer un compte</Link></p>
                </div>

            </div>

        </div>
    );
}

export default Login;