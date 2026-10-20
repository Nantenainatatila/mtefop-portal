// Bouton vert avec petit chargement : <Button loading={enCours}>Envoyer</Button>
// Pendant le chargement, le bouton est désactivé et affiche une roue qui tourne.
export default function Button({ loading = false, disabled = false, className = '', children, ...props }) {
  return (
    <button className={`btn ${className}`} disabled={loading || disabled} {...props}>
      {loading && <span className="spinner spinner-sm" />}
      <span>{children}</span>
    </button>
  );
}
