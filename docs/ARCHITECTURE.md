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
│   │   ├── api/                    # 18 routes API (server-side uniquement)
│   │   │   ├── auth/[...nextauth]/ # Handlers NextAuth
│   │   │   ├── prtg/               # devices, sensors, alerts, summary
│   │   │   ├── vcenter/            # vms, hosts, datastores
│   │   │   ├── proxmox/            # nodes, vms
│   │   │   ├── veeam/              # jobs, sessions
│   │   │   ├── glpi/               # tickets, summary
│   │   │   ├── securetransport/    # transfers
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
│   │   ├── api-handler.ts          # Factory createApiRoute
│   │   ├── constants.ts            # TTLs, routes, couleurs
│   │   ├── prtg.ts                 # Client API PRTG v2
│   │   ├── vcenter.ts              # Client API vCenter REST
│   │   ├── proxmox.ts              # Client API Proxmox VE
│   │   ├── veeam.ts                # Client API Veeam B&R
│   │   ├── glpi.ts                 # Client API GLPI REST
│   │   └── securetransport.ts      # Client API Axway SecureTransport
│   │
│   ├── hooks/                      # Hooks React avec auto-refresh
│   │   ├── useAutoRefresh.ts       # Hook generique d'auto-refresh
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

## Pattern `createApiRoute`

Toutes les routes API de donnees utilisent la factory `createApiRoute` (definie dans `src/lib/api-handler.ts`). Elle centralise la gestion de : l'authentification, le multi-instances, le cache, le stale fallback et les metadonnees de reponse.

### Interface

```typescript
interface ApiRouteOptions<K extends SourceKey> {
  source: K;
  getCacheKey: (instanceId: string, req: NextRequest) => string;
  ttlMs: number;
  fetcher: (instance: SourceInstanceMap[K], req: NextRequest) => Promise<unknown[]>;
}

export function createApiRoute<K extends SourceKey>(
  options: ApiRouteOptions<K>
): (req: NextRequest) => Promise<NextResponse>
```

### Exemple d'utilisation

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

### Comportement interne

1. Verifier la session JWT (`auth()`) — retourne 401 si absent
2. Recuperer toutes les instances configurees pour la source
3. Pour chaque instance en parallele (`Promise.allSettled`) :
   - Tenter `cacheFetch(key, ttl, fetcher)`
   - Si le fetcher echoue : tenter `cacheGetStale(key)` (donnees perimees)
   - Enrichir chaque item avec `_instanceId` et `_instanceName`
4. Agregation : fusionner les resultats de toutes les instances
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

| Source | TTL frais | TTL stale max | Refresh UI |
|---|---|---|---|
| PRTG | 30 s | 150 s | 30 000 ms |
| vCenter | 60 s | 300 s | 60 000 ms |
| Proxmox | 60 s | 300 s | 60 000 ms |
| Veeam | 120 s | 600 s | 120 000 ms |
| GLPI | 60 s | 300 s | 60 000 ms |
| SecureTransport | 120 s | 600 s | 120 000 ms |

TTLs configurables via `CACHE_TTL_*` (en secondes).

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
