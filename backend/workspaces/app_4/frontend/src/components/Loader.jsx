// Chargement de page : à afficher pendant qu'on attend les données
export default function Loader({ text = 'Chargement...' }) {
  return (
    <div className="page-loader">
      <span className="spinner" />
      <p>{text}</p>
    </div>
  );
}
