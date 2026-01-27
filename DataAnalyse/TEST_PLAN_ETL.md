# Plan de Test - Module ETL Pipeline (F6.1)

## Objectif
Valider que toutes les fonctionnalités du pipeline ETL sont utilisables et complètes.

---

## 1. Tests de Base du Pipeline

### Test 1.1: Sélection d'une source de données
**Pré-requis**: Au moins un dataset importé avec des données
**Étapes**:
1. Aller dans "Pipeline ETL"
2. Sélectionner un dataset dans le dropdown "Source de données"
3. Vérifier l'affichage des informations

**Résultat attendu**:
- ✅ Le nombre de lignes et colonnes est affiché
- ✅ Message vert de confirmation avec icône ✓
- ✅ Les options de transformation apparaissent

**Statut**: ⬜ Non testé | ✅ Réussi | ❌ Échoué

---

### Test 1.2: Ajout d'une étape de transformation
**Pré-requis**: Une source de données sélectionnée
**Étapes**:
1. Cliquer sur "Ajouter une étape"
2. Vérifier que le menu s'affiche avec 9 options
3. Cliquer sur "Filtre"

**Résultat attendu**:
- ✅ Menu de transformations s'affiche
- ✅ Les 9 types sont visibles: Filtre, Sélectionner, Tri, Agrégation, Calculer, Diviser, Fusionner, Renommer, Dédoublonner
- ✅ L'étape est ajoutée à la liste
- ✅ La configuration de l'étape est expanded par défaut

**Statut**: ⬜ Non testé | ✅ Réussi | ❌ Échoué

---

### Test 1.3: Réorganisation des étapes
**Pré-requis**: Au moins 2 étapes ajoutées
**Étapes**:
1. Cliquer sur la flèche "Monter" de l'étape #2
2. Vérifier que l'ordre change
3. Cliquer sur la flèche "Descendre"

**Résultat attendu**:
- ✅ L'étape #2 devient #1
- ✅ Le preview est recalculé automatiquement
- ✅ Les numéros d'étapes sont mis à jour

**Statut**: ⬜ Non testé | ✅ Réussi | ❌ Échoué

---

### Test 1.4: Expansion/Collapse d'une étape
**Pré-requis**: Au moins 1 étape ajoutée
**Étapes**:
1. Cliquer sur le chevron pour collapse l'étape
2. Cliquer à nouveau pour expand

**Résultat attendu**:
- ✅ La configuration se cache/affiche
- ✅ Le preview se cache/affiche
- ✅ Icône chevron change de direction

**Statut**: ⬜ Non testé | ✅ Réussi | ❌ Échoué

---

### Test 1.5: Suppression d'une étape
**Pré-requis**: Au moins 1 étape ajoutée
**Étapes**:
1. Cliquer sur l'icône poubelle rouge
2. Vérifier la suppression

**Résultat attendu**:
- ✅ L'étape est supprimée immédiatement
- ✅ Les numéros d'étapes sont réajustés
- ✅ Le pipeline est recalculé

**Statut**: ⬜ Non testé | ✅ Réussi | ❌ Échoué

---

## 2. Tests des Transformations - Filtre

### Test 2.1: Filtre simple avec une condition
**Pré-requis**: Dataset avec une colonne numérique
**Étapes**:
1. Ajouter une étape "Filtre"
2. Ajouter une condition
3. Sélectionner une colonne
4. Choisir l'opérateur ">" (supérieur à)
5. Saisir une valeur
6. Vérifier le preview

**Résultat attendu**:
- ✅ Le preview affiche uniquement les lignes correspondantes
- ✅ Le nombre de lignes est correct
- ✅ Aucune erreur affichée

**Statut**: ⬜ Non testé | ✅ Réussi | ❌ Échoué

---

### Test 2.2: Filtre avec plusieurs conditions (ET)
**Pré-requis**: Dataset avec plusieurs colonnes
**Étapes**:
1. Ajouter une étape "Filtre"
2. Sélectionner "ET (toutes les conditions)"
3. Ajouter 2 conditions différentes
4. Vérifier le preview

**Résultat attendu**:
- ✅ Seules les lignes satisfaisant TOUTES les conditions sont affichées
- ✅ Le count de lignes diminue par rapport à la source
- ✅ Les deux conditions sont bien appliquées

**Statut**: ⬜ Non testé | ✅ Réussi | ❌ Échoué

---

### Test 2.3: Filtre avec plusieurs conditions (OU)
**Pré-requis**: Dataset avec plusieurs colonnes
**Étapes**:
1. Ajouter une étape "Filtre"
2. Sélectionner "OU (au moins une condition)"
3. Ajouter 2 conditions différentes
4. Vérifier le preview

**Résultat attendu**:
- ✅ Les lignes satisfaisant AU MOINS UNE condition sont affichées
- ✅ Le count est >= au filtre ET
- ✅ La logique OU fonctionne correctement

**Statut**: ⬜ Non testé | ✅ Réussi | ❌ Échoué

---

### Test 2.4: Filtre avec opérateurs de texte
**Pré-requis**: Dataset avec colonnes textuelles
**Étapes**:
1. Ajouter une étape "Filtre"
2. Tester les opérateurs: contient, commence par, finit par
3. Vérifier les résultats pour chaque

**Résultat attendu**:
- ✅ "contient" filtre correctement
- ✅ "commence par" filtre correctement
- ✅ "finit par" filtre correctement
- ✅ La casse est respectée selon le paramètre

**Statut**: ⬜ Non testé | ✅ Réussi | ❌ Échoué

---

### Test 2.5: Filtre "est vide" / "n'est pas vide"
**Pré-requis**: Dataset avec des valeurs null/vides
**Étapes**:
1. Ajouter une étape "Filtre"
2. Utiliser l'opérateur "est vide"
3. Vérifier le résultat
4. Changer pour "n'est pas vide"

**Résultat attendu**:
- ✅ "est vide" retourne uniquement les lignes vides
- ✅ "n'est pas vide" retourne uniquement les lignes non-vides
- ✅ Pas de champ de valeur affiché pour ces opérateurs

**Statut**: ⬜ Non testé | ✅ Réussi | ❌ Échoué

---

### Test 2.6: Suppression d'une condition de filtre
**Pré-requis**: Filtre avec plusieurs conditions
**Étapes**:
1. Cliquer sur l'icône X d'une condition
2. Vérifier la mise à jour

**Résultat attendu**:
- ✅ La condition est supprimée
- ✅ Le preview est recalculé
- ✅ Les autres conditions restent intactes

**Statut**: ⬜ Non testé | ✅ Réussi | ❌ Échoué

---

## 3. Tests des Transformations - Calculer

### Test 3.1: Colonne calculée simple
**Pré-requis**: Dataset avec colonnes numériques "Prix" et "Quantité"
**Étapes**:
1. Ajouter une étape "Calculer"
2. Nom de colonne: "Total"
3. Formule: `[Prix] * [Quantité]`
4. Vérifier le preview

**Résultat attendu**:
- ✅ Une nouvelle colonne "Total" apparaît
- ✅ Les valeurs sont calculées correctement
- ✅ Le nombre de colonnes augmente de 1

**Statut**: ⬜ Non testé | ✅ Réussi | ❌ Échoué

---

### Test 3.2: Formule avec opérations multiples
**Pré-requis**: Dataset avec colonnes numériques
**Étapes**:
1. Ajouter une étape "Calculer"
2. Formule complexe: `([Prix] * [Quantité]) * 1.2`
3. Vérifier le résultat

**Résultat attendu**:
- ✅ La formule est évaluée correctement
- ✅ L'ordre des opérations est respecté
- ✅ Les parenthèses fonctionnent

**Statut**: ⬜ Non testé | ✅ Réussi | ❌ Échoué

---

### Test 3.3: Formule avec erreur de syntaxe
**Pré-requis**: Aucun
**Étapes**:
1. Ajouter une étape "Calculer"
2. Formule invalide: `[Prix] * * [Quantité]`
3. Vérifier l'erreur

**Résultat attendu**:
- ✅ Une erreur est affichée
- ✅ Message d'erreur clair en rouge
- ✅ Le pipeline s'arrête à cette étape

**Statut**: ⬜ Non testé | ✅ Réussi | ❌ Échoué

---

### Test 3.4: Formule référençant une colonne inexistante
**Pré-requis**: Aucun
**Étapes**:
1. Ajouter une étape "Calculer"
2. Formule: `[ColonneInexistante] * 2`
3. Vérifier l'erreur

**Résultat attendu**:
- ✅ Une erreur est affichée
- ✅ Message indiquant que la colonne n'existe pas
- ✅ Le pipeline s'arrête à cette étape

**Statut**: ⬜ Non testé | ✅ Réussi | ❌ Échoué

---

## 4. Tests des Transformations - Autres

### Test 4.1: Tri (Sort)
**Pré-requis**: Dataset avec colonnes
**Étapes**:
1. Ajouter une étape "Tri"
2. Configurer le tri
3. Vérifier l'ordre dans le preview

**Résultat attendu**:
- ✅ Les données sont triées correctement
- ✅ L'ordre croissant/décroissant fonctionne
- ✅ Le nombre de lignes reste inchangé

**Statut**: ⬜ Non testé | ✅ Réussi | ❌ Échoué

---

### Test 4.2: Dédoublonnage (Distinct)
**Pré-requis**: Dataset avec lignes en double
**Étapes**:
1. Ajouter une étape "Dédoublonner"
2. Vérifier le preview

**Résultat attendu**:
- ✅ Les doublons sont supprimés
- ✅ Le nombre de lignes diminue
- ✅ Une seule occurrence de chaque ligne unique reste

**Statut**: ⬜ Non testé | ✅ Réussi | ❌ Échoué

---

### Test 4.3: Sélection de colonnes (Select)
**Pré-requis**: Dataset avec plusieurs colonnes
**Étapes**:
1. Ajouter une étape "Sélectionner"
2. Configurer les colonnes à garder
3. Vérifier le preview

**Résultat attendu**:
- ✅ Seules les colonnes sélectionnées sont affichées
- ✅ Le nombre de colonnes diminue
- ✅ Les données des colonnes sont intactes

**Statut**: ⬜ Non testé | ✅ Réussi | ❌ Échoué

---

### Test 4.4: Renommer (Rename)
**Pré-requis**: Dataset avec colonnes
**Étapes**:
1. Ajouter une étape "Renommer"
2. Configurer les renommages
3. Vérifier le preview

**Résultat attendu**:
- ✅ Les colonnes sont renommées correctement
- ✅ Les données restent intactes
- ✅ Le nombre de colonnes reste inchangé

**Statut**: ⬜ Non testé | ✅ Réussi | ❌ Échoué

---

### Test 4.5: Agrégation (Aggregate)
**Pré-requis**: Dataset avec colonnes à grouper
**Étapes**:
1. Ajouter une étape "Agrégation"
2. Configurer le GROUP BY et les agrégations
3. Vérifier le preview

**Résultat attendu**:
- ✅ Les données sont groupées correctement
- ✅ Les agrégations (SUM, AVG, COUNT, etc.) fonctionnent
- ✅ Le nombre de lignes diminue

**Statut**: ⬜ Non testé | ✅ Réussi | ❌ Échoué

---

## 5. Tests de Pipeline Complet

### Test 5.1: Pipeline multi-étapes
**Pré-requis**: Dataset complexe
**Étapes**:
1. Créer un pipeline avec:
   - Étape 1: Filtre pour enlever les valeurs nulles
   - Étape 2: Calculer une nouvelle colonne
   - Étape 3: Tri sur cette colonne
   - Étape 4: Dédoublonnage
2. Vérifier chaque étape

**Résultat attendu**:
- ✅ Chaque étape s'exécute correctement
- ✅ Les previews intermédiaires sont cohérents
- ✅ Le résultat final est correct
- ✅ Le nombre de lignes/colonnes évolue logiquement

**Statut**: ⬜ Non testé | ✅ Réussi | ❌ Échoué

---

### Test 5.2: Pipeline avec erreur à mi-parcours
**Pré-requis**: Aucun
**Étapes**:
1. Créer un pipeline avec 3 étapes
2. Mettre une erreur dans l'étape #2
3. Vérifier la gestion de l'erreur

**Résultat attendu**:
- ✅ L'étape #1 fonctionne et affiche son preview
- ✅ L'étape #2 affiche l'erreur en rouge
- ✅ L'étape #3 n'est pas exécutée
- ✅ Pas de résultat final affiché

**Statut**: ⬜ Non testé | ✅ Réussi | ❌ Échoué

---

### Test 5.3: Modification d'une étape existante
**Pré-requis**: Pipeline avec plusieurs étapes
**Étapes**:
1. Modifier une étape au milieu du pipeline
2. Vérifier la recalculation

**Résultat attendu**:
- ✅ Les étapes suivantes sont recalculées
- ✅ Les previews sont mis à jour
- ✅ Le résultat final change en conséquence

**Statut**: ⬜ Non testé | ✅ Réussi | ❌ Échoué

---

## 6. Tests de Performance et Robustesse

### Test 6.1: Dataset volumineux (>10,000 lignes)
**Pré-requis**: Un grand dataset
**Étapes**:
1. Sélectionner un dataset volumineux
2. Ajouter plusieurs transformations
3. Vérifier le temps de réponse

**Résultat attendu**:
- ✅ Le preview est affiché rapidement (< 2s)
- ✅ Pas de freeze de l'interface
- ✅ Limite de preview à 100 lignes fonctionne

**Statut**: ⬜ Non testé | ✅ Réussi | ❌ Échoué

---

### Test 6.2: Changement rapide de source
**Pré-requis**: Plusieurs datasets
**Étapes**:
1. Créer un pipeline
2. Changer de source de données
3. Vérifier le comportement

**Résultat attendu**:
- ✅ Le pipeline est recalculé
- ✅ Les colonnes disponibles sont mises à jour
- ✅ Les configurations d'étapes s'adaptent

**Statut**: ⬜ Non testé | ✅ Réussi | ❌ Échoué

---

## 7. Tests d'Interface Utilisateur

### Test 7.1: Messages d'information
**Pré-requis**: Aucun
**Étapes**:
1. Ouvrir la page ETL sans sélectionner de source
2. Vérifier les messages

**Résultat attendu**:
- ✅ Message clair pour sélectionner une source
- ✅ Pas d'erreur affichée
- ✅ Interface propre et utilisable

**Statut**: ⬜ Non testé | ✅ Réussi | ❌ Échoué

---

### Test 7.2: Compteurs et indicateurs
**Pré-requis**: Pipeline avec étapes
**Étapes**:
1. Vérifier tous les compteurs affichés

**Résultat attendu**:
- ✅ Nombre de lignes correct à chaque étape
- ✅ Nombre de colonnes correct à chaque étape
- ✅ Numérotation des étapes correcte (#1, #2, #3...)
- ✅ Count dans le résultat final correct

**Statut**: ⬜ Non testé | ✅ Réussi | ❌ Échoué

---

## Résumé des Tests

| Catégorie | Tests Total | Réussis | Échoués | Non testés |
|-----------|-------------|---------|---------|------------|
| Base Pipeline | 5       | 0       | 0       | 5          |
| Filtre    | 6           | 0       | 0       | 6          |
| Calculer  | 4           | 0       | 0       | 4          |
| Autres Transformations | 5 | 0   | 0       | 5          |
| Pipeline Complet | 3    | 0       | 0       | 3          |
| Performance | 2         | 0       | 0       | 2          |
| UI        | 2           | 0       | 0       | 2          |
| **TOTAL** | **27**      | **0**   | **0**   | **27**     |

---

## Notes de Test

### Bugs Identifiés
_(À remplir pendant les tests)_

### Améliorations Suggérées
_(À remplir pendant les tests)_

### Configuration des Étapes Non Implémentées
Les étapes suivantes ont des configurations placeholder et nécessitent une implémentation complète:
- SelectConfig (Sélectionner colonnes)
- AggregateConfig (Agrégation)
- SortConfig (Tri)
- RenameConfig (Renommage)
- SplitConfig (Division de colonnes)
- MergeConfig (Fusion de colonnes)

---

**Date de dernière mise à jour**: 2026-01-24
**Testeur**: _À compléter_
**Version**: 1.0
