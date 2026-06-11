---
description: Publier une version de pdf-compare — bump synchronisé pyproject.toml + __init__.py, CHANGELOG au format Keep a Changelog, tag git.
argument-hint: "[patch|minor|major ou version exacte]"
disable-model-invocation: true
---

# /release — Release pdf-compare

## 1. Pré-vol (bloquant)

- `git status` propre, branche `main` à jour.
- Suite complète verte : `pytest --cov=pdf_compare`, `black --check src/ tests/`,
  `flake8 src/ tests/`, `mypy src/`. Pas de release sur du rouge.

## 2. Version

- `$ARGUMENTS` donne le bump ou la version ; sinon déduis depuis
  `git log $(git describe --tags --abbrev=0)..HEAD --oneline` (feature → minor,
  fixes → patch, rupture du contrat CLI/exit-codes → major) et annonce ton choix.
- **Deux fichiers à bumper, toujours ensemble** (c'est le piège du repo) :
  - `pyproject.toml` → `version = "X.Y.Z"`
  - `src/pdf_compare/__init__.py` → `__version__ = "X.Y.Z"`
  - Vérifie qu'ils sont identiques après édition.

## 3. CHANGELOG.md

Format Keep a Changelog déjà en place : nouvelle section `## [X.Y.Z] - AAAA-MM-JJ` en
tête (sous Unreleased si présent), sous-sections `### Added` / `### Changed` / `### Fixed`.
Décris l'effet utilisateur (nouvelle option CLI, comportement), pas les commits.

## 4. Commit + tag

```bash
git add pyproject.toml src/pdf_compare/__init__.py CHANGELOG.md
git commit -m "chore(release): vX.Y.Z"
git tag -a vX.Y.Z -m "pdf-compare vX.Y.Z"
```

## 5. Push — confirmation d'abord

Récapitule version + changelog et attends le OK avant `git push --follow-tags`.
Si une publication PyPI est envisagée : `python -m build` pour valider que le paquet se
construit (la config setuptools pointe sur `src/`), mais ne publie jamais sur PyPI sans
demande explicite.
