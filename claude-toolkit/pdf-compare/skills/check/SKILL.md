---
description: Quality gate de pdf-compare — pytest avec coverage comme en CI, plus black/flake8/mypy, en vérifiant la compatibilité Python 3.9. À lancer avant commit ou quand l'utilisateur demande si tout passe.
argument-hint: "[--fix] [--fast pour sauter les tests slow]"
---

# /check — Quality gate (pdf-compare)

```bash
pytest --cov=pdf_compare --cov-report=term-missing   # 1. exactement comme la CI
black --check src/ tests/                            # 2. format
flake8 src/ tests/                                   # 3. lint
mypy src/                                            # 4. typecheck
```

- `--fast` dans `$ARGUMENTS` : `pytest -m "not slow"` à la place de la suite complète.
- `--fix` : `black src/ tests/` (sans `--check`) puis re-vérifie flake8.
- Si l'environnement n'a pas les deps : `pip install -e ".[dev]"` d'abord.

## Vigilances spécifiques

- **Compat 3.9** : la CI teste 3.9 → 3.12. Si tu tournes en local sur 3.12, vérifie à la
  lecture que le code n'utilise rien de >3.9 (annotations `X | Y` nues, `match`,
  `tomllib`…). C'est LA cause classique de "vert local, rouge CI" sur ce repo.
- Les tests qui manipulent des PDFs les génèrent à la volée — un échec sur fichier
  manquant signifie qu'un test attend un PDF non généré, pas qu'il faut committer un
  binaire.
- Markers stricts (`--strict-markers`) : un nouveau marker doit être déclaré dans
  `pytest.ini` sinon toute la suite échoue.
- Couverture : compare le `term-missing` avant/après tes changements — un nouveau module
  sans test se voit immédiatement.

## Rapport

Tableau étape / ✅-❌ / erreur exacte. Pour un échec mypy ou flake8, cite fichier:ligne
et propose le fix. Précise la version Python locale utilisée.
