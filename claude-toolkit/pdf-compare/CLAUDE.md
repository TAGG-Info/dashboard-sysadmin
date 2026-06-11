# pdf-compare

Outil CLI Python de comparaison visuelle de PDF : rendu des pages en images (PyMuPDF),
diff pixel-par-pixel (numpy/scipy), rapports PDF/HTML/JSON/images. Distribué via pip
(`pdf-compare = pdf_compare.cli:main`), compatible Python 3.9 → 3.12, Windows/Linux/macOS.

## Commandes

```bash
pip install -e ".[dev]"                      # setup dev
pytest --cov=pdf_compare --cov-report=term-missing   # tests (= la CI)
pytest -m "not slow"                         # tests rapides seulement
black src/ tests/                            # format (line-length 100)
flake8 src/ tests/                           # lint
mypy src/                                    # typecheck (py3.9 target)
python create_test_pdfs.py                   # générer des PDF de test
```

La CI teste sur la matrice Python 3.9/3.10/3.11/3.12 — toute syntaxe ou API doit rester
compatible 3.9 (pas de `match`, pas de `X | Y` dans les annotations sans
`from __future__ import annotations`).

## Architecture — pipeline en modules (`src/pdf_compare/`)

```
cli.py        → commande Click unique, toutes les options --output-*
comparator.py → orchestration de la comparaison (entrée du pipeline)
renderer.py   → PDF → images haute résolution (PyMuPDF)
differ.py     → diff pixel + détection de régions (numpy/scipy)
stats.py      → similarité par page / globale, comptages
reporter.py   → génération des sorties : PDF annoté, HTML, JSON, images
```

Chaque étape est isolée : une nouvelle fonctionnalité se place dans LE module concerné,
pas en travers du pipeline.

## Conventions

- CLI : Click, une seule commande `main` — une nouvelle capacité = une nouvelle
  `@click.option` (avec valeur par défaut rétrocompatible), pas une sous-commande.
- **Exit codes contractuels** : 0 = PDFs identiques, 1 = différences. Des scripts
  utilisateurs en dépendent — ne jamais changer cette sémantique.
- Tests dans `tests/` (pytest, markers `slow` et `integration` déclarés dans
  `pytest.ini` — `--strict-markers` actif). Les tests génèrent leurs PDFs de test
  (reportlab / `create_test_pdfs.py`), jamais de binaire committé.
- black line-length 100 ; mypy configuré mais `disallow_untyped_defs = false` — type
  les nouvelles fonctions quand même.
- Versioning : `pyproject.toml` **ET** `src/pdf_compare/__init__.py` (`__version__`)
  doivent rester synchronisés ; CHANGELOG.md au format Keep a Changelog.
- Cross-platform : chemins via `pathlib`, pas de commande shell spécifique à un OS
  (les `.bat` à la racine sont des helpers Windows, ne pas les casser).
