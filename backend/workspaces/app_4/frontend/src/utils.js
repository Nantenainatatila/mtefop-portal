// Petites fonctions utiles dans toute l'application

// 45000000 -> "45 000 000 Ar"
export function formatAriary(montant) {
  return `${new Intl.NumberFormat('fr-FR').format(Number(montant) || 0)} Ar`;
}

// Date lisible : "14/10/2026 11:37"
export function formatDate(date) {
  return new Date(date).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}

// Libellés des statuts de commande
export const STATUTS = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  delivered: 'Livrée',
  cancelled: 'Annulée',
};
