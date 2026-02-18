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
│   │   ├── api/                    # 19 routes API (server-side uniquement)
│   │   │   ├── auth/[...nextauth]/ # Handlers NextAuth
│   │   │   ├── prtg/               # devices, sensors, alerts, summary
│   │   │   ├── vcenter/            # vms, hosts, datastores
│   │   │   ├── proxmox/            # nodes, vms
│   │   │   ├── veeam/              # jobs, sessions
│   │   │   ├── glpi/               # tickets, summary
│   │   │   ├── securetransport/    # transfers, logs
│   │   │   ├── settings/sources/   # CRUD config instances (admin)
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
│   │   ├── auth.ts                 # Configuration NextAuth
│   │   ├── ldap.ts                 # Client LDAP (bind, search, verify)
│   │   ├── cache.ts                # Cache Redis + fallback Map memoire
│   │   ├── config.ts               # Config chiffree (data/config.json)
│   │   ├── config-types.ts         # Interfaces et types de config (extraits de config.ts)
│   │   ├── api-handler.ts          # Factory createApiRoute
│   │   ├── constants.ts            # TTLs, routes, couleurs
│   │   ├── status-mappers.ts       # Fonctions statut→couleur/label (Veeam, vCenter, PRTG)
│   │   ├── formatters.ts           # formatBytes, formatMemory, formatDateFR
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
│   │   ├── usePRTG.ts
│   │   ├── useInfrastructure.ts
│   │   ├── useVeeam.ts
│   │   ├── useTickets.ts
│   │   └── useTransfers.ts
│   │
│   ├── types/                      # Interfaces TypeScript
│   │   ├── common.ts               # ApiResponse<T>, WithInstance<T>, CacheEntry<T>
│   │   ├── next-auth.d.ts          # Augmentation User/JWT (role, authSource)
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
│   │   │   ├── StatCard.tsx        # Carte statistique standardisee
│   │   │   ├── StatusBadge.tsx     # Badge de statut colore
│   │   │   ├── ErrorState.tsx      # Etat d'erreur avec retry
│   │   │   ├── RefreshButton.tsx   # Bouton refresh avec countdown
│   │   │   ├── InstanceGroup.tsx   # groupByInstance, hasMultipleInstances, InstanceSectionHeader
│   │   │   └── ...                 # shadcn/ui components
│   └── middleware.ts               # Protection globale des routes (auth + RBAC)
│
├── data/
│   └── config.json                 # Config instances chiffree AES-256-GCM
│
├── Dockerfile                      # Build multi-stage Node 20 Alpine
├── docker-compose.yml              # dashboard + redis + caddy
└── Caddyfile                       # Reverse proxy HTTPS avec headers securite
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
   - Tenter `cacheFetch(key, ttl, fetcher)`
   - Si le fetcher echoue : tenter `cacheGetStale(key)` (donnees perimees)
   - Enrichir chaque resultat avec `_instanceId` et `_instanceName`
4. Agregation :
   - `createApiRoute` : fusionne les tableaux de toutes les instances
   - `createSummaryApiRoute` : appelle `aggregator(results, req)` pour combiner les resultats
5. Retourner `{ data, _source, _timestamp, _stale, _partial }`

`_partial: true` est retourne si certaines instances ont echoue mais d'autres ont fourni des donnees.

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
| `cacheFetch(key, ttl, fetcher)` | Get ou fetch avec deduplication |
| `cacheGetStale(key)` | Lecture donnee perimee (dans TTL x 5) |

### Stale-while-revalidate

Chaque entree de cache stocke `{ data, timestamp, ttl }`. Le TTL total en Redis est `ceil(ttl * 5 / 1000)` secondes (STALE_MULTIPLIER = 5). Cela permet :
- **Reponse rapide** : servir depuis le cache sans attendre l'API
- **Resilience** : si l'API est down, afficher les dernieres donnees connues jusqu'a 5x le TTL
- **Anti-stampede** : la Map `inFlight` deduplique les requetes concurrentes sur un cache froid

### TTLs par source

| Source | Endpoint | TTL frais | TTL stale max | Refresh UI |
|---|---|---|---|---|
| PRTG | tous | 30 s | 150 s | 30 000 ms |
| vCenter | tous | 60 s | 300 s | 60 000 ms |
| Proxmox | tous | 60 s | 300 s | 60 000 ms |
| Veeam | tous | 120 s | 600 s | 120 000 ms |
| GLPI | tous | 60 s | 300 s | 60 000 ms |
| SecureTransport | `/transfers` (resume) | 120 s | 600 s | 120 000 ms |
| SecureTransport | `/logs` (data) | 300 s | 1 500 s | — |
| SecureTransport | `/logs` (count seul) | 600 s | — | — |

TTLs configurables via `CACHE_TTL_*` (en secondes).

> Le cache `/logs` utilise **deux niveaux** : le cache data (TTL 5 min) et un cache count separe (TTL 10 min). Quand le cache data expire, le count est encore valide, ce qui reduit les appels ST de 2 a 1. Voir [docs/api/securetransport.md](api/securetransport.md#double-cache-pour-le-count).

---

## Authentification

### Flux LDAP/AD (methode principale)

```
1. Bind avec le compte de service (LDAP_BIND_DN / LDAP_BIND_PASSWORD)
2. Recherche utilisateur par filtre (LDAP_USER_SEARCH_FILTER, defaut: sAMAccountName)
3. Bind avec le DN de l'utilisateur + mot de passe fourni (verification)
4. Lecture de l'attribut memberOf
5. isAdmin(groups) : recherche de LDAP_ADMIN_GROUP dans les groupes
   -> role "admin" si trouve, "viewer" sinon
6. JWT signe (NextAuth) avec role et authSource="ldap", duree 8h
```

### Fallback admin local

Si LDAP est down OU si l'utilisateur n'est pas trouve en LDAP, le systeme tente le compte local :

```
username == LOCAL_ADMIN_USERNAME
  && bcrypt.compare(password, LOCAL_ADMIN_PASSWORD_HASH)
  --> JWT avec role="admin", authSource="local"
```

Le compte local est toujours disponible meme si l'AD est indisponible.

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
  +-- Tout le reste ------------------> Passe
```

### JWT et session

- Strategie : `jwt` (pas de base de donnees de sessions)
- Duree de vie : 8 heures
- Champs personnalises : `role` (`"admin"` | `"viewer"`), `authSource` (`"ldap"` | `"local"`)
- Augmentation de type dans `src/types/next-auth.d.ts`

### Rate limiting

Un rate limiter en memoire (`src/lib/rate-limit.ts`) protege la route de connexion contre le brute-force. Apres un nombre de tentatives depasse, les requetes pour ce nom d'utilisateur sont bloquees temporairement.

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

### Comportements

- **Retry backoff** : en cas d'echec initial, retente 2 fois (2s, 4s) avant d'abandonner
- **Slowdown auto** : apres N echecs consecutifs, saute les ticks programmes (2x, 4x, max 8x l'intervalle) pour ne pas saturer une API en panne
- **Stale detection** : si la reponse contient `_stale: true`, expose `isStale: true`
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

Fonctions de formatage extraites des composants :

| Fonction | Description |
|---|---|
| `formatBytes(bytes)` | Taille en octets → `"1.2 Go"` |
| `formatMemory(mib)` | MiB → `"8.0 Go"` |
| `formatDateFR(dateStr)` | ISO date → `"18/02/2026 14:30:42"` (avec secondes) |

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
