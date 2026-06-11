---
description: Scaffolder une slash command Discord complète (discord.js) — définition, handler, permissions, réponses éphémères/embeds — en suivant la structure des commandes existantes du bot.
argument-hint: "<nom de la commande> <ce qu'elle fait>"
---

# /new-discord-command — Nouvelle slash command

## Avant d'écrire

1. Repère la structure du bot : où vivent les commandes existantes (`src/commands/`,
   `commands/`…), comment elles sont enregistrées (loader dynamique ? tableau ? script de
   deploy des commandes ?), et ouvre 2 commandes existantes comme modèles.
2. Identifie la version de discord.js (`package.json`) — les builders
   (`SlashCommandBuilder`) et types d'interaction varient entre majeures.

## Construction

- **Définition** : `SlashCommandBuilder` — nom en minuscules sans espaces, description
  courte, options typées (`addStringOption`, `addUserOption`…) avec `setRequired` correct.
  Sous-commandes si la commande a plusieurs verbes plutôt que des options mode/action.
- **Permissions** : `setDefaultMemberPermissions` pour les commandes admin/modération, et
  re-vérification côté handler (les perms Discord côté client ne suffisent pas).
- **Handler** :
  - `await interaction.deferReply()` dès que le traitement peut dépasser ~2s (limite de
    3s avant expiration du token d'interaction), `ephemeral: true` pour les réponses
    sensibles ou de confirmation.
  - try/catch global : en cas d'erreur, répondre quelque chose à l'utilisateur
    (`editReply`/`followUp` selon l'état) — jamais d'interaction laissée sans réponse.
  - Embeds pour les sorties riches (couleur cohérente avec le reste du bot, footer/
    timestamp si les autres en ont).
- **Enregistrement** : ajoute la commande au mécanisme existant du repo (loader, index,
  script de deploy). Rappelle dans ton rapport qu'il faudra (re)déployer les définitions
  de commandes (guild = instantané, global = jusqu'à 1h de propagation).

## Finition

Typecheck + lint du repo, et si le bot a un mode dev/guild de test, indique comment
tester la commande.
