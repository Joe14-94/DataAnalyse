# Guide : Regex et Remplacements Multiples

## 🎯 Comment remplacer plusieurs chaînes différentes ?

### Méthode 1 : Imbrication de REMPLACER

Pour remplacer plusieurs chaînes différentes, vous devez **imbriquer** plusieurs fonctions REMPLACER les unes dans les autres.

**Syntaxe générale :**

```
REMPLACER(REMPLACER(REMPLACER([Colonne], "ancien1", "nouveau1"), "ancien2", "nouveau2"), "ancien3", "nouveau3")
```

**Comment ça marche :**

1. Le REMPLACER le plus à l'intérieur s'exécute en premier
2. Son résultat est passé au REMPLACER suivant
3. Et ainsi de suite jusqu'au dernier REMPLACER

---

### Exemple 1 : Normaliser des statuts

**Colonnes :** `Statut` contient "En cours", "Terminé", "Annulé", etc.

**Objectif :** Traduire en anglais tous les statuts

**Formule :**

```
REMPLACER(REMPLACER(REMPLACER([Statut], "En cours", "Active"), "Terminé", "Done"), "Annulé", "Cancelled")
```

**Étape par étape :**

1. `REMPLACER([Statut], "En cours", "Active")` → Remplace "En cours" par "Active"
2. Le résultat passe au suivant : `REMPLACER(résultat, "Terminé", "Done")` → Remplace "Terminé" par "Done"
3. Le résultat passe au dernier : `REMPLACER(résultat, "Annulé", "Cancelled")` → Remplace "Annulé" par "Cancelled"

**Résultats :**
| Statut original | Statut traduit |
|----------------|----------------|
| En cours | Active |
| Terminé | Done |
| Annulé | Cancelled |
| En attente | En attente | (pas changé car non spécifié)

---

### Exemple 2 : Nettoyer un code produit

**Colonne :** `Code` = "ABC-123_DEF/456"

**Objectif :** Remplacer tous les séparateurs par des espaces

**Formule :**

```
REMPLACER(REMPLACER(REMPLACER([Code], "-", " "), "_", " "), "/", " ")
```

**Résultat :** "ABC 123 DEF 456"

---

### Exemple 3 : Normaliser des données multi-sources

**Colonne :** `Pays` contient "France", "france", "FR", "FRA"

**Objectif :** Tout normaliser en "France"

**Formule :**

```
REMPLACER(REMPLACER(REMPLACER(CAPITALISEPREMIER([Pays]), "Fr", "France"), "Fra", "France"), "France", "France")
```

Ou plus simplement avec des conditions :

```
SI(CONTIENT(MAJUSCULE([Pays]), "FR"), "France", [Pays])
```

---

## 🔍 Comment utiliser les expressions régulières (Regex) ?

Les **expressions régulières** (ou regex) permettent de rechercher des **patterns** (motifs) complexes dans du texte.

### Syntaxe avec REMPLACER

```
REMPLACER([Colonne], "pattern_regex", "remplacement")
```

**Important :** Les regex fonctionnent uniquement avec `REMPLACER`, pas avec `SUBSTITUER`.

---

## 📚 Patterns Regex les plus utiles

### 1. Supprimer tous les chiffres

**Pattern :** `[0-9]+`

**Signification :**

- `[0-9]` = un chiffre de 0 à 9
- `+` = un ou plusieurs

**Formule :**

```
REMPLACER([Code], "[0-9]+", "")
```

**Exemples :**
| Avant | Après |
|-------|-------|
| ABC123 | ABC |
| Test456End | TestEnd |
| 2024-Report | -Report |

---

### 2. Supprimer tous les espaces

**Pattern :** ` ` (un espace simple) ou `\s` (tous types d'espaces)

**Formule :**

```
REMPLACER([Téléphone], " ", "")
```

**Exemples :**
| Avant | Après |
|-------|-------|
| 06 12 34 56 78 | 0612345678 |
| Hello World | HelloWorld |

---

### 3. Supprimer tous les caractères spéciaux

**Pattern :** `[^a-zA-Z0-9 ]`

**Signification :**

- `[^...]` = tout **SAUF** ce qui est dans les crochets
- `a-zA-Z0-9 ` = lettres minuscules, majuscules, chiffres et espaces
- Donc : tout sauf lettres, chiffres et espaces

**Formule :**

```
REMPLACER([Texte], "[^a-zA-Z0-9 ]", "")
```

**Exemples :**
| Avant | Après |
|-------|-------|
| Hello@World! | HelloWorld |
| Code#123-ABC | Code123ABC |
| Test&Value$2024 | TestValue2024 |

---

### 4. Garder uniquement les lettres

**Pattern :** `[^a-zA-Z]`

**Formule :**

```
REMPLACER([Nom], "[^a-zA-Z]", "")
```

**Exemples :**
| Avant | Après |
|-------|-------|
| Jean-Pierre | JeanPierre |
| Marie123 | Marie |
| O'Connor | OConnor |

---

### 5. Remplacer tout après un caractère

**Pattern :** `@.*`

**Signification :**

- `@` = le caractère arobase
- `.` = n'importe quel caractère
- `*` = zéro ou plusieurs fois
- Donc : @ suivi de n'importe quoi

**Formule :**

```
REMPLACER([Email], "@.*", "@example.com")
```

**Exemples :**
| Avant | Après |
|-------|-------|
| user@gmail.com | user@example.com |
| admin@domain.fr | admin@example.com |

---

### 6. Remplacer les doubles espaces par un seul

**Pattern :** ` +` (espace suivi de +)

**Formule :**

```
REMPLACER([Texte], " +", " ")
```

**Exemples :**
| Avant | Après |
|-------|-------|
| Hello World | Hello World |
| A B C | A B C |

---

### 7. Supprimer les tirets et underscores

**Pattern :** `[-_]`

**Signification :**

- `[-_]` = soit un tiret, soit un underscore

**Formule :**

```
REMPLACER([Code], "[-_]", "")
```

**Exemples :**
| Avant | Après |
|-------|-------|
| ABC-123 | ABC123 |
| test_value | testvalue |
| hello-world_2024 | helloworld2024 |

---

### 8. Remplacer plusieurs espaces/séparateurs par un seul

**Pattern :** `[ \-_/]+`

**Signification :**

- `[ \-_/]` = espace, tiret, underscore ou slash
- `+` = un ou plusieurs

**Formule :**

```
REMPLACER([Code], "[ \-_/]+", " ")
```

**Exemples :**
| Avant | Après |
|-------|-------|
| ABC-123_DEF/456 | ABC 123 DEF 456 |
| Hello---World | Hello World |

---

## 🎓 Tableaux de référence Regex

### Caractères spéciaux

| Pattern | Signification            | Exemple                            |
| ------- | ------------------------ | ---------------------------------- |
| `.`     | N'importe quel caractère | `a.c` trouve "abc", "adc", "a1c"   |
| `*`     | 0 ou plusieurs           | `ab*` trouve "a", "ab", "abb"      |
| `+`     | 1 ou plusieurs           | `ab+` trouve "ab", "abb" (pas "a") |
| `?`     | 0 ou 1                   | `ab?` trouve "a", "ab"             |
| `^`     | Début de chaîne          | `^Hello` trouve "Hello" en début   |
| `$`     | Fin de chaîne            | `World$` trouve "World" en fin     |

### Classes de caractères

| Pattern    | Signification           | Équivalent     |
| ---------- | ----------------------- | -------------- |
| `[0-9]`    | Un chiffre              | `[0123456789]` |
| `[a-z]`    | Une lettre minuscule    | -              |
| `[A-Z]`    | Une lettre majuscule    | -              |
| `[a-zA-Z]` | Une lettre (min ou maj) | -              |
| `[^0-9]`   | Tout SAUF un chiffre    | -              |
| `\d`       | Un chiffre              | `[0-9]`        |
| `\s`       | Un espace blanc         | `[ \t\n\r]`    |
| `\w`       | Lettre, chiffre ou \_   | `[a-zA-Z0-9_]` |

### Quantificateurs

| Pattern | Signification     | Exemple                          |
| ------- | ----------------- | -------------------------------- |
| `{n}`   | Exactement n fois | `[0-9]{3}` = 3 chiffres          |
| `{n,}`  | Au moins n fois   | `[0-9]{2,}` = 2 chiffres ou plus |
| `{n,m}` | Entre n et m fois | `[0-9]{2,4}` = 2 à 4 chiffres    |

---

## 💡 Cas d'usage pratiques

### Cas 1 : Nettoyer des numéros de téléphone

**Objectif :** Supprimer espaces, tirets, points, parenthèses

**Colonne :** `Téléphone` = "06.12.34.56.78", "(01) 23 45 67 89"

**Formule :**

```
REMPLACER([Téléphone], "[ .\-()]", "")
```

**Résultat :**

- "06.12.34.56.78" → "0612345678"
- "(01) 23 45 67 89" → "0123456789"

---

### Cas 2 : Extraire uniquement les chiffres d'un code

**Objectif :** Garder uniquement les chiffres

**Colonne :** `Code` = "ABC-123-DEF"

**Formule :**

```
REMPLACER([Code], "[^0-9]", "")
```

**Résultat :** "123"

---

### Cas 3 : Formater un SIRET (supprimer espaces)

**Colonne :** `SIRET` = "123 456 789 00012"

**Formule :**

```
REMPLACER([SIRET], " ", "")
```

**Résultat :** "12345678900012"

---

### Cas 4 : Normaliser des URLs

**Objectif :** Remplacer http:// par https://

**Colonne :** `URL` = "http://example.com"

**Formule :**

```
REMPLACER([URL], "^http://", "https://")
```

**Résultat :** "https://example.com"

---

### Cas 5 : Masquer les emails

**Objectif :** Remplacer le domaine par \*\*\*

**Colonne :** `Email` = "user@example.com"

**Formule :**

```
REMPLACER([Email], "@.*", "@***")
```

**Résultat :** "user@\*\*\*"

---

### Cas 6 : Nettoyer un texte copié-collé

**Objectif :** Supprimer espaces multiples, retours à la ligne, tabulations

**Colonne :** `Texte` avec espaces/tabs/retours multiples

**Formule :**

```
REMPLACER([Texte], "[ \t\n\r]+", " ")
```

**Résultat :** Un seul espace entre chaque mot

---

### Cas 7 : Extraire le début d'un code postal

**Objectif :** Garder uniquement les 2 premiers chiffres

**Colonne :** `Code Postal` = "75001"

**Formule (sans regex) :**

```
GAUCHE([Code Postal], 2)
```

**Formule (avec regex) :**

```
REMPLACER([Code Postal], "^([0-9]{2}).*", "$1")
```

**Résultat :** "75"

---

## 🔗 Combiner regex et autres fonctions

### Exemple 1 : Nettoyer puis mettre en majuscules

```
MAJUSCULE(REMPLACER([Nom], "[^a-zA-Z]", ""))
```

- Supprime tous les caractères non-lettres
- Puis convertit en majuscules

### Exemple 2 : Remplacer puis supprimer espaces

```
SUPPRESPACE(REMPLACER(REMPLACER([Texte], "-", " "), "_", " "))
```

- Remplace tirets et underscores par des espaces
- Puis supprime les espaces de début/fin

### Exemple 3 : Condition basée sur pattern

```
SI(CONTIENT([Code], "-"), REMPLACER([Code], "-", ""), [Code])
```

- Si le code contient un tiret, le remplace
- Sinon, garde l'original

---

## ⚠️ Erreurs courantes

### Erreur 1 : Oublier d'échapper les caractères spéciaux

Certains caractères ont un sens spécial en regex : `. * + ? ^ $ ( ) [ ] { } | \`

**Mauvais :**

```
REMPLACER([Texte], ".", "")  ← Supprime TOUS les caractères !
```

**Correct :**

```
REMPLACER([Texte], "\.", "")  ← Supprime uniquement les points
```

### Erreur 2 : Confondre REMPLACER et SUBSTITUER

**REMPLACER** supporte les regex :

```
REMPLACER([Code], "[0-9]+", "")  ✅ Fonctionne
```

**SUBSTITUER** ne supporte PAS les regex :

```
SUBSTITUER([Code], "[0-9]+", "")  ❌ Cherche littéralement "[0-9]+"
```

### Erreur 3 : Pattern trop large

**Trop large :**

```
REMPLACER([Email], ".*@", "user@")  ← Remplace tout jusqu'au dernier @
```

**Plus précis :**

```
REMPLACER([Email], "^.*@", "user@")  ← Remplace seulement avant le premier @
```

---

## 🎯 Dans la modale de champ calculé

Tous ces exemples sont maintenant **disponibles directement dans la modale** !

1. Cliquez sur **"+ Champ calculé"**
2. En bas de la modale, cliquez sur **"📖 Exemples d'utilisation"**
3. Consultez les 6 exemples pratiques :
   - Remplacement simple
   - Remplacements multiples en chaîne
   - Supprimer tous les chiffres (regex)
   - Supprimer tous les espaces (regex)
   - Supprimer caractères spéciaux (regex)
   - Remplacer tout après @ (regex)
4. Un tableau de référence rapide des patterns regex est inclus

---

## 📚 Pour aller plus loin

### Documentation complète

- **Guide pratique** : `GUIDE_UTILISATION_CHAMPS_CALCULES.md`
- **Toutes les fonctions** : `FONCTIONS_CHAINES_CARACTERES.md`
- **Démo REMPLACER** : `DEMO_REMPLACER.md`

### Tester vos regex

**Astuce :** Utilisez l'aperçu en temps réel dans la modale pour tester vos formules regex avant de créer le champ !

L'aperçu affiche le résultat calculé sur la première ligne de vos données, ce qui vous permet de vérifier immédiatement si votre pattern fonctionne.

---

**Besoin d'aide ?** Les exemples dans la modale sont interactifs - développez la section "Exemples d'utilisation" pour voir tous les cas d'usage !
