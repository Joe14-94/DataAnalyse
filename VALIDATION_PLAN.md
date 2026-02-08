# Plan de Validation et de Test - Refactorisation de l'Application

## 1. Objectifs du Plan
Ce plan vise à garantir que la refactorisation massive des six pages monolithiques n'a introduit aucune régression fonctionnelle et que la nouvelle architecture (Hooks + Reducers + Sous-composants) est techniquement saine.

## 2. Stratégie de Test

### 2.1 Tests Techniques
- **Validation TypeScript :** Aucun usage de `any` dans les props des nouveaux composants. Compilation stricte réussie via `pnpm build`.
- **Tests Unitaires :** Validation de la logique métier extraite dans les hooks personnalisés.
- **Performance :** Vérification de l'absence de re-rendus excessifs via les DevTools React (comparaison avant/après refactorisation).

### 2.2 Tests Fonctionnels (Smoke Tests)
Pour chaque module refactorisé, les scénarios suivants doivent être validés :

#### Budget
- Création d'un nouveau budget.
- Saisie de valeurs dans la grille.
- Navigation entre les versions.
- Validation d'un workflow budgétaire (soumission/approbation).

#### Studio d'Analyse (Analytics)
- Changement de dimension et de métrique.
- Application de filtres (Égal, Contient, Commence par).
- Export HTML interactif (vérification de l'affichage des données).
- Export PDF/PNG du graphique.
- Ajout au tableau de bord.

#### Data Explorer
- Changement de dataset.
- Recherche globale et filtres par colonne.
- Édition de cellules en "Mode Édition".
- Création et modification de champs calculés.
- Export CSV/Excel des données filtrées.

#### Forecast
- Création d'un forecast mensuel et d'un rolling forecast.
- Génération de prédictions ML (si données historiques présentes).
- Création de snapshots pour le rolling forecast.
- Consultation des rapports de réconciliation.

#### Settings
- Import de plans comptables (PCG/IFRS).
- Création d'axes analytiques.
- Lancement de l'audit de diagnostic.
- Export/Import de backups JSON.

## 3. Procédures de Validation

### Étape 1 : Build de Production
Exécuter `pnpm build` pour s'assurer que le typage et le bundling sont corrects.

### Étape 2 : Tests Automatisés
Exécuter `pnpm test` pour vérifier que les règles de calcul et les utilitaires fonctionnent toujours.

### Étape 3 : Tests Visuels (Playwright)
Utiliser des scripts de capture d'écran pour comparer l'UI avec les versions précédentes et s'assurer que les composants sont correctement rendus.

## 4. Matrice de Non-Régression

| Module | Fonctionnalité Critique | État |
| :--- | :--- | :--- |
| Core | Navigation Inter-Pages | ✅ Validé |
| Budget | Calcul des Totaux | ✅ Validé |
| Analytics | Graphiques Dynamiques | ✅ Validé |
| Data Explorer | Persistance IndexedDB | ✅ Validé |
| Settings | Intégrité des Backups | ✅ Validé |
| Forecast | Snapshots Temporels | ✅ Validé |
