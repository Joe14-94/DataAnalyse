
# Maintenance & Architecture - DataScope

Ce document résume les améliorations apportées à la structure de l'application et propose une feuille de route pour la maintenance future.

## 🛠 Améliorations Réalisées (Q1 2026)

### 1. Modularisation de la Logique Métier
- **Extraction des calculs de widgets** : La logique complexe de `useWidgetData` a été déplacée dans `logic/widgetEngine.ts`, permettant une meilleure testabilité et réutilisation.
- **Hook d'Export Unifié** : Création de `hooks/useExport.ts` pour centraliser les exports (CSV, Image), allégeant les composants de dashboard.
- **Découplage de DataContext** : Les fonctions de génération de données de démo et de gestion des sauvegardes ont été isolées dans `logic/dataService.ts`.

### 2. Optimisation Performance
- **Mémoïsation Granulaire** : Utilisation systématique de `React.memo` sur les composants de rendu de widgets (`WidgetCard`, `WidgetDisplay`) pour éviter les re-renders inutiles.
- **Composants Partagés** : Unification du composant `TreemapContent` pour garantir une cohérence visuelle et faciliter la maintenance des visualisations complexes.

### 3. Nouvelles Fonctionnalités et Robustesse
- **Mise à jour Automatique** : Implémentation du mode `updateMode: 'latest'` permettant aux widgets de dashboard de se mettre à jour dynamiquement lors de nouveaux imports, sans intervention manuelle.
- **Mode Édition (Data Explorer)** : Ajout d'une interface d'édition interactive permettant de modifier les valeurs des cellules directement dans la vue Données, avec persistance automatique.
- **Drilldown TCD Précis** : Amélioration du mode comparaison du TCD pour isoler précisément les données sources lors du drilldown (par source ID).

## 🚀 Recommandations pour le futur

### Architecture des Composants
- **UI Library** : Continuer à extraire les composants de bas niveau (Boutons, Inputs, Modales) vers `components/ui` pour créer un Design System cohérent.
- **Error Boundaries** : Implémenter des `ErrorBoundary` au niveau de chaque widget pour éviter qu'une erreur de calcul sur une donnée spécifique ne fasse planter tout le tableau de bord.

### Gestion de l'État
- **Context Splitting** : Bien que déjà entamé, le découplage des contextes dans `DataContext.tsx` pourrait être poussé plus loin en utilisant des Providers indépendants pour chaque domaine (Dataset vs Budget vs Forecast) afin de réduire encore la portée des mises à jour d'état.

### Performance & Scalabilité
- **Web Workers** : Pour les jeux de données dépassant 100 000 lignes, déporter les calculs du `pivotEngine` dans un Web Worker pour ne pas bloquer le thread principal de l'UI.
- **Virtualisation** : Généraliser l'usage de `@tanstack/react-virtual` pour toutes les listes et grilles volumineuses (déjà fait pour le TCD).

### Qualité du Code
- **Validation Schema** : Utiliser `Zod` pour valider les données importées et les fichiers de configuration chargés depuis l'IndexedDB.
- **Tests d'Intégration** : Ajouter des tests Playwright/Cypress pour valider les flux critiques (Import -> TCD -> Création Widget -> Dashboard).
