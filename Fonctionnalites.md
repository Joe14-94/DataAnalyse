# Référentiel des Fonctionnalités et Historique des Demandes

Ce document est le référentiel unique de DataScope. Il liste toutes les fonctionnalités disponibles, classées par page du menu, ainsi que l'historique des ajustements et modifications demandés. Ce document sert de base pour les tests de non-régression.

**Version de référence** : 18-02-2026-01
**Dernière mise à jour** : 18/02/2026

---

## 📊 1. Tableau de Bord (Accueil)

| Fonctionnalité | Description | Date Demande | Type |
| :--- | :--- | :--- | :--- |
| **Widgets KPI** | Affichage d'indicateurs clés avec tendance vs période précédente. | Historique | Core |
| **Graphiques Variés** | Barres, Courbes, Pie, Radar, Treemap, Funnel. | Historique | Core |
| **Mode Édition** | Drag & drop et redimensionnement des widgets. | Historique | Core |
| **Filtres Transversaux** | Le clic sur un graphique filtre l'ensemble du tableau de bord. | Historique | Core |
| **Widget Texte** | Ajout de blocs de texte libre pour le contexte. | Historique | Core |
| **Export PNG/PDF** | Exportation visuelle du dashboard ou des widgets. | 2026-02-10 | Ajustement |
| **Mise à jour Auto** | Les widgets pointent vers la version 'latest' d'un dataset. | 2026-02-15 | Ajustement |

---

## 📑 2. Données (Data Explorer)

| Fonctionnalité | Description | Date Demande | Type |
| :--- | :--- | :--- | :--- |
| **Grille Virtuelle** | Affichage performant de +100k lignes (tanstack-virtual). | Historique | Core |
| **Filtrage & Tri** | Filtres par colonne et tri multi-directionnel. | Historique | Core |
| **Mode Édition Directe** | Modification des cellules directement dans la grille. | 2026-02-05 | Ajustement |
| **Champs Calculés (V2)** | Interface complète avec +16 fonctions (Texte, Math, Logique). | 2026-02-12 | Modification |
| **Historique Ligne** | Drawer latéral affichant l'audit trail d'une donnée. | Historique | Core |
| **Recherche Globale** | Recherche plein texte optimisée (O(N)). | 2026-01-29 | Ajustement |
| **Formatage Cond.** | Coloration des cellules selon des règles métiers. | Historique | Core |
| **Copie Formule** | Bouton de copie rapide du résultat dans le modal de calcul. | 2026-02-18 | Ajustement |
| **VLOOKUP Intégré** | Enrichissement d'un dataset par jointure avec un autre. | 2026-02-01 | Core |
| **Ordre des colonnes** | Pouvoir changer l'ordre des colonnes | Historique | Core
| **Renommer une colonne** | Pouvoir renommer le libellé d'une colonne | Historique | Core 
| **Changer le type de données** | Pouvoir changer le typage des données. Lors du passage d'un type Nombre à Date, calcul et affichage de l'information au fomat JJ/MM/AAAA | Historique | Core
| **Barre de titre fixe** | La barre contenant le libellé de toutes les colonnes reste fixe lorsque l'utilisateur fait défiler verticalement le tableau | Historique |Core
| **Analyse de Qualité** | Analyse du profil de données (complétude, types, doublons) avec visualisations. | 2026-02-18 | Sprint 5 |

---

## 📥 3. Importation & ETL

| Fonctionnalité | Description | Date Demande | Type |
| :--- | :--- | :--- | :--- |
| **Import Multi-format** | Support Excel (.xlsx) et CSV. | Historique | Core |
| **Mapping Intelligent** | Apprentissage automatique des correspondances de colonnes. | Historique | Core |
| **Pipeline ETL (Page)** | Interface dédiée pour créer des flux de transformation complexes. | 2026-02-10 | Core |
| **Transformations** | Filtre, Sélection, Tri, Agrégation, Calcul, Division, Fusion. | 2026-02-10 | Core |
| **Preview Temps Réel** | Visualisation des données à chaque étape du pipeline. | 2026-02-10 | UX |
| **Sécurité Formules** | Remplacement de `eval()` par `FormulaParser` sécurisé. | 2026-02-14 | Sécurité |
| **Gestion Doublons** | Détection sur clé unique lors de l'importation. | Historique | Core |
| **Compression** | Stockage colonnaire compressé dans IndexedDB. | 2026-02-05 | Optimisation |
| **Optimisation Jointure** | Hoisting des mappings de clés dans `applyJoin` (O(N+M)). | 2026-02-15 | Performance |

---

## 📈 4. Studio d'Analyse & TCD

| Fonctionnalité | Description | Date Demande | Type |
| :--- | :--- | :--- | :--- |
| **Pivot Multi-niveaux** | Jusqu'à 3 niveaux de hiérarchie en lignes. | Historique | Core |
| **Comparaison Temp.** | Analyse N vs N-1 avec calcul d'écarts (%, Abs). | 2026-02-20 | Modification |
| **Drill-down** | Navigation vers le détail des lignes sources depuis une cellule. | Historique | Core |
| **Réinitialisation** | Bouton "Réinitialiser" pour vider toute la config du TCD. | 2026-02-15 | Ajustement |
| **Mode "Sans Valeur"** | Possibilité de générer un TCD sans métrique (liste unique). | 2026-02-16 | Ajustement |
| **Groupement Dates** | Agrégation auto par Année, Trimestre, Mois. | Historique | Core |
| **Sticky Headers** | Colonnes et lignes de titres fixées lors du scroll. | 2026-02-10 | UX |
| **Calculs de Totaux** | Lignes de total et sous-total automatiques. | Historique | Core |
| **Sélection Totaux** | Support de la sélection de cellules sur les lignes de Total. | 2026-02-22 | Ajustement |
| **Déployer/Regrouper** | Expand/Collapse des lignes par niveau de hiérarchie. | 2026-02-24 | Core |
| **Stats Avancées** | Agrégations statistiques : Médiane, Écart-type, Variance, Percentiles, etc. | 2026-02-18 | Sprint 5 |

---

## 💰 5. Budgets & Forecasts

| Fonctionnalité | Description | Date Demande | Type |
| :--- | :--- | :--- | :--- |
| **Éditeur de Budget** | Grille de saisie spécifique pour les données budgétaires. | 2026-01-25 | Core |
| **Versions de Budget** | Gestion de plusieurs scénarios (V1, V2, Final). | 2026-01-28 | Core |
| **Rolling Forecast** | Projection glissante basée sur le réalisé et le reste à faire. | 2026-02-08 | Core |
| **Snapshots** | Capture de l'état des prévisions à une date T. | 2026-02-12 | Ajustement |
| **Réconciliation** | Rapport comparatif entre Budget, Réalisé et Forecast. | 2026-02-14 | Modification |
| **Axes Analytiques** | Gestion de dimensions personnalisées pour le budget. | 2026-01-30 | Core |

---

## 🎨 6. Personnalisation & UI

| Fonctionnalité | Description | Date Demande | Type |
| :--- | :--- | :--- | :--- |
| **Logo Entreprise** | Personnalisation de l'interface avec le logo client (PDF incl.). | 2026-02-05 | Ajustement |
| **Thèmes & Styles** | Support Mode Sombre/Clair et styles Material/Glass. | 2026-02-12 | Core |
| **Palettes Couleurs** | 9 ambiances colorimétriques configurables. | 2026-02-12 | Core |
| **Densité d'Affichage** | Modes Expert (10px font), Compact et Confort. | 2026-02-14 | UX |
| **Polices Pro** | Sélection de polices (Inter, Outfit, Mono). | 2026-02-12 | UX |

---

## ⚙️ 7. Paramètres & Système

| Fonctionnalité | Description | Date Demande | Type |
| :--- | :--- | :--- | :--- |
| **Sauvegarde JSON** | Export/Import complet de la base de données locale. | Historique | Core |
| **Plans Comptables** | Importation de structures PCG / IFRS. | Historique | Core |
| **Calendriers Fiscaux** | Définition des périodes budgétaires (Mois, Trimestres). | 2026-01-25 | Core |
| **Diagnostics** | Suite de tests automatiques pour valider l'intégrité. | 2026-02-01 | Maintenance |
| **Mode Local** | Garantie de confidentialité (aucune donnée sortante). | Historique | Core |

---

## 🛠 8. Transversal (Accessibilité & Performance)

| Fonctionnalité | Description | Date Demande | Type |
| :--- | :--- | :--- | :--- |
| **Undo / Redo** | Historique global des actions sur 20 niveaux. | 2026-02-10 | UX |
| **Focus Trap** | Accessibilité clavier sur tous les modaux (WCAG). | 2026-02-13 | Accessibilité |
| **Standard text-xs** | Uniformisation des tailles de texte (min 12px). | 2026-02-14 | Design |
| **Escape Key** | Fermeture systématique des modaux via la touche Echap. | 2026-02-15 | UX |
| **Cache de Calcul** | Optimisation des performances via `FORMULA_CACHE`. | 2026-01-31 | Performance |
| **Virtualisation** | Affichage de 100k+ lignes sans latence (Bi-directionnel). | 2026-01-15 | Performance |
| **Ascenseurs Fins** | Réduction de la largeur des scrollbars (3px) pour plus de finesse. | 2026-02-12 | UX |
| **Format des dates** | Toutes les dates sont au format Français | Historique | Core
| **Utilisation des majuscules** | Les majuscules sont utilisées en respectant les règles d'usage en Français |Historique | Core

---

## 📝 Historique des Ajustements Récents (Journal Jules)

*Cette section récapitule les modifications spécifiques demandées pour éviter les régressions sur les détails fins.*

### Février 2026
- **2026-02-18** : Sprint 5 - Analyse de Données & Stats : Implémentation du moteur de Profiling de données (logic/dataProfiling.ts) et du panneau de visualisation Recharts. Ajout de 10 nouvelles métriques statistiques dans le moteur de Pivot (Médiane, StdDev, Variance, P25, P75, etc.).
- **2026-02-18** : Sprint Finalisation Qualité (Fixes) : Résolution de 55 erreurs de lint, suppression des imports/variables inutilisés, correction du TDZ dans le TCD, et validation du build TypeScript strict.
- **2026-02-17** : Sprint Finalisation Qualité : Nettoyage exhaustif du lint (zéro erreur), correction des circularités de dépendances, fiabilisation des types `any`, et conformité stricte au `react-hooks/rules-of-hooks`.
- **2026-02-16** : Sprint UX & Architecture (P1) : Modularisation de la logique métier (`useETLPipelineLogic`, `useImportLogic`). Remplacement des alertes natives par un système de dialogue asynchrone (`ConfirmDialog`) et notifications `sonner`.
- **2026-02-15** : Sprint Sécurité & Production (P0) : Durcissement de la CSP (retrait de `unsafe-inline`), validation sécurisée des logos (`validateLogoUri`), et automatisation de la synchronisation CSP/Headers pour le déploiement Cloudflare.
- **2026-02-13** : Audit technique senior (Architecture SPA) : Décomposition des hooks complexes (`usePivotExport`, `usePivotDrilldown`), harmonisation UTC des dates, optimisation des dédoublonnages (O(N)) et amélioration de l'accessibilité clavier dans le TCD.
- **2026-02-15** : Optimisation de la performance des jointures ETL (`applyJoin`) via le hoisting des mappings de clés.
- **2026-02-12** : Audit technique complet et optimisations (Sécurité ReDoS, Persistance beforeunload, Cache de calcul O(N) et Accessibilité ARIA).
- **2026-02-11** : Affichage du cumul des différences (total des deltas) dans le pied de page du TCD temporel pour une meilleure lisibilité des écarts globaux (ex: total des jours de décalage).
- **2026-02-11** : Correction de la perte de données en mode comparaison (ajout du mode "Tout l'exercice" par défaut, suppression du filtrage restrictif sur les dates et gestion des préfixes de champs).
- **2026-02-24** : Ajout de la fonctionnalité Déployer/Regrouper les lignes du TCD par niveau.
- **2026-02-24** : Correction du style des boutons de déploiement, de l'affichage des totaux (0,00) et de l'alignement du pied de page du TCD.
- **2026-02-22** : Support de la sélection de cellules sur les lignes de "Total" (standard et temporel).
- **2026-02-22** : Optimisation du pipeline de comparaison temporelle (passage en boucle unique).
- **2026-02-20** : Support multi-métriques dans le mode comparaison temporelle du TCD.
- **2026-02-18** : Ajout de la fonction "Copier" dans l'aperçu du `CalculatedFieldModal`.
- **2026-02-16** : Autoriser le TCD sans métriques (affichage des dimensions uniquement).
- **2026-02-15** : Ajout du bouton "Réinitialiser" complet dans le Studio d'Analyse (sources, filtres, TCD).
- **2026-02-14** : Sécurisation du pipeline ETL (FormulaParser).
- **2026-02-13** : Correction de l'accessibilité des Checkboxes (utilisation de `sr-only` au lieu de `hidden`).
- **2026-02-12** : Refonte de la page "Personnalisation" (thèmes, polices, densité).
- **2026-02-10** : Implémentation du système Undo/Redo global.
- **2026-02-05** : Implémentation du "Mode Édition" dans la grille Data Explorer.

### Janvier 2026
- **2026-01-31** : Mise en place du `FORMULA_CACHE` pour accélérer les TCD volumineux.
- **2026-01-29** : Refonte de la recherche globale DataExplorer pour passer en O(N).
- **2026-01-23** : Optimisation des filtres "In" via conversion en `Set`.
- **2026-01-20** : Lancement du module Budget et Plans Comptables.
