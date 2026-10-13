import { useEffect, useState } from "react";

const carte = {
    background: "#fff",
    borderRadius: 10,
    padding: 16,
    marginTop: 16,
    boxShadow: "0 1px 4px rgba(0,0,0,.12)"
};

function Bloc({ titre, donnees }) {
    const ok = donnees && (donnees.statut === "ok" || donnees.connecte || (donnees.message && donnees.node));
    return (
        <div style={carte}>
            <h3 style={{ margin: 0 }}>
                {ok ? "✅" : "⚠️"} {titre}
            </h3>
            <pre style={{ whiteSpace: "pre-wrap", fontSize: 13 }}>
                {JSON.stringify(donnees, null, 2)}
            </pre>
        </div>
    );
}

export default function App() {
    const [hello, setHello] = useState({ etat: "chargement..." });
    const [db, setDb] = useState({ etat: "chargement..." });

    const charger = (url, setter) =>
        fetch(url)
            .then((r) => r.json())
            .then(setter)
            .catch((e) => setter({ erreur: e.message }));

    useEffect(() => {
        charger("/api/hello", setHello);
        charger("/api/db", setDb);
    }, []);

    return (
        <div
            style={{
                fontFamily: "system-ui, sans-serif",
                background: "#f2f4f8",
                minHeight: "100vh",
                padding: 24
            }}
        >
            <div style={{ maxWidth: 640, margin: "0 auto" }}>
                <h1>Application de test MTEFOP</h1>
                <p>React (frontend) + Node.js/Express (backend) + base de données.</p>
                <Bloc titre="Backend (/api/hello)" donnees={hello} />
                <Bloc titre="Base de données (/api/db)" donnees={db} />
            </div>
        </div>
    );
}
