# Référentiel des Fonctionnalités - DataScope

Ce document liste l'ensemble des fonctionnalités implémentées et maintenues dans l'application DataScope. Il sert de base pour la vérification de conformité (QA) lors des mises à jour.

**Version actuelle** : 2026-01-31-147

---

## 1. Gestion des Données (Core)

| ID | Fonctionnalité | Description | Statut |
| :--- | :--- | :--- | :--- |
| **D01** | **Import Excel/CSV** | Drag & drop de fichiers `.xlsx` et `.csv`. Parsing automatique. | ✅ Actif |
| **D02** | **Mapping Intelligent** | Détection automatique des colonnes déjà connues (apprentissage). | ✅ Actif |
| **D03** | **Typologie Multiples** | Gestion de plusieurs datasets isolés (RH, Ventes, etc.). | ✅ Actif |
| **D04** | **Nettoyage de Données** | Outils "Trim", "Majuscule/Minuscule", "Déduplication" avant import. | ✅ Actif |
| **D05** | **Gestion des Doublons** | Détection et suppression des doublons sur une colonne clé. | ✅ Actif |
| **D06** | **Fusion vs Écrasement** | Choix lors de l'import : ajouter aux données existantes ou tout remplacer. | ✅ Actif |

## 2. Explorateur de Données

| ID | Fonctionnalité | Description | Statut |
| :--- | :--- | :--- | :--- |
| **E01** | **Filtrage Colonne** | Filtres textuels sur chaque colonne (contient...). | ✅ Actif |
| **E02** | **Tri Multi-directionnel** | Tri croissant/décroissant sur toutes les colonnes. | ✅ Actif |
| **E03** | **Champs Calculés** | Création de colonnes virtuelles avec formules (`[Prix]*[Qté]`). | ✅ Actif |
| **E04** | **Formatage Conditionnel** | Règles de couleur (texte/fond) basées sur valeurs (<, >, =). | ✅ Actif |
| **E05** | **Formatage Numérique** | Configuration décimales, unité (€, %), échelle (k, M) par colonne. | ✅ Actif |
| **E06** | **Historique Ligne** | Vue détaillée de l'évolution d'une entité (audit trail) via Drawer latéral. | ✅ Actif |
| **E07** | **Recherche Globale** | Recherche textuelle sur l'ensemble du jeu de données. | ✅ Actif |

## 3. Tableau Croisé Dynamique (TCD)

| ID | Fonctionnalité | Description | Statut |
| :--- | :--- | :--- | :--- |
| **T01** | **Multi-dimensions Lignes** | Regroupement hiérarchique jusqu'à 3 niveaux. | ✅ Actif |
| **T02** | **Dimension Colonne** | Pivot sur une colonne dynamique. | ✅ Actif |
| **T03** | **Regroupement Date** | Groupement auto par Année, Trimestre, Mois sur colonne date. | ✅ Actif |
| **T04** | **Agrégations** | Somme, Compte, Moyenne, Min, Max, Liste. | ✅ Actif |
| **T05** | **Drill-down (Navigation)** | Clic sur ligne/cellule pour voir les données source filtrées. | ✅ Actif |
| **T06** | **Filtres Globaux** | Filtres multi-sélection applicables au TCD entier. | ✅ Actif |
| **T07** | **Jointure (Blending)** | Croisement avec un second dataset via clé commune. | ✅ Actif |
| **T08** | **Sauvegarde Vues** | Enregistrement de la configuration du TCD pour réutilisation. | ✅ Actif |

## 4. Tableau de Bord (Dashboard)

| ID | Fonctionnalité | Description | Statut |
| :--- | :--- | :--- | :--- |
| **W01** | **Widgets KPI** | Indicateurs chiffres clés avec tendance vs précédent. | ✅ Actif |
| **W02** | **Graphiques Variés** | Barres, Courbes, Pie, Radar, Treemap, Funnel. | ✅ Actif |
| **W03** | **Mode Édition** | Drag & drop, redimensionnement des widgets. | ✅ Actif |
| **W04** | **Filtres Transversaux** | Clic sur un graphe filtre tous les autres widgets (Drill-down global). | ✅ Actif |
| **W05** | **Widget Texte** | Ajout de blocs de texte libre pour contextes/titres. | ✅ Actif |

## 5. Maintenance & Conformité

| ID | Fonctionnalité | Description | Statut |
| :--- | :--- | :--- | :--- |
| **S01** | **Sauvegarde JSON** | Export complet de la base de données locale. | ✅ Actif |
| **S02** | **Diagnostic Automatique** | Suite de tests intégrée pour vérifier les moteurs de calcul. | ✅ Actif |
| **S03** | **Mode Local (Privacy)** | Aucune donnée envoyée vers le cloud/serveur. | ✅ Actif |
