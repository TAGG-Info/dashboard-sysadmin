---
description: Créer une route API Next.js conforme aux conventions du dashboard — factory createApiRoute pour les sources, ou handler manuel avec auth/zod/rate-limit pour le reste (settings, actions admin).
argument-hint: "<chemin de la route> <description>"
---

# /api-route — Route API conforme

Deux cas, à identifier d'abord :

## Cas 1 — Lecture de données d'une source (le plus fréquent)

→ **Toujours** la factory `createApiRoute` de `src/lib/api-handler.ts`. Modèle :

```ts
import { createApiRoute } from '@/lib/api-handler';
import { getXxxClient } from '@/lib/xxx';
import { CACHE_TTL } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export const GET = createApiRoute({
  source: 'xxx',
  getCacheKey: (instanceId, req) => `dashboard:xxx:${instanceId}:resource`,
  ttlMs: CACHE_TTL.XXX,
  fetcher: async (instance, req) => { /* appel client, retourne unknown[] */ },
});
```

- Paramètres de requête → inclus dans la clé de cache (sinon collisions entre filtres).
- Agrégation multi-instances → `createSummaryApiRoute` avec un `aggregator`.
- Ne JAMAIS réimplémenter auth/cache/circuit-breaker à la main pour une source.

## Cas 2 — Mutation ou route hors source (settings, actions, auth)

Handler manuel, mais avec les mêmes garde-fous — regarde
`src/app/api/settings/sources/route.ts` comme modèle :

1. `const session = await auth();` → 401 sans session ; vérifie `session.user?.role ===
   'admin'` pour tout ce qui écrit.
2. Validation du body avec un schéma zod (à ajouter dans `src/lib/schemas.ts`).
3. Rate-limit via `src/lib/rate-limit.ts` pour les endpoints sensibles (auth, écriture).
4. Erreurs : `NextResponse.json({ error: ... }, { status })` — message générique côté
   client, détail dans `loggers.<domaine>` côté serveur. Jamais de stack trace ni de
   credential dans la réponse.
5. Si la route écrit une config de source : invalide/rafraîchis le cache concerné.

## Finition

Test unitaire si la route a de la logique (validation, agrégation), puis `npx tsc
--noEmit && npx eslint src/` avant de conclure.
