# SysAdmin Dashboard

Tableau de bord d'administration systeme unifie. Agrege en temps reel les donnees de six sources d'infrastructure dans une interface unique, securisee par authentification LDAP/Active Directory.

---

## Fonctionnalites

- **6 integrations API** : PRTG, VMware vCenter, Proxmox VE, Veeam B&R 12+, GLPI, Axway SecureTransport
- **Multi-instances** : plusieurs instances d'une meme source (ex. deux vCenter) supportees nativement
- **Resilience** : isolation par source — si une API est indisponible, les autres continuent de fonctionner
- **Cache stale-while-revalidate** : Redis avec fallback en memoire, donnees perimees servies en fallback
- **Authentification LDAP/AD** avec roles admin/viewer et fallback admin local
- **Interface** : dark mode par defaut, Tailwind v4, shadcn/ui, Recharts
- **Deploiement Docker** avec Caddy en reverse proxy HTTPS
- **Configuration chiffree** : credentials API stockes en AES-256-GCM sur disque

---

## Stack technique

| Couche | Technologie | Version |
|---|---|---|
| Framework | Next.js (App Router, Turbopack) | 16.1.6 |
| UI | React, Tailwind CSS, shadcn/ui, Recharts | 19.2.3 / ^4 |
| Auth | NextAuth (JWT strategy), ldapjs, bcryptjs | 5.0.0-beta.30 / ^3.0.7 |
| Cache | ioredis + fallback Map en memoire | ^5.9.3 |
| Deploiement | Docker Compose, Caddy 2, Redis 7 | — |
| Langage | TypeScript strict | ^5 |

---

## Prerequis

- Node.js 20+ et npm 10+ (developpement)
- Docker et Docker Compose (production)
- Acces reseau aux APIs des sources configurees
- Serveur LDAP/AD (optionnel — fallback admin local disponible)
- Redis (optionnel — fallback en memoire integre)

---

## Installation rapide

```bash
git clone https://github.com/votre-org/dashboard-tagg.git
cd dashboard-tagg

# Copier et editer les variables d'environnement
cp .env.example .env.local
# Editer .env.local : NEXTAUTH_SECRET, LOCAL_ADMIN_*, LDAP_*, sources...

npm install
npm run dev
```

L'application est accessible sur `http://localhost:3000`.

### Scripts disponibles

```bash
npm run dev           # Serveur de developpement (Turbopack)
npm run build         # Build de production
npm run start         # Serveur de production
npm run lint          # ESLint
npm run test          # Tests (Vitest)
npm run test:coverage # Couverture de tests
```

---

## Configuration des sources

Les connexions aux APIs (URLs, credentials) se configurent de deux facons :

1. **Via l'interface Settings** (recommande) : accessible aux utilisateurs avec le role `admin`. Les secrets sont chiffres en AES-256-GCM sur disque (`data/config.json`).
2. **Via variables d'environnement** : fallback si aucune config UI n'est presente pour une source.

| Source | Authentification |
|---|---|
| PRTG | Bearer token (API v2) |
| VMware vCenter | Session token (Basic Auth -> session ID) |
| Proxmox VE | API token (`PVEAPIToken`) |
| Veeam B&R | OAuth2 password grant |
| GLPI | Session token (app-token + user-token) |
| SecureTransport | Basic Auth (stateless) |

Voir [docs/CONFIGURATION.md](docs/CONFIGURATION.md) pour le detail complet des variables d'environnement.

---

## Deploiement Docker

```bash
cp .env.example .env.local
# Editer .env.local avec les valeurs de production

docker compose up -d
```

Caddy gere automatiquement le TLS. Modifier `Caddyfile` pour adapter le nom de domaine.

Voir [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) pour le guide complet (Caddy, HTTPS, mise a jour, logs, securite).

---

## Architecture

Voir [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) pour :
- Structure des dossiers
- Flux de donnees (Client -> Middleware -> API Route -> Cache -> Reponse)
- Pattern `createApiRoute` factory
- Systeme de cache Redis + fallback memoire
- Authentification LDAP/AD et roles
- Types TypeScript (`ApiResponse<T>`, `WithInstance<T>`)

---

## Documentation

| Document | Contenu |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Architecture, flux de donnees, patterns techniques |
| [docs/CONFIGURATION.md](docs/CONFIGURATION.md) | Variables d'environnement, configuration sources, roles |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Docker Compose, Caddy, HTTPS, mise a jour, securite |
| [docs/USER_GUIDE.md](docs/USER_GUIDE.md) | Guide utilisateur — navigation, pages, gestion des erreurs |
| [docs/api/README.md](docs/api/README.md) | Reference API — index des 18 endpoints |
