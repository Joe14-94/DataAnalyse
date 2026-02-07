# 📚 Comment accéder à la documentation des champs calculés ?

## 🎯 Toute la documentation est maintenant accessible directement depuis l'interface !

Plus besoin de consulter des fichiers MD externes. Toute l'aide est intégrée dans l'application.

---

## 📍 Où trouver la documentation ?

### Option 1 : Depuis le Tableau Croisé Dynamique (TCD)

1. **Ouvrez le TCD** depuis le menu de navigation
2. Cliquez sur **"+ Champ calculé"** en haut à gauche
3. La modale de création s'ouvre
4. **Scrollez vers le bas** jusqu'à la section "Exemples d'utilisation"
5. Cliquez sur **"📚 Voir la documentation complète"** (bouton violet en bas)

```
┌────────────────────────────────────────────────┐
│  🧮 Nouveau champ calculé                     │
├────────────────────────────────────────────────┤
│  [ Nom du champ ]                              │
│  [ Formule ]                                   │
│  [ Champs ] [ Fonctions ]                      │
│  ✨ Aperçu du résultat                         │
│                                                 │
│  📖 Exemples d'utilisation ▼                   │
│  ├─ ✓ Remplacement simple                      │
│  ├─ ✓ Remplacements multiples                  │
│  ├─ ✓ Regex : Supprimer chiffres               │
│  └─ ... (6 exemples)                           │
│                                                 │
│  ┌───────────────────────────────────────┐    │
│  │ 📚 Voir la documentation complète  ← CLIC │ │
│  └───────────────────────────────────────┘    │
│                                                 │
│  [Annuler]              [Créer le champ]       │
└────────────────────────────────────────────────┘
```

---

### Option 2 : Depuis la page "Données" (DataExplorer)

1. **Ouvrez la page "Données"** depuis le menu
2. Cliquez sur **"Calculs"** dans la barre d'outils
3. La modale de création s'ouvre (même interface que le TCD)
4. **Scrollez vers le bas** jusqu'à la section "Exemples d'utilisation"
5. Cliquez sur **"📚 Voir la documentation complète"**

---

## 📖 Contenu de la documentation

Quand vous cliquez sur "Voir la documentation complète", un modal s'ouvre avec **4 onglets** :

### 1️⃣ Toutes les fonctions

**Contenu :**

- **22 fonctions** organisées par catégories :
  - 🔵 **Logique & Math** : SI, SOMME, MOYENNE, ARRONDI, MIN, MAX, ABS
  - 🟢 **Transformation de texte** : CONCAT, MAJUSCULE, MINUSCULE, CAPITALISEPREMIER, CAPITALISEMOTS
  - 🟣 **Recherche & Remplacement** : REMPLACER, SUBSTITUER, TROUVE, CONTIENT
  - 🟡 **Extraction** : EXTRAIRE, GAUCHE, DROITE, LONGUEUR, SUPPRESPACE

**Pour chaque fonction :**

- ✅ Syntaxe complète
- ✅ Description détaillée
- ✅ Exemple concret d'utilisation

**Exemple d'affichage :**

```
┌────────────────────────────────────────┐
│  CONCAT                                 │
│  CONCAT(texte1, texte2, [sep])         │
│  Concatène plusieurs textes avec un    │
│  séparateur optionnel                   │
│  Exemple : CONCAT([Prénom], [Nom], " ")│
└────────────────────────────────────────┘
```

---

### 2️⃣ Regex & Remplacements

**Contenu :**

- **8 patterns regex** les plus utiles avec exemples :
  - `[0-9]+` : Supprimer tous les chiffres
  - `[^a-zA-Z0-9 ]` : Supprimer caractères spéciaux
  - `@.*` : Remplacer tout après @
  - Et plus encore...

- **Tableau de référence** des symboles regex :
  - `[0-9]` = un chiffre
  - `[a-z]` = une lettre minuscule
  - `[^...]` = tout SAUF
  - `+` = un ou plusieurs
  - `*` = zéro ou plusieurs
  - `.` = n'importe quel caractère
  - `\s` = espace blanc

- **Guide des remplacements multiples** :
  - Comment imbriquer les REMPLACER
  - Exemples étape par étape

**Exemple d'affichage :**

```
┌────────────────────────────────────────┐
│  Pattern : [0-9]+                      │
│  Desc : Un ou plusieurs chiffres       │
│  Formule :                             │
│  REMPLACER([Code], "[0-9]+", "")       │
│  Résultat : ABC123 → ABC               │
└────────────────────────────────────────┘
```

---

### 3️⃣ Exemples pratiques

**Contenu :**

- **8 exemples concrets** prêts à copier :
  1. Formater un nom complet
  2. Nettoyer un numéro de téléphone
  3. Extraire uniquement les chiffres
  4. Créer un email
  5. Normaliser des statuts
  6. Vérifier et catégoriser
  7. Extraire l'initiale
  8. Formater un code postal

**Pour chaque exemple :**

- ✅ Formule complète
- ✅ Données d'exemple
- ✅ Résultat attendu
- ✅ Explication détaillée

**Exemple d'affichage :**

```
┌────────────────────────────────────────┐
│  Formater un nom complet               │
│  ────────────────────────────────────  │
│  Formule :                             │
│  CONCAT(CAPITALISEPREMIER([Prénom]),   │
│         MAJUSCULE([Nom]), " ")         │
│                                        │
│  Données :                             │
│  {Prénom: "jean", Nom: "dupont"}      │
│                                        │
│  Résultat :                            │
│  Jean DUPONT                           │
│                                        │
│  💡 Combine CONCAT avec               │
│  CAPITALISEPREMIER et MAJUSCULE       │
└────────────────────────────────────────┘
```

---

### 4️⃣ Cas d'usage avancés

**Contenu :**

- **6 formules complexes** avec explications détaillées :
  1. Nettoyage complet de données
  2. Validation et formatage conditionnel
  3. Construction d'identifiant unique
  4. Extraction de domaine email
  5. Masquage partiel de données
  6. Normalisation multi-sources

**Pour chaque cas :**

- ✅ Formule complète
- ✅ Explication du fonctionnement
- ✅ Étapes détaillées numérotées
- ✅ Bonnes pratiques

**Exemple d'affichage :**

```
┌────────────────────────────────────────┐
│  Nettoyage complet de données          │
│  ────────────────────────────────────  │
│  SUPPRESPACE(MAJUSCULE(REMPLACER(      │
│    [Nom], "[^a-zA-Z ]", "")))          │
│                                        │
│  Étapes :                              │
│  1. REMPLACER supprime les caractères  │
│     qui ne sont pas lettres/espaces    │
│  2. MAJUSCULE convertit en majuscules  │
│  3. SUPPRESPACE nettoie les espaces    │
└────────────────────────────────────────┘
```

---

## 🎨 Interface de la documentation

### Design et navigation

- **Navigation par onglets** en haut du modal
- **Scrolling fluide** pour parcourir le contenu
- **Code coloré** pour une meilleure lisibilité
- **Cartes cliquables** pour chaque fonction/exemple
- **Icônes** pour identifier rapidement les catégories
- **Bouton "Fermer"** en bas du modal

### Exemple visuel

```
┌────────────────────────────────────────────────────────┐
│  📖 Documentation des Champs Calculés          ✖       │
│  Guide complet des fonctions et exemples               │
├────────────────────────────────────────────────────────┤
│  [📖 Toutes les fonctions] [⚡ Regex] [💡 Exemples] [🚀 Avancés] │
├────────────────────────────────────────────────────────┤
│                                                         │
│  [Contenu de l'onglet sélectionné]                    │
│                                                         │
│  ┌──────────────────────────────────────┐             │
│  │  Fonction 1                          │             │
│  │  Syntaxe, Description, Exemple       │             │
│  └──────────────────────────────────────┘             │
│                                                         │
│  ┌──────────────────────────────────────┐             │
│  │  Fonction 2                          │             │
│  │  Syntaxe, Description, Exemple       │             │
│  └──────────────────────────────────────┘             │
│                                                         │
├────────────────────────────────────────────────────────┤
│                                        [Fermer]         │
└────────────────────────────────────────────────────────┘
```

---

## 🚀 Avantages de la documentation intégrée

### ✅ Accessible instantanément

- Pas besoin de quitter l'application
- Pas de fichiers à télécharger ou ouvrir
- Documentation toujours à jour avec le code

### ✅ Interactive

- Navigation par onglets pour trouver rapidement
- Exemples copiables directement
- Code coloré pour une meilleure compréhension

### ✅ Complète

- 22 fonctions documentées
- 8 patterns regex expliqués
- 8 exemples pratiques
- 6 cas d'usage avancés
- Bonnes pratiques incluses

### ✅ Contextuelle

- S'ouvre depuis la modale de création
- Reste accessible pendant que vous travaillez
- Ferme automatiquement quand vous avez terminé

---

## 📝 Workflow recommandé

### Pour créer un champ calculé simple :

1. Ouvrez la modale (TCD ou Données)
2. Consultez la **section "Exemples d'utilisation"** (repliable)
3. Si vous avez besoin de plus d'infos, cliquez sur **"Documentation complète"**
4. Allez dans l'onglet **"Exemples pratiques"**
5. Trouvez un exemple similaire
6. Copiez et adaptez la formule
7. Testez avec l'aperçu en temps réel
8. Créez le champ

### Pour une formule complexe avec regex :

1. Ouvrez la modale (TCD ou Données)
2. Cliquez sur **"Documentation complète"**
3. Allez dans l'onglet **"Regex & Remplacements"**
4. Consultez le tableau de référence
5. Trouvez le pattern adapté
6. Revenez dans la modale
7. Construisez votre formule progressivement
8. Vérifiez avec l'aperçu
9. Créez le champ

### Pour combiner plusieurs fonctions :

1. Ouvrez la modale (TCD ou Données)
2. Cliquez sur **"Documentation complète"**
3. Allez dans l'onglet **"Cas d'usage avancés"**
4. Trouvez un exemple similaire
5. Lisez les étapes détaillées
6. Adaptez à votre cas
7. Testez progressivement chaque partie
8. Créez le champ

---

## ⚡ Raccourcis pratiques

### Accès rapide aux exemples

Si vous savez déjà ce que vous voulez faire :

1. Ouvrez la modale
2. Scrollez jusqu'à "Exemples d'utilisation"
3. Dépliez la section
4. Vous y trouverez les 6 exemples les plus courants

### Pour une référence rapide

Si vous connaissez le nom de la fonction :

1. Ouvrez la "Documentation complète"
2. Allez dans "Toutes les fonctions"
3. Trouvez votre fonction par catégorie
4. Consultez syntaxe et exemple

---

## 💡 Astuces

### ✅ Utilisez l'aperçu en temps réel

La modale affiche toujours un aperçu du résultat calculé sur la première ligne. C'est le meilleur moyen de vérifier votre formule !

### ✅ Construisez progressivement

Pour les formules complexes, testez chaque partie séparément avant de tout combiner.

### ✅ Consultez les exemples avancés

L'onglet "Cas d'usage avancés" contient des techniques puissantes expliquées étape par étape.

### ✅ Gardez la documentation ouverte

Vous pouvez garder le modal de documentation ouvert pendant que vous travaillez sur votre formule.

---

## 📚 Fichiers de documentation (si besoin)

Si vous préférez consulter la documentation hors ligne, les fichiers MD sont toujours disponibles :

1. `FONCTIONS_CHAINES_CARACTERES.md` - Doc technique complète
2. `GUIDE_UTILISATION_CHAMPS_CALCULES.md` - Guide pratique
3. `DEMO_REMPLACER.md` - Démo visuelle REMPLACER
4. `GUIDE_REGEX_REMPLACEMENTS.md` - Guide regex complet
5. `LOCALISER_AIDE_MODALE.md` - Où trouver l'aide
6. `INTEGRATION_DATAEXPLORER.md` - Intégration DataExplorer

**Mais la documentation intégrée dans l'interface est plus pratique et à jour !** ✨

---

**Toute la documentation est maintenant à portée de clic depuis la modale de création de champ calculé !** 🎉
