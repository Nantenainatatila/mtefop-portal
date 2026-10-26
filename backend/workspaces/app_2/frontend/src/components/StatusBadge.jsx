export const STATUTS = {
  enregistre: ['Enregistré', 'gray'],
  en_cours: ['En cours', 'blue'],
  en_attente: ['En attente', 'orange'],
  transmis: ['Transmis', 'purple'],
  valide: ['Validé', 'green'],
  rejete: ['Rejeté', 'red'],
  cloture: ['Clôturé', 'dark'],
};
export const PRIORITES = { normale: 'Normale', urgente: 'Urgente', tres_urgente: 'Très urgente' };

export default function StatusBadge({ statut }) {
  const [label, color] = STATUTS[statut] || [statut, 'gray'];
  return <span className={`badge badge-${color}`}>{label}</span>;
}

export const fmtDate = (d) => (d ? new Date(d.replace(' ', 'T')).toLocaleDateString('fr-FR') : '—');
export const fmtDateTime = (d) => (d ? new Date(d.replace(' ', 'T')).toLocaleString('fr-FR') : '—');
