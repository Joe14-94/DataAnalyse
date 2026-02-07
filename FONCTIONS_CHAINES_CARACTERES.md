# Fonctions de manipulation de chaînes de caractères

## Vue d'ensemble

Ce document décrit les nouvelles fonctions de manipulation de chaînes de caractères disponibles dans les champs calculés de la vue "Données".

## Fonctions de concaténation

### CONCAT / CONCATENER

Concatène plusieurs valeurs avec un séparateur optionnel.

**Syntaxe :**

```
CONCAT(texte1, texte2, [séparateur])
```

**Exemples :**

```
CONCAT([Prénom], [Nom], " ")           → "Jean Dupont"
CONCAT([Ville], [Pays], ", ")          → "Paris, France"
CONCAT([A], [B], [C])                  → "ABC" (sans séparateur)
```

**Note :** Si le dernier argument est une chaîne courte (1-3 caractères), il sera utilisé comme séparateur.

## Fonctions de recherche et remplacement

### REMPLACER / REPLACE

Remplace toutes les occurrences d'une chaîne par une autre (supporte les expressions régulières).

**Syntaxe :**

```
REMPLACER(texte, recherche, remplacement)
```

**Exemples :**

```
REMPLACER([Texte], "ancien", "nouveau")              → Remplace "ancien" par "nouveau"
REMPLACER([Email], "@.*", "@example.com")           → Change le domaine email (regex)
REMPLACER([Tel], " ", "")                           → Supprime tous les espaces
```

**Cas d'usage avancé - Remplacements multiples :**

```
REMPLACER(REMPLACER([Code], "A", "1"), "B", "2")    → Remplace A par 1, puis B par 2
```

### SUBSTITUER / SUBSTITUTE

Remplace toutes les occurrences d'une chaîne exacte par une autre (sans regex).

**Syntaxe :**

```
SUBSTITUER(texte, ancien_texte, nouveau_texte)
```

**Exemples :**

```
SUBSTITUER([Texte], "old", "new")     → Remplace "old" par "new"
```

**Différence avec REMPLACER :** SUBSTITUER ne supporte pas les expressions régulières, il effectue un remplacement de texte exact.

### TROUVE / FIND / SEARCH

Trouve la position d'une sous-chaîne dans un texte.

**Syntaxe :**

```
TROUVE(recherche, texte, [position_départ])
```

**Retour :** Position de la sous-chaîne (0-indexé), ou -1 si non trouvé.

**Exemples :**

```
TROUVE("World", [Texte])              → 6 (si Texte = "Hello World")
TROUVE("xyz", [Texte])                → -1 (si "xyz" n'est pas dans Texte)
TROUVE("a", [Texte], 5)               → Cherche "a" à partir de la position 5
```

### CONTIENT / CONTAINS / INCLUS

Vérifie si un texte contient une sous-chaîne.

**Syntaxe :**

```
CONTIENT(texte, recherche)
```

**Retour :** `true` si le texte contient la recherche, `false` sinon.

**Exemples :**

```
CONTIENT([Email], "@gmail.com")       → true si email Gmail
CONTIENT([Ville], "Paris")            → true si "Paris" est dans le nom de ville
```

## Fonctions d'extraction

### EXTRAIRE / SUBSTRING / MID

Extrait une sous-chaîne d'un texte.

**Syntaxe :**

```
EXTRAIRE(texte, position_départ, [longueur])
```

**Exemples :**

```
EXTRAIRE([Texte], 0, 5)               → Les 5 premiers caractères
EXTRAIRE([Texte], 6)                  → À partir du 6ème caractère jusqu'à la fin
EXTRAIRE([Code], 3, 2)                → 2 caractères à partir de la position 3
```

### GAUCHE / LEFT

Extrait les n premiers caractères d'un texte.

**Syntaxe :**

```
GAUCHE(texte, nombre_caractères)
```

**Exemples :**

```
GAUCHE([Code], 3)                     → "ABC" (si Code = "ABC123")
GAUCHE([Nom], 1)                      → Première lettre du nom
```

### DROITE / RIGHT

Extrait les n derniers caractères d'un texte.

**Syntaxe :**

```
DROITE(texte, nombre_caractères)
```

**Exemples :**

```
DROITE([Code], 3)                     → "123" (si Code = "ABC123")
DROITE([Année], 2)                    → "24" (si Année = "2024")
```

## Fonctions de transformation

### MAJUSCULE / UPPER

Convertit un texte en majuscules.

**Syntaxe :**

```
MAJUSCULE(texte)
```

**Exemples :**

```
MAJUSCULE([Nom])                      → "DUPONT" (si Nom = "Dupont")
```

### MINUSCULE / LOWER

Convertit un texte en minuscules.

**Syntaxe :**

```
MINUSCULE(texte)
```

**Exemples :**

```
MINUSCULE([Email])                    → "user@example.com"
```

### CAPITALISEPREMIER / CAPITALIZE

Met la première lettre en majuscule et le reste en minuscules.

**Syntaxe :**

```
CAPITALISEPREMIER(texte)
```

**Exemples :**

```
CAPITALISEPREMIER([Prénom])           → "Jean" (si Prénom = "JEAN" ou "jean")
```

### CAPITALISEMOTS / PROPER / TITLE

Met la première lettre de chaque mot en majuscule.

**Syntaxe :**

```
CAPITALISEMOTS(texte)
```

**Exemples :**

```
CAPITALISEMOTS([Titre])               → "Bonjour Le Monde" (si Titre = "bonjour le monde")
```

## Fonctions utilitaires

### LONGUEUR / LENGTH / LEN

Retourne le nombre de caractères dans un texte.

**Syntaxe :**

```
LONGUEUR(texte)
```

**Exemples :**

```
LONGUEUR([Nom])                       → 6 (si Nom = "Dupont")
LONGUEUR([Code])                      → Nombre de caractères du code
```

### SUPPRESPACE / TRIM / NETTOYER

Supprime les espaces au début et à la fin d'un texte.

**Syntaxe :**

```
SUPPRESPACE(texte)
```

**Exemples :**

```
SUPPRESPACE([Nom])                    → "Dupont" (si Nom = "  Dupont  ")
```

## Cas d'usage avancés

### Exemple 1 : Formater un nom complet

```
CONCAT(CAPITALISEPREMIER([Prénom]), MAJUSCULE([Nom]), " ")
```

Résultat : "Jean DUPONT"

### Exemple 2 : Nettoyer et formater un numéro de téléphone

```
REMPLACER(REMPLACER(SUPPRESPACE([Téléphone]), " ", ""), "-", "")
```

Résultat : Supprime tous les espaces et tirets

### Exemple 3 : Extraire un code postal d'une adresse

```
GAUCHE(DROITE([Adresse], 10), 5)
```

Résultat : Extrait les 5 caractères du code postal (si situé dans les 10 derniers caractères)

### Exemple 4 : Créer un email à partir du nom

```
CONCAT(MINUSCULE([Prénom]), ".", MINUSCULE([Nom]), "@example.com")
```

Résultat : "jean.dupont@example.com"

### Exemple 5 : Normaliser des données

```
REMPLACER(REMPLACER(REMPLACER([Statut], "En cours", "Active"), "Terminé", "Completed"), "Annulé", "Cancelled")
```

Résultat : Traduit plusieurs statuts en chaîne

### Exemple 6 : Vérifier et formater une donnée

```
SI(CONTIENT([Email], "@"), [Email], CONCAT([Email], "@example.com"))
```

Résultat : Ajoute "@example.com" si l'email ne contient pas "@"

## Combinaison avec d'autres fonctions

Toutes ces fonctions peuvent être combinées avec les fonctions mathématiques et logiques :

```
SI(LONGUEUR([Code]) > 5, GAUCHE([Code], 5), [Code])
```

Résultat : Limite le code à 5 caractères maximum

```
SI(CONTIENT([Catégorie], "Premium"), [Prix] * 1.2, [Prix])
```

Résultat : Augmente le prix de 20% pour les catégories Premium

## Notes importantes

1. **Indexation :** Les positions commencent à 0 (le premier caractère est à la position 0)
2. **Sensibilité à la casse :** Les fonctions de recherche sont sensibles à la casse
3. **Chaînage :** Vous pouvez imbriquer plusieurs fonctions pour des transformations complexes
4. **Performance :** Les expressions régulières (REMPLACER) peuvent être plus lentes sur de grandes quantités de données
