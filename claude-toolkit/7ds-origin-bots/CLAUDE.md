# 7DS-Origin-Bots

Monorepo pnpm de 4 bots Discord (discord.js v14, TypeScript strict, ESM) pour le serveur
7DS Origin, déployés via PM2 (`ecosystem.config.cjs` racine) :

| Bot (`bots/`) | App PM2 | Rôle |
|---|---|---|
| `general` | `7ds-general` | Gestion serveur : welcome, modération, sondages, reaction roles, giveaways, logs |
| `codes-promo` | `7ds-codes` | Notifications codes promo (+ serveur express intégré) |
| `changelog` | `7ds-changelog` | Publication des changelogs |
| `notifications` | `7ds-notifications` | Notifications diverses |

## Commandes

```bash
pnpm install                                   # à la racine (workspace)
pnpm --filter @7ds-bots/general dev            # dev d'un bot (tsx + .env local au bot)
pnpm -r build                                  # build tous les bots (tsc → dist/)
npx tsc --noEmit                               # typecheck (depuis le dossier du bot)
pm2 reload ecosystem.config.cjs                # déploiement (depuis la racine, après build)
```

Chaque bot a son propre `.env` (voir `.env.example` du bot) chargé via
`node --env-file=.env` / `tsx --env-file=.env` — pas de dotenv.

## Architecture d'un bot (modèle : `bots/general/`)

- `src/index.ts` — point d'entrée unique : env vars validées en tête (`requireEnv` ou
  `!`), client Discord avec intents explicites, enregistrement REST des slash commands,
  dispatch des interactions, branchement des events.
- `src/commands/<nom>.ts` — **pattern maison, pas de framework ni de loader dynamique** :
  chaque fichier exporte `build<Nom>Command()` (retourne un `SlashCommandBuilder`) et
  `handle<Nom>Command(interaction, ...)`. Le câblage (import + ajout au tableau REST +
  case dans le dispatch) se fait À LA MAIN dans `index.ts`.
- `src/events/<nom>.ts` — un handler exporté par event Discord (welcome, leave, ban,
  messageDelete…), branché dans `index.ts`.
- `src/config/*.config.ts` — config structurée du serveur (rôles, règles, langues).
- Domaines avec état (ex. `src/giveaways/`) : dossier dédié avec storage/scheduler/
  embed/handler séparés.

## Conventions

- ESM strict : imports relatifs avec extension `.js` (`./commands/clear.js`) même en .ts.
- Textes visibles par les utilisateurs **en français**, préfixés d'un emoji de statut
  (❌ erreur, ✅ succès) ; réponses sensibles/admin en éphémère via `flags: 64`.
- Commandes admin : garde `hasAdminRole(interaction, adminRoleId)` de `src/utils.ts`
  côté handler — les permissions Discord seules ne suffisent pas.
- Toute I/O Discord dans un try/catch ; jamais d'interaction laissée sans réponse
  (limite de 3s → `deferReply` si traitement long).
- `process.on("unhandledRejection")` en tête de chaque index — à conserver.
- Nouvelle variable d'env : l'ajouter au `.env.example` du bot concerné.
- Pas de tests automatisés dans ce repo : la validation = `pnpm -r build` (tsc strict)
  + test manuel sur le serveur Discord.
