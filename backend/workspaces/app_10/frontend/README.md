# Frontend - Gestion des congés MTEFOP

Application React (Vite) qui consomme l'API `backend-conges-mtefop`.

## Démarrage

```bash
npm install
cp .env.example .env     # optionnel en développement
npm run dev              # http://localhost:3000
```

Le backend doit tourner sur http://localhost:5000 (le proxy Vite redirige `/api` vers lui, donc aucun problème CORS en développement).

## Production

```bash
# .env : VITE_API_URL=https://votre-domaine/api
npm run build            # génère le dossier dist/
```
Servez `dist/` avec Nginx/Apache (avec redirection de toutes les routes vers index.html) et mettez l'URL du frontend dans `CORS_ORIGIN` du backend.

## Pages

| Page | Rôles |
|---|---|
| Connexion, Tableau de bord, Nouvelle demande, Mes demandes, Détail demande, Planning, Soldes, Notifications, Profil | tous |
| À valider, Toutes les demandes, Employés (consultation) | ADMIN, RH, DIRECTEUR, CHEF_SERVICE |
| Employés (création, modification, désactivation), ouverture des soldes, ajustement | ADMIN, RH |
| Gestion des comptes utilisateurs | ADMIN |
| Paramètres (types de congés, jours fériés, directions, services, postes) | ADMIN, RH |

## Structure

```
src/
  api/client.js          axios + token JWT + gestion des erreurs
  context/               AuthContext (connexion, rôles)
  hooks/useApi.js        chargement de données
  components/            Layout, Modal, Toast, DecisionForm, Pagination…
  pages/                 une page par écran (+ pages/parametres/)
  styles.css             thème
```
