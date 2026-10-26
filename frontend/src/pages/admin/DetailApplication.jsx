import "../admin/css admin/detailApplication.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { io } from "socket.io-client";
import {
    ArrowLeft,
    Eraser,
    ExternalLink,
    Pencil,
    RefreshCw,
    Rocket,
    Terminal,
    Trash2
} from "lucide-react";
import api from "../../../api/axios";

const SERVEUR = "http://localhost:5000";

const libelleStatut = (statut) => {
    if (statut === "online") return "En ligne";
    if (statut === "offline") return "Pas en ligne";
    return "Erreur";
};

const heureActuelle = () =>
    new Date().toLocaleTimeString("fr-FR", { hour12: false });

const recupererAdminConnecte = () => {
    try {
        return JSON.parse(localStorage.getItem("utilisateur"));
    } catch {
        return null;
    }
};

function DetailApplication() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [app, setApp] = useState(null);
    const [chargement, setChargement] = useState(true);
    const [erreur, setErreur] = useState("");

    const [logs, setLogs] = useState([]);
    const [enCours, setEnCours] = useState(false);
    const [suppressionEnCours, setSuppressionEnCours] = useState(false);

    // "deployer" | "redeployer" | "supprimer" | null
    const [confirmation, setConfirmation] = useState(null);

    const enCoursRef = useRef(false);
    const erreurSocketRef = useRef(false);
    const compteurLogRef = useRef(0);
    const logsRef = useRef(null);

    // ================= LOGS =================
    const ajouterLog = useCallback((message, niveau = "info") => {
        compteurLogRef.current += 1;
        const ligne = {
            id: compteurLogRef.current,
            heure: heureActuelle(),
            message,
            niveau
        };
        setLogs((precedents) => [...precedents, ligne]);
    }, []);

    // défilement automatique vers le dernier message
    useEffect(() => {
        if (logsRef.current) {
            logsRef.current.scrollTop = logsRef.current.scrollHeight;
        }
    }, [logs]);

    // ================= SOCKET =================
    useEffect(() => {
        const socket = io(SERVEUR);

        socket.on("deploy:progress", ({ message, etape }) => {
            // l'événement est diffusé à tous : on ne garde que
            // ce qui arrive pendant le déploiement lancé depuis cette page
            if (!enCoursRef.current) return;

            if (etape === -1) {
                erreurSocketRef.current = true;
                ajouterLog(message, "erreur");
            } else {
                ajouterLog(message, "info");
            }
        });

        return () => {
            socket.disconnect();
        };
    }, [ajouterLog]);

    // ================= CHARGEMENT =================
    const chargerApp = useCallback(async () => {
        try {
            const response = await api.get(`/applications/${id}`);
            setApp(response.data.donnee);
            setErreur("");
        } catch (error) {
            console.error("Erreur de recuperation de l'application", error);
            setErreur(
                error.response?.status === 404
                    ? "Application introuvable"
                    : "Impossible de charger l'application"
            );
        }
    }, [id]);

    const chargerDernierDeploiement = useCallback(async () => {
        try {
            const response = await api.get(`/deploiements/${id}`);
            const dep = response.data;
            if (!dep?.statut_deploie) return;

            ajouterLog(
                `Dernier déploiement : ${dep.statut_deploie}` +
                    (dep.message_deploie ? ` - ${dep.message_deploie}` : ""),
                dep.statut_deploie === "failed" ? "erreur" : "info"
            );
            if (dep.erreur_deploie) {
                ajouterLog(dep.erreur_deploie, "erreur");
            }
        } catch (error) {
            console.error("Erreur de recuperation du deploiement", error);
        }
    }, [id, ajouterLog]);

    useEffect(() => {
        setChargement(true);
        setLogs([]);
        Promise.all([chargerApp(), chargerDernierDeploiement()]).finally(() =>
            setChargement(false)
        );
    }, [chargerApp, chargerDernierDeploiement]);

    // ================= ACTIONS =================
    const lancerDeploiement = async (redeploiement) => {
        setConfirmation(null);
        setErreur("");

        const admin = recupererAdminConnecte();
        if (!admin?.id_admin) {
            setErreur("Session expirée, veuillez vous reconnecter");
            return;
        }

        setLogs([]);
        erreurSocketRef.current = false;
        enCoursRef.current = true;
        setEnCours(true);
        ajouterLog(
            redeploiement ? "Redéploiement lancé..." : "Déploiement lancé..."
        );

        try {
            const response = await api.get(
                `/deploiements/${id}/${admin.id_admin}`
            );
            ajouterLog(response.data.message, "succes");
            if (response.data.deploiement?.url) {
                ajouterLog(
                    `Application disponible : ${response.data.deploiement.url}`,
                    "succes"
                );
            }
        } catch (error) {
            console.error("Erreur de deploiement", error);
            // le backend a déjà envoyé l'erreur par socket dans la plupart des cas
            if (!erreurSocketRef.current) {
                ajouterLog(
                    `Erreur : ${
                        error.response?.data?.message || error.message
                    }`,
                    "erreur"
                );
            }
        } finally {
            enCoursRef.current = false;
            setEnCours(false);
            await chargerApp();
        }
    };

    const supprimerApp = async () => {
        setConfirmation(null);
        setSuppressionEnCours(true);
        setErreur("");
        try {
            await api.delete(`/applications/${id}`);
            navigate("/admin/application");
        } catch (error) {
            console.error("Erreur de suppression", error);
            setErreur(
                error.response?.data?.message ||
                    "Erreur lors de la suppression de l'application"
            );
            setSuppressionEnCours(false);
        }
    };

    const confirmerAction = () => {
        if (confirmation === "deployer") lancerDeploiement(false);
        else if (confirmation === "redeployer") lancerDeploiement(true);
        else if (confirmation === "supprimer") supprimerApp();
    };

    // ================= RENDU =================
    if (chargement) {
        return <div className="detail_application">Chargement...</div>;
    }

    if (!app) {
        return (
            <div className="detail_application">
                <p className="erreur">{erreur || "Application introuvable"}</p>
                <Link className="detail-btn detail-btn-retour" to="/admin/application">
                    <ArrowLeft size={18} /> Retour
                </Link>
                
            </div>
        );
    }

    const estDocker = app.type_app === "docker";
    const dejaDeploye =
        Boolean(app.date_dernier_deploiement) || app.statut_app !== "offline";
    const occupe = enCours || suppressionEnCours;

    const textesConfirmation = {
        deployer: {
            titre: "Déployer l'application",
            texte: `Lancer le déploiement de « ${app.nom_app} » ?`,
            bouton: "Déployer"
        },
        redeployer: {
            titre: "Redéployer l'application",
            texte: `Les conteneurs actuels de « ${app.nom_app} » seront remplacés par une nouvelle version. Continuer ?`,
            bouton: "Redéployer"
        },
        supprimer: {
            titre: "Supprimer l'application",
            texte: `« ${app.nom_app} » sera supprimée définitivement avec ses conteneurs, images, volumes et fichiers. Cette action est irréversible.`,
            bouton: "Supprimer"
        }
    };

    return (
        <div className="detail_application">
            {/* ---------- EN-TÊTE ---------- */}
            <div className="detail-header">
                <button onClick={() => navigate(-1)} className="detail-btn detail-btn-retour">
                     <ArrowLeft size={18} /> Retour
                </button>
                <div className="detail-actions">
                    {estDocker && (
                        <button
                            type="button"
                            className="detail-btn detail-btn-deployer"
                            disabled={occupe}
                            onClick={() =>
                                setConfirmation(
                                    dejaDeploye ? "redeployer" : "deployer"
                                )
                            }
                        >
                            {dejaDeploye ? (
                                <RefreshCw size={18} className={enCours ? "tourne" : ""} />
                            ) : (
                                <Rocket size={18} />
                            )}
                            {enCours
                                ? "En cours..."
                                : dejaDeploye
                                ? "Redéployer"
                                : "Déployer"}
                        </button>
                    )}

                    {occupe ? (
                        <button type="button" className="detail-btn detail-btn-modifier" disabled>
                            <Pencil size={18} /> Modifier
                        </button>
                    ) : (
                        <Link
                            className="detail-btn detail-btn-modifier"
                            to={`/admin/ajouterApplication/${id}`}
                        >
                            <Pencil size={18} /> Modifier
                        </Link>
                    )}

                    <button
                        type="button"
                        className="detail-btn detail-btn-supprimer"
                        disabled={occupe}
                        onClick={() => setConfirmation("supprimer")}
                    >
                        <Trash2 size={18} />
                        {suppressionEnCours ? "Suppression..." : "Supprimer"}
                    </button>
                </div>
            </div>

            {erreur && <p className="erreur">{erreur}</p>}

            {/* ---------- INFORMATIONS ---------- */}
            <div className="detail-carte">
                <div className="detail-titre">
                    {app.icone_app ? (
                        <img
                            className="detail-icone"
                            src={`${SERVEUR}/${app.icone_app}`}
                            alt={app.nom_app}
                        />
                    ) : (
                        <div className="detail-icone detail-icone-vide">
                            {app.nom_app?.charAt(0).toUpperCase()}
                        </div>
                    )}
                    <div>
                        <h2>{app.nom_app}</h2>
                        <span className={`detail-statut statut-${app.statut_app}`}>
                            {libelleStatut(app.statut_app)}
                        </span>
                    </div>
                </div>

                {app.description_app && (
                    <p className="detail-description">{app.description_app} </p>
                )}
                <div className="detail-info">
                        <span>Message</span>
                        <strong className={
                            app.statut_app !== 'online' 
                            ? 'couleur_rouge'
                            : ''}>{app.message_statut_app}
                        </strong>
                </div>

                <div className="detail-grille">
                     
                    <div className="detail-info">
                        <span>Nom du bouton</span>
                        <strong>{app.nom_bouton_app}</strong>
                    </div>
                    <div className="detail-info">
                        <span>Destination</span>
                        <strong>{app.nom_des}</strong>
                    </div>
                   
                    <div className="detail-info">
                        <span>Catégorie</span>
                        <strong>{app.nom_cat}</strong>
                    </div>
                    <div className="detail-info">
                        <span>Type</span>
                        <strong>
                            {estDocker ? "Application à déployer" : "Application externe (URL)"}
                        </strong>
                    </div>

                    {estDocker ? (
                        <>
                            <div className="detail-info">
                                <span>Base de données</span>
                                <strong>{app.moteur_db || "aucune"}</strong>
                            </div>
                            <div className="detail-info">
                                <span>Frontend</span>
                                <strong>{app.frontend_technologie_app || "-"}</strong>
                            </div>
                            <div className="detail-info">
                                <span>Backend</span>
                                <strong>{app.backend_technologie_app || "-"}</strong>
                            </div>
                            <div className="detail-info">
                                <span>Version</span>
                                <strong>{app.version_app || "-"}</strong>
                            </div>
                            <div className="detail-info">
                                <span>Port</span>
                                <strong>{app.port_app || "-"}</strong>
                            </div>
                            <div className="detail-info">
                                <span>Dernier déploiement</span>
                                <strong>
                                    {app.date_dernier_deploiement
                                        ? new Date(app.date_dernier_deploiement).toLocaleString("fr-FR")
                                        : "Jamais déployée"}
                                </strong>
                            </div>
                        </>
                    ) : null}

                    {(app.url_publique_app || app.url_app) && (
                        <div className="detail-info detail-info-large">
                            <span>URL</span>
                            <a
                                href={estDocker ? app.url_publique_app : app.url_app}
                                target="_blank"
                                rel="noreferrer"
                            >
                                {estDocker ? app.url_publique_app : app.url_app}
                                <ExternalLink size={14} />
                            </a>
                        </div>
                    )}
                </div>
            </div>

            {/* ---------- FENÊTRE DE LOGS ---------- */}
            {estDocker && (
                <div className="detail-logs">
                    <div className="detail-logs-entete">
                        <span>
                            <Terminal size={16} /> Logs de déploiement
                            {enCours && <em className="logs-live"> ● en direct</em>}
                        </span>
                        <button
                            type="button"
                            className="logs-vider"
                            disabled={enCours || logs.length === 0}
                            onClick={() => setLogs([])}
                        >
                            <Eraser size={14} /> Vider
                        </button>
                    </div>

                    <div className="detail-logs-corps" ref={logsRef}>
                        {logs.length === 0 ? (
                            <p className="log-vide">
                                Aucun log. Lancez un déploiement pour suivre sa progression.
                            </p>
                        ) : (
                            logs.map((ligne) => (
                                <div key={ligne.id} className={`log-ligne log-${ligne.niveau}`}>
                                    <span className="log-heure">[{ligne.heure}]</span>
                                    <span className="log-message">{ligne.message}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* ---------- CONFIRMATION ---------- */}
            {confirmation && (
                <div className="detail-overlay" onClick={() => setConfirmation(null)}>
                    <div className="detail-modal" onClick={(e) => e.stopPropagation()}>
                        <h3>{textesConfirmation[confirmation].titre}</h3>
                        <p>{textesConfirmation[confirmation].texte}</p>
                        <div className="detail-modal-actions">
                            <button
                                type="button"
                                className="detail-btn detail-btn-retour"
                                onClick={() => setConfirmation(null)}
                            >
                                Annuler
                            </button>
                            <button
                                type="button"
                                className={`detail-btn ${
                                    confirmation === "supprimer"
                                        ? "detail-btn-supprimer"
                                        : "detail-btn-deployer"
                                }`}
                                onClick={confirmerAction}
                            >
                                {textesConfirmation[confirmation].bouton}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default DetailApplication;