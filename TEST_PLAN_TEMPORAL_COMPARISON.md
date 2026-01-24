# Plan de Test - Comparaison Temporelle TCD (F7.1)

**Version**: 1.0
**Date**: 2026-01-24
**Fonctionnalité**: Comparaison multi-périodes dans le Tableau Croisé Dynamique

## Vue d'ensemble

La fonctionnalité de comparaison temporelle permet de comparer les mêmes données sur plusieurs périodes (2 à 4 sources) avec calcul automatique des écarts en valeur ou en pourcentage.

## Scénarios de Test

### 1. Configuration des Sources (5 tests)

#### Test 1.1: Activation du mode comparaison
**Prérequis**:
- TCD ouvert avec un dataset contenant plusieurs imports
- Mode standard actif

**Étapes**:
1. Cliquer sur le bouton "Comparaison" dans le toggle de mode
2. Vérifier l'activation du mode

**Résultat attendu**:
- ✅ Le mode comparaison est activé
- ✅ Le panneau "Configuration Temporelle" apparaît
- ✅ Le bouton "Comparaison" est surligné
- ✅ Le texte d'aide change pour "Comparaison temporelle"

#### Test 1.2: Sélection de 2 sources
**Prérequis**: Mode comparaison activé

**Étapes**:
1. Cliquer sur "+ Configurer les sources"
2. Sélectionner 2 imports différents
3. Nommer les sources (ex: "2024", "2025")
4. Sélectionner la première comme référence
5. Cliquer sur "Appliquer"

**Résultat attendu**:
- ✅ Les 2 sources apparaissent dans le panneau de configuration
- ✅ La source de référence est marquée avec "✓ Référence"
- ✅ Les noms personnalisés sont affichés
- ✅ Les dates d'import sont affichées correctement

#### Test 1.3: Sélection de 4 sources (maximum)
**Prérequis**: Dataset avec au moins 4 imports

**Étapes**:
1. Ouvrir la configuration des sources
2. Sélectionner 4 imports
3. Tenter de sélectionner un 5ème

**Résultat attendu**:
- ✅ 4 sources peuvent être sélectionnées
- ✅ Message d'erreur "Maximum 4 sources" si tentative de 5ème sélection
- ✅ Toutes les sources sont listées dans la configuration

#### Test 1.4: Changement de source de référence
**Prérequis**: 3 sources configurées, référence = source 1

**Étapes**:
1. Ouvrir la configuration des sources
2. Sélectionner la source 2 comme référence
3. Appliquer

**Résultat attendu**:
- ✅ La source 2 devient la référence
- ✅ Les colonnes delta sont recalculées par rapport à la nouvelle référence
- ✅ L'ancienne référence affiche maintenant des deltas

#### Test 1.5: Détection automatique de l'année
**Prérequis**: Imports avec données contenant une colonne "Date écriture"

**Étapes**:
1. Ouvrir la configuration des sources
2. Sélectionner un import

**Résultat attendu**:
- ✅ L'année est détectée automatiquement depuis les données
- ✅ Le label par défaut utilise l'année détectée (ex: "2024")
- ✅ Si pas de date, utilise la date d'import

---

### 2. Filtrage par Période (4 tests)

#### Test 2.1: Période complète (janvier à décembre)
**Prérequis**: 2 sources configurées

**Étapes**:
1. Configurer période: mois début = 1, mois fin = 12
2. Ajouter un champ dans "Lignes"
3. Ajouter un champ dans "Valeurs"

**Résultat attendu**:
- ✅ Toutes les données de l'année sont incluses
- ✅ Le tableau affiche les agrégations complètes

#### Test 2.2: Période partielle (janvier à avril)
**Prérequis**: 2 sources configurées avec données sur toute l'année

**Étapes**:
1. Configurer période: mois début = 1, mois fin = 4
2. Vérifier les résultats affichés

**Résultat attendu**:
- ✅ Seules les données de janvier à avril sont incluses
- ✅ Les totaux correspondent aux 4 premiers mois
- ✅ Les données de mai à décembre sont exclues

#### Test 2.3: Période traversant l'année (novembre à février)
**Prérequis**: Sources avec données multi-années

**Étapes**:
1. Configurer période: mois début = 11, mois fin = 2
2. Vérifier les résultats

**Résultat attendu**:
- ✅ Les mois novembre, décembre, janvier, février sont inclus
- ✅ Les autres mois sont exclus
- ✅ Pas d'erreur de calcul

#### Test 2.4: Période d'un seul mois
**Prérequis**: 2 sources configurées

**Étapes**:
1. Configurer période: mois début = 1, mois fin = 1
2. Vérifier les résultats

**Résultat attendu**:
- ✅ Seul le mois de janvier est inclus
- ✅ Les totaux sont corrects

---

### 3. Regroupement et Agrégation (6 tests)

#### Test 3.1: Regroupement par un seul champ
**Prérequis**: 2 sources configurées

**Étapes**:
1. Glisser le champ "Compte" dans "Lignes"
2. Glisser le champ "Montant" dans "Valeurs"
3. Vérifier le tableau

**Résultat attendu**:
- ✅ Une ligne par compte
- ✅ Colonnes: Compte | Source1 | Δ | Source2 | Δ
- ✅ Les sommes sont correctes par compte

#### Test 3.2: Regroupement par plusieurs champs (hiérarchie)
**Prérequis**: 2 sources configurées

**Étapes**:
1. Glisser "Compte" puis "Axe analytique" dans "Lignes"
2. Glisser "Montant" dans "Valeurs"

**Résultat attendu**:
- ✅ Regroupement hiérarchique: Compte › Axe analytique
- ✅ Les labels sont séparés par " - "
- ✅ Les agrégations sont correctes à chaque niveau

#### Test 3.3: Agrégation SOMME
**Prérequis**: Configuration avec 2 sources

**Étapes**:
1. Configurer regroupement et valeur
2. Sélectionner "SUM" comme type d'agrégation

**Résultat attendu**:
- ✅ Les valeurs sont sommées par groupe
- ✅ Les totaux correspondent à la somme réelle

#### Test 3.4: Agrégation MOYENNE
**Prérequis**: Configuration avec 2 sources

**Étapes**:
1. Sélectionner "AVG" comme type d'agrégation
2. Vérifier les résultats

**Résultat attendu**:
- ✅ Les valeurs sont moyennées
- ✅ La moyenne est calculée correctement (somme / nombre de lignes)

#### Test 3.5: Agrégation COUNT
**Prérequis**: Configuration avec 2 sources

**Étapes**:
1. Sélectionner "COUNT" comme type d'agrégation
2. Vérifier les résultats

**Résultat attendu**:
- ✅ Le nombre de lignes est affiché par groupe
- ✅ Les deltas de count sont corrects

#### Test 3.6: Agrégation MIN / MAX
**Prérequis**: Configuration avec 2 sources

**Étapes**:
1. Tester "MIN" puis "MAX"
2. Vérifier les valeurs

**Résultat attendu**:
- ✅ MIN retourne la valeur minimale du groupe
- ✅ MAX retourne la valeur maximale du groupe

---

### 4. Calcul des Écarts (5 tests)

#### Test 4.1: Écart en valeur (positif)
**Prérequis**:
- Source référence: 100 000
- Source comparée: 120 000

**Résultat attendu**:
- ✅ Delta affiché: +20 000,00
- ✅ Couleur verte
- ✅ Symbole "+" devant la valeur

#### Test 4.2: Écart en valeur (négatif)
**Prérequis**:
- Source référence: 100 000
- Source comparée: 80 000

**Résultat attendu**:
- ✅ Delta affiché: -20 000,00
- ✅ Couleur rouge
- ✅ Symbole "-" (naturel du nombre négatif)

#### Test 4.3: Écart en pourcentage (positif)
**Prérequis**:
- Format delta = "percentage"
- Source référence: 100 000
- Source comparée: 120 000

**Résultat attendu**:
- ✅ Delta affiché: +20,0%
- ✅ Couleur verte
- ✅ Formule: ((120000 - 100000) / 100000) * 100 = 20%

#### Test 4.4: Écart en pourcentage (négatif)
**Prérequis**:
- Format delta = "percentage"
- Source référence: 100 000
- Source comparée: 80 000

**Résultat attendu**:
- ✅ Delta affiché: -20,0%
- ✅ Couleur rouge
- ✅ Formule: ((80000 - 100000) / 100000) * 100 = -20%

#### Test 4.5: Cas particulier - division par zéro
**Prérequis**:
- Source référence: 0
- Source comparée: 100 000

**Résultat attendu**:
- ✅ En pourcentage: affichage de "100%" ou message approprié
- ✅ Pas d'erreur JavaScript
- ✅ En valeur: +100 000,00

---

### 5. Affichage et Interface (6 tests)

#### Test 5.1: Colonnage avec 2 sources
**Prérequis**: 2 sources (A = réf, B)

**Résultat attendu**:
- ✅ Colonnes: Groupe | A | B | Δ
- ✅ La colonne A (référence) n'a pas de delta
- ✅ Fond bleu clair pour la colonne référence

#### Test 5.2: Colonnage avec 4 sources
**Prérequis**: 4 sources (A = réf, B, C, D)

**Résultat attendu**:
- ✅ Colonnes: Groupe | A | B | Δ | C | Δ | D | Δ
- ✅ Chaque source (sauf référence) a sa colonne delta
- ✅ Fond violet pour les colonnes delta

#### Test 5.3: Basculement format valeur/pourcentage
**Prérequis**: Tableau affiché avec deltas

**Étapes**:
1. Cliquer sur "Valeur"
2. Vérifier l'affichage
3. Cliquer sur "%"
4. Vérifier l'affichage

**Résultat attendu**:
- ✅ En mode "Valeur": deltas en montant (ex: +20 000,00)
- ✅ En mode "%": deltas en pourcentage (ex: +20,0%)
- ✅ Pas de rechargement de page
- ✅ Changement instantané

#### Test 5.4: Formatage des nombres
**Prérequis**: Données avec montants variés

**Résultat attendu**:
- ✅ Séparateur de milliers: espace (ex: 1 000 000,00)
- ✅ Deux décimales par défaut
- ✅ Alignement à droite des valeurs numériques
- ✅ Police tabulaire pour alignement des chiffres

#### Test 5.5: Indicateurs visuels des écarts
**Prérequis**: Tableau avec écarts positifs et négatifs

**Résultat attendu**:
- ✅ Écarts positifs: texte vert, gras, avec "+"
- ✅ Écarts négatifs: texte rouge, gras
- ✅ Écarts nuls: texte gris, affichage "-"

#### Test 5.6: Responsive et scroll
**Prérequis**: Tableau avec 4 sources et nombreuses lignes

**Résultat attendu**:
- ✅ Scroll horizontal si colonnes dépassent
- ✅ Scroll vertical si lignes dépassent
- ✅ En-têtes fixes en haut lors du scroll
- ✅ Pas de décalage entre en-têtes et données

---

### 6. Drilldown (3 tests)

#### Test 6.1: Drilldown sur valeur de référence
**Prérequis**: Tableau affiché

**Étapes**:
1. Cliquer sur une cellule de la colonne référence
2. Vérifier la modal de détails

**Résultat attendu**:
- ✅ Modal s'ouvre avec le détail des lignes
- ✅ Titre: "Détails: [Groupe]"
- ✅ Toutes les colonnes du dataset sont affichées
- ✅ Seules les lignes du groupe sont affichées

#### Test 6.2: Drilldown sur valeur comparée
**Prérequis**: Tableau affiché

**Étapes**:
1. Cliquer sur une cellule d'une source non-référence
2. Vérifier la modal

**Résultat attendu**:
- ✅ Modal s'ouvre avec les bonnes lignes
- ✅ Les données correspondent à la source cliquée
- ✅ Filtrage par période appliqué

#### Test 6.3: Drilldown impossible sur delta
**Prérequis**: Tableau affiché

**Étapes**:
1. Cliquer sur une cellule delta

**Résultat attendu**:
- ✅ Pas de drilldown (ou drilldown vers la source associée)
- ✅ Comportement cohérent

---

### 7. Cas Limites et Erreurs (5 tests)

#### Test 7.1: Moins de 2 sources
**Étapes**:
1. Activer le mode comparaison
2. Ne sélectionner qu'une seule source
3. Configurer regroupement et valeur

**Résultat attendu**:
- ✅ Message d'erreur ou tableau vide
- ✅ Indication claire: "Sélectionnez au moins 2 sources"
- ✅ Pas d'erreur JavaScript

#### Test 7.2: Aucun champ de regroupement
**Prérequis**: 2 sources configurées

**Étapes**:
1. Ne pas glisser de champ dans "Lignes"
2. Glisser un champ dans "Valeurs"

**Résultat attendu**:
- ✅ Tableau vide ou message: "Glissez des champs dans 'Lignes'"
- ✅ Pas de calcul lancé

#### Test 7.3: Aucun champ de valeur
**Prérequis**: 2 sources configurées

**Étapes**:
1. Glisser un champ dans "Lignes"
2. Ne pas glisser de champ dans "Valeurs"

**Résultat attendu**:
- ✅ Tableau vide ou message: "Glissez un champ dans 'Valeurs'"
- ✅ Pas de calcul lancé

#### Test 7.4: Colonne "Date écriture" absente
**Prérequis**: Dataset sans colonne de date

**Résultat attendu**:
- ✅ Détection automatique échoue gracieusement
- ✅ Utilise un nom de colonne par défaut ou affiche toutes les données
- ✅ Pas d'erreur

#### Test 7.5: Sources avec structures différentes
**Prérequis**: 2 imports du même dataset mais avec colonnes légèrement différentes

**Résultat attendu**:
- ✅ Fonctionne avec les colonnes communes
- ✅ Valeurs manquantes = 0 ou null
- ✅ Pas d'erreur

---

### 8. Performance (3 tests)

#### Test 8.1: Calcul avec dataset de 1000 lignes
**Prérequis**: 2 sources avec 1000 lignes chacune

**Résultat attendu**:
- ✅ Calcul terminé en moins de 2 secondes
- ✅ Affichage fluide
- ✅ Indicateur de chargement pendant le calcul

#### Test 8.2: Calcul avec dataset de 10 000 lignes
**Prérequis**: 2 sources avec 10 000 lignes chacune

**Résultat attendu**:
- ✅ Calcul terminé en moins de 5 secondes
- ✅ Pas de gel de l'interface
- ✅ Indicateur de progression

#### Test 8.3: Calcul avec 4 sources
**Prérequis**: 4 sources avec 5000 lignes chacune

**Résultat attendu**:
- ✅ Calcul terminé en temps raisonnable (<10s)
- ✅ Toutes les comparaisons sont correctes
- ✅ Mémoire stable (pas de fuite)

---

### 9. Persistance et Sauvegarde (3 tests)

#### Test 9.1: Sauvegarde de la configuration
**Prérequis**: Configuration complète avec 2 sources

**Étapes**:
1. Configurer une comparaison temporelle
2. Rafraîchir la page (F5)

**Résultat attendu**:
- ✅ Mode comparaison toujours actif
- ✅ Sources restaurées
- ✅ Période et format delta restaurés
- ✅ Tableau recalculé automatiquement

#### Test 9.2: Sauvegarde en tant qu'analyse
**Prérequis**: Configuration complète

**Étapes**:
1. Cliquer sur "Sauvegarder"
2. Nommer "Comparaison 2024 vs 2025"
3. Valider
4. Recharger l'analyse depuis la liste

**Résultat attendu**:
- ✅ Analyse sauvegardée avec toute la configuration
- ✅ Rechargement restaure le mode comparaison
- ✅ Toutes les sources sont restaurées
- ✅ Le tableau s'affiche correctement

#### Test 9.3: Changement de dataset
**Prérequis**: Mode comparaison actif

**Étapes**:
1. Changer de dataset via le menu

**Résultat attendu**:
- ✅ Configuration temporelle réinitialisée
- ✅ Retour au mode standard ou message approprié
- ✅ Pas d'erreur

---

### 10. Intégration et Workflow (4 tests)

#### Test 10.1: Basculement Standard ↔ Comparaison
**Prérequis**: Configuration en mode standard

**Étapes**:
1. Passer en mode comparaison
2. Configurer des sources
3. Revenir en mode standard
4. Repasser en mode comparaison

**Résultat attendu**:
- ✅ Changement de mode fluide
- ✅ Configuration temporelle préservée lors du retour
- ✅ TCD standard fonctionne normalement
- ✅ Pas de conflit entre les deux modes

#### Test 10.2: Export en mode comparaison
**Prérequis**: Tableau de comparaison affiché

**Étapes**:
1. Cliquer sur "Export" → "PDF"
2. Vérifier le PDF généré

**Résultat attendu**:
- ✅ PDF contient le tableau de comparaison
- ✅ Toutes les colonnes sont visibles
- ✅ Formatage préservé (couleurs, gras)
- ✅ Titre indique "Comparaison temporelle"

#### Test 10.3: Export HTML
**Prérequis**: Tableau de comparaison affiché

**Étapes**:
1. Exporter en HTML
2. Ouvrir le fichier

**Résultat attendu**:
- ✅ HTML valide
- ✅ Styles CSS appliqués
- ✅ Tableau complet avec toutes les données

#### Test 10.4: Utilisation avec filtres
**Prérequis**: Mode comparaison actif

**Étapes**:
1. Ajouter un filtre (ex: Compte = "601000")
2. Vérifier le tableau

**Résultat attendu**:
- ✅ Les filtres s'appliquent aux sources
- ✅ Les comparaisons ne portent que sur les données filtrées
- ✅ Les totaux sont corrects

---

## Critères de Succès

### Critères Fonctionnels
- ✅ Tous les scénarios de test passent sans erreur
- ✅ Les calculs d'agrégation sont exacts
- ✅ Les deltas (valeur et %) sont corrects
- ✅ Le drilldown fonctionne correctement
- ✅ L'interface est intuitive

### Critères de Performance
- ✅ Calcul < 2s pour 2 sources de 1000 lignes
- ✅ Calcul < 5s pour 2 sources de 10 000 lignes
- ✅ Pas de gel de l'interface

### Critères d'Utilisabilité
- ✅ Configuration claire et guidée
- ✅ Indicateurs visuels explicites (couleurs, symboles)
- ✅ Messages d'erreur compréhensibles
- ✅ Workflow fluide entre modes

### Critères de Qualité
- ✅ Aucune erreur JavaScript console
- ✅ Pas de fuite mémoire
- ✅ Code TypeScript sans erreur de compilation
- ✅ Build réussit

---

## Notes de Test

### Données de Test Recommandées
1. **Grand Livre 2024**: Import avec données janvier-décembre 2024
2. **Grand Livre 2025**: Import avec données janvier-décembre 2025
3. **Budget 2026**: Import avec données prévisionnelles
4. **Q1 2024**: Import avec données janvier-mars 2024

### Configuration Recommandée
- Champs de regroupement: Compte, Centre de coût, Projet
- Champ de valeur: Montant, Débit, Crédit
- Période test: Mois 1-12, 1-3, 1-6

### Bugs Connus
- Aucun à ce jour

### Améliorations Futures
- Comparaison de budgets vs réalisé
- Graphiques de comparaison
- Export Excel avec plusieurs onglets
- Alertes sur variations importantes
