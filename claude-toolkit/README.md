# Claude Toolkit — Skills & Commandes

Pack de skills Claude Code taillé pour tes projets (dashboard-sysadmin, 7DS-Origin-Bots,
media-stack, pdf-compare, Optralis…). Une fois installés, les skills sont invocables en
tapant `/nom-du-skill` dans Claude Code, et Claude peut aussi les déclencher tout seul
quand le contexte correspond à leur description.

> Ce dossier vit sur une branche `claude/...` de dashboard-sysadmin uniquement parce que
> l'environnement d'exécution l'exigeait. Récupère-le, installe-le, puis supprime la branche.

---

## Installation

### 1. Pack global (toutes sessions, tous projets)

À copier dans `~/.claude/` sur ta machine :

```bash
cp -r claude-toolkit/global/skills/* ~/.claude/skills/
# Optionnel : tes préférences perso (fusionne si tu as déjà un fichier)
cat claude-toolkit/global/CLAUDE.md >> ~/.claude/CLAUDE.md
```

### 2. Packs par projet

À copier dans le dossier `.claude/` de chaque repo concerné (et à committer avec le repo,
comme ça toute session Claude Code — locale ou web — en profite) :

```bash
# Dans dashboard-sysadmin
cp -r claude-toolkit/projects/dashboard-sysadmin/skills .claude/skills
cp claude-toolkit/projects/dashboard-sysadmin/CLAUDE.md ./CLAUDE.md

# Dans 7DS-Origin-Bots (et 7DS-Origin si pertinent)
cp -r claude-toolkit/projects/discord-bots/skills .claude/skills
```

---

## Contenu

### Skills globaux (`~/.claude/skills/`)

| Skill | Usage |
|---|---|
| `/commit` | Commit propre : analyse du diff, message conventionnel, découpage si nécessaire |
| `/check` | Quality gate complet auto-détecté (tsc, eslint, vitest, build, ruff/pytest…) |
| `/fix-ci` | Diagnostique le dernier run GitHub Actions en échec et le répare |
| `/docker-debug` | Debug méthodique d'une stack docker compose (media-stack, dashboard…) |
| `/release` | Version bump + changelog + tag, adapté au type de projet |

### Skills projet — dashboard-sysadmin

| Skill | Usage |
|---|---|
| `/new-source` | Ajouter une intégration API complète (client lib, cache, route, UI) en suivant les patterns existants |
| `/api-route` | Créer une route API conforme (api-handler, auth, rate-limit, cache, zod) |
| `/new-widget` | Créer un composant dashboard shadcn/Recharts conforme aux conventions UI |

### Skills projet — bots Discord (7DS-Origin-Bots)

| Skill | Usage |
|---|---|
| `/new-discord-command` | Scaffolder une slash command Discord complète (definition, handler, permissions) |

### Fichiers CLAUDE.md

- `global/CLAUDE.md` — tes préférences perso (langue, style de réponse, habitudes git)
- `projects/dashboard-sysadmin/CLAUDE.md` — conventions du repo pour que Claude soit
  efficace dès la première requête (architecture, commandes, patterns à respecter)

---

## Rappels utiles

- Les skills **projet** (committés dans `.claude/skills/` du repo) sont partagés : un
  collègue qui clone le repo les a aussi.
- Tu peux passer des arguments : `/new-source zabbix`, `/fix-ci`, `/commit --amend`…
- Pour créer un nouveau skill rapidement : crée `.claude/skills/mon-skill/SKILL.md` avec
  un frontmatter `description:` et des instructions en markdown. C'est tout.
