---
description: Quality gate complet du projet courant — détecte la stack (TS/Next, Node, Python…) et enchaîne typecheck, lint, tests et build. À lancer avant un commit, une PR, ou quand l'utilisateur demande "vérifie que tout passe".
argument-hint: "[--fix pour auto-corriger lint/format]"
---

# /check — Quality gate

## Détection de la stack

Regarde ce qui existe à la racine et choisis la suite correspondante :

| Indice | Suite à exécuter |
|---|---|
| `package.json` + `tsconfig.json` | `npx tsc --noEmit` → eslint → tests → build |
| `package.json` seul | lint → tests |
| `pyproject.toml` / `requirements.txt` | `ruff check` (ou flake8) → `mypy` si configuré → `pytest` |
| `docker-compose.yml` seul | `docker compose config -q` (validation syntaxe) |

**Priorité aux scripts du repo** : lis `scripts` dans `package.json` (ou le Makefile, ou
le workflow CI dans `.github/workflows/`) et utilise les mêmes commandes que la CI plutôt
que des commandes génériques. Si la CI fait `npx eslint src/`, fais pareil.

## Exécution

1. Lance les étapes **dans l'ordre CI** (typecheck → lint → tests → build), chacune
   complètement même si une précédente échoue (sauf si le build dépend du typecheck).
2. Si `$ARGUMENTS` contient `--fix` : lance d'abord `eslint --fix` / `prettier --write` /
   `ruff check --fix`, puis re-vérifie.
3. Tests : mode run non-interactif (`vitest run`, jamais `vitest` en watch).

## Rapport final

Tableau compact : étape / ✅-❌ / détail si échec. Pour chaque échec, cite le fichier:ligne
et l'erreur exacte, puis propose le fix — mais n'applique les fixes non triviaux que si
on te le demande. Ne déclare jamais "tout est vert" si une étape a été sautée : dis
lesquelles ont tourné.
