---
description: Ajouter une nouvelle intégration de source d'infrastructure au dashboard (ex. Zabbix, UniFi, pfSense) — client lib, config chiffrée, routes API, hook, UI — en suivant le pattern des 6 sources existantes.
argument-hint: "<nom de la source> [ressources à exposer]"
---

# /new-source — Nouvelle intégration API

Ajoute la source `$ARGUMENTS` en répliquant le pattern d'une source existante. **Avant
d'écrire quoi que ce soit**, lis intégralement une source proche en complexité (PRTG pour
du monitoring REST simple, Veeam pour de l'auth token + sessions, vCenter pour du
multi-ressources) : `src/lib/<source>.ts` + ses routes `src/app/api/<source>/` + son hook.

## Checklist complète (dans l'ordre)

1. **Types config** — `src/lib/config-types.ts` :
   - Interface d'instance (url, credentials…), ajout dans `SourceConfig`
   - Champs sensibles dans `SENSITIVE_FIELDS` (mots de passe, tokens, secrets)

2. **Client** — `src/lib/<source>.ts` :
   - `get<Source>Client(instance)` retournant un objet avec une méthode par ressource
   - HTTP via `ky` avec timeout, auth upstream gérée dans le client
   - Types de réponse explicites (pas de `any`), normalisation des statuts via
     `status-mappers.ts` si la source a des états santé
   - Logs via `loggers.<source>` — jamais les credentials dans les logs

3. **TTL cache** — `CACHE_TTL.<SOURCE>` dans `src/lib/constants.ts` (aligne-toi sur une
   source au rythme de rafraîchissement similaire).

4. **Routes API** — `src/app/api/<source>/<ressource>/route.ts` :
   - Toujours via `createApiRoute` (ou `createSummaryApiRoute` pour `/summary`)
   - `export const dynamic = 'force-dynamic';`
   - Clé de cache : `dashboard:<source>:${instanceId}:<ressource>[:params]`
   - Une route `/summary` est attendue par la page d'accueil

5. **Hook client** — `src/hooks/use<Source>.ts` sur le modèle de `usePRTG.ts`
   (auto-refresh via `useAutoRefresh`, gestion des instances multiples et du flag `_stale`).

6. **UI** — composants dans `src/components/<domaine>/`, page ou section dans
   `src/app/`. Réutilise les primitives shadcn existantes et le style des cards voisines.

7. **Settings** — vérifie que la nouvelle source apparaît dans la page de configuration
   (`src/app/settings/`, `src/app/api/settings/sources/`) pour la saisie des instances.

8. **Tests + docs** — test unitaire du client dans `src/__tests__/` (réponses mockées,
   y compris cas d'erreur upstream), mention dans `docs/CONFIGURATION.md` et `.env.example`
   si variable d'env.

## Contrat de résilience (non négociable)

La nouvelle source en panne ne doit jamais impacter les autres : pas de throw qui
remonte hors du fetcher, le circuit breaker et le fallback stale de `createApiRoute`
font le travail SI tu passes par la factory. Termine par `/check` complet.
