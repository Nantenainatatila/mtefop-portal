export const ROLES = { ADMIN: 'ADMIN', RH: 'RH', DIRECTEUR: 'DIRECTEUR', CHEF_SERVICE: 'CHEF_SERVICE', EMPLOYE: 'EMPLOYE' };
export const MANAGERS = [ROLES.ADMIN, ROLES.RH, ROLES.DIRECTEUR, ROLES.CHEF_SERVICE];
export const RH_ROLES = [ROLES.ADMIN, ROLES.RH];

export const ROLE_LABEL = {
  ADMIN: 'Administrateur', RH: 'Ressources humaines', DIRECTEUR: 'Directeur',
  CHEF_SERVICE: 'Chef de service', EMPLOYE: 'Employé',
};
export const STATUT_LABEL = {
  BROUILLON: 'Brouillon', EN_ATTENTE: 'En attente', APPROUVE: 'Approuvé', REFUSE: 'Refusé', ANNULE: 'Annulé',
};
export const STATUT_EMPLOYE = ['FONCTIONNAIRE', 'ECD', 'EFA', 'STAGIAIRE'];
export const MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
