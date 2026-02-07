# Design System - DataAnalyse

## Typographie

### Tailles de Police (Tailwind CSS)

Toutes les pages et composants doivent utiliser les classes Tailwind standards pour assurer la cohérence :

| Classe Tailwind | Taille   | Pixels | Usage                                                |
| --------------- | -------- | ------ | ---------------------------------------------------- |
| `text-xs`       | 0.75rem  | 12px   | Petits textes, labels secondaires, aide contextuelle |
| `text-sm`       | 0.875rem | 14px   | Texte standard, corps de texte, descriptions         |
| `text-base`     | 1rem     | 16px   | Texte principal, contenu (classe par défaut)         |
| `text-lg`       | 1.125rem | 18px   | Titres de sections, en-têtes secondaires             |
| `text-xl`       | 1.25rem  | 20px   | Titres principaux                                    |
| `text-2xl`      | 1.5rem   | 24px   | Grands titres                                        |

### Règles d'Utilisation

#### ✅ À FAIRE

```tsx
// Labels et textes secondaires
<label className="text-xs text-slate-500">Date de création</label>

// Texte standard des interfaces
<p className="text-sm text-slate-600">Description du widget</p>

// Titres de sections
<h3 className="text-lg font-bold text-slate-800">Configuration</h3>

// Titres de pages
<h1 className="text-2xl font-bold text-slate-900">Tableau de Bord</h1>
```

#### ❌ À ÉVITER

```tsx
// NE PAS utiliser de tailles personnalisées
<span className="text-[10px]">❌ Incorrect</span>
<span className="text-[0.9em]">❌ Incorrect</span>
<span className="text-[11px]">❌ Incorrect</span>

// Utiliser les classes Tailwind standards
<span className="text-xs">✅ Correct</span>
<span className="text-sm">✅ Correct</span>
```

## Couleurs

### Palette Principale

- **Primaire (Dynamique)** : `brand-50` à `brand-900` (dépend de l'ambiance choisie)
  - Boutons principaux : `bg-brand-600 hover:bg-brand-700`
  - Texte accentué : `text-brand-600`

- **Secondaire (Indigo/Violet)** : `indigo-50` à `indigo-900`, `purple-50` à `purple-900`
  - Accents secondaires
  - Données temporelles

- **Neutre (Slate)** : `slate-50` à `slate-900`
  - Texte principal : `text-slate-800`
  - Texte secondaire : `text-slate-600`
  - Bordures : `border-slate-200`
  - Arrière-plans : `bg-slate-50`, `bg-slate-100`

### Couleurs Sémantiques

- **Succès** : `green-50` à `green-900`
- **Avertissement** : `amber-50` à `amber-900`
- **Erreur** : `red-50` à `red-900`
- **Info** : `brand-50` à `brand-900` (ou `blue-` si fixe)

## Espacement

### Padding & Margin

Utiliser l'échelle Tailwind standard (multiples de 4px):

| Classe | Pixels | Usage                                        |
| ------ | ------ | -------------------------------------------- |
| `p-1`  | 4px    | Espacement minimal                           |
| `p-2`  | 8px    | Espacement standard pour composants compacts |
| `p-3`  | 12px   | Espacement standard                          |
| `p-4`  | 16px   | Espacement confortable                       |
| `p-6`  | 24px   | Espacement large                             |
| `p-8`  | 32px   | Espacement extra-large                       |

## Composants

### Boutons

```tsx
// Bouton primaire
<button className="px-4 py-2 bg-brand-600 text-white text-sm font-bold rounded hover:bg-brand-700">
  Action
</button>

// Bouton secondaire
<button className="px-4 py-2 bg-white text-slate-600 text-sm border border-slate-300 rounded hover:bg-slate-50">
  Annuler
</button>

// Bouton petit
<button className="px-2 py-1 bg-brand-600 text-white text-xs font-bold rounded hover:bg-brand-700">
  Action
</button>
```

### Cartes

```tsx
<div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
  <h3 className="text-lg font-bold text-slate-800 mb-2">Titre</h3>
  <p className="text-sm text-slate-600">Contenu</p>
</div>
```

### Formulaires

```tsx
// Label
<label className="text-xs font-bold text-slate-600 mb-1 block">
  Nom du champ
</label>

// Input
<input
  type="text"
  className="w-full px-3 py-2 text-sm border border-slate-300 rounded bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
  placeholder="Entrez une valeur"
/>

// Select
<select className="w-full px-3 py-2 text-sm border border-slate-300 rounded bg-white">
  <option>Option 1</option>
  <option>Option 2</option>
</select>
```

### Tableaux

```tsx
<table className="min-w-full divide-y divide-slate-200">
  <thead className="bg-slate-50">
    <tr>
      <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Colonne</th>
    </tr>
  </thead>
  <tbody className="bg-white divide-y divide-slate-200">
    <tr>
      <td className="px-4 py-3 text-sm text-slate-700">Valeur</td>
    </tr>
  </tbody>
</table>
```

## Bordures & Ombres

### Bordures

- Standard : `border border-slate-200`
- Accentuée : `border-2 border-brand-300`
- Arrondie standard : `rounded` ou `rounded-lg`
- Très arrondie : `rounded-xl`

### Ombres

- Légère : `shadow-sm`
- Normale : `shadow`
- Importante : `shadow-lg`
- Extra : `shadow-xl`

## Transitions

Toujours ajouter des transitions pour une meilleure UX:

```tsx
<button className="... transition-colors hover:bg-brand-700">
  Bouton avec transition
</button>

<div className="... transition-all duration-300">
  Animation complète
</div>
```

## Responsive Design

Utiliser les breakpoints Tailwind:

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Responsive grid */}
</div>

<h1 className="text-xl md:text-2xl lg:text-3xl">
  {/* Responsive typography */}
</h1>
```

## Accessibilité

- Toujours utiliser des labels pour les champs de formulaire
- Ajouter des attributs `title` ou `aria-label` aux icônes interactives
- Assurer un contraste suffisant (ratio 4.5:1 minimum pour le texte)
- Utiliser des tailles de police lisibles (minimum `text-xs` / 12px)

## Maintenance

### Vérification de Conformité

Pour vérifier qu'aucune taille personnalisée n'est utilisée:

```bash
# Rechercher les tailles personnalisées
grep -r "text-\[" pages/ components/

# Devrait retourner 0 résultats
```

### Remplacement Global

Si des tailles personnalisées sont détectées:

```bash
# Remplacer dans tous les fichiers
find pages/ components/ -name "*.tsx" -exec sed -i 's/text-\[10px\]/text-xs/g; s/text-\[11px\]/text-sm/g; s/text-\[9px\]/text-xs/g; s/text-\[0\.9em\]/text-sm/g; s/text-\[0\.8em\]/text-xs/g' {} \;
```

---

**Dernière mise à jour** : 2026-01-25
**Version** : 1.0
