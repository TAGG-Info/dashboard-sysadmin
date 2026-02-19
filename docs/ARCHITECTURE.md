# Architecture — SysAdmin Dashboard

## Vue d'ensemble

Le SysAdmin Dashboard est une application Next.js 16 (App Router) qui agrege en temps reel les donnees de six sources d'infrastructure IT. L'application s'execute cote serveur pour proteger les credentials, met les reponses en cache, et isole chaque source pour garantir la resilience.

**Principes directeurs :**
- Isolation par source : une panne API n'impacte pas les autres widgets
- Cache agressif avec donnees perimees (stale) comme filet de securite
- Authentification LDAP/AD avec fallback local garanti
- Configuration des instances persistee chiffree sur disque
- Credentials jamais exposes au navigateur (appels API uniquement server-side)

---

## Structure des dossiers

```
dashboard-tagg/
├── src/
│   ├── app/                        # App Router Next.js
│   │   ├── api/                    # 20 routes API (server-side uniquement)
│   │   │   ├── auth/[...nextauth]/ # Handlers NextAuth
│   │   │   ├── prtg/               # devices, sensors, alerts, summary
│   │   │   ├── vcenter/            # vms, hosts, datastores
│   │   │   ├── proxmox/            # nodes, vms
│   │   │   ├── veeam/              # jobs, sessions
│   │   │   ├── glpi/               # tickets, summary
│   │   │   ├── securetransport/    # transfers, logs
│   │   │   ├── settings/sources/   # CRUD config instances (admin)
│   │   │   ├── settings/roles/     # CRUD roles AD (admin)
│   │   │   └── health/             # health check
│   │   ├── login/                  # Page de connexion
│   │   ├── monitoring/             # Page PRTG
│   │   ├── infrastructure/         # Page vCenter + Proxmox
│   │   ├── backups/                # Page Veeam
│   │   ├── tickets/                # Page GLPI
│   │   ├── transfers/              # Page SecureTransport
│   │   ├── settings/               # Page parametres (admin uniquement)
│   │   └── page.tsx                # Dashboard home
│   │
│   ├── lib/                        # Logique serveur partagee
│   │   ├── auth.config.ts          # Config NextAuth Edge-safe (callbacks, pages, session)
│   │   ├── auth.ts                 # NextAuth complet avec providers (Node.js only)
│   │   ├── ldap.ts                 # Client LDAP (bind, search, verify)
│   │   ├── roles.ts                # Lecture/ecriture roles sur disque (data/roles.json)
│   │   ├── roles-resolver.ts       # Resolution de role pure (Edge-safe, pas d'I/O)
│   │   ├── cache.ts                # Cache Redis + fallback Map memoire
│   │   ├── config.ts               # Config chiffree (data/config.json)
│   │   ├── config-types.ts         # Interfaces et types de config (extraits de config.ts)
│   │   ├── api-handler.ts          # Factory createApiRoute + circuit breaker
│   │   ├── circuit-breaker.ts     # Circuit breaker par cle de cache (3 echecs → 30s open)
│   │   ├── cache-warmup.ts        # Warm-up cache direct (appels upstream, pas HTTP)
│   │   ├── constants.ts            # TTLs, routes, couleurs
│   │   ├── status-mappers.ts       # Fonctions statut→couleur/label (Veeam, vCenter, PRTG)
│   │   ├── formatters.ts           # formatBytes, formatMemory, formatDateFR (date-fns)
│   │   ├── logger.ts              # Logger structuré Pino + child loggers par source
│   │   ├── schemas.ts             # Schémas Zod de validation des réponses API
│   │   ├── export.ts              # Export CSV/Excel/PDF (dynamic imports)
│   │   ├── prtg.ts                 # Client API PRTG v2
│   │   ├── vcenter.ts              # Client API vCenter REST
│   │   ├── proxmox.ts              # Client API Proxmox VE
│   │   ├── veeam.ts                # Client API Veeam B&R
│   │   ├── glpi.ts                 # Client API GLPI REST
│   │   └── securetransport.ts      # Client API Axway SecureTransport
│   │
│   ├── hooks/                      # Hooks React avec auto-refresh
│   │   ├── useAutoRefresh.ts       # Hook generique d'auto-refresh
│   │   ├── usePageRefresh.ts       # Hook DRY pour refresh manuel des pages
│   │   ├── useColumnResize.ts      # Hook resize colonnes (pointer drag)
│   │   ├── useRefreshSignal.ts     # Hook refreshSignal (partage par 6 composants)
│   │   ├── useRoles.ts             # Hook CRUD roles (fetch, create, update, delete)
│   │   ├── usePRTG.ts
│   │   ├── useInfrastructure.ts
│   │   ├── useVeeam.ts
│   │   ├── useTickets.ts
│   │   └── useTransfers.ts
│   │
│   ├── types/                      # Interfaces TypeScript
│   │   ├── common.ts               # ApiResponse<T>, WithInstance<T>, CacheEntry<T>
│   │   ├── roles.ts                # DashboardRole, DASHBOARD_PAGES, ALL_PAGE_PATHS
│   │   ├── next-auth.d.ts          # Augmentation User/JWT (role, allowedPages, authSource)
│   │   ├── prtg.ts
│   │   ├── vcenter.ts
│   │   ├── proxmox.ts
│   │   ├── veeam.ts
│   │   ├── glpi.ts
│   │   └── securetransport.ts
│   │
│   ├── components/                 # Composants React par domaine
│   │   ├── layout/
│   │   │   ├── DashboardShell.tsx  # Shell principal (sidebar + topbar + main)
│   │   │   ├── Sidebar.tsx         # Sidebar collapsible (fleche en haut)
│   │   │   ├── Topbar.tsx          # Barre superieure (dots + user menu)
│   │   │   ├── PageHeader.tsx      # Header standardise des pages
│   │   │   ├── MobileNav.tsx       # Navigation mobile (drawer)
│   │   │   └── SourceStatusDots.tsx # Indicateurs 6 sources
│   │   ├── ui/
│   │   ├── settings/
│   │   │   ├── RoleManager.tsx     # UI CRUD gestion des roles AD
│   │   │   └── SourceItem.tsx      # Item source extracte de SourceConfigs
│   │   ├── ui/
│   │   │   ├── StatCard.tsx        # Carte statistique standardisee
│   │   │   ├── StatusBadge.tsx     # Badge de statut colore
│   │   │   ├── ErrorState.tsx      # Etat d'erreur avec retry
│   │   │   ├── RefreshButton.tsx   # Bouton refresh avec countdown
│   │   │   ├── ExportButton.tsx   # Bouton export CSV/Excel/PDF (dropdown)
│   │   │   ├── InstanceGroup.tsx   # groupByInstance, hasMultipleInstances, InstanceSectionHeader
│   │   │   └── ...                 # shadcn/ui components
│   │   │
│   ├── test/
│   │   ├── setup.ts               # Setup Vitest + MSW
│   │   └── mocks/
│   │       ├── handlers.ts        # MSW mock handlers pour les 6 APIs
│   │       └── server.ts          # MSW server node
│   └── middleware.ts               # Protection globale des routes (auth + RBAC)
│
├── data/
│   ├── config.json                 # Config instances chiffree AES-256-GCM
│   └── roles.json                  # Roles et mapping groupes AD (JSON clair)
│
│   └── instrumentation.ts           # Initialisation runtime (cron, logging)
│
├── .github/workflows/ci.yml        # Pipeline CI GitHub Actions
├── .prettierrc                      # Config Prettier + plugin Tailwind
├── .husky/pre-commit                # Hook pre-commit (lint-staged)
├── playwright.config.ts             # Config tests E2E Playwright
├── e2e/                             # Tests E2E (Playwright)
├── Dockerfile                       # Build multi-stage Node 22 Alpine (non-root, healthcheck)
├── docker-compose.yml               # dashboard + redis (healthcheck) + caddy
└── Caddyfile                        # Reverse proxy HTTPS avec headers securite
```

---

## Flux de donnees

```
Navigateur
    |
    | HTTP/HTTPS
    v
[Caddy] -- reverse_proxy --> [Next.js :3000]
                                    |
                             [middleware.ts]
                             auth check + RBAC
                                    |
                          [API Route /api/{source}/*]
                                    |
                           session = auth()  <-- JWT cookie
                                    |
                        getSourceConfig(source)
                        lit data/config.json (cache 10s)
                              ou env vars
                                    |
                          cacheFetch(key, ttl, fetcher)
                                    |
                           [Cache Redis ou Map]
                           Donnee fraiche ? --> Retourner
                                    |
                           [Non / Expiree]
                                    |
                          inFlight.get(key) ?
                          Deduplication anti-stampede
                                    |
                          fetcher() -- client lib --> [API Externe]
                                    |
                          cacheSet(key, data, ttl)
                                    |
                     NextResponse.json({ data, _source, _timestamp, ... })
                                    |
                                Navigateur
                          Hook React (useXxx)
                          auto-refresh selon intervalle
```

**En cas de panne API :** `cacheGetStale()` retourne les donnees perimees jusqu'a `ttl x 5` au lieu d'une erreur. Le champ `_stale: true` est present dans la reponse.

---

## Factories de routes API

Toutes les routes API de donnees utilisent deux factories (definies dans `src/lib/api-handler.ts`). Elles centralisent la gestion de : l'authentification, le multi-instances, le cache, le stale fallback et les metadonnees de reponse.

### `createApiRoute` — routes qui retournent un tableau

Pour les endpoints qui retournent une **liste d'items** (VMs, hosts, tickets, sensors, etc.). Chaque item est enrichi avec `_instanceId` et `_instanceName`.

```typescript
interface ApiRouteOptions<K extends SourceKey> {
  source: K;
  getCacheKey: (instanceId: string, req: NextRequest) => string;
  ttlMs: number;
  fetcher: (instance: SourceInstanceMap[K], req: NextRequest) => Promise<unknown[]>;
}
```

Exemple :

```typescript
// src/app/api/prtg/devices/route.ts
export const GET = createApiRoute({
  source: 'prtg',
  getCacheKey: (instanceId) => `dashboard:prtg:${instanceId}:devices`,
  ttlMs: CACHE_TTL.PRTG,
  fetcher: async (instance) => {
    const r = await getPRTGClient(instance).getDevices();
    return r.data as unknown[];
  },
});
```

**Routes utilisant `createApiRoute`** : `prtg/devices`, `prtg/sensors`, `prtg/alerts`, `vcenter/vms`, `vcenter/hosts`, `vcenter/datastores`, `proxmox/nodes`, `proxmox/vms`, `veeam/jobs`, `veeam/sessions`, `glpi/tickets`.

### `createSummaryApiRoute` — routes qui retournent un objet agrege

Pour les endpoints qui **agrègent** les resultats de plusieurs instances en un seul objet (summaries, stats, logs fusionnes, etc.). Le `fetcher` retourne les donnees brutes par instance, et l'`aggregator` les combine.

```typescript
interface SummaryApiRouteOptions<K extends SourceKey, TRaw, TAggregated> {
  source: K;
  getCacheKey: (instanceId: string, req: NextRequest) => string;
  ttlMs: number;
  fetcher: (instance: SourceInstanceMap[K], req: NextRequest) => Promise<TRaw>;
  aggregator: (results: InstanceResult<TRaw>[], req: NextRequest) => TAggregated;
}
```

Exemple :

```typescript
// src/app/api/prtg/summary/route.ts
export const GET = createSummaryApiRoute<'prtg', PRTGSummary, PRTGSummary>({
  source: 'prtg',
  getCacheKey: (instanceId) => `dashboard:prtg:${instanceId}:summary`,
  ttlMs: CACHE_TTL.PRTG,
  fetcher: async (instance) => { /* ... retourne PRTGSummary par instance */ },
  aggregator: (results) => { /* ... combine les PRTGSummary en un seul */ },
});
```

**Routes utilisant `createSummaryApiRoute`** : `prtg/summary`, `glpi/summary`, `securetransport/transfers`, `securetransport/logs`.

### Comportement interne (commun aux deux factories)

1. Verifier la session JWT (`auth()`) — retourne 401 si absent
2. Recuperer toutes les instances configurees pour la source
3. Pour chaque instance en parallele (`Promise.allSettled`) :
   - **Circuit breaker** : si le circuit est ouvert pour cette cle, aller directement au stale fallback sans tenter l'appel upstream
   - Tenter `cacheFetch(key, ttl, fetcher)` → `recordSuccess(key)` si ok
   - Si le fetcher echoue : `recordFailure(key)` + tenter `cacheGetStale(key)` (donnees perimees)
   - Enrichir chaque resultat avec `_instanceId` et `_instanceName`
4. Agregation :
   - `createApiRoute` : fusionne les tableaux de toutes les instances
   - `createSummaryApiRoute` : appelle `aggregator(results, req)` pour combiner les resultats
5. Retourner `{ data, _source, _timestamp, _stale, _partial }`

`_partial: true` est retourne si certaines instances ont echoue mais d'autres ont fourni des donnees.

### Circuit breaker (`src/lib/circuit-breaker.ts`)

Protege les API routes contre les cascades de timeout quand un upstream est down :

| Parametre | Valeur |
|---|---|
| Seuil d'ouverture | 3 echecs consecutifs |
| Duree d'ouverture | 30 secondes |
| Half-open | Apres 30s, laisse passer 1 requete probe |

Le circuit breaker est indexe par cle de cache (= par instance + endpoint). Un succes remet le compteur a zero. Quand le circuit est ouvert, les factories servent directement les donnees stale sans appeler l'upstream.

---

## Systeme de cache

### Backend

| Backend | Condition | Comportement |
|---|---|---|
| Redis (ioredis) | `REDIS_URL` defini et Redis accessible | Priorite, partage entre instances |
| Map en memoire | Redis absent ou en erreur | Fallback automatique et silencieux |

La connexion Redis est lazy avec timeout de 3 secondes et max 1 retry. Si la connexion echoue, `redisFailed = true` et toutes les operations suivantes utilisent la Map memoire sans retenter Redis.

### Fonctions

| Fonction | Role |
|---|---|
| `cacheGet(key)` | Lecture donnee fraiche (dans TTL) |
| `cacheSet(key, data, ttl)` | Ecriture avec timestamp |
| `cacheFetch(key, ttl, fetcher)` | True SWR : frais → retour / stale → retour + revalidation background / froid → bloquer |
| `cacheGetStale(key)` | Lecture donnee perimee (dans TTL x 5) |

### Stale-while-revalidate (true SWR)

`cacheFetch` implemente un vrai pattern SWR en 3 niveaux :

1. **Cache frais** (dans TTL) → retour instantane
2. **Cache stale** (expire mais < TTL x 5) → retour instantane + revalidation en background (fire-and-forget via `inFlight`)
3. **Cache froid** (rien) → bloque sur le fetch (deduplique via `inFlight`)

Chaque entree de cache stocke `{ data, timestamp, ttl }`. Le TTL total en Redis est `ceil(ttl * 5 / 1000)` secondes (STALE_MULTIPLIER = 5). Cela permet :
- **Reponse rapide** : servir depuis le cache sans attendre l'API, meme avec des donnees stale
- **Resilience** : si l'API est down, afficher les dernieres donnees connues jusqu'a 5x le TTL
- **Anti-stampede** : la Map `inFlight` deduplique les requetes concurrentes sur un cache froid

### LRU memoire

Le cache memoire (fallback Map) est borne a **500 entrees max** (`MAX_MEMORY_ENTRIES`). Quand la limite est atteinte, l'entree la plus ancienne (par insertion order) est supprimee (approximation FIFO). Les timers d'expiration sont nettoyes proprement.

### TTLs par source

| Source | Endpoint | TTL frais | TTL stale max | Refresh UI |
|---|---|---|---|---|
| PRTG | tous | 30 s | 150 s | 30 000 ms |
| vCenter | tous | 60 s | 300 s | 60 000 ms |
| Proxmox | tous | 60 s | 300 s | 60 000 ms |
| Veeam | tous | 120 s | 600 s | 120 000 ms |
| GLPI | tous | 60 s | 300 s | 60 000 ms |
| SecureTransport | `/transfers` (resume) | 120 s | 600 s | 120 000 ms |
| SecureTransport | `/logs` (data) | 15 s | 75 s | configurable (RefreshIntervalsProvider) |
| SecureTransport | `/logs` (count seul) | 120 s | — | — |

TTLs configurables via `CACHE_TTL_*` (en secondes). Le refresh UI des logs ST est configurable via `RefreshIntervalsProvider` (defaut 30s, min 10s).

> Le cache `/logs` utilise **deux niveaux** : le cache data (TTL 15s) et un cache count separe (TTL 2 min). Quand le cache data expire, le count est encore valide, ce qui reduit les appels ST de 2 a 1. Voir [docs/api/securetransport.md](api/securetransport.md#double-cache-pour-le-count).

---

## Authentification

### Flux LDAP/AD (methode principale)

```
1. Bind avec le compte de service (LDAP_BIND_DN / LDAP_BIND_PASSWORD)
2. Recherche utilisateur par filtre (LDAP_USER_SEARCH_FILTER, defaut: sAMAccountName)
3. Bind avec le DN de l'utilisateur + mot de passe fourni (verification)
4. Lecture de l'attribut memberOf
5. resolveRole(groups) : resolution du role via mapping groupes AD → roles
   -> Compare les CN des groupes memberOf avec les adGroups de chaque role
   -> Priorite au role admin si match, puis premier role custom, sinon viewer
6. JWT signe (NextAuth) avec role, allowedPages et authSource="ldap", duree 8h
```

### Fallback admin local

Si LDAP est down OU si l'utilisateur n'est pas trouve en LDAP, le systeme tente le compte local :

```
username == LOCAL_ADMIN_USERNAME
  && bcrypt.compare(password, LOCAL_ADMIN_PASSWORD_HASH)
  --> JWT avec role="admin", allowedPages=[toutes], authSource="local"
```

Le compte local est toujours disponible meme si l'AD est indisponible.

### Split auth Edge/Node

NextAuth est split en deux fichiers pour la compatibilite Edge Runtime :

| Fichier | Runtime | Role |
|---|---|---|
| `auth.config.ts` | Edge-safe | Callbacks JWT/session, pages, session config. Importe par middleware. |
| `auth.ts` | Node.js only | Config complete avec providers (Credentials, LDAP, roles). Importe par API routes. |

Le middleware cree sa propre instance NextAuth legere depuis `auth.config.ts` (verification JWT uniquement). Les API routes utilisent l'instance complete depuis `auth.ts` (avec `authorize()` et resolution de role).

### Protection des routes (middleware.ts)

```
Toute requete entrante
  |
  +-- Statique (_next/*, favicon) ? --> Passe sans check
  +-- Route auth (/api/auth/*) ? -----> Passe sans check
  +-- Non authentifie + hors /login --> Redirect /login
  +-- Authentifie + /login -----------> Redirect /
  +-- /api/settings (POST/PUT/...) ?
  |     --> Verif CSRF : origin == host
  +-- /settings ou /api/settings ?
  |     +-- role == "admin" ----------> Passe
  |     +-- sinon (API) ------------->  403 Forbidden
  |     +-- sinon (page) ------------>  Redirect /
  +-- Page dashboard (non-API) ?
  |     +-- role == "admin" ----------> Passe (bypass page check)
  |     +-- allowedPages contient la page ? --> Passe
  |     +-- sinon ------------------->  Redirect vers premiere page autorisee
  +-- Tout le reste ------------------> Passe
```

### JWT et session

- Strategie : `jwt` (pas de base de donnees de sessions)
- Duree de vie : 8 heures
- Champs personnalises : `role` (string, ex: `"admin"`, `"viewer"`, `"compta"`), `allowedPages` (string[]), `authSource` (`"ldap"` | `"local"`)
- Augmentation de type dans `src/types/next-auth.d.ts`

### Rate limiting

Un rate limiter en memoire (`src/lib/rate-limit.ts`) protege la route de connexion contre le brute-force. Apres un nombre de tentatives depasse, les requetes pour ce nom d'utilisateur sont bloquees temporairement.

---

## Systeme de roles

### Concept

Les roles permettent de mapper des **groupes Active Directory** vers des **pages du dashboard**. Un utilisateur qui se connecte via LDAP est associe au role dont un des `adGroups` correspond a l'un de ses groupes AD (`memberOf`). Le JWT stocke alors le `role.id` et `role.pages` (les pages autorisees).

### Fichiers

| Fichier | Role |
|---|---|
| `src/types/roles.ts` | Type `DashboardRole`, constantes `DASHBOARD_PAGES`, `ALL_PAGE_PATHS` |
| `src/lib/roles-resolver.ts` | Logique pure (Edge-safe) : `resolveRoleFromList()`, `extractCN()`, `validateRole()`, `getDefaultRoles()` |
| `src/lib/roles.ts` | I/O disque : `readRoles()`, `writeRoles()`, `resolveRole()` (importe `fs/promises`, Node.js only) |
| `src/app/api/settings/roles/route.ts` | API CRUD (GET/POST/PUT/DELETE), protege admin |
| `src/hooks/useRoles.ts` | Hook React : fetch, create, update, delete avec refresh auto |
| `src/components/settings/RoleManager.tsx` | UI de gestion dans la page Settings |

### Structure d'un role

```typescript
interface DashboardRole {
  id: string;        // slug unique (ex: "compta", "admin")
  name: string;      // nom d'affichage (ex: "Comptabilite")
  adGroups: string[]; // noms CN des groupes AD (ex: ["GS-COMPTA"])
  pages: string[];   // pages autorisees (ex: ["/", "/tickets"])
  isSystem?: boolean; // true pour admin et viewer (non supprimables)
}
```

### Roles systeme

Deux roles systeme sont crees par defaut et ne peuvent pas etre supprimes :

| Role | ID | Groupe AD par defaut | Pages |
|---|---|---|---|
| Administrateur | `admin` | `LDAP_ADMIN_GROUP` (env) ou `Dashboard-Admins` | Toutes + `/settings` |
| Lecteur | `viewer` | aucun (fallback) | Toutes sauf `/settings` |

### Resolution de role

```
1. Extraire les CN des groupes memberOf de l'utilisateur
2. Pour chaque role (sauf viewer) :
   a. Comparer les adGroups du role avec les CN (case-insensitive)
   b. Si match → ajouter a la liste des candidats
3. Si aucun match → retourner le role viewer (fallback)
4. Si match admin → retourner admin (priorite absolue)
5. Sinon → retourner le premier role custom qui matche
```

### Stockage

Les roles sont stockes dans `data/roles.json` (JSON clair, pas chiffre). Si le fichier est absent ou invalide, les roles systeme par defaut sont utilises. Le repertoire `data/` est configure par `DATA_DIR` (defaut: `./data`).

### Navigation filtree

Le `Sidebar` et le `MobileNav` lisent `session.user.allowedPages` pour n'afficher que les liens vers les pages autorisees. Le lien Settings n'apparait que pour le role `admin`.

---

## Multi-instances

Chaque source accepte un tableau d'instances dans la configuration. Exemple pour vCenter :

```json
{
  "vcenter": [
    { "id": "vcenter-prod", "name": "vCenter Production", "baseUrl": "...", ... },
    { "id": "vcenter-dr",   "name": "vCenter DR",         "baseUrl": "...", ... }
  ]
}
```

`createApiRoute` appelle `fetcher()` pour chaque instance en parallele (`Promise.allSettled`). Les items retournes sont enrichis avec `_instanceId` et `_instanceName` pour permettre le regroupement cote client.

**Cle de cache** : une cle par instance (`dashboard:prtg:{instanceId}:devices`), les instances sont independantes en cache.

**Cache partage vCenter** : les routes `/api/vcenter/vms` et `/api/vcenter/hosts` partagent un cache commun `dashboard:vcenter:{id}:vm-host-map` qui contient le mapping VM→Host. Cela evite le probleme N+1 (N appels `getVMsByHost` par host) en ne faisant le mapping qu'une fois par TTL.

**Priorite config** : `data/config.json` > variables d'environnement. Si le fichier config contient des instances pour une source, les variables d'environnement sont ignorees pour cette source.

---

## Layout standardise

Toutes les pages suivent un layout uniforme base sur des composants partages.

### Structure d'une page

```
DashboardShell
  ├── Sidebar (collapsible, fleche en haut a droite)
  ├── Topbar (source dots + user menu, PAS de titre)
  └── Main content
        ├── PageHeader (titre + source indicator + badge + actions)
        ├── Stats (grille de StatCard)
        └── Contenu (tables, grilles, sidebar, etc.)
```

### Dashboard (page.tsx) — hooks partages

La page dashboard est un composant client (`'use client'`) qui remonte les hooks `usePRTGAlerts()` et `useVeeamSessions()` au niveau page. Les donnees sont passees en props a `OverviewCards` et `RecentActivity`, evitant la duplication de fetches (6 hooks au lieu de 9).

### PageHeader (`src/components/layout/PageHeader.tsx`)

Header unique utilise par les 7 pages. Props : `title`, `source?` (affiche SourceIndicator), `badge?`, `actions?` (RefreshButton).

### StatCard (`src/components/ui/StatCard.tsx`)

Carte statistique standardisee, deux variantes :
- **Simple** : label + valeur + badge optionnel (Tickets, Backups)
- **Avec icone** : icone dans cercle colore + valeur + label (Monitoring SensorGrid)

### usePageRefresh (`src/hooks/usePageRefresh.ts`)

Hook factorise pour le pattern refresh manuel. Retourne `{ refreshKey, loading, handleRefresh }`. Utilise par les 6 pages client (toutes sauf Dashboard).

### useColumnResize (`src/hooks/useColumnResize.ts`)

Hook de resize de colonnes par pointer drag. Retourne `{ widths, startResize, resetWidths }`. Utilise par les 5 tableaux : TransferLogTable, TicketList, JobList, VMList, ProxmoxVMTable.

### Conventions

- Espacement vertical : `space-y-6` entre sections
- Grilles stats : `gap-4` (tickets/backups) ou `gap-3` (monitoring)
- Borders : `border-border/50`
- Tables denses : `text-xs`/`text-sm`, `px-3 py-1.5`

---

## Hook useAutoRefresh

Le hook generique `src/hooks/useAutoRefresh.ts` est utilise par tous les hooks de donnees (`usePRTG`, `useInfrastructure`, `useTransfers`, etc.).

### Options

```typescript
interface UseAutoRefreshOptions {
  url: string;
  interval: number;        // ms
  enabled?: boolean;       // defaut: true
  trackCountdown?: boolean; // defaut: false
  autoRefresh?: boolean;   // defaut: true
}
```

### trackCountdown

**Par defaut `false`** — le countdown timer (setInterval 5s) est inactif.

Mettre `trackCountdown: true` uniquement dans le composant/hook qui passe `nextRefreshIn` a un `RefreshButton`. Sans ca, chaque instance du hook provoque ~1 re-render/5s inutile.

```typescript
// OK — la page affiche un RefreshButton avec countdown
const { data } = useAutoRefresh({ url, interval, trackCountdown: true });

// OK — composant interne qui n'a pas de RefreshButton
const { data } = useAutoRefresh({ url, interval }); // trackCountdown: false par defaut
```

### autoRefresh

**Par defaut `true`**. Mettre a `false` pour faire le fetch initial mais desactiver le polling periodique. Utile pour les donnees a la demande qui ne doivent pas creer de timer independant.

```typescript
// Sensors per-device : fetch une fois a l'expand, pas de polling
const { data } = useAutoRefresh({ url, interval, autoRefresh: false });
```

Cas d'usage : `usePRTGSensors(deviceId)` passe `autoRefresh: !deviceId` — les sensors globaux polleraient, mais les sensors par device ne font qu'un fetch initial.

### Comportements

- **Retry backoff** : en cas d'echec initial, retente 2 fois (2s, 4s) avant d'abandonner
- **Slowdown auto** : apres N echecs consecutifs, saute les ticks programmes (2x, 4x, max 8x l'intervalle) pour ne pas saturer une API en panne
- **Stale detection** : si la reponse contient `_stale: true`, expose `isStale: true`
- **Reset interval apres refresh manuel** : `refresh()` incremente un `refreshEpoch` interne qui redeclenche le setup de l'intervalle — le prochain auto-refresh est exactement `interval` ms apres le refresh manuel, et le countdown reste synchronise
- **refreshSignal** : pattern pour rafraichir un composant avec etat interne (ex: `TransferLogTable`) sans le remonter — passer un `number` incrementable qui declenche `refresh()` via `useEffect`

---

## Utilitaires partages

### useRefreshSignal (`src/hooks/useRefreshSignal.ts`)

Hook partage qui encapsule le pattern refreshSignal utilise par 6 composants (TransferLogTable, VMList, TicketList, JobList, DeviceTree, BackupCalendar). Evite la duplication du pattern `useRef` + `useEffect` dans chaque composant.

```typescript
useRefreshSignal(refreshSignal, refresh);
// Equivalent a :
// const refreshRef = useRef(refresh);
// useEffect(() => { refreshRef.current = refresh; });
// useEffect(() => { if (refreshSignal) refreshRef.current?.(); }, [refreshSignal]);
```

### status-mappers (`src/lib/status-mappers.ts`)

Fonctions de mapping statut→niveau consolidees depuis 4 composants (JobCard, JobList, VMList, DeviceTree) :

| Fonction | Source | Retourne |
|---|---|---|
| `resultToStatus(result?)` | Veeam | `'healthy' \| 'warning' \| 'critical' \| 'neutral'` |
| `resultLabel(result?)` | Veeam | Label en francais |
| `powerStateToStatus(state)` | vCenter | `'healthy' \| 'warning' \| 'neutral'` |
| `powerStateLabel(state)` | vCenter | Label en francais |
| `prtgStatusToLevel(status)` | PRTG | `'healthy' \| 'warning' \| 'critical' \| 'info' \| 'neutral'` |

### formatters (`src/lib/formatters.ts`)

Fonctions de formatage extraites des composants. Utilise `date-fns` avec la locale française :

| Fonction | Description |
|---|---|
| `formatBytes(bytes)` | Taille en octets → `"1.2 Go"` |
| `formatMemory(mib)` | MiB → `"8.0 Go"` |
| `formatDateFR(dateStr)` | ISO date → `"18/02 14:30:42"` (date-fns, locale fr) |
| `formatTimeAgo(dateStr)` | ISO date → `"il y a 5 minutes"` (date-fns, locale fr) |

### InstanceGroup (`src/components/ui/InstanceGroup.tsx`)

Composants et utilitaires pour le groupement multi-instances :

| Export | Role |
|---|---|
| `groupByInstance(items)` | Groupe un tableau par `_instanceId` → `{ instanceId, instanceName, items }[]` |
| `hasMultipleInstances(items)` | Retourne `true` si plus d'une instance presente |
| `InstanceSectionHeader` | Header visuel de section avec icone Building2 + nom |
| `InstanceGroupRenderer` | Composant declaratif qui groupe et rend avec headers conditionnels |

Utilise par : JobList, VMList, DeviceTree, TicketList, StatusGrid.

### config-types (`src/lib/config-types.ts`)

Interfaces TypeScript des configurations d'instances, extraites de `config.ts` pour separer types et logique :

`BaseInstance`, `PRTGInstance`, `VCenterInstance`, `ProxmoxInstance`, `VeeamInstance`, `GLPIInstance`, `STInstance`, `SourceConfig`, `SourceInstanceMap`, `SourceKey`, `SENSITIVE_FIELDS`.

Les types sont re-exportes depuis `config.ts` pour la compatibilite ascendante.

---

## Types TypeScript

### ApiResponse<T>

Structure retournee par toutes les routes API de donnees :

```typescript
interface ApiResponse<T> {
  data: T;
  _source: SourceName;      // 'prtg' | 'vcenter' | 'proxmox' | 'veeam' | 'glpi' | 'securetransport'
  _timestamp: number;       // Date.now() au moment de la reponse
  _stale?: boolean;         // true si les donnees viennent du cache perime
  _partial?: boolean;       // true si certaines instances ont echoue
  _instanceId?: string;     // present pour les reponses mono-instance
  _instanceName?: string;
}
```

### WithInstance<T>

Metadata d'instance ajoutee a chaque item lors de l'agregation multi-instances :

```typescript
interface InstanceMetadata {
  _instanceId: string;
  _instanceName: string;
}

type WithInstance<T> = T & InstanceMetadata;
```

### SourceName

```typescript
type SourceName =
  | 'prtg'
  | 'vcenter'
  | 'proxmox'
  | 'veeam'
  | 'glpi'
  | 'securetransport';
```

### CacheEntry<T>

```typescript
interface CacheEntry<T> {
  data: T;
  timestamp: number;  // Date.now() au moment du stockage
  ttl: number;        // TTL frais en ms
}
```

### Chiffrement de la configuration

Les champs sensibles (mots de passe, tokens) sont chiffres avec AES-256-GCM avant ecriture dans `data/config.json`. La cle est derivee de `NEXTAUTH_SECRET` via scrypt. Format stocke : `iv:authTag:ciphertext` (hexadecimal).

| Source | Champs chiffres |
|---|---|
| PRTG | `apiKey` |
| vCenter | `password` |
| Proxmox | `tokenSecret` |
| Veeam | `password` |
| GLPI | `appToken`, `userToken` |
| SecureTransport | `password` |

---

## Logging structuré (Pino)

Le logger est défini dans `src/lib/logger.ts`. En production, il produit du JSON structuré (compatible Docker / Loki / ELK). En développement, il utilise `pino-pretty` avec couleurs.

### Child loggers par source

Chaque source API a son propre child logger avec le champ `source` pré-rempli :

```typescript
loggers.prtg.error({ status: 401, path: '/devices' }, 'PRTG API error');
// → {"level":"error","source":"prtg","status":401,"path":"/devices","msg":"PRTG API error"}
```

Loggers disponibles : `prtg`, `vcenter`, `proxmox`, `veeam`, `glpi`, `st`, `cache`, `auth`.

### Où sont les logs

| Fichier | Ce qui est loggé |
|---|---|
| `src/lib/cache.ts` | Fallback Redis → mémoire, erreurs Redis set |
| `src/lib/prtg.ts` | Erreurs API PRTG (status code + path) |
| `src/lib/securetransport.ts` | Erreurs API ST, fallback `/transferSites` → `/sites` |
| `src/lib/vcenter.ts` | Erreurs API vCenter |
| `src/lib/proxmox.ts` | Erreurs API Proxmox |
| `src/lib/veeam.ts` | Erreurs API Veeam |
| `src/lib/glpi.ts` | Erreurs API GLPI |
| `src/instrumentation.ts` | Démarrage runtime, cron warm-up |

---

## Validation des données (Zod)

Les schémas sont dans `src/lib/schemas.ts`. Ils décrivent la forme attendue des réponses des 6 APIs externes :

| Schéma | API source |
|---|---|
| `stTransferLogSchema` | SecureTransport — logs de transfert |
| `prtgDeviceSchema` | PRTG — devices |
| `prtgSensorSchema` | PRTG — sensors |
| `veeamJobSchema` | Veeam — jobs de backup |
| `glpiTicketSchema` | GLPI — tickets |

La fonction `safeParse(schema, data, label)` valide les données sans crasher : si la validation échoue, elle log un warning et retourne les données brutes.

---

## Export de données (CSV/Excel/PDF)

L'utilitaire `src/lib/export.ts` permet d'exporter les données affichées dans les tableaux. Les bibliothèques `xlsx` et `jspdf` sont chargées dynamiquement (pas de surcoût sur le bundle initial).

Le composant `src/components/ui/ExportButton.tsx` fournit un bouton dropdown "Exporter" avec trois formats : CSV, Excel (.xlsx), PDF. Il utilise les toasts Sonner pour le feedback.

---

## Tâches planifiées (Croner)

Le fichier `src/instrumentation.ts` (hook Next.js `register()`) initialise des tâches cron via la lib `croner` :

| Cron | Fréquence | Action |
|---|---|---|
| `*/2 * * * *` | Toutes les 2 min | Warm-up cache direct via `warmupAllSources()` |

Les tâches ne tournent qu'en runtime Node.js (`process.env.NEXT_RUNTIME === 'nodejs'`), pas en Edge.

### Cache warm-up (`src/lib/cache-warmup.ts`)

Le warm-up appelle directement les clients API upstream (pas de HTTP vers nos propres routes, ce qui evite les problemes d'auth). Pour chaque source configuree :

1. Recupere les instances via `getSourceConfig(source)`
2. Appelle les fetchers des clients (memes cles de cache que les routes API)
3. Popule le cache avec `cacheSet()` et les memes TTLs que les routes

Sources warm-up : PRTG (summary + sensors), vCenter (vms + hosts + vm-host-map), Proxmox (vms), Veeam (sessions), GLPI (tickets), SecureTransport (logs recents).

Chaque source est isolee via `Promise.allSettled` — un echec n'impacte pas les autres.

### Timeouts API

Tous les clients API ont un timeout de **10 secondes** via `AbortSignal.timeout(10_000)` sur chaque `fetch()`. Couvre aussi les appels auth (getSession, getToken). Les retries 401 (vCenter, Veeam) ont leur propre timeout.

---

## Notifications (Sonner)

Le composant `<Toaster>` est placé dans `src/app/layout.tsx`. Les toasts s'appellent depuis n'importe quel composant client :

```typescript
import { toast } from 'sonner';
toast.success('Export réussi');
toast.error('Connexion perdue');
```

---

## CI/CD

### Pipeline GitHub Actions (`.github/workflows/ci.yml`)

S'exécute sur chaque push et pull request vers `master` :

```
1. npm ci          — installation des dépendances
2. tsc --noEmit    — vérification TypeScript
3. eslint src/     — linting
4. vitest run      — tests unitaires
5. next build      — build production
```

### Pre-commit hooks (Husky + lint-staged)

À chaque `git commit`, lint-staged exécute automatiquement sur les fichiers modifiés :
1. `prettier --write` — formatage automatique
2. `eslint --fix` — correction des erreurs de lint

---

## Tests

### Tests unitaires (Vitest + MSW)

- 33 tests dans `src/__tests__/`
- MSW (Mock Service Worker) intercepte les requêtes HTTP au niveau réseau (`src/test/mocks/`)
- Le serveur MSW est initialisé dans `src/test/setup.ts` (`beforeAll`, `afterEach`, `afterAll`)
- Config : `vitest.config.ts` avec `include: ['src/**/*.test.ts']`

### Tests E2E (Playwright)

- Config : `playwright.config.ts` (Chromium, `http://localhost:3000`)
- Tests dans `e2e/`
- Commandes : `npm run test:e2e` (headless), `npm run test:e2e:ui` (GUI)

---

## Docker

### Dockerfile (multi-stage)

| Stage | Rôle |
|---|---|
| `deps` | Installation des dépendances production uniquement |
| `builder` | Installation complète + `next build` |
| `runner` | Image finale : `.next/standalone` + `public` + `static` uniquement |

Caractéristiques :
- **Node 22 Alpine** — image légère
- **Utilisateur non-root** (`nextjs:nodejs`, UID 1001)
- **Healthcheck intégré** : `wget --spider http://localhost:3000/api/health` toutes les 30s
- Image finale : ~200-300 MB (vs ~1.5 GB sans multi-stage)

### docker-compose.yml

| Service | Healthcheck |
|---|---|
| `redis` | `redis-cli ping` toutes les 10s |
| `dashboard` | Démarre seulement quand Redis est healthy (`depends_on: condition: service_healthy`) |
| `caddy` | Reverse proxy HTTPS |

---

## Scripts npm

| Script | Commande |
|---|---|
| `dev` | `next dev` — développement local avec Turbopack |
| `build` | `next build` — build production |
| `start` | `next start` — serveur production |
| `lint` | `next lint` — ESLint |
| `format` | `prettier --write "src/**/*.{ts,tsx}"` — formatage du code |
| `test` | `vitest` — tests unitaires (watch mode) |
| `test:ui` | `vitest --ui` — interface web Vitest |
| `test:coverage` | `vitest run --coverage` — couverture de code |
| `test:e2e` | `playwright test` — tests E2E headless |
| `test:e2e:ui` | `playwright test --ui` — tests E2E avec GUI |
| `analyze` | `ANALYZE=true next build` — analyse taille des bundles |
| `prepare` | `husky` — initialise les git hooks (automatique après npm install) |
