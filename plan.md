
# Roadmap DataScope - Transformation BI (Q4 2025)

Ce document liste les fonctionnalités techniques et fonctionnelles à implémenter pour passer DataScope au niveau "Enterprise".

## 1. Moteur de Données Avancé (Priorité Haute)

### 1.1. Champs Calculés (Calculated Fields)
- **Objectif** : Permettre la création de nouvelles colonnes basées sur des formules arithmétiques.
- **Technique** : Parser syntaxique supportant les références de colonnes `[NomColonne]`.
- **Statut** : ✅ Fait (v202511-108).

### 1.2. Import de Fichiers Natifs
- **Objectif** : Supporter le Drag & Drop de fichiers .xlsx et .csv pour contourner les limites du presse-papier.
- **Technique** : Intégration de `xlsx` (SheetJS) pour parser les fichiers binaires.
- **Statut** : ✅ Fait (v202511-109).

### 1.3. Nettoyage de Données (Data Cleaning)
- **Objectif** : Outils pour harmoniser les données brutes avant analyse.
- **Fonctions** : Trim, Uppercase/Lowercase, Recherche/Remplace, Déduplication.
- **Statut** : ✅ Fait (v202511-110).

## 2. Visualisation & Interactivité (Priorité Moyenne)

### 2.1. Filtrage Transversal (Drill-down)
- **Objectif** : Cliquer sur un segment de graphique filtre tous les autres widgets du dashboard.
- **Technique** : Contexte de filtre global `DashboardFilterContext`.
- **Statut** : ✅ Fait (v202511-110).

### 2.2. Formatage Conditionnel
- **Objectif** : Colorer les cellules des tableaux selon des règles (ex: Marge < 0 => Rouge).
- **Technique** : Extension de `FieldConfig` avec des règles de style CSS dynamiques.
- **Statut** : ✅ Fait (v202511-110).

## 3. Contextualisation & Productivité (Nouveau - V2)

### 3.1. Widgets de Contexte (Texte/Titre)
- **Objectif** : Ajouter des zones de texte libre sur le dashboard pour expliquer les chiffres ou séparer les sections.
- **Statut** : 🔄 En cours (v202511-111).

### 3.2. Duplication de Widget
- **Objectif** : Bouton pour cloner un widget existant et sa configuration pour gagner du temps.
- **Statut** : 📅 À faire.

## 4. Architecture & Performance

### 4.1. Web Workers
- **Objectif** : Déporter les calculs lourds (parsing, agrégations TCD) hors du thread principal pour ne pas figer l'UI.
- **Statut** : À envisager si > 50k lignes.
