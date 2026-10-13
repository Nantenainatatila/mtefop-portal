export default function Pagination({ pagination, onChange }) {
  if (!pagination || pagination.pages <= 1) return null;
  const { page, pages, total } = pagination;
  return (
    <div className="pagination">
      <span className="muted">{total} résultat(s)</span>
      <div>
        <button className="btn btn-light" disabled={page <= 1} onClick={() => onChange(page - 1)}>← Précédent</button>
        <span className="page-info">Page {page} / {pages}</span>
        <button className="btn btn-light" disabled={page >= pages} onClick={() => onChange(page + 1)}>Suivant →</button>
      </div>
    </div>
  );
}
