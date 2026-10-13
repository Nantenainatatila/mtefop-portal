# Backend - Gestion des congés MTEFOP

API REST Node.js / Express / MySQL.

## Démarrage

```bash
# 1. Créer la base (script SQL fourni séparément)
sudo -u postgres psql -d gestion_conges_mtefop -f gestion_conges_mtefop_postgres.sql

# 2. Installer et configurer
npm install
cp .env.example .env      # puis éditer DB_* et JWT_SECRET

# 3. Générer un hash de mot de passe pour les comptes de démonstration
node -e "console.log(require('bcryptjs').hashSync('MonMotDePasse123', 10))"
#    -> remplacer les '$2y$10$A_REMPLACER_PAR_UN_HASH' dans la table utilisateurs

# 4. Lancer
npm run dev               # ou npm start
```

Test : `GET http://localhost:5000/health`

## Structure

```
server.js              démarrage, arrêt propre
app.js                 middlewares globaux, montage des routes
config/                env, pool MySQL, constantes (rôles, statuts)
middlewares/           auth (JWT), authorize (rôles), validate, rateLimiter, errorHandler
controllers/           logique métier
routes/                endpoints + règles de validation
utils/                 ApiError, asyncHandler, audit, notify, scope (périmètre par rôle)
```

## Endpoints (préfixe /api, JWT requis sauf login)

| Méthode | Route | Rôles |
|---|---|---|
| POST | /auth/login | public |
| GET | /auth/me | tous |
| PUT | /auth/mot-de-passe | tous |
| GET | /dashboard | tous (filtré par périmètre) |
| GET | /employes | ADMIN, RH, DIRECTEUR, CHEF_SERVICE |
| GET | /employes/:id | selon périmètre |
| POST | /employes | ADMIN, RH |
| PUT | /employes/:id | ADMIN, RH |
| PATCH | /employes/:id/desactiver, /reactiver | ADMIN, RH |
| PUT | /employes/:id/compte | ADMIN |
| GET | /demandes/mes-demandes | tous |
| GET | /demandes/a-valider | ADMIN, RH, DIRECTEUR, CHEF_SERVICE |
| GET | /demandes/planning?debut=&fin= | tous (filtré) |
| GET | /demandes | ADMIN, RH, DIRECTEUR, CHEF_SERVICE |
| POST | /demandes | tous |
| GET | /demandes/:id | propriétaire, valideurs, périmètre |
| POST | /demandes/:id/decision | valideurs (`{decision:"APPROUVE"|"REFUSE", commentaire}`) |
| PATCH | /demandes/:id/annuler | propriétaire, RH |
| GET | /soldes/mes-soldes?annee= | tous |
| GET | /soldes/employe/:id | selon périmètre |
| POST | /soldes/initialiser | ADMIN, RH |
| PUT | /soldes/:id | ADMIN, RH |
| GET/POST/PUT/DELETE | /types-conges | lecture tous, écriture ADMIN/RH |
| GET/POST/PUT/DELETE | /jours-feries | lecture tous, écriture ADMIN/RH |
| GET/POST/PUT | /structure/directions, /services, /postes | lecture tous, écriture ADMIN/RH |
| GET/PATCH | /notifications | tous |

## Règles métier appliquées

- Calcul des jours via la fonction SQL `fn_jours_ouvrables` (hors week-ends et fériés) ou jours calendaires selon le type.
- Contrôles : chevauchement, solde (en tenant compte des demandes en attente), durée max, sexe requis, justificatif.
- Circuit de validation : niveau 1 = supérieur direct, niveau 3 = RH. Nul ne valide sa propre demande.
- Le solde est décompté / restitué par les triggers SQL (approbation / annulation).
- Chaque action sensible est écrite dans `journal_audit`.

## Exemple

```bash
curl -X POST localhost:5000/api/auth/login -H "Content-Type: application/json" \
  -d '{"login":"miora","mot_de_passe":"MonMotDePasse123"}'

curl -X POST localhost:5000/api/demandes -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
  -d '{"id_type":1,"date_debut":"2026-12-21","date_fin":"2026-12-31","motif":"Fin d année"}'
```
