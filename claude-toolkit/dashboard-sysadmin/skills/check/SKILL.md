---
description: Quality gate du dashboard — rejoue exactement les étapes de la CI (tsc, eslint, vitest, build) en local. À lancer avant tout commit/push ou quand l'utilisateur demande de vérifier que tout passe.
argument-hint: "[--fix] [--e2e]"
---

# /check — Quality gate (dashboard-sysadmin)

Rejoue **exactement** les étapes de `.github/workflows/ci.yml`, dans le même ordre et
avec les mêmes commandes (Node 22 en CI) :

```bash
npx tsc --noEmit          # 1. TypeScript check
npx eslint src/           # 2. Lint
npx vitest run            # 3. Tests (jamais `vitest` seul : mode watch infini)
npm run build             # 4. Build Next.js
```

- Lance les 4 étapes même si une échoue (sauf build si le typecheck est cassé).
- `--fix` dans `$ARGUMENTS` : d'abord `npx eslint src/ --fix` + `npm run format`
  (prettier sur `src/**/*.{ts,tsx}`), puis re-déroule le gate.
- `--e2e` : ajoute `npm run test:e2e` (Playwright) à la fin — nécessite un
  serveur/config, vérifie `playwright.config.ts` avant.

## Pièges connus du repo

- Le build a besoin des variables d'`.env.example` pour certaines routes — si le build
  échoue sur de la config manquante, vérifie `.env` avant de soupçonner le code.
- Les tests (`src/__tests__/`) mockent Redis/LDAP : un échec "connection refused" =
  mock manquant dans le nouveau test, pas un service à démarrer.
- Husky + lint-staged tournent déjà au commit : si le gate passe mais le commit est
  rejeté, lis la sortie du hook au lieu de forcer avec `--no-verify`.

## Rapport

Tableau : étape / ✅-❌ / erreur exacte (fichier:ligne) si échec, avec fix proposé.
Annonce les étapes réellement exécutées — jamais de "tout est vert" partiel.
