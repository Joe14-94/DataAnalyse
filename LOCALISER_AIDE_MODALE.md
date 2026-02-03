# 🔍 Où trouver la section d'aide dans la modale ?

## Position exacte dans l'interface

La section d'aide se trouve **EN BAS de la modale**, juste **APRÈS la section "Aperçu du résultat"**.

```
┌────────────────────────────────────────────────────────────────────────┐
│  🧮 Nouveau champ calculé                                    ✖         │
│  ASSISTANT DE CRÉATION                                                  │
├────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────┬──────────────────┬─────────────────┐             │
│  │  Nom du champ   │   Champs         │   Fonctions     │             │
│  │  Formule        │   disponibles    │   disponibles   │             │
│  │  Type           │                  │                 │             │
│  │  Unité          │   • Champ1       │   Logique       │             │
│  │                 │   • Champ2       │   • SI          │             │
│  │                 │   • Test         │                 │             │
│  │                 │   • ...          │   Math          │             │
│  │                 │                  │   • SOMME       │             │
│  │                 │                  │   • MOYENNE     │             │
│  │                 │                  │                 │             │
│  │                 │                  │   Texte         │             │
│  │                 │                  │   • CONCAT      │             │
│  │                 │                  │   • REMPLACER   │             │
│  │                 │                  │   • GAUCHE      │             │
│  │                 │                  │   • ...         │             │
│  └─────────────────┴──────────────────┴─────────────────┘             │
│                                                                         │
│  ┌─ APERÇU DU RÉSULTAT ──────────────────────────────────────┐        │
│  │  ✨ Aperçu du résultat                                     │        │
│  │  [Le résultat calculé s'affiche ici]                      │        │
│  └────────────────────────────────────────────────────────────┘        │
│                                                                         │
│  ┌─ EXEMPLES D'UTILISATION (cliquez pour dérouler) ──────────┐  ◄◄◄   │
│  │  📖 Exemples d'utilisation (REMPLACER, Regex...)     🔽   │  ICI ! │
│  └────────────────────────────────────────────────────────────┘        │
│       ↑                                                                 │
│       Cliquez sur cette barre pour voir les exemples                   │
│                                                                         │
│  [Annuler]                                    [Créer le champ]         │
└────────────────────────────────────────────────────────────────────────┘
```

## Quand vous cliquez, cela se déploie ainsi :

```
┌────────────────────────────────────────────────────────────────────────┐
│  ... (reste de la modale ci-dessus)                                    │
│                                                                         │
│  ┌─ APERÇU DU RÉSULTAT ──────────────────────────────────────┐        │
│  │  ✨ Aperçu du résultat                                     │        │
│  │  [Le résultat calculé s'affiche ici]                      │        │
│  └────────────────────────────────────────────────────────────┘        │
│                                                                         │
│  ┌─ EXEMPLES D'UTILISATION ───────────────────────────────────┐        │
│  │  📖 Exemples d'utilisation (REMPLACER, Regex...)     🔼   │ ◄ Ouvert│
│  ├────────────────────────────────────────────────────────────┤        │
│  │                                                             │        │
│  │  ✓ Remplacement simple                                     │        │
│  │  REMPLACER([Test], "AZERTY", "QSDFGH")                    │        │
│  │  → Remplace toutes les occurrences de "AZERTY" par "QSD..." │      │
│  │                                                             │        │
│  │  ✓ Remplacements multiples en chaîne                       │        │
│  │  REMPLACER(REMPLACER(REMPLACER([Statut], "En cours",...   │        │
│  │  → Remplace plusieurs chaînes différentes en imbriquant... │        │
│  │                                                             │        │
│  │  ✓ Regex : Supprimer tous les chiffres                    │        │
│  │  REMPLACER([Code], "[0-9]+", "")                          │        │
│  │  → "ABC123DEF" devient "ABCDEF"                           │        │
│  │  Pattern: [0-9]+ = un ou plusieurs chiffres               │        │
│  │                                                             │        │
│  │  ✓ Regex : Remplacer tous les espaces                     │        │
│  │  REMPLACER([Tel], " ", "")                                │        │
│  │  → "06 12 34 56 78" devient "0612345678"                  │        │
│  │                                                             │        │
│  │  ✓ Regex : Supprimer caractères spéciaux                  │        │
│  │  REMPLACER([Texte], "[^a-zA-Z0-9 ]", "")                  │        │
│  │  → Garde uniquement lettres, chiffres et espaces          │        │
│  │  Pattern: [^...] = tout SAUF ce qui est dans les crochets │        │
│  │                                                             │        │
│  │  ✓ Regex : Remplacer tout après @                         │        │
│  │  REMPLACER([Email], "@.*", "@example.com")                │        │
│  │  → "user@ancien.com" devient "user@example.com"           │        │
│  │  Pattern: .* = n'importe quoi après @                     │        │
│  │                                                             │        │
│  │  ┌─ Aide Regex (expressions régulières) ─────────┐        │        │
│  │  │  [0-9] = un chiffre                            │        │        │
│  │  │  [a-z] = une lettre minuscule                  │        │        │
│  │  │  [A-Z] = une lettre majuscule                  │        │        │
│  │  │  [^...] = tout sauf ...                        │        │        │
│  │  │  + = un ou plusieurs                           │        │        │
│  │  │  * = zéro ou plusieurs                         │        │        │
│  │  │  . = n'importe quel caractère                  │        │        │
│  │  │  \s = espace blanc                             │        │        │
│  │  └────────────────────────────────────────────────┘        │        │
│  │                                                             │        │
│  │  💡 Astuce : Pour remplacer plusieurs chaînes différentes, │        │
│  │  imbriquez les REMPLACER les uns dans les autres...       │        │
│  │                                                             │        │
│  └─────────────────────────────────────────────────────────────┘        │
│                                                                         │
│  [Annuler]                                    [Créer le champ]         │
└────────────────────────────────────────────────────────────────────────┘
```

## 🔧 Comment la voir ?

### Étape 1 : Ouvrir la modale
1. Allez dans le **Tableau Croisé Dynamique (TCD)**
2. Cliquez sur **"+ Champ calculé"** en haut à gauche

### Étape 2 : Trouver la section d'aide
1. **Scrollez vers le bas** dans la modale (si besoin)
2. Cherchez la section avec le titre :
   ```
   📖 Exemples d'utilisation (REMPLACER, Regex, Remplacements multiples)
   ```
3. Elle se trouve juste **APRÈS** la section "✨ Aperçu du résultat"

### Étape 3 : Déployer les exemples
1. **Cliquez** sur la barre avec le titre
2. Les exemples se déploient vers le bas
3. Pour refermer, cliquez à nouveau

## ⚠️ Si vous ne la voyez toujours pas

### Possibilité 1 : Le serveur de développement n'est pas à jour

Il faut **redémarrer le serveur de développement** :

```bash
# Arrêter le serveur (Ctrl+C dans le terminal)
# Puis relancer :
npm run dev
```

### Possibilité 2 : Le cache du navigateur

Il faut **vider le cache** du navigateur :

1. **Chrome/Edge** : Ctrl+Shift+R (ou Cmd+Shift+R sur Mac)
2. **Firefox** : Ctrl+F5 (ou Cmd+Shift+R sur Mac)
3. Ou ouvrez les DevTools (F12) → Network → Cochez "Disable cache"

### Possibilité 3 : La modale est trop petite

Si la fenêtre de votre navigateur est petite :
- La section peut nécessiter un **scroll vertical**
- Scrollez vers le bas dans la modale pour voir la section d'aide

## 📸 À quoi ressemble le bouton ?

Le bouton pour déployer les exemples a cette apparence :

```
┌─────────────────────────────────────────────────────────────┐
│  📖 Exemples d'utilisation (REMPLACER, Regex...)      🔽    │  ← Replié
└─────────────────────────────────────────────────────────────┘
    ↑                                                      ↑
  Icône livre                                      Chevron vers le bas
```

Quand il est ouvert :

```
┌─────────────────────────────────────────────────────────────┐
│  📖 Exemples d'utilisation (REMPLACER, Regex...)      🔼    │  ← Déplié
└─────────────────────────────────────────────────────────────┘
    ↑                                                      ↑
  Icône livre                                      Chevron vers le haut
```

## 🎨 Couleurs et style

- La section a un **fond bleu-indigo clair**
- Les exemples ont des **bordures de couleur** :
  - 🔵 Indigo : Remplacement simple
  - 🟡 Amber : Remplacements multiples
  - 🟣 Purple : Supprimer chiffres
  - 🟢 Green : Supprimer espaces
  - 🌸 Pink : Supprimer caractères spéciaux
  - 🔷 Cyan : Remplacer après @

## 🐛 Vérification que le code est bien là

Vous pouvez vérifier que le code a bien été ajouté :

```bash
grep -n "showExamples" components/pivot/CalculatedFieldModal.tsx
```

Cela devrait afficher plusieurs lignes montrant que la variable `showExamples` existe.

---

**Si vous ne voyez toujours pas la section après avoir redémarré le serveur, faites-moi savoir et je vérifierai s'il y a une erreur de compilation.**
