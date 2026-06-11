---
description: Créer un composant/widget UI du dashboard (card, grille, graphique, table) conforme aux conventions shadcn/Tailwind/Recharts du projet — dark mode, états stale/erreur, auto-refresh.
argument-hint: "<nom du widget> <ce qu'il affiche>"
---

# /new-widget — Widget dashboard

## Avant d'écrire

Ouvre 2 composants voisins du même type dans `src/components/<domaine>/` (ex.
`SensorCard.tsx`, `SensorGrid.tsx` pour du monitoring) et calque structure, imports et
nommage. Le widget doit être indistinguable du code existant.

## Règles du projet

- **Données** : via le hook `use<Source>` existant (ou crée-le sur le modèle de
  `usePRTG.ts`). Jamais de `fetch` direct dans un composant.
- **Primitives** : composants shadcn de `src/components/ui/` (Card, Badge, Tabs,
  Tooltip…). S'il manque une primitive, installe-la via `npx shadcn@latest add <nom>` —
  ne la code pas à la main dans `ui/`.
- **Graphiques** : Recharts, en suivant un graphique existant (couleurs thème, tooltip,
  responsive container).
- **Tables** : TanStack Table (+ `@tanstack/react-virtual` si potentiellement longue) —
  modèle dans les composants tickets/transfers.
- **Icônes** : lucide-react. **Dates** : date-fns + `formatters.ts`. **Classes** :
  `cn()` de `src/lib/utils.ts`.

## États obligatoires (le dashboard tourne en NOC, tout doit dégrader proprement)

1. **Loading** : skeleton, pas de spinner plein écran.
2. **Stale** : si les items portent `_stale: true`, indique visuellement que la donnée
   est périmée (comme le font les widgets existants).
3. **Erreur / source down** : message compact dans le widget, le reste de la page reste
   fonctionnel.
4. **Multi-instances** : les données portent `_instanceId`/`_instanceName` — affiche
   l'instance quand il y en a plusieurs.
5. **Vide** : état explicite ("Aucune alerte") plutôt qu'un widget blanc.

Dark mode par défaut : utilise les tokens de thème Tailwind, jamais de couleur en dur.

## Finition

`npx tsc --noEmit && npx eslint src/`, puis vérifie le rendu en dev si possible.
