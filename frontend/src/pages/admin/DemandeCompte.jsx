import {
    User,
    LockKeyhole,
    UserPlus,
    Mail,
    Lock,
    EyeOff,
    Eye,
    LogIn
} from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import api from "../../../api/axios";

function DemmandeCompte() {
    const [motDePasseVisible, setMotDePasseVisible] = useState(false);
    const [motDePasseVisible2, setMotDePasseVisible2] = useState(false);
    const [nom_admin, setNomAdmin] = useState("");
    const [email_admin, setEmailAdmin] = useState("");
    const [password_admin, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [erreur, setErreur] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const emailRegex =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const demandeCompte = async(e) => {
        e.preventDefault();
        setLoading(true);
        setErreur("");
        setMessage("");

        try {
            if (!nom_admin || !email_admin || !password_admin || !confirmPassword) {
                return setErreur("Veuiller remplir tous les champs");
            }
            if (!emailRegex.test(email_admin)) {
            setErreur(
                "Veuillez saisir une adresse e-mail valide, par exemple : nom@gmail.com"
            );
            return;
        }
            if (password_admin !== confirmPassword) {
                return setErreur("Desolé,Les deux mot de passe sont differents");
            }

            const response = await api.post("/register",
                {
                   nom_admin,email_admin,password_admin
                }
            );

            console.log("demande envoyé");
            setMessage(response.data.message);
            setEmailAdmin("");
            setNomAdmin("");
            setConfirmPassword("");
            setPassword("");
        } catch (error) {
            console.error("Erreur de creation de compte dans frontend");
            setErreur(error.response?.data?.message || "Erreur dans le serveur");

        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="login-header">
                    <div className="login-logo">
                        MTEFOP
                    </div>
                    <h1>Administration</h1>
                    <p>Après creation de compte, vous-devez attendre que le super-admin accepte votre demande</p>
                </div>

                <form className="login-form" >
                    <div className="input-group">
                        <User className="input-icon" size={20} />

                        <input 
                            type="text"
                            id="nom_admin"
                            placeholder=" "
                            autoComplete="text"
                            value={nom_admin}
                            onChange={(e) => setNomAdmin(e.target.value)}
                        />
                        <label htmlFor="nom_admin">Nom d'administrateur</label>
                    </div>

                    <div className="input-group">
                        <Mail className="input-icon" size={20}/>
                        <input 
                            type="email"
                            id="email"
                            placeholder="email"
                            value={email_admin}
                            required
                            onChange={(e) => setEmailAdmin(e.target.value)}
                        />
                        <label htmlFor="email">E-mail d'administrateur</label>
                    </div>

                    <div className="input-group">
                        <Lock className="input-icon" size={20}/>
                        <input 
                            type={motDePasseVisible? "text" : "password"}
                            placeholder=" "
                            id="password"
                            value={password_admin}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <label htmlFor="password">
                            Mot de passe
                        </label>

                        <button 
                            type="button"
                            className="password-toggle"
                            onClick={() => setMotDePasseVisible(!motDePasseVisible)}
                        >
                            {!motDePasseVisible? (
                                    <Eye className="input-icon" size={20} /> 
                                ) : (
                                    <EyeOff className="input-icon" size={20} />
                                )}
                        </button>
                    </div>
                    <div className="input-group">
                        <LockKeyhole className="input-icon" size={20}/>

                        <input 
                            type={motDePasseVisible2? "text" : "password"}
                            id="confirmPassword"
                            placeholder=" "
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                        <label htmlFor="">Confirmer le mot de passe</label>

                        <button
                            type="button"
                            className="password-toggle"
                            onClick={() => setMotDePasseVisible2(!motDePasseVisible2)}
                        >
                            {motDePasseVisible2? (
                                <EyeOff className="input-icon" size={20}/> 
                                ) : (<Eye className="input-icon" size={20} />
                            )}
                        </button>

                    </div>

                    {erreur && (
                            <div className="login-erreur">
                                {erreur}
                            </div>
                        )}
                    {message && (
                        <div className="login-message">
                                {message}
                        </div>
                    )}
                        
                    <button type="submit" className="login-button" onClick={demandeCompte}>
                        {loading? (
                            <span>Creation en cours...</span>
                        ): (
                            <>
                                <UserPlus size={20} />
                                <span>Creer un compte</span>
                            </>
                        )}
                            
                    </button>
                </form>
                <div className="login-link">
                    <p>Vous-avez deja un compte? <Link to="/admin/login">Se connecter</Link></p>
                </div>
            </div>
        </div>
    );
}
export default DemmandeCompte;