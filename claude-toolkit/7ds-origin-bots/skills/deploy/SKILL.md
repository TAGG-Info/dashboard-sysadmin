---
description: Builder et déployer les bots 7DS via PM2 — build workspace, reload ciblé ou global, diagnostic d'un bot qui crash en boucle.
argument-hint: "[nom du bot, ou 'all']"
---

# /deploy — Build + PM2 (7DS-Origin-Bots)

## Déploiement

```bash
pnpm install                 # si les deps ont changé (lockfile pnpm)
pnpm -r build                # build TOUS les bots — un bot cassé doit bloquer le deploy
pm2 reload ecosystem.config.cjs              # tous (depuis la racine du repo)
pm2 reload 7ds-<bot>                         # un seul (general|codes|changelog|notifications)
pm2 logs 7ds-<bot> --lines 30                # vérifier le démarrage après reload
```

Toujours dans cet ordre : un `pm2 reload` sans rebuild relance l'ANCIEN `dist/` — c'est
le piège classique de ce repo ("j'ai déployé mais rien ne change").

Vérification post-deploy : `pm2 status` (tous `online`, compteur de restarts stable) +
logs des 30 dernières lignes sans stack trace.

## Bot qui crash en boucle (`errored` / restarts qui montent)

1. `pm2 logs 7ds-<bot> --err --lines 50` — la **première** erreur après le démarrage.
2. Causes fréquentes ici :
   - **`.env` manquant/incomplet dans `bots/<bot>/`** : les apps PM2 utilisent
     `node --env-file=.env` avec `cwd` le dossier du bot — un `.env` absent fait crasher
     au boot. Compare avec le `.env.example` du bot.
   - **`dist/` absent** : bot jamais buildé sur cette machine → `pnpm -r build`.
   - **Token invalide / intents non activés** : erreur discord.js au login
     (`Used disallowed intents` → activer les intents privilégiés sur le Developer
     Portal, pas dans le code).
   - **Crash après N minutes** : `max_restarts: 10` atteint = PM2 abandonne ; corriger
     la cause puis `pm2 restart 7ds-<bot>` pour réarmer.
3. Reproduis en avant-plan pour voir l'erreur complète :
   `cd bots/<bot> && node --env-file=.env dist/index.js`.

## Interdits

- Jamais `pm2 delete` sans confirmation (perd la config de l'app).
- Ne jamais afficher le contenu des `.env` (tokens Discord) dans le rapport — cite les
  NOMS de variables manquantes, pas les valeurs.
