---
description: Ajouter un format de sortie ou une option de rapport à pdf-compare (ex. CSV, Markdown, XML, nouveau mode d'annotation) en suivant le pipeline cli → comparator → reporter.
argument-hint: "<format ou option à ajouter>"
---

# /new-output-format — Nouveau format de rapport

Ajoute `$ARGUMENTS` en suivant le chemin des formats existants (PDF/HTML/JSON/images).
**Avant d'écrire** : lis `reporter.py` en entier (~370 lignes) et la signature de `main`
dans `cli.py` pour voir comment les `--output-*` existants circulent.

## Étapes

1. **`reporter.py`** — une fonction de génération dédiée, sur le modèle des existantes :
   - Reçoit les stats/diffs déjà calculés (objets de `stats.py`/`differ.py`) — le
     reporter ne recalcule RIEN, il met en forme.
   - Écrit via `pathlib`, encode en UTF-8 explicite (compat Windows).

2. **`cli.py`** — nouvelle `@click.option('--output-<format>', type=click.Path(...))`
   alignée sur le style des options existantes (help court, valeur par défaut None =
   désactivé). Brancher l'appel au reporter dans `main` au même endroit que les autres
   formats.

3. **Aucun changement de comportement par défaut** : sans la nouvelle option, sortie et
   exit codes strictement identiques (0 = identiques, 1 = différences — contrat absolu).

4. **Tests** — dans `tests/` :
   - Génère deux PDFs de test à la volée (voir comment `test_comparator.py` ou
     `create_test_pdfs.py` les fabriquent avec reportlab).
   - Vérifie : fichier créé, contenu structurellement valide (parse le JSON/CSV/XML
     produit), cas "PDFs identiques" ET "PDFs différents".
   - Marque `slow` si le test rend des pages en haute résolution.

5. **Docs** — section dans `README.md` (bloc d'exemples d'usage) + entrée `### Added`
   dans `CHANGELOG.md` sous `## [Unreleased]` (crée la section si absente).

## Compat (bloquant)

Python 3.9 minimum — pas d'union `X | Y` nue, pas de `match`. Si le format demande une
nouvelle dépendance, ajoute-la dans `pyproject.toml` AVEC borne de version majeure
(comme les deps existantes) et questionne d'abord : la stdlib suffit souvent (csv, xml,
json). Termine par `/check`.
