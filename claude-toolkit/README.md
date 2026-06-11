# Claude Toolkit — un pack par repo

Skills Claude Code **sur-mesure par repo**, écrits après analyse du code réel de chaque
projet (architecture, conventions, commandes CI exactes, pièges connus). Chaque pack
contient un `CLAUDE.md` (contexte permanent du repo) et des skills invocables en
`/nom-du-skill`.

> Ce dossier vit sur une branche `claude/...` de dashboard-sysadmin uniquement parce que
> la session devait cibler un repo. Récupère les packs, installe-les chacun dans leur
> repo, puis supprime la branche.

---

## Installation — dans chaque repo concerné

```bash
# Exemple pour pdf-compare (pareil pour les autres)
cd pdf-compare
mkdir -p .claude
cp -r <toolkit>/pdf-compare/skills .claude/skills
cp <toolkit>/pdf-compare/CLAUDE.md ./CLAUDE.md
git add .claude CLAUDE.md && git commit -m "chore: add Claude Code config"
```

Committés dans le repo, les packs profitent à toutes les sessions (locales, web, et
collègues qui clonent). Si un `CLAUDE.md` existe déjà, fusionne au lieu d'écraser.

---

## `dashboard-sysadmin/` — dashboard NOC Next.js 16

Basé sur : factory `createApiRoute`, cache SWR Redis + circuit breaker, multi-instances,
CI tsc→eslint→vitest→build, stack Docker/Caddy.

| Skill | Usage |
|---|---|
| `/new-source` | Ajouter une 7ᵉ intégration (config-types → client ky → routes → hook → UI → settings → tests) |
| `/api-route` | Route API conforme : factory pour les sources, auth+zod+rate-limit pour le reste |
| `/new-widget` | Widget shadcn/Recharts avec les états obligatoires (loading, stale, source down, multi-instances) |
| `/check` | Rejoue exactement la CI en local (+ `--fix`, `--e2e`) |
| `/deploy-docker` | Debug/préparation de la stack compose (app + Redis + Caddy, config chiffrée) |

## `pdf-compare/` — CLI Python de diff visuel PDF

Basé sur : pipeline cli→comparator→renderer→differ→stats→reporter, CI matrice Python
3.9–3.12, exit codes contractuels, double versioning pyproject/`__init__.py`.

| Skill | Usage |
|---|---|
| `/check` | pytest --cov comme la CI + black/flake8/mypy, avec garde-fou compat 3.9 |
| `/new-output-format` | Ajouter un format de rapport (CSV, Markdown…) sans toucher au comportement par défaut |
| `/release` | Bump synchronisé des 2 fichiers de version + CHANGELOG Keep a Changelog + tag |

## `7ds-origin-bots/` — monorepo pnpm de 4 bots Discord

Basé sur : pattern maison `build<Nom>Command`/`handle<Nom>Command` câblé à la main dans
`index.ts`, ESM avec imports `.js`, textes FR + `flags: 64`, PM2 ecosystem.

| Skill | Usage |
|---|---|
| `/new-command` | Slash command complète : fichier commande + les 3 points de câblage dans index.ts |
| `/new-bot` | 5ᵉ bot dans le workspace : package, tsconfig, index, .env.example, entrée PM2 |
| `/deploy` | Build workspace + reload PM2 + diagnostic d'un bot qui crash en boucle |

---

## Repos non couverts (et pourquoi)

- **7DS-Origin, media-stack, RustDesk, Optralis** : privés et hors du scope de cette
  session — lecture refusée, impossible de faire du sur-mesure honnête. Pour avoir leur
  pack : lance une session Claude Code directement dans ces repos et demande le même
  travail (le `CLAUDE.md` de chaque pack ici sert de modèle de ce qu'il faut produire).
- **StudiTok** : repo vide à ce jour.
