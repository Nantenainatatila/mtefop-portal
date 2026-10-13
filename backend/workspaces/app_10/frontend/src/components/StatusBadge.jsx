import { STATUT_LABEL } from '../utils/constants';

export default function StatusBadge({ statut }) {
  return <span className={`badge badge-${statut}`}>{STATUT_LABEL[statut] || statut}</span>;
}
