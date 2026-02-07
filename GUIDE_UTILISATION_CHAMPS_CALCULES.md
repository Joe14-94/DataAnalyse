# Guide pratique : Utilisation des champs calculés avec manipulation de texte

## Comment créer un champ calculé ?

1. Dans la vue **Tableau Croisé Dynamique (TCD)**, cliquez sur le bouton **"+ Champ calculé"**
2. Une modale s'ouvre avec 3 colonnes :
   - **Gauche** : Informations du champ (nom, formule, type)
   - **Centre** : Liste des champs disponibles (cliquez pour insérer)
   - **Droite** : Liste des fonctions (cliquez pour insérer)

## Syntaxe de base

### Références aux colonnes

Les noms de colonnes doivent être **entre crochets** :

```
[NomDeColonne]
```

### Valeurs textuelles

Les chaînes de caractères doivent être **entre guillemets** (simples ou doubles) :

```
"texte" ou 'texte'
```

### Nombres

Les nombres s'écrivent directement :

```
123 ou 45.67
```

---

## Exemples concrets par fonction

### 🔗 CONCAT - Concaténer des colonnes

#### Exemple 1 : Nom complet avec espace

**Colonnes :** `Prénom` = "Jean", `Nom` = "Dupont"

**Formule dans la modale :**

```
CONCAT([Prénom], [Nom], " ")
```

**Résultat :** "Jean Dupont"

**Étapes :**

1. Nom du champ : "Nom complet"
2. Formule : `CONCAT([Prénom], [Nom], " ")`
3. Type de résultat : **Texte**
4. Cliquer sur "Créer le champ"

---

#### Exemple 2 : Adresse complète

**Colonnes :** `Rue` = "5 avenue", `Ville` = "Paris", `CP` = "75001"

**Formule :**

```
CONCAT([Rue], [Ville], [CP], ", ")
```

**Résultat :** "5 avenue, Paris, 75001"

---

### 🔄 REMPLACER - Rechercher et remplacer du texte

#### Exemple 1 : Remplacer "AZERTY" par "QSDFGH" dans la colonne "Test"

**Colonne :** `Test` = "Code AZERTY 123"

**Formule dans la modale :**

```
REMPLACER([Test], "AZERTY", "QSDFGH")
```

**Résultat :** "Code QSDFGH 123"

**Étapes :**

1. Nom du champ : "Test modifié"
2. Formule : `REMPLACER([Test], "AZERTY", "QSDFGH")`
3. Type de résultat : **Texte** ← Important !
4. Cliquer sur "Créer le champ"

Le nouveau champ apparaîtra automatiquement dans **"Lignes"** (en bas à gauche) car c'est du texte.

---

#### Exemple 2 : Nettoyer les espaces dans un numéro de téléphone

**Colonne :** `Téléphone` = "06 12 34 56 78"

**Formule :**

```
REMPLACER([Téléphone], " ", "")
```

**Résultat :** "0612345678"

---

#### Exemple 3 : Remplacements multiples en chaîne

**Colonne :** `Statut` = "En cours"

**Formule :**

```
REMPLACER(REMPLACER(REMPLACER([Statut], "En cours", "Active"), "Terminé", "Done"), "Annulé", "Cancelled")
```

**Résultat :** "Active" (si Statut = "En cours")

**Explication :** On peut imbriquer plusieurs REMPLACER pour faire plusieurs transformations.

---

### 📏 GAUCHE / DROITE - Extraire une partie du texte

#### Exemple 1 : Initiales du prénom

**Colonne :** `Prénom` = "Jean-Pierre"

**Formule :**

```
GAUCHE([Prénom], 1)
```

**Résultat :** "J"

---

#### Exemple 2 : Deux derniers chiffres de l'année

**Colonne :** `Année` = "2024"

**Formule :**

```
DROITE([Année], 2)
```

**Résultat :** "24"

---

### ✂️ EXTRAIRE - Extraire une sous-chaîne

#### Exemple 1 : Code produit (caractères 3 à 7)

**Colonne :** `Référence` = "AB-12345-XY"

**Formule :**

```
EXTRAIRE([Référence], 3, 5)
```

**Résultat :** "12345"

**Explication :** Commence à la position 3 et prend 5 caractères.

---

### 🔍 TROUVE / CONTIENT - Rechercher dans un texte

#### Exemple 1 : Vérifier si un email est Gmail

**Colonne :** `Email` = "jean@gmail.com"

**Formule :**

```
CONTIENT([Email], "@gmail.com")
```

**Résultat :** `true` (booléen)

---

#### Exemple 2 : Trouver la position de "@" dans un email

**Colonne :** `Email` = "jean@example.com"

**Formule :**

```
TROUVE("@", [Email])
```

**Résultat :** 4 (position du @)

---

### 🔤 Transformation de casse

#### Exemple 1 : Formater un nom (Prénom normal, NOM en majuscules)

**Colonnes :** `Prénom` = "jean", `Nom` = "dupont"

**Formule :**

```
CONCAT(CAPITALISEPREMIER([Prénom]), MAJUSCULE([Nom]), " ")
```

**Résultat :** "Jean DUPONT"

---

#### Exemple 2 : Chaque mot avec majuscule (titre)

**Colonne :** `Titre` = "rapport annuel 2024"

**Formule :**

```
CAPITALISEMOTS([Titre])
```

**Résultat :** "Rapport Annuel 2024"

---

### 🧹 SUPPRESPACE - Nettoyer les espaces

#### Exemple : Nettoyer un champ mal formaté

**Colonne :** `Nom` = " Dupont "

**Formule :**

```
SUPPRESPACE([Nom])
```

**Résultat :** "Dupont"

---

## Cas d'usage avancés

### 1. Créer un identifiant unique

**Colonnes :** `Prénom` = "Jean", `Nom` = "Dupont", `ID` = "123"

**Formule :**

```
CONCAT(MAJUSCULE(GAUCHE([Prénom], 1)), MAJUSCULE(GAUCHE([Nom], 3)), [ID], "-")
```

**Résultat :** "J-DUP-123"

---

### 2. Normaliser des données multi-sources

**Colonne :** `Pays` contient "France", "france", "FRANCE"

**Formule :**

```
CAPITALISEPREMIER(SUPPRESPACE([Pays]))
```

**Résultat :** Toujours "France"

---

### 3. Extraire le domaine d'un email

**Colonne :** `Email` = "jean.dupont@example.com"

**Formule :**

```
EXTRAIRE([Email], TROUVE("@", [Email]) + 1)
```

**Résultat :** "example.com"

**Explication :** TROUVE trouve la position du "@", on ajoute 1 pour commencer après, puis EXTRAIRE prend le reste.

---

### 4. Formater un numéro de téléphone français

**Colonne :** `Tel` = "0612345678"

**Formule :**

```
CONCAT(GAUCHE([Tel], 2), EXTRAIRE([Tel], 2, 2), EXTRAIRE([Tel], 4, 2), EXTRAIRE([Tel], 6, 2), EXTRAIRE([Tel], 8, 2), " ")
```

**Résultat :** "06 12 34 56 78"

---

## Différences importantes

### REMPLACER vs SUBSTITUER

**REMPLACER** supporte les expressions régulières (regex) :

```
REMPLACER([Email], "@.*", "@example.com")  ← Change tout après le @
```

**SUBSTITUER** fait un remplacement exact :

```
SUBSTITUER([Email], "@gmail.com", "@example.com")  ← Remplace exactement "@gmail.com"
```

---

## Comportement selon le type de champ

Lors de la création d'un champ calculé, le **Type de résultat** détermine où il apparaît dans le TCD :

| Type de résultat | Zone du TCD         | Exemple d'utilisation                    |
| ---------------- | ------------------- | ---------------------------------------- |
| **Nombre**       | Valeurs (métriques) | Calculs, sommes, moyennes                |
| **Texte**        | Lignes (dimensions) | Concaténations, transformations de texte |
| **Vrai/Faux**    | Lignes (dimensions) | Conditions, tests                        |

**Important :**

- Si vous créez un champ avec **REMPLACER**, **CONCAT**, etc., sélectionnez **Type = Texte**
- Le champ sera automatiquement placé dans **"Lignes"** en bas à gauche
- Vous pourrez ensuite le déplacer vers "Colonnes" ou "Filtres" si besoin

---

## Astuces pratiques

### ✅ Utiliser l'aperçu en temps réel

- La modale affiche un **aperçu du résultat** calculé sur la première ligne
- Si l'aperçu affiche une erreur, vérifiez :
  - Les crochets autour des noms de colonnes : `[Nom]`
  - Les guillemets autour du texte : `"texte"`
  - La syntaxe de la fonction

### ✅ Insérer facilement des champs et fonctions

- **Cliquez** sur un champ dans la colonne centrale pour l'insérer
- **Cliquez** sur une fonction dans la colonne de droite pour l'insérer
- Pas besoin de taper manuellement !

### ✅ Tester avec des exemples simples

Avant de créer une formule complexe, testez chaque partie :

1. `GAUCHE([Nom], 3)` → Vérifiez le résultat
2. `MAJUSCULE(GAUCHE([Nom], 3))` → Ajoutez la transformation
3. Continuez à construire progressivement

---

## Questions fréquentes

**Q : Puis-je utiliser un champ calculé dans un autre champ calculé ?**
R : Oui ! Une fois créé, un champ calculé devient une colonne comme les autres. Vous pouvez l'utiliser avec `[NomDuChampCalculé]`.

**Q : Comment supprimer un champ calculé ?**
R : Dans le TCD, la liste des champs calculés apparaît en haut avec une icône de suppression (🗑️).

**Q : La formule ne fonctionne pas, que faire ?**
R : Vérifiez :

1. Les noms de colonnes sont bien entre `[crochets]`
2. Le texte est bien entre `"guillemets"`
3. L'aperçu affiche le résultat attendu
4. Le type de résultat est bien sélectionné (Texte pour les fonctions de chaînes)

**Q : Puis-je combiner plusieurs fonctions ?**
R : Absolument ! C'est la puissance des champs calculés. Exemple :

```
MAJUSCULE(REMPLACER(SUPPRESPACE([Nom]), "-", " "))
```

Cela va : supprimer les espaces → remplacer les tirets par des espaces → tout mettre en majuscules

---

**Besoin d'aide ?** Consultez la documentation complète dans `FONCTIONS_CHAINES_CARACTERES.md`
