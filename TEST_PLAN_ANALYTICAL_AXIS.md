# Plan de Test - Import d'Axes Analytiques

## Objectif
Valider la fonctionnalité d'import des axes analytiques et de leurs valeurs depuis des fichiers Excel/CSV.

---

## 1. Tests de Création d'Axe Analytique

### Test 1.1: Création d'un axe analytique simple
**Pré-requis**: Accès au module Budget, onglet Référentiels
**Étapes**:
1. Aller dans "Budget" → "Référentiels"
2. Cliquer sur "Nouvel axe"
3. Remplir Code: "CC"
4. Remplir Nom: "Centre de coûts"
5. Ne pas cocher "Obligatoire"
6. Cliquer sur "Créer"

**Résultat attendu**:
- ✅ Message de confirmation "Axe analytique créé avec succès !"
- ✅ L'axe apparaît dans la liste avec le code "CC"
- ✅ Badge de code affiché en bleu
- ✅ Affiche "0 valeur(s) configurée(s)"

**Statut**: ⬜ Non testé | ✅ Réussi | ❌ Échoué

---

### Test 1.2: Création d'un axe obligatoire
**Pré-requis**: Accès au module Budget, onglet Référentiels
**Étapes**:
1. Cliquer sur "Nouvel axe"
2. Code: "PRJ", Nom: "Projet"
3. Cocher "Axe obligatoire sur les lignes budgétaires"
4. Cliquer sur "Créer"

**Résultat attendu**:
- ✅ L'axe est créé avec un badge rouge "Obligatoire"
- ✅ Le badge est clairement visible à côté du code

**Statut**: ⬜ Non testé | ✅ Réussi | ❌ Échoué

---

### Test 1.3: Validation - Code en double
**Pré-requis**: Au moins un axe créé avec code "CC"
**Étapes**:
1. Créer un nouvel axe avec le même code "CC"
2. Tenter de valider

**Résultat attendu**:
- ✅ Message d'erreur "Un axe avec ce code existe déjà"
- ✅ L'axe n'est pas créé

**Statut**: ⬜ Non testé | ✅ Réussi | ❌ Échoué

---

### Test 1.4: Validation - Champs requis
**Pré-requis**: Aucun
**Étapes**:
1. Ouvrir la modal "Nouvel axe"
2. Laisser Code et Nom vides
3. Cliquer sur "Créer"

**Résultat attendu**:
- ✅ Message d'erreur "Veuillez saisir un code et un nom pour l'axe"
- ✅ L'axe n'est pas créé

**Statut**: ⬜ Non testé | ✅ Réussi | ❌ Échoué

---

## 2. Tests de Téléchargement du Template

### Test 2.1: Téléchargement du template Excel
**Pré-requis**: Aucun
**Étapes**:
1. Aller dans "Budget" → "Référentiels"
2. Cliquer sur "Template"
3. Vérifier le téléchargement

**Résultat attendu**:
- ✅ Fichier "Template_Axe_Analytique.xlsx" téléchargé
- ✅ Le fichier contient les colonnes: Code, Libellé, Code Parent, Responsable, Email Responsable
- ✅ 3 lignes d'exemple présentes (CC-001, CC-002, CC-003)
- ✅ Hiérarchie visible (CC-002 et CC-003 ont CC-001 comme parent)

**Statut**: ⬜ Non testé | ✅ Réussi | ❌ Échoué

---

## 3. Tests d'Import Excel

### Test 3.1: Import Excel basique
**Pré-requis**: Un axe analytique créé (ex: "CC"), fichier Excel avec valeurs
**Étapes**:
1. Créer un fichier Excel avec:
   - Colonne "Code": CC-001, CC-002, CC-003
   - Colonne "Libellé": Direction Générale, Direction Marketing, Direction IT
2. Sur l'axe "CC", cliquer sur "Importer"
3. Sélectionner le fichier
4. Vérifier l'import

**Résultat attendu**:
- ✅ Message "Import réussi ! 3 valeur(s) importée(s)."
- ✅ Les 3 valeurs apparaissent dans la liste
- ✅ Codes et libellés corrects
- ✅ Le compteur affiche "3 valeur(s) configurée(s)"

**Statut**: ⬜ Non testé | ✅ Réussi | ❌ Échoué

---

### Test 3.2: Import Excel avec hiérarchie
**Pré-requis**: Un axe créé
**Étapes**:
1. Créer un fichier Excel avec colonne "Code Parent":
   - CC-001, DG, (vide)
   - CC-002, Marketing, CC-001
   - CC-003, IT, CC-001
2. Importer le fichier

**Résultat attendu**:
- ✅ Import réussi
- ✅ Les liens de parenté sont enregistrés (vérifiable via export)
- ✅ Aucune erreur affichée

**Statut**: ⬜ Non testé | ✅ Réussi | ❌ Échoué

---

### Test 3.3: Import Excel avec responsables
**Pré-requis**: Un axe créé
**Étapes**:
1. Créer un fichier Excel avec:
   - Colonnes: Code, Libellé, Responsable, Email Responsable
   - Ligne: CC-001, DG, John Doe, john@example.com
2. Importer

**Résultat attendu**:
- ✅ Import réussi
- ✅ Les informations de responsable sont enregistrées
- ✅ Vérifiable via export

**Statut**: ⬜ Non testé | ✅ Réussi | ❌ Échoué

---

### Test 3.4: Import Excel - Détection automatique des colonnes
**Pré-requis**: Un axe créé
**Étapes**:
1. Créer un fichier avec colonnes dans un ordre différent:
   - Libellé, Code (inversé)
2. Importer

**Résultat attendu**:
- ✅ La détection automatique fonctionne
- ✅ Import réussi avec bon mapping
- ✅ Données correctement importées

**Statut**: ⬜ Non testé | ✅ Réussi | ❌ Échoué

---

### Test 3.5: Import Excel - Gestion des erreurs
**Pré-requis**: Un axe créé
**Étapes**:
1. Créer un fichier Excel vide (sans données)
2. Tenter l'import

**Résultat attendu**:
- ✅ Message d'erreur clair
- ✅ "Le fichier doit contenir au moins une ligne d'en-tête et une ligne de données"
- ✅ Aucune valeur créée

**Statut**: ⬜ Non testé | ✅ Réussi | ❌ Échoué

---

### Test 3.6: Import Excel - Ligne sans code
**Pré-requis**: Un axe créé
**Étapes**:
1. Créer un fichier avec une ligne ayant un code vide
2. Importer

**Résultat attendu**:
- ✅ Message d'erreur "Chaque ligne doit avoir un code"
- ✅ Import échoue
- ✅ Aucune valeur créée

**Statut**: ⬜ Non testé | ✅ Réussi | ❌ Échoué

---

## 4. Tests d'Import CSV

### Test 4.1: Import CSV avec délimiteur point-virgule (;)
**Pré-requis**: Un axe créé
**Étapes**:
1. Créer un fichier CSV avec séparateur ;
   ```
   Code;Libellé
   CC-001;Direction Générale
   CC-002;Marketing
   ```
2. Importer

**Résultat attendu**:
- ✅ Délimiteur détecté automatiquement
- ✅ Import réussi
- ✅ 2 valeurs créées

**Statut**: ⬜ Non testé | ✅ Réussi | ❌ Échoué

---

### Test 4.2: Import CSV avec délimiteur virgule (,)
**Pré-requis**: Un axe créé
**Étapes**:
1. Créer un fichier CSV avec séparateur ,
   ```
   Code,Label
   CC-001,General Management
   ```
2. Importer

**Résultat attendu**:
- ✅ Délimiteur détecté
- ✅ Import réussi

**Statut**: ⬜ Non testé | ✅ Réussi | ❌ Échoué

---

### Test 4.3: Import CSV - Encodage UTF-8
**Pré-requis**: Un axe créé
**Étapes**:
1. Créer un CSV avec caractères accentués
   ```
   Code;Libellé
   CC-001;Contrôle de Gestion
   CC-002;Activités Européennes
   ```
2. Importer

**Résultat attendu**:
- ✅ Les accents sont préservés
- ✅ Import réussi
- ✅ Libellés affichés correctement

**Statut**: ⬜ Non testé | ✅ Réussi | ❌ Échoué

---

## 5. Tests d'Export

### Test 5.1: Export des valeurs d'axe vers Excel
**Pré-requis**: Un axe avec au moins 3 valeurs
**Étapes**:
1. Sur un axe ayant des valeurs, cliquer sur "Exporter"
2. Vérifier le fichier téléchargé

**Résultat attendu**:
- ✅ Fichier .xlsx téléchargé avec format: [NomAxe]_[Date].xlsx
- ✅ Toutes les colonnes présentes: Code, Libellé, Code Parent, Responsable, Email Responsable, Actif
- ✅ Toutes les valeurs exportées
- ✅ Données correctes

**Statut**: ⬜ Non testé | ✅ Réussi | ❌ Échoué

---

### Test 5.2: Export - Pas de bouton si aucune valeur
**Pré-requis**: Un axe sans valeur
**Étapes**:
1. Vérifier un axe vide

**Résultat attendu**:
- ✅ Bouton "Exporter" n'est pas affiché
- ✅ Seul le bouton "Importer" est visible

**Statut**: ⬜ Non testé | ✅ Réussi | ❌ Échoué

---

## 6. Tests de Gestion des Valeurs

### Test 6.1: Affichage des valeurs importées
**Pré-requis**: Axe avec valeurs importées
**Étapes**:
1. Vérifier l'affichage dans la carte de l'axe

**Résultat attendu**:
- ✅ Les valeurs sont affichées en grille
- ✅ Code affiché en police monospace grise
- ✅ Libellé affiché en noir
- ✅ Bouton X de suppression visible

**Statut**: ⬜ Non testé | ✅ Réussi | ❌ Échoué

---

### Test 6.2: Suppression d'une valeur
**Pré-requis**: Axe avec au moins 1 valeur
**Étapes**:
1. Cliquer sur le X d'une valeur
2. Confirmer la suppression

**Résultat attendu**:
- ✅ Dialog de confirmation avec le nom de la valeur
- ✅ La valeur est supprimée après confirmation
- ✅ Le compteur est mis à jour

**Statut**: ⬜ Non testé | ✅ Réussi | ❌ Échoué

---

### Test 6.3: Limitation d'affichage (>20 valeurs)
**Pré-requis**: Importer >20 valeurs
**Étapes**:
1. Importer 25 valeurs
2. Vérifier l'affichage

**Résultat attendu**:
- ✅ Seules les 20 premières valeurs sont affichées
- ✅ Message "... et 5 autre(s)" affiché
- ✅ Zone scrollable si nécessaire

**Statut**: ⬜ Non testé | ✅ Réussi | ❌ Échoué

---

## 7. Tests d'Interface Utilisateur

### Test 7.1: État vide - Premier axe
**Pré-requis**: Aucun axe créé
**Étapes**:
1. Aller dans l'onglet Référentiels

**Résultat attendu**:
- ✅ Zone avec bordure en pointillés affichée
- ✅ Icône filtre grise centrée
- ✅ Message "Aucun axe analytique"
- ✅ Bouton "Créer un axe" visible

**Statut**: ⬜ Non testé | ✅ Réussi | ❌ Échoué

---

### Test 7.2: Messages d'aide dans la modal d'import
**Pré-requis**: Aucun
**Étapes**:
1. Ouvrir la modal d'import

**Résultat attendu**:
- ✅ Encadré bleu avec format attendu
- ✅ Liste des colonnes requises et optionnelles
- ✅ Instructions claires

**Statut**: ⬜ Non testé | ✅ Réussi | ❌ Échoué

---

### Test 7.3: Indicateur de chargement pendant l'import
**Pré-requis**: Fichier à importer
**Étapes**:
1. Lancer un import
2. Observer pendant le traitement

**Résultat attendu**:
- ✅ Bouton devient "Import en cours..."
- ✅ Icône horloge avec animation spin
- ✅ Bouton désactivé pendant l'import

**Statut**: ⬜ Non testé | ✅ Réussi | ❌ Échoué

---

### Test 7.4: Gestion des erreurs - Affichage
**Pré-requis**: Import avec erreur
**Étapes**:
1. Importer un fichier invalide
2. Vérifier l'affichage de l'erreur

**Résultat attendu**:
- ✅ Encadré rouge avec l'erreur
- ✅ Icône AlertCircle
- ✅ Message d'erreur clair

**Statut**: ⬜ Non testé | ✅ Réussi | ❌ Échoué

---

## 8. Tests de Formats de Fichiers

### Test 8.1: Format .xlsx
**Pré-requis**: Fichier .xlsx valide
**Étapes**:
1. Importer un fichier .xlsx

**Résultat attendu**:
- ✅ Import réussi

**Statut**: ⬜ Non testé | ✅ Réussi | ❌ Échoué

---

### Test 8.2: Format .xls (ancien Excel)
**Pré-requis**: Fichier .xls valide
**Étapes**:
1. Importer un fichier .xls

**Résultat attendu**:
- ✅ Import réussi
- ✅ Compatibilité avec ancien format

**Statut**: ⬜ Non testé | ✅ Réussi | ❌ Échoué

---

### Test 8.3: Format .csv
**Pré-requis**: Fichier .csv valide
**Étapes**:
1. Importer un fichier .csv

**Résultat attendu**:
- ✅ Import réussi

**Statut**: ⬜ Non testé | ✅ Réussi | ❌ Échoué

---

### Test 8.4: Format non supporté (.txt, .pdf, etc.)
**Pré-requis**: Fichier .txt
**Étapes**:
1. Tenter d'importer un .txt

**Résultat attendu**:
- ✅ Erreur "Format de fichier non supporté. Utilisez .xlsx, .xls ou .csv"
- ✅ Aucune valeur créée

**Statut**: ⬜ Non testé | ✅ Réussi | ❌ Échoué

---

## 9. Tests d'Intégration

### Test 9.1: Import multiple sur le même axe
**Pré-requis**: Un axe avec déjà 3 valeurs
**Étapes**:
1. Importer 2 nouvelles valeurs
2. Vérifier le résultat

**Résultat attendu**:
- ✅ Les 2 nouvelles valeurs s'ajoutent aux 3 existantes
- ✅ Total: 5 valeurs
- ✅ Pas de doublon

**Statut**: ⬜ Non testé | ✅ Réussi | ❌ Échoué

---

### Test 9.2: Import sur différents axes
**Pré-requis**: 2 axes créés
**Étapes**:
1. Importer valeurs sur axe 1
2. Importer valeurs sur axe 2
3. Vérifier la séparation

**Résultat attendu**:
- ✅ Les valeurs sont correctement assignées à chaque axe
- ✅ Pas de mélange entre axes
- ✅ Compteurs corrects

**Statut**: ⬜ Non testé | ✅ Réussi | ❌ Échoué

---

## Résumé des Tests

| Catégorie | Tests Total | Réussis | Échoués | Non testés |
|-----------|-------------|---------|---------|------------|
| Création d'axe | 4      | 0       | 0       | 4          |
| Template  | 1           | 0       | 0       | 1          |
| Import Excel | 6        | 0       | 0       | 6          |
| Import CSV | 3          | 0       | 0       | 3          |
| Export    | 2           | 0       | 0       | 2          |
| Gestion Valeurs | 3    | 0       | 0       | 3          |
| Interface | 4           | 0       | 0       | 4          |
| Formats   | 4           | 0       | 0       | 4          |
| Intégration | 2         | 0       | 0       | 2          |
| **TOTAL** | **29**      | **0**   | **0**   | **29**     |

---

## Notes de Test

### Bugs Identifiés
_(À remplir pendant les tests)_

### Améliorations Suggérées
_(À remplir pendant les tests)_

---

## Exemple de Fichier Excel de Test

```
Code        | Libellé                  | Code Parent | Responsable  | Email Responsable
------------|--------------------------|-------------|--------------|-------------------
CC-001      | Direction Générale       |             | John Doe     | john@example.com
CC-002      | Direction Marketing      | CC-001      | Jane Smith   | jane@example.com
CC-003      | Direction IT             | CC-001      | Bob Wilson   | bob@example.com
CC-004      | Marketing Digital        | CC-002      | Alice Brown  | alice@example.com
CC-005      | Infrastructure IT        | CC-003      | Tom Davis    | tom@example.com
```

---

**Date de dernière mise à jour**: 2026-01-24
**Testeur**: _À compléter_
**Version**: 1.0
