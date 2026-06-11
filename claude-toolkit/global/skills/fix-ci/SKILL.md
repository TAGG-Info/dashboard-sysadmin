---
description: Diagnostiquer et réparer un échec de CI GitHub Actions — récupère les logs du run en échec, identifie la cause racine, reproduit en local, corrige. À utiliser quand la CI est rouge ou que l'utilisateur demande de "réparer le build".
argument-hint: "[numéro de PR ou de run, optionnel]"
---

# /fix-ci — Réparer la CI

## 1. Localiser l'échec

- Avec `gh` CLI : `gh run list --limit 5` puis `gh run view <id> --log-failed`.
- En environnement remote (pas de `gh`) : utilise les outils MCP GitHub
  (`actions_list`, `get_job_logs` avec `failed_only`).
- Si `$ARGUMENTS` donne une PR ou un run précis, va directement dessus.

## 2. Diagnostiquer — règle d'or : lis le VRAI log

Ne devine pas depuis le nom du job. Extrais l'erreur exacte (fichier, ligne, message).
Classe l'échec :

- **Code cassé** (typecheck/lint/test) → reproduis en local avec la même commande que la
  CI (lis le workflow YAML pour la connaître), corrige, re-lance localement.
- **Flaky** (timeout réseau, test instable) → relance le run une fois. Si ça re-échoue,
  ce n'est pas flaky : traite la cause.
- **Environnement CI** (version Node différente, cache npm corrompu, secret manquant) →
  compare le workflow avec le local ; propose le fix de workflow.
- **Dépendances** (lockfile désynchronisé, `npm ci` qui échoue) → `npm install` propre et
  commit du lockfile.

## 3. Corriger et vérifier

1. Applique le fix minimal qui traite la cause racine — pas de désactivation de test ou
   de `// eslint-disable` pour faire passer au vert, sauf demande explicite.
2. Re-lance localement la commande CI qui échouait. Elle doit passer AVANT de pousser.
3. Commit (`fix(ci): ...` ou le type approprié) et push seulement si la tâche le prévoit.
4. Rapporte : cause racine en une phrase, fix appliqué, preuve locale que ça passe.
