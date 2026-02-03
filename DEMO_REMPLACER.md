# 🎯 Démonstration : Remplacer "AZERTY" par "QSDFGH" dans la colonne "Test"

## Scénario
Vous avez une colonne nommée **"Test"** qui contient des valeurs comme :
- "Code AZERTY 123"
- "AZERTY-456"
- "Test AZERTY final"

Vous voulez créer une nouvelle colonne où toutes les occurrences de "AZERTY" sont remplacées par "QSDFGH".

---

## 📋 Étape par étape dans la modale

### Étape 1 : Ouvrir la modale
Dans le **Tableau Croisé Dynamique (TCD)**, cliquez sur le bouton **"+ Champ calculé"** en haut à gauche.

```
┌──────────────────────────────────────────────────────────────────┐
│  🧮 Nouveau champ calculé                              ✖         │
│  ASSISTANT DE CRÉATION                                            │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─ Colonne 1 : Formulaire ──────────────────────────────┐       │
│  │                                                         │       │
│  │  Nom du champ                                          │       │
│  │  ┌────────────────────────────────────────────────┐   │       │
│  │  │ [Saisissez le nom ici]                         │   │       │
│  │  └────────────────────────────────────────────────┘   │       │
│  │                                                         │       │
│  │  Formule                                               │       │
│  │  ┌────────────────────────────────────────────────┐   │       │
│  │  │                                                 │   │       │
│  │  │ [Votre formule ici]                            │   │       │
│  │  │                                                 │   │       │
│  │  │                                                 │   │       │
│  │  └────────────────────────────────────────────────┘   │       │
│  │                                                         │       │
│  │  Type de résultat                                      │       │
│  │  ┌────────────────────────────────────────────────┐   │       │
│  │  │ [Sélection : Nombre / Texte / Vrai-Faux]      │   │       │
│  │  └────────────────────────────────────────────────┘   │       │
│  └─────────────────────────────────────────────────────┘       │
│                                                                   │
│  ┌─ Colonne 2 : Champs disponibles ──┬─ Colonne 3 : Fonctions ─┐│
│  │                                     │                          ││
│  │  📊 CHAMPS                          │  🔢 FONCTIONS            ││
│  │  • Champ1                           │                          ││
│  │  • Champ2                           │  Logique                 ││
│  │  • Test                             │  • SI                    ││
│  │  • ...                              │                          ││
│  │                                     │  Math                    ││
│  │  [Cliquez pour insérer]            │  • SOMME                 ││
│  │                                     │  • MOYENNE               ││
│  │                                     │                          ││
│  │                                     │  Texte                   ││
│  │                                     │  • CONCAT                ││
│  │                                     │  • REMPLACER ← ICI       ││
│  │                                     │  • GAUCHE                ││
│  │                                     │  • ...                   ││
│  └─────────────────────────────────────┴──────────────────────────┘│
│                                                                   │
│  ┌─ Aperçu ──────────────────────────────────────────────────┐   │
│  │  ✨ Aperçu du résultat                                     │   │
│  │  [Le résultat s'affichera ici]                            │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                   │
│  [Annuler]                                    [Créer le champ]    │
└──────────────────────────────────────────────────────────────────┘
```

---

### Étape 2 : Remplir le nom du champ

Dans le champ **"Nom du champ"**, saisissez :
```
Test modifié
```

```
  Nom du champ
  ┌────────────────────────────────────────────────┐
  │ Test modifié                                   │ ✓
  └────────────────────────────────────────────────┘
```

---

### Étape 3 : Construire la formule

**Option A : Saisie manuelle**
Dans le champ **"Formule"**, tapez directement :
```
REMPLACER([Test], "AZERTY", "QSDFGH")
```

**Option B : Avec les clics (recommandé)**
1. Cliquez sur **"REMPLACER"** dans la colonne de droite (section Texte)
   → La formule affiche : `REMPLACER(`

2. Cliquez sur **"Test"** dans la colonne des champs
   → La formule affiche : `REMPLACER([Test]`

3. Tapez manuellement : `, "AZERTY", "QSDFGH")`

**Résultat final dans le champ Formule :**
```
  Formule
  ┌────────────────────────────────────────────────┐
  │ REMPLACER([Test], "AZERTY", "QSDFGH")         │ ✓
  │                                                 │
  │                                                 │
  │                                                 │
  └────────────────────────────────────────────────┘
```

---

### Étape 4 : Sélectionner le type "Texte"

**C'est l'étape CRUCIALE !**

Dans le champ **"Type de résultat"**, sélectionnez **"Texte"** (et non "Nombre").

```
  Type de résultat
  ┌────────────────────────────────────────────────┐
  │ Texte                                ▼         │ ✓
  └────────────────────────────────────────────────┘
       ↑
       IMPORTANT : Sélectionnez "Texte" !
```

**Pourquoi ?**
- Si vous choisissez "Texte" → Le champ ira dans **"Lignes"** (dimensions)
- Si vous choisissez "Nombre" → Le champ ira dans **"Valeurs"** (métriques) ← Pas adapté pour du texte !

---

### Étape 5 : Vérifier l'aperçu

Pendant que vous tapez, l'aperçu en bas de la modale affiche le résultat calculé sur la première ligne de vos données.

Si votre première ligne a `Test = "Code AZERTY 123"`, vous verrez :

```
  ┌─ Aperçu ──────────────────────────────────────┐
  │  ✨ Aperçu du résultat                         │
  │                                                 │
  │  Code QSDFGH 123                               │ ✓
  │                                                 │
  │  Calculé sur la 1ère ligne                     │
  └─────────────────────────────────────────────────┘
```

**Si l'aperçu affiche une erreur :**
```
  ┌─ Aperçu ──────────────────────────────────────┐
  │  ❌ Erreur dans la formule                     │
  │                                                 │
  │  Syntaxe invalide                              │
  └─────────────────────────────────────────────────┘
```

Vérifiez :
- Les crochets autour de `[Test]`
- Les guillemets autour de `"AZERTY"` et `"QSDFGH"`
- Les virgules entre les arguments

---

### Étape 6 : Créer le champ

Cliquez sur le bouton **"Créer le champ"** en bas à droite.

```
  ┌────────────┐                  ┌──────────────────────┐
  │  Annuler   │                  │  ✓ Créer le champ    │
  └────────────┘                  └──────────────────────┘
                                            ↑
                                       Cliquez ici
```

---

## ✅ Résultat attendu

### Dans le menu du TCD (à gauche)

Votre nouveau champ **"Test modifié"** apparaît automatiquement dans la section **"Lignes"** :

```
┌─ Configuration TCD ─────────────────────┐
│                                          │
│  📊 Champs calculés                      │
│  ┌────────────────────────────────────┐ │
│  │  Test modifié               🗑️     │ ← Votre nouveau champ
│  └────────────────────────────────────┘ │
│                                          │
│  📌 Filtres                              │
│  [vide]                                  │
│                                          │
│  📐 Lignes                               │
│  ┌────────────────────────────────────┐ │
│  │  Test modifié                       │ ← Placé automatiquement ici
│  └────────────────────────────────────┘ │
│                                          │
│  📊 Colonnes                             │
│  [vide]                                  │
│                                          │
│  🔢 Valeurs                              │
│  [vide]                                  │
│                                          │
└──────────────────────────────────────────┘
```

**Notez bien :** Comme vous avez sélectionné "Texte", le champ est dans **"Lignes"** et non dans "Valeurs" !

---

### Dans vos données

Si vous aviez ces données dans la colonne "Test" :

| ID  | Test               |
|-----|--------------------|
| 1   | Code AZERTY 123    |
| 2   | AZERTY-456         |
| 3   | Test AZERTY final  |
| 4   | Autre donnée       |

Vous obtenez maintenant une nouvelle colonne "Test modifié" :

| ID  | Test               | Test modifié        |
|-----|--------------------|---------------------|
| 1   | Code AZERTY 123    | Code QSDFGH 123     |
| 2   | AZERTY-456         | QSDFGH-456          |
| 3   | Test AZERTY final  | Test QSDFGH final   |
| 4   | Autre donnée       | Autre donnée        |

---

## 🔄 Variantes et cas d'usage

### Variante 1 : Remplacements multiples en chaîne

Si vous voulez remplacer plusieurs chaînes différentes :

**Formule :**
```
REMPLACER(REMPLACER([Test], "AZERTY", "QSDFGH"), "123", "789")
```

**Résultat :**
- "Code AZERTY 123" → "Code QSDFGH 789"

---

### Variante 2 : Suppression d'une chaîne

Pour supprimer une chaîne (= remplacer par rien) :

**Formule :**
```
REMPLACER([Test], "AZERTY", "")
```

**Résultat :**
- "Code AZERTY 123" → "Code  123" (AZERTY enlevé)

---

### Variante 3 : Remplacer avec une expression régulière

Si vous voulez utiliser les regex (par exemple, remplacer tous les chiffres) :

**Formule :**
```
REMPLACER([Test], "[0-9]+", "XXX")
```

**Résultat :**
- "Code AZERTY 123" → "Code AZERTY XXX"

---

## ⚠️ Erreurs courantes

### Erreur 1 : Oublier les crochets
```
❌ REMPLACER(Test, "AZERTY", "QSDFGH")
✅ REMPLACER([Test], "AZERTY", "QSDFGH")
```

### Erreur 2 : Oublier les guillemets
```
❌ REMPLACER([Test], AZERTY, QSDFGH)
✅ REMPLACER([Test], "AZERTY", "QSDFGH")
```

### Erreur 3 : Mauvais type de champ
```
❌ Type de résultat : Nombre  → Le champ ira dans "Valeurs" (pas adapté pour du texte)
✅ Type de résultat : Texte   → Le champ ira dans "Lignes" (correct)
```

### Erreur 4 : Virgules manquantes
```
❌ REMPLACER([Test] "AZERTY" "QSDFGH")
✅ REMPLACER([Test], "AZERTY", "QSDFGH")
                   ↑        ↑
                Virgules nécessaires
```

---

## 🎓 Pour aller plus loin

### Combiner avec d'autres fonctions

**Nettoyer et remplacer :**
```
REMPLACER(SUPPRESPACE([Test]), "AZERTY", "QSDFGH")
```
→ Supprime les espaces avant/après, puis remplace

**Remplacer et mettre en majuscules :**
```
MAJUSCULE(REMPLACER([Test], "azerty", "qsdfgh"))
```
→ Remplace puis convertit tout en majuscules

**Remplacer uniquement si présent :**
```
SI(CONTIENT([Test], "AZERTY"), REMPLACER([Test], "AZERTY", "QSDFGH"), [Test])
```
→ Remplace seulement si "AZERTY" est présent, sinon garde l'original

---

## 📚 Documentation complète

- **Guide complet** : Voir `GUIDE_UTILISATION_CHAMPS_CALCULES.md`
- **Liste des fonctions** : Voir `FONCTIONS_CHAINES_CARACTERES.md`

---

**Bon à savoir :** Une fois le champ créé, vous pouvez le modifier à tout moment en cliquant sur le bouton "✏️" (éditer) à côté du nom du champ dans la liste des champs calculés.
