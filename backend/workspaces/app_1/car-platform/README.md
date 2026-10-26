# AutoMada – Plateforme e-commerce de voitures

Projet complet pour débutants : **Node.js + Express** (API REST), **React + Vite** (interface) et **PostgreSQL** (base de données). Les prix sont en **Ariary (Ar)**.

## Fonctionnalités

**Visiteur / public**
- Voir le fil des voitures (marque, prix, image), rechercher et filtrer par marque
- Voir le détail d’une voiture et ses commentaires
- Créer son profil (l’image de profil est **facultative**)

**Client connecté**
- Liker une voiture, commenter, commander
- Suivre ses commandes et **discuter avec l’admin** à propos de chaque commande
- Modifier son profil

**Admin** (il ne commande pas)
- Publier une voiture avec image, prix, marque, année et description (ou la supprimer)
- Recevoir une **notification** à chaque commande ou message client (badge dans le menu)
- Boîte de commandes : changer le statut (en attente, confirmée, livrée, annulée) et discuter avec le client
- **Tableau de bord** : voitures les plus commandées, les plus likées, les plus commentées, commandes par statut

**Design** : adapté au téléphone (menu en bas), fond blanc, vert comme seule couleur (boutons), l’écran est rempli sur grand écran. Chargement à chaque page, et petite roue de chargement dans les boutons.

---

## Ce qu’il faut installer

- [Node.js](https://nodejs.org) 18 ou plus récent
- [PostgreSQL](https://www.postgresql.org/download/) 13 ou plus récent

## Installation (4 étapes)

### 1. Créer la base de données

```bash
createdb -U postgres car_platform
psql -U postgres -d car_platform -f database/car_platform.sql
```

(Sous Windows, vous pouvez aussi utiliser pgAdmin : créer une base `car_platform`, puis exécuter le fichier `database/car_platform.sql` dans l’outil « Query Tool ».)

### 2. Lancer le backend (API)

```bash
cd backend
cp .env.example .env        # puis ouvrez .env et mettez votre mot de passe PostgreSQL
npm install
npm run dev
```

L’API démarre sur http://localhost:5000 (test : http://localhost:5000/api/health).

Dans `.env`, la ligne importante est :
```
DATABASE_URL=postgresql://UTILISATEUR:MOTDEPASSE@localhost:5432/car_platform
```

### 3. Lancer le frontend

Dans un **deuxième terminal** :

```bash
cd frontend
npm install
npm run dev
```

Ouvrez http://localhost:5173

### 4. Se connecter

| Rôle   | Email           | Mot de passe |
|--------|-----------------|--------------|
| Admin  | admin@car.mg    | admin123     |
| Client | client@car.mg   | client123    |

Vous pouvez aussi créer un nouveau client avec « S’inscrire ». **Changez le mot de passe admin avant une vraie mise en ligne.**

---

## Comment fonctionne une commande ?

1. Le client ouvre une voiture et clique sur **Commander** (avec un message facultatif).
2. La commande est enregistrée et une **notification** est créée pour l’admin.
3. L’admin voit le badge sur **Commandes**, ouvre la commande, change son statut et clique sur **Discuter**.
4. Client et admin s’échangent des messages (la discussion s’actualise toute seule toutes les 5 secondes).

## Organisation des dossiers

```
car-platform/
├── database/
│   └── car_platform.sql        Tables + données de démonstration
├── backend/
│   ├── .env.example            Réglages (port, base de données, secret)
│   ├── uploads/                Images envoyées (profils et voitures)
│   └── src/
│       ├── server.js           Démarre l'API
│       ├── db.js               Connexion à PostgreSQL
│       ├── middleware/
│       │   ├── auth.js         Vérifie la connexion / le rôle admin
│       │   └── upload.js       Envoi des images (multer)
│       └── routes/
│           ├── auth.js         Inscription, connexion, profil
│           ├── brands.js       Marques
│           ├── cars.js         Voitures, likes, commentaires
│           ├── orders.js       Commandes et messages
│           └── admin.js        Statistiques et notifications
└── frontend/
    └── src/
        ├── main.jsx, App.jsx   Démarrage et liste des pages
        ├── api.js              Appels au backend
        ├── AuthContext.jsx     Utilisateur connecté
        ├── utils.js            Prix en Ariary, dates, statuts
        ├── styles.css          Tout le design
        ├── components/         Morceaux réutilisables (menu, boutons, cartes...)
        └── pages/              Une page = un fichier
```

## Les routes de l’API

| Méthode | Route | Qui | Rôle |
|---|---|---|---|
| POST | `/api/auth/register` | public | Créer un profil (image facultative) |
| POST | `/api/auth/login` | public | Se connecter |
| GET / PUT | `/api/auth/me` | connecté | Voir / modifier son profil |
| GET | `/api/brands` | public | Liste des marques |
| GET | `/api/cars?brand=&search=` | public | Liste des voitures |
| GET | `/api/cars/:id` | public | Détail + commentaires |
| POST | `/api/cars/:id/like` | connecté | Liker / retirer le like |
| POST | `/api/cars/:id/comments` | connecté | Commenter |
| POST | `/api/cars` | admin | Publier une voiture |
| DELETE | `/api/cars/:id` | admin | Supprimer une voiture |
| POST | `/api/orders` | client | Commander |
| GET | `/api/orders/mine` | client | Mes commandes |
| GET | `/api/orders` | admin | Toutes les commandes |
| PATCH | `/api/orders/:id/status` | admin | Changer le statut |
| GET / POST | `/api/orders/:id/messages` | client concerné ou admin | Discussion |
| GET | `/api/admin/stats` | admin | Statistiques |
| GET | `/api/admin/notifications` | admin | Notifications |
| POST | `/api/admin/notifications/read-all` | admin | Tout marquer comme lu |

## Problèmes fréquents

- **`password authentication failed`** : le mot de passe dans `backend/.env` (`DATABASE_URL`) ne correspond pas à celui de PostgreSQL.
- **`database "car_platform" does not exist`** : refaites l’étape 1.
- **Les images ne s’affichent pas** : vérifiez que le backend tourne bien (le frontend demande les images au backend via `/uploads`).
- **Page blanche / erreur réseau** : le backend (port 5000) et le frontend (port 5173) doivent tourner en même temps.

## Pour aller plus loin

- Mise en ligne du frontend : `cd frontend && npm run build` crée le dossier `dist/`. Il faudra alors indiquer au frontend l’adresse de l’API (le proxy de `vite.config.js` ne sert qu’en développement) et limiter `cors()` dans `backend/src/server.js` à votre domaine.
- Idées : modifier une voiture, pagination, photos multiples, paiement mobile money.
