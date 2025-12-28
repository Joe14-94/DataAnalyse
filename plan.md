
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
- **Stat