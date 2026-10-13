// Affichage standard des états de chargement / erreur / vide
export function Loading() { return <div className="state">Chargement…</div>; }
export function ErrorBox({ message }) { return <div className="alert alert-error">{message}</div>; }
export function Empty({ children = 'Aucune donnée à afficher.' }) { return <div className="state muted">{children}</div>; }
