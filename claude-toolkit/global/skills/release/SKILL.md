---
description: Préparer une release — version bump semver, changelog généré depuis les commits, tag git. À utiliser quand l'utilisateur veut publier/tagger une nouvelle version d'un projet.
argument-hint: "[patch|minor|major, ou version exacte]"
disable-model-invocation: true
---

# /release — Préparer une release

## 1. Pré-vol (bloquant)

- Branche par défaut à jour, working tree propre (`git status`). Sinon : STOP, signale.
- Quality gate vert : déroule la logique de `/check`. Pas de release sur du rouge.

## 2. Déterminer la version

- Si `$ARGUMENTS` donne `patch`/`minor`/`major` ou une version exacte : utilise-la.
- Sinon, déduis-la des commits depuis le dernier tag (`git log $(git describe --tags
  --abbrev=0)..HEAD --oneline`) : un `feat` → minor, que des `fix`/`chore` → patch,
  un `BREAKING CHANGE` ou `!` → major. Annonce ton choix et la raison.

## 3. Bump + changelog

- **Node/TS** : `npm version <ver> --no-git-tag-version` (met à jour package.json +
  lockfile). **Python** : version dans `pyproject.toml`.
- Changelog : regroupe les commits depuis le dernier tag par type (Features / Fixes /
  Autres), en langage humain — décris l'effet pour l'utilisateur, pas le commit. Ajoute
  la section en tête de `CHANGELOG.md` (crée le fichier s'il n'existe pas).

## 4. Commit + tag

```
git add -A && git commit -m "chore(release): vX.Y.Z"
git tag -a vX.Y.Z -m "vX.Y.Z"
```

## 5. Push — demande confirmation d'abord

Le push du tag est public et déclenche potentiellement de la CI/CD. Récapitule (version,
changelog) et attends le OK avant `git push --follow-tags`. Si le repo a un workflow de
release GitHub (vérifie `.github/workflows/`), mentionne ce qui va se déclencher.
