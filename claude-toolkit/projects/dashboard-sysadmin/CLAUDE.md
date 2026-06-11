# dashboard-sysadmin

Tableau de bord sysadmin unifié : agrège PRTG, vCenter, Proxmox, Veeam, GLPI et Axway
SecureTransport derrière une auth LDAP/AD. Next.js 16 App Router + React 19, TypeScript
strict, Tailwind v4 + shadcn/ui, Redis (fallback mémoire), déployé en Docker + Caddy.

## Commandes

```bash
npm run dev                # dev server (Turbopack)
npx tsc --noEmit           # typecheck (la CI fait exactement ça)
npx eslint src/            # lint (idem CI)
npx vitest run             # tests unitaires (jamais `vitest` seul : mode watch)
npm run build              # build prod
npm run test:e2e           # Playwright
```

La CI (`.github/workflows/ci.yml`) enchaîne : tsc → eslint → vitest → build. Tout doit
être vert avant de pousser.

## Architecture — à respecter impérativement

- **Une source = un client dans `src/lib/<source>.ts`** (prtg.ts, veeam.ts, vcenter.ts…).
  Le client encapsule HTTP (via `ky`), auth upstream et typage des réponses. Factory
  `get<Source>Client(instance)`.
- **Routes API = factory `createApiRoute` de `src/lib/api-handler.ts`**. Ne jamais écrire
  un handler GET à la main pour une source : la factory gère auth (session NextAuth),
  multi-instances, cache stale-while-revalidate, circuit breaker et métadonnées
  `_instanceId`/`_instanceName`/`_stale`. Variante `createSummaryApiRoute` pour les
  agrégations.
- **Cache** : `src/lib/cache.ts` (Redis → fallback Map mémoire, dédup in-flight). Clés au
  format `dashboard:<source>:<instanceId>:<ressource>`. TTL dans `CACHE_TTL`
  (`src/lib/constants.ts`).
- **Config sources** : chiffrée AES-256-GCM sur disque, types dans `config-types.ts`,
  accès via `getSourceConfig(source)`. Les champs sensibles sont listés dans
  `SENSITIVE_FIELDS`.
- **Côté client** : un hook `src/hooks/use<Source>.ts` par source (fetch + auto-refresh
  via `useAutoRefresh`), composants par domaine dans `src/components/<domaine>/`,
  primitives shadcn dans `src/components/ui/` (ne pas les modifier à la main, passer par
  le CLI shadcn).
- **Logs** : `loggers.<domaine>` de `src/lib/logger.ts` (pino). Jamais de `console.log`.
- **Résilience** : une source en panne ne doit JAMAIS faire tomber les autres —
  `Promise.allSettled`, fallback stale, circuit breaker. Toute nouvelle intégration suit
  ce contrat.

## Conventions

- TypeScript strict, pas de `any` (préférer `unknown` + narrowing).
- Zod pour valider les entrées (`src/lib/schemas.ts`).
- Jamais de secret en clair dans le code ou les logs (attention aux URLs avec credentials).
- Tests unitaires dans `src/__tests__/`, mocks réseau — pas d'appels réels aux APIs.
- UI : dark mode par défaut, composants existants comme modèles (regarder un voisin du
  même dossier avant de créer).
