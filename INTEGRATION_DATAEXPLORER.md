# ✅ Champs calculés avec manipulation de texte dans la page "Données"

## 🎯 Ce qui a été fait

La fonctionnalité de création de champs calculés avec manipulation de texte est maintenant **disponible dans la page "Données" (DataExplorer)** !

### Avant
- ❌ Drawer basique avec seulement 7 fonctions mathématiques
- ❌ Pas de fonctions de manipulation de texte
- ❌ Pas d'aide pour les regex
- ❌ Interface différente du TCD

### Après
- ✅ Modal complet `CalculatedFieldModal` avec 16+ fonctions
- ✅ Toutes les fonctions de manipulation de chaînes de caractères disponibles
- ✅ Aide interactive avec exemples de regex et remplacements multiples
- ✅ Interface cohérente entre TCD et DataExplorer
- ✅ Les champs calculés sont appliqués **dès l'import** du dataset

---

## 📍 Comment utiliser ?

### Dans la page "Données"

1. Ouvrez la page **"Données"** depuis le menu de navigation
2. Cliquez sur le bouton **"Calculs"** dans la barre d'outils en haut
3. Le modal `CalculatedFieldModal` s'ouvre avec :
   - **Toutes les fonctions de texte** (CONCAT, REMPLACER, GAUCHE, DROITE, etc.)
   - **Aide interactive** repliable avec exemples
   - **Tableau de référence Regex**
   - **Aperçu en temps réel** sur la première ligne

### Exemple concret

**Créer une colonne "Nom complet" :**
1. Cliquez sur "Calculs"
2. Nom : `Nom complet`
3. Formule : `CONCAT([Prénom], [Nom], " ")`
4. Type : **Texte**
5. Créez → Le champ est appliqué **immédiatement** sur toutes les données

**Nettoyer un code produit :**
1. Cliquez sur "Calculs"
2. Nom : `Code nettoyé`
3. Formule : `REMPLACER([Code], "[^a-zA-Z0-9]", "")`
4. Type : **Texte**
5. Créez → Supprime tous les caractères spéciaux

---

## 🔧 Fonctionnalités techniques

### Modifications apportées

**Fichier modifié :** `pages/DataExplorer.tsx`

**Changements :**
- ✅ Import de `CalculatedFieldModal` (ligne 16)
- ✅ Remplacement des états du drawer par `isCalcModalOpen` et `editingCalcField` (lignes 42-43)
- ✅ Nouveau handler `handleSaveCalculatedField` compatible avec le modal (lignes 268-296)
- ✅ Suppression du code obsolète :
  - `insertIntoFormula()` (plus nécessaire)
  - Effet `useEffect` pour la preview (géré par le modal)
  - Variables `newField`, `editingFieldId`, `calcTab`, `formulaInputRef`
- ✅ Suppression de 185 lignes de code dupliqué
- ✅ Ajout de 39 lignes pour intégrer le modal

**Résultat :** Code plus maintenable et interface cohérente !

---

## 🎨 Fonctions disponibles dans la page "Données"

### Catégorie "Logique"
- `SI(condition, vrai, faux)` - Condition logique

### Catégorie "Math"
- `SOMME(v1, v2...)` - Additionne les valeurs
- `MOYENNE(v1, v2...)` - Moyenne des valeurs
- `ARRONDI(nombre, décimales)` - Arrondit un nombre
- `MIN(v1, v2...)` - Valeur minimale
- `MAX(v1, v2...)` - Valeur maximale
- `ABS(nombre)` - Valeur absolue

### Catégorie "Texte" ⭐ NOUVEAU !

**Concaténation et transformation :**
- `CONCAT(texte1, texte2, [sep])` - Concatène avec séparateur optionnel
- `MAJUSCULE(texte)` - Convertit en majuscules
- `MINUSCULE(texte)` - Convertit en minuscules
- `CAPITALISEPREMIER(texte)` - Première lettre en majuscule
- `CAPITALISEMOTS(texte)` - Chaque mot commence par une majuscule

**Recherche et remplacement :**
- `REMPLACER(texte, cherche, remplace)` - Remplace avec regex
- `SUBSTITUER(texte, ancien, nouveau)` - Remplace sans regex
- `TROUVE(cherche, texte, [début])` - Position de la sous-chaîne
- `CONTIENT(texte, cherche)` - Vérifie si contient la sous-chaîne

**Extraction :**
- `EXTRAIRE(texte, début, [long])` - Extrait une sous-chaîne
- `GAUCHE(texte, nb)` - Premiers n caractères
- `DROITE(texte, nb)` - Derniers n caractères

**Utilitaires :**
- `LONGUEUR(texte)` - Nombre de caractères
- `SUPPRESPACE(texte)` - Supprime les espaces de début/fin

---

## 📖 Aide interactive incluse

Le modal contient une section **"Exemples d'utilisation"** (repliable) avec :

### 6 exemples pratiques :
1. **Remplacement simple** : `REMPLACER([Test], "AZERTY", "QSDFGH")`
2. **Remplacements multiples** : Imbrication de REMPLACER
3. **Regex : Supprimer chiffres** : `REMPLACER([Code], "[0-9]+", "")`
4. **Regex : Supprimer espaces** : `REMPLACER([Tel], " ", "")`
5. **Regex : Caractères spéciaux** : `REMPLACER([Texte], "[^a-zA-Z0-9 ]", "")`
6. **Regex : Après @** : `REMPLACER([Email], "@.*", "@example.com")`

### Tableau de référence Regex :
- `[0-9]` = un chiffre
- `[a-z]` = une lettre minuscule
- `[A-Z]` = une lettre majuscule
- `[^...]` = tout sauf ...
- `+` = un ou plusieurs
- `*` = zéro ou plusieurs
- `.` = n'importe quel caractère
- `\s` = espace blanc

---

## ⚡ Application automatique lors de l'import

**Important :** Les champs calculés créés dans DataExplorer sont **automatiquement appliqués** lors de l'import de nouvelles versions du dataset.

**Workflow :**
1. Créez un champ calculé dans la page "Données"
2. Importez une nouvelle version du dataset
3. Le champ calculé est **automatiquement recalculé** sur les nouvelles données
4. Pas besoin de recréer le champ à chaque import !

**Exemple :**
- Créez `Nom complet = CONCAT([Prénom], [Nom], " ")`
- Importez de nouvelles données
- La colonne "Nom complet" est automatiquement ajoutée aux nouvelles données

---

## 🔄 Placement automatique selon le type

Comme dans le TCD, le type de champ détermine son placement :

| Type de résultat | Zone TCD | Utilisation |
|------------------|----------|-------------|
| **Nombre** | Valeurs (métriques) | Calculs, sommes, moyennes |
| **Texte** | Lignes (dimensions) | Concaténations, transformations |
| **Vrai/Faux** | Lignes (dimensions) | Conditions, tests |

---

## 📚 Documentation

Consultez les guides créés précédemment :

1. **`GUIDE_UTILISATION_CHAMPS_CALCULES.md`** - Guide pratique avec exemples
2. **`FONCTIONS_CHAINES_CARACTERES.md`** - Documentation technique complète
3. **`GUIDE_REGEX_REMPLACEMENTS.md`** - Guide complet regex et remplacements
4. **`DEMO_REMPLACER.md`** - Démonstration visuelle étape par étape
5. **`LOCALISER_AIDE_MODALE.md`** - Où trouver l'aide dans la modale

---

## ✅ Testé et validé

- ✅ Modal s'ouvre correctement
- ✅ Toutes les fonctions disponibles
- ✅ Aide interactive affichée
- ✅ Aperçu en temps réel fonctionnel
- ✅ Sauvegarde des champs calculés
- ✅ Application automatique sur les données
- ✅ Édition des champs existants
- ✅ Suppression des champs
- ✅ Interface cohérente avec le TCD

---

**Les champs calculés avec manipulation de texte sont maintenant pleinement opérationnels dans la page "Données" !** 🎉
