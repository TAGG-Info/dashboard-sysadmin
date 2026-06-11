---
description: Ajouter une slash command à un des bots 7DS (general, codes-promo, changelog, notifications) en suivant le pattern maison build/handle + câblage manuel dans index.ts.
argument-hint: "<bot> <nom de la commande> <ce qu'elle fait>"
---

# /new-command — Slash command 7DS

Le repo n'utilise PAS de framework de commandes : pattern maison à répliquer exactement.
**Modèles à lire d'abord** : `bots/general/src/commands/clear.ts` (commande simple avec
garde admin) et `giveaway.ts` (commande riche). Identifie le bot cible depuis
`$ARGUMENTS` (par défaut : `general`, qui héberge les commandes serveur).

## 1. Fichier `bots/<bot>/src/commands/<nom>.ts`

Deux exports, nommage strict :

```ts
import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { hasAdminRole } from "../utils.js";   // ⚠️ extension .js obligatoire (ESM)

export function buildXxxCommand() {
  return new SlashCommandBuilder()
    .setName("xxx")                            // minuscules, sans espace
    .setDescription("Description en français") // les users du serveur sont FR
    .addStringOption(/* options typées, setRequired/setMinValue corrects */);
}

export async function handleXxxCommand(
  interaction: ChatInputCommandInteraction,
  adminRoleId: string,                         // si commande admin
) { /* ... */ }
```

Règles du handler :
- Commande admin → garde `hasAdminRole` en premier, refus en éphémère :
  `{ content: "❌ Vous n'avez pas la permission...", flags: 64 }`.
- Traitement potentiellement > 2s → `await interaction.deferReply()` immédiat
  (`{ flags: 64 }` si la réponse doit rester privée).
- try/catch autour des appels Discord ; en cas d'erreur, TOUJOURS répondre quelque chose
  (`reply` ou `editReply` selon l'état de l'interaction).
- Messages : français + emoji statut (❌/✅), embeds pour les sorties riches comme les
  commandes existantes.

## 2. Câblage dans `bots/<bot>/src/index.ts` (3 points, tous manuels)

1. Import : `import { buildXxxCommand, handleXxxCommand } from "./commands/xxx.js";`
2. Ajout de `buildXxxCommand()` là où les commandes sont enregistrées via REST
   (`Routes.applicationGuildCommands`).
3. Dispatch : nouvelle branche dans le handler d'interactions, en passant les mêmes
   dépendances que les voisines (adminRoleId, IDs de channels…).

Nouvelle config nécessaire (channel, rôle…) → variable d'env en tête d'`index.ts` comme
les existantes + ajout au `.env.example` du bot.

## 3. Validation

```bash
pnpm --filter @7ds-bots/<bot> build    # tsc strict doit passer
```

Pas de tests auto dans ce repo. Rappelle dans ton rapport : les commandes sont
enregistrées en guild au démarrage → redémarrer le bot (`pm2 restart 7ds-<bot>` ou
`pnpm dev` local) pour voir la commande, effet immédiat (pas le délai des commandes
globales).
