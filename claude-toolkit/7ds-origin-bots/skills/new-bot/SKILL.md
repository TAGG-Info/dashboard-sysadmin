---
description: Créer un 5e bot dans le monorepo 7DS-Origin-Bots — package workspace pnpm, structure src/, .env.example, entrée PM2 — calqué sur les bots existants.
argument-hint: "<nom du bot> <rôle du bot>"
---

# /new-bot — Nouveau bot dans le monorepo

Crée `bots/<nom>/` en clonant la structure d'un bot existant. **Modèle** :
`bots/notifications` ou `bots/changelog` pour un bot simple, `bots/general` si le bot
aura commandes + events.

## Checklist

1. **`bots/<nom>/package.json`** — copie d'un existant, adapté :
   - `"name": "@7ds-bots/<nom>"`, `"type": "module"`
   - scripts identiques : `dev` (tsx --env-file=.env), `build` (tsc), `start`
     (node --env-file=.env dist/index.js)
   - mêmes versions de deps que les autres bots (discord.js ^14, tsx, typescript,
     @types/node) — regarde un package.json voisin, ne devine pas.

2. **`bots/<nom>/tsconfig.json`** — copie conforme d'un bot existant (ESM, strict,
   outDir dist).

3. **`bots/<nom>/src/index.ts`** — squelette standard du repo :
   - `process.on("unhandledRejection", ...)` en tête
   - Validation env (`requireEnv` comme codes-promo, ou `!` comme general) :
     `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `DISCORD_GUILD_ID` + les IDs de channels du bot
   - Client avec les **intents minimaux** pour le rôle du bot (pas de copier-coller des
     intents de general s'il n'en a pas besoin)
   - `client.once("clientReady"/"ready")`, présence via `ActivityType` comme les autres

4. **`bots/<nom>/.env.example`** — toutes les variables, valeurs factices.

5. **PM2** — entrée dans `ecosystem.config.cjs` **racine** :
   ```js
   { name: "7ds-<nom>", cwd: "./bots/<nom>", script: "dist/index.js",
     node_args: "--env-file=.env", restart_delay: 5000, max_restarts: 10 }
   ```

6. **Validation** : `pnpm install` à la racine (enregistre le package dans le
   workspace), puis `pnpm --filter @7ds-bots/<nom> build`.

## Rapport

Liste ce qui reste à faire côté Discord/serveur : créer l'application + bot sur le
Developer Portal (ou réutiliser un token), inviter le bot avec les bons scopes/perms,
remplir le `.env` sur la machine de prod, `pm2 start ecosystem.config.cjs --only 7ds-<nom>`.
