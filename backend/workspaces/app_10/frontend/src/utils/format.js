// Les dates arrivent du backend en texte (YYYY-MM-DD) : on évite new Date() pour ne pas décaler les jours
export const fmtDate = (s) => (s ? s.slice(0, 10).split('-').reverse().join('/') : '—');
export const fmtDateTime = (s) => (s ? `${fmtDate(s)} ${s.slice(11, 16)}` : '—');
export const fmtNum = (n) => Number(n ?? 0).toLocaleString('fr-FR', { maximumFractionDigits: 1 });
export const today = () => new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD en heure locale
export const pad = (n) => String(n).padStart(2, '0');
export const nomComplet = (e) => `${e.nom ?? ''} ${e.prenom ?? ''}`.trim();
