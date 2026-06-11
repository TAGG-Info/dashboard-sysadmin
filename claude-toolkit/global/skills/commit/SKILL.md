---
description: Créer un ou plusieurs commits propres à partir des changements en cours — analyse du diff, message Conventional Commits, découpage logique si nécessaire. À utiliser quand l'utilisateur demande de committer son travail.
argument-hint: "[--amend | message optionnel]"
---

# /commit — Commit propre

## Démarche

1. **État des lieux** (en parallèle) :
   - `git status` — fichiers modifiés/non suivis
   - `git diff` et `git diff --staged` — contenu réel des changements
   - `git log --oneline -10` — style des messages récents du repo

2. **Analyse** : identifie ce que les changements font *fonctionnellement*. Si le diff
   mélange plusieurs sujets indépendants (ex. un fix + un refactor sans rapport), propose
   un découpage en plusieurs commits et stage les fichiers groupe par groupe.

3. **Garde-fous** — vérifie avant de stage :
   - Pas de secrets (`.env`, clés, tokens, mots de passe en dur). Si trouvé : STOP, signale-le.
   - Pas de fichiers générés ou de debug (`console.log` oubliés, `node_modules`, builds).
   - Si des hooks husky/lint-staged existent, laisse-les tourner — ne les contourne
     jamais avec `--no-verify` sans demande explicite.

4. **Message** : Conventional Commits, impératif, concis.
   - Format : `type(scope): description` — ex. `feat(veeam): add job retry status to backups page`
   - Le corps (optionnel) explique le *pourquoi*, pas le *quoi*.
   - En anglais, sauf si l'historique du repo est en français.

5. **Exécution** : `git add` ciblé (jamais `git add -A` à l'aveugle), puis `git commit`.
   Si `$ARGUMENTS` contient `--amend`, amende le dernier commit (seulement s'il n'est pas
   déjà pushé). Si `$ARGUMENTS` contient un message, utilise-le comme base mais corrige-le
   s'il ne reflète pas le diff.

6. **Rapport** : affiche le(s) hash(s) + message(s) créés. Ne push PAS sauf demande explicite.
