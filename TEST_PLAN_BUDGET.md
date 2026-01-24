# Plan de Test - Module Budget (F3.1)

## Objectif
Valider que toutes les fonctionnalités du module Budget sont utilisables et complètes.

---

## 1. Tests des Modèles Budgétaires (Templates)

### Test 1.1: Création d'un modèle vide
**Pré-requis**: Aucun
**Étapes**:
1. Aller dans l'onglet "Modèles"
2. Cliquer sur "Nouveau modèle"
3. Remplir le nom: "Modèle Test Vide"
4. Laisser "Budget source" sur "-- Modèle vide --"
5. Cliquer sur "Créer le modèle"

**Résultat attendu**:
- ✅ Message de confirmation "Modèle créé avec succès !"
- ✅ Le modèle apparaît dans la liste avec 0 comptes
- ✅ Modal se ferme automatiquement

**Statut**: ⬜ Non testé | ✅ Réussi | ❌ Échoué

---

### Test 1.2: Création d'un modèle depuis un budget existant
**Pré-requis**: Au moins un budget avec des lignes comptables
**Étapes**:
1. Aller dans l'onglet "Modèles"
2. Cliquer sur "Nouveau modèle"
3. Remplir le nom: "Modèle depuis Budget"
4. Remplir la description: "Modèle créé pour tests"
5. Remplir la catégorie: "Test"
6. Sélectionner un budget source dans le dropdown
7. Vérifier le message bleu indiquant le nombre de comptes
8. Cliquer sur "Créer le modèle"

**Résultat attendu**:
- ✅ Le modèle apparaît avec le bon nombre de comptes
- ✅ Les informations (nom, description, catégorie) sont correctes
- ✅ Affichage correct du nombre de comptes dans la carte

**Statut**: ⬜ Non testé | ✅ Réussi | ❌ Échoué

---

### Test 1.3: Modification d'un modèle existant
**Pré-requis**: Au moins un modèle créé
**Étapes**:
1. Aller dans l'onglet "Modèles"
2. Cliquer sur le bouton "Modifier" (icône crayon) d'un modèle
3. Modifier le nom, la description et la catégorie
4. Cliquer sur "Enregistrer"

**Résultat attendu**:
- ✅ Modal d'édition s'ouvre avec les valeurs actuelles
- ✅ Message de confirmation "Modèle modifié avec succès !"
- ✅ Les modifications sont visibles dans la carte
- ✅ Le nombre de comptes reste inchangé

**Statut**: ⬜ Non testé | ✅ Réussi | ❌ Échoué

---

### Test 1.4: Utilisation d'un modèle pour créer un budget
**Pré-requis**: Au moins un modèle avec des comptes
**Étapes**:
1. Aller dans l'onglet "Modèles"
2. Cliquer sur "Utiliser ce modèle" sur un modèle
3. Attendre la confirmation
4. Vérifier que l'on est redirigé vers l'éditeur

**Résultat attendu**:
- ✅ Un nouveau budget est créé avec le nom "Budget depuis [nom du modèle]"
- ✅ Le budget contient toutes les lignes du template
- ✅ Redirection automatique vers l'onglet "Éditeur"
- ✅ Message de confirmation avec le nombre de comptes

**Statut**: ⬜ Non testé | ✅ Réussi | ❌ Échoué

---

### Test 1.5: Suppression d'un modèle
**Pré-requis**: Au moins un modèle créé
**Étapes**:
1. Aller dans l'onglet "Modèles"
2. Cliquer sur le bouton "Supprimer" (icône poubelle rouge)
3. Confirmer la suppression dans le dialog

**Résultat attendu**:
- ✅ Dialog de confirmation s'affiche avec le nom du modèle
- ✅ Le modèle disparaît de la liste après confirmation
- ✅ Aucune erreur affichée

**Statut**: ⬜ Non testé | ✅ Réussi | ❌ Échoué

---

## 2. Tests de la Création de Budget

### Test 2.1: Création d'un nouveau budget
**Pré-requis**: Aucun
**Étapes**:
1. Aller dans l'onglet "Liste"
2. Cliquer sur "Nouveau budget"
3. Remplir tous les champs requis
4. Cliquer sur "Créer"

**Résultat attendu**:
- ✅ Le budget est créé avec une version V1 initiale
- ✅ Le budget apparaît dans la liste
- ✅ La version a le statut "Brouillon"

**Statut**: ⬜ Non testé | ✅ Réussi | ❌ Échoué

---

## 3. Tests de l'Éditeur Budgétaire

### Test 3.1: Ajout d'une ligne budgétaire
**Pré-requis**: Un budget créé
**Étapes**:
1. Sélectionner un budget
2. Cliquer sur "Ajouter une ligne"
3. Sélectionner un compte
4. Vérifier l'ajout dans le tableau

**Résultat attendu**:
- ✅ La ligne est ajoutée au tableau
- ✅ Le compte est correctement affiché
- ✅ Les périodes sont initialisées à 0

**Statut**: ⬜ Non testé | ✅ Réussi | ❌ Échoué

---

### Test 3.2: Saisie de valeurs budgétaires
**Pré-requis**: Un budget avec des lignes
**Étapes**:
1. Cliquer sur une cellule de valeur
2. Saisir un montant
3. Appuyer sur Entrée

**Résultat attendu**:
- ✅ La valeur est enregistrée
- ✅ La cellule affiche le montant formaté
- ✅ Le total est mis à jour

**Statut**: ⬜ Non testé | ✅ Réussi | ❌ Échoué

---

## 4. Tests Import/Export

### Test 4.1: Export d'un budget vers Excel
**Pré-requis**: Un budget avec des données
**Étapes**:
1. Sélectionner un budget
2. Cliquer sur "Exporter"
3. Choisir le format Excel
4. Vérifier le téléchargement

**Résultat attendu**:
- ✅ Un fichier .xlsx est téléchargé
- ✅ Le fichier contient toutes les lignes
- ✅ Les valeurs sont correctes

**Statut**: ⬜ Non testé | ✅ Réussi | ❌ Échoué

---

### Test 4.2: Import d'un budget depuis Excel
**Pré-requis**: Un fichier Excel valide
**Étapes**:
1. Cliquer sur "Importer"
2. Sélectionner le fichier
3. Valider l'import

**Résultat attendu**:
- ✅ Les données sont importées correctement
- ✅ Aucune donnée n'est perdue
- ✅ Message de confirmation

**Statut**: ⬜ Non testé | ✅ Réussi | ❌ Échoué

---

## 5. Tests du Workflow Budgétaire

### Test 5.1: Soumission d'une version
**Pré-requis**: Une version en brouillon
**Étapes**:
1. Sélectionner une version
2. Cliquer sur "Soumettre"
3. Vérifier le changement de statut

**Résultat attendu**:
- ✅ Le statut passe à "Soumis"
- ✅ La version devient non-éditable
- ✅ Horodatage de soumission enregistré

**Statut**: ⬜ Non testé | ✅ Réussi | ❌ Échoué

---

### Test 5.2: Validation d'une version
**Pré-requis**: Une version soumise
**Étapes**:
1. Sélectionner une version soumise
2. Cliquer sur "Valider"
3. Vérifier le changement de statut

**Résultat attendu**:
- ✅ Le statut passe à "Validé"
- ✅ Badge vert affiché
- ✅ Horodatage de validation enregistré

**Statut**: ⬜ Non testé | ✅ Réussi | ❌ Échoué

---

### Test 5.3: Rejet d'une version
**Pré-requis**: Une version soumise
**Étapes**:
1. Sélectionner une version soumise
2. Cliquer sur "Rejeter"
3. Saisir une raison
4. Confirmer

**Résultat attendu**:
- ✅ Le statut passe à "Rejeté"
- ✅ La raison est enregistrée
- ✅ Badge rouge affiché

**Statut**: ⬜ Non testé | ✅ Réussi | ❌ Échoué

---

## 6. Tests de Comparaison de Versions

### Test 6.1: Comparaison de deux versions
**Pré-requis**: Au moins deux versions d'un même budget
**Étapes**:
1. Aller dans l'onglet "Comparaison"
2. Sélectionner la version 1
3. Sélectionner la version 2
4. Vérifier l'affichage des différences

**Résultat attendu**:
- ✅ Les différences sont affichées
- ✅ Les écarts sont calculés (valeur et %)
- ✅ Couleurs distinctes pour chaque version

**Statut**: ⬜ Non testé | ✅ Réussi | ❌ Échoué

---

## Résumé des Tests

| Catégorie | Tests Total | Réussis | Échoués | Non testés |
|-----------|-------------|---------|---------|------------|
| Modèles   | 5           | 0       | 0       | 5          |
| Création  | 1           | 0       | 0       | 1          |
| Éditeur   | 2           | 0       | 0       | 2          |
| Import/Export | 2       | 0       | 0       | 2          |
| Workflow  | 3           | 0       | 0       | 3          |
| Comparaison | 1         | 0       | 0       | 1          |
| **TOTAL** | **14**      | **0**   | **0**   | **14**     |

---

## Notes de Test

### Bugs Identifiés
_(À remplir pendant les tests)_

### Améliorations Suggérées
_(À remplir pendant les tests)_

---

**Date de dernière mise à jour**: 2026-01-24
**Testeur**: _À compléter_
**Version**: 1.0
