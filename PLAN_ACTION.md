# Plan d'Action - DataScope

**Derniere mise a jour** : 2026-02-20
**Base** : Audit technique V4 (meme date)
**Score UX actuel** : 6.9/10 | **Cible** : 8.5/10

---

## Avancement global

| Priorite | Actions | Terminees | En cours | Restantes |
|----------|---------|-----------|----------|-----------|
| P0 - Bloquant | 2 | 1 | 0 | 1 |
| P1 - Haute | 6 | 2 | 0 | 4 |
| P2 - Moyenne | 7 | 0 | 0 | 7 |
| P3 - Basse | 6 | 0 | 0 | 6 |
| P4 - Backlog | 5 | 0 | 0 | 5 |
| **Total** | **26** | **3** | **0** | **23** |

---

## P0 - Bloquant

### P0.1 — Corriger validation companyLogo a l'import de backup ✅ PARTIEL

**Statut** : La validation existe pour l'**upload UI** (`DataContext.tsx:796`) mais l'**import de backup** contourne cette validation (`DataContext.tsx:857`).

**1 ligne a corriger** :
```typescript
// DataContext.tsx:857 — AVANT (ne valide pas)
if (shouldImport('companyLogo') && parsed.companyLogo) setCompanyLogo(parsed.companyLogo);

// APRES — passer par updateCompanyLogo qui valide
if (shouldImport('companyLogo') && parsed.companyLogo) updateCompanyLogo(parsed.companyLogo);
```

**Effort** : 5 minutes | **Critere** : Backup forge avec URI malveillante → logo ignore

---

### P0.2 — Supprimer `unsafe-inline` de la CSP ❌ NON TRAITE

**Fichier** : `index.html:7`

**Actions** :
1. Installer `vite-plugin-csp-guard` (ou equivalent)
2. Remplacer `'unsafe-inline'` par `'nonce-{generated}'` dans `script-src`
3. Creer `public/_headers` pour Cloudflare Pages avec header CSP dynamique
4. Tester le build et l'application

**Effort** : 1 jour | **Critere** : `unsafe-inline` absent de `script-src`, application fonctionnelle

---

## P1 - Haute (a traiter en priorite)

### P1.1 — Remplacer les 54 `alert()` par des toasts ❌ NON TRAITE

**Contexte** : `window.confirm()` est elimine (0 occurrence ✅). Il reste 54 `alert()` dans 13 fichiers.

**Fichiers par nombre d'occurrences** :

| Fichier | `alert()` |
|---------|-----------|
| `hooks/useBudgetLogic.ts` | 13 |
| `hooks/useSettingsLogic.ts` | 9 |
| `hooks/usePivotExport.ts` | 4 |
| `utils/exportUtils.ts` | 4 |
| `pages/Budget.tsx` | 3 |
| `hooks/useDataExplorerLogic.ts` | 3 |
| `components/pivot/TemporalSourceModal.tsx` | 3 |
| `components/settings/O365Section.tsx` | 3 |
| `pages/Import.tsx` | 2 |
| `pages/ETLPipeline.tsx` | 2 |
| `components/forecast/ForecastList.tsx` | 2 |
| `pages/Customization.tsx` | 1 |
| `components/settings/BackupRestoreModal.tsx` | 1 |

**Actions** :
1. `npm install sonner`
2. Ajouter `<Toaster richColors />` dans `App.tsx` apres `<DataProvider>`
3. Creer `utils/notify.ts` :
   ```typescript
   import { toast } from 'sonner';
   export const notify = {
     success: (msg: string) => toast.success(msg),
     error: (msg: string) => toast.error(msg),
     warning: (msg: string) => toast.warning(msg),
     info: (msg: string) => toast.info(msg),
   };
   ```
4. Remplacer fichier par fichier (commencer par `useBudgetLogic.ts` + `useSettingsLogic.ts`)
5. Configurer le theming Sonner pour respecter le design system (dark mode, `--brand-*`)

**Effort** : 2-3 jours | **Critere** : 0 `alert()`, toasts stylises en dark et light mode

---

### P1.2 — Decomposer ETLPipeline.tsx (1 364 lignes) ❌ NON TRAITE

**Contexte** : Seul fichier page > 1000 lignes. 19 `: any` + 4 `as any`. Pas de hook logique.

**Actions** :
1. Creer `hooks/useETLPipelineLogic.ts` : extraire tous les useState, useEffect, callbacks
2. Creer dans `components/etl/` :
   - `ETLPipelineHeader.tsx` — barre d'outils (nom, save, run)
   - `ETLNodeList.tsx` — liste des noeuds de transformation
   - `ETLNodeEditor.tsx` — panneau de configuration d'un noeud
   - `ETLCanvas.tsx` — zone de visualisation
   - `ETLPreview.tsx` — apercu donnees a chaque etape
3. Reduire `pages/ETLPipeline.tsx` a ~150 lignes
4. Typer les 23 `: any`/`as any` pendant la decomposition
5. Ecrire des tests pour `useETLPipelineLogic`

**Effort** : 3-4 jours | **Critere** : Page < 200 lignes, 0 useState, 0 `: any`

---

### P1.3 — Decomposer Import.tsx (916 lignes) ❌ NON TRAITE

**Actions** :
1. Creer `hooks/useImportLogic.ts` : wizard state, file parsing, mapping, validation
2. Creer dans `components/import/` :
   - `ImportSourceSelector.tsx` — choix mode (fichier, coller, Excel)
   - `ImportFileDropZone.tsx` — drag & drop avec feedback
   - `ImportMappingEditor.tsx` — configuration colonnes
   - `ImportPreview.tsx` — apercu des donnees
   - `ImportProgressBar.tsx` — nouveau : barre de progression pour gros fichiers
3. Reduire `pages/Import.tsx` a ~150 lignes
4. Ajouter barre de progression pour fichiers > 10 000 lignes
5. Ecrire des tests pour `useImportLogic`

**Effort** : 2-3 jours | **Critere** : Page < 200 lignes, 0 useState, progression visible

---

### P1.4 — Pipeline CI/CD minimale ❌ NON TRAITE

**Actions** :
1. Creer `.github/workflows/ci.yml` :
   ```yaml
   name: CI
   on: [push, pull_request]
   jobs:
     quality:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-node@v4
           with: { node-version: 20, cache: 'npm' }
         - run: npm ci
         - run: npx tsc --noEmit
         - run: npx eslint . --max-warnings 0
         - run: npx vitest run
         - run: npm run build
   ```
2. Ajouter badge CI dans le README

**Effort** : 0.5 jour | **Critere** : Pipeline verte sur push, build bloque si lint echoue

---

### P1.5 — Reduire `: any` de 305 → < 200 ⚠️ EN COURS

**Contexte** : `: any` passe de 417 (pic) → 321 → 305. `as any` : 93 → 47 (-49%). Bon progres sur `as any`, lent sur `: any`.

**Plan de reduction** :

| Sprint | Fichiers cibles | `: any` a eliminer | Cumul cible |
|--------|-----------------|---------------------|-------------|
| S1 | `ETLPipeline.tsx` (19), `ChartModalDisplay.tsx` (16) | 35 | 270 |
| S2 | `useWidgetData.ts` (14), `PivotGrid.tsx` (14), `useChartModalLogic.ts` (13) | 41 | 229 |
| S3 | `WidgetDisplay.tsx` (13), `SettingsModals.tsx` (12), `ChartModalControls.tsx` (11) | 36 | 193 |

**Actions** :
1. Creer des interfaces pour les structures recurrentes (chart data, widget props, pivot config)
2. Monter ESLint `no-explicit-any` de `warn` a `error` apres le S3
3. Ajouter `"noUnusedLocals": true` et `"noUnusedParameters": true` dans `tsconfig.json`

**Effort** : 3-4 jours | **Critere** : < 200 `: any`, ESLint en error

---

### P1.6 — Nettoyer les 70 `console.*` residuels ⚠️ EN COURS

**Fichiers prioritaires** : `logic/pivotToChart.ts` (16), `services/o365Service.ts` (10), `O365Section.tsx` (7)

**Actions** :
1. Creer `utils/logger.ts` :
   ```typescript
   const isDev = import.meta.env.DEV;
   export const logger = {
     error: (msg: string, ...args: unknown[]) => { if (isDev) console.error(msg, ...args); },
     warn: (msg: string, ...args: unknown[]) => { if (isDev) console.warn(msg, ...args); },
   };
   ```
2. Remplacer `console.log` de debug par rien
3. Remplacer `console.error/warn` de production par `logger.*`
4. Ajouter `no-console: ["warn", { allow: ["error"] }]` dans `eslint.config.js`

**Effort** : 1 jour | **Critere** : 0 `console.log`, < 5 `console.error` (ErrorBoundary uniquement)

---

## P2 - Moyenne (sprint 2)

### P2.1 — Profilage et qualite des donnees ❌ NON TRAITE

**Actions** :
1. Creer `logic/dataProfiling.ts` :
   - `profileColumn(values)` : type, completude (% non-null), cardinalite, min/max/moyenne/mediane, distribution
   - `detectOutliers(values, 'iqr' | 'zscore')` : retourne les indices outliers
   - `detectDuplicates(data, keys)` : retourne les indices de doublons
   - `qualityScore(profile)` : score global 0-100
2. Creer `components/data-explorer/DataProfilingPanel.tsx` :
   - Panneau lateral avec profil par colonne
   - Mini-chart Recharts pour la distribution
   - Indicateurs vert/orange/rouge par completude
   - Boutons "Supprimer doublons" et "Traiter valeurs manquantes"
3. Afficher un resume de qualite apres chaque import (composant `ImportQualitySummary.tsx`)

**Effort** : 3-4 jours

---

### P2.2 — Undo/Redo global (Ctrl+Z / Ctrl+Y) ❌ NON TRAITE

**Actions** :
1. Creer `hooks/useUndoRedo.ts` (stack, push, undo, redo, canUndo, canRedo)
2. Integrer dans DataContext, PivotConfig, WidgetContext
3. Enregistrer raccourcis `Ctrl+Z` et `Ctrl+Y` dans `Layout.tsx`
4. Ajouter indicateur visuel dans le header (compteur d'actions annulables)
5. Limite : 30 etats maximum

**Effort** : 3-4 jours

---

### P2.3 — Scatter plot, waterfall et graphiques statistiques ❌ NON TRAITE

**Actions** :
1. Ajouter types dans `types/pivot.ts` : `'scatter' | 'waterfall' | 'boxplot' | 'heatmap'`
2. Implementer dans `logic/pivotToChart.ts` :
   - Scatter : `<ScatterChart>` Recharts (2 axes num + couleur par categorie)
   - Waterfall : barres cumulees (essentiel pour le module finance)
   - Boxplot : quartiles + outliers (calcul dans pivotEngine)
   - Heatmap : matrice D3.js
3. Mettre a jour l'auto-detection (2 numeriques → recommander scatter, positif/negatif → waterfall)

**Effort** : 3-4 jours

---

### P2.4 — Drill-through Dashboard → donnees ❌ NON TRAITE

**Actions** :
1. Ajouter `onDrillThrough` dans `WidgetDisplay.tsx`
2. Creer `components/dashboard/DrillThroughDrawer.tsx`
3. Navigation vers DataExplorer avec filtres : `/#/data?dataset=xxx&filter=field:value`
4. Modifier `useWidgetData.ts` pour exposer les donnees source filtrees

**Effort** : 2-3 jours

---

### P2.5 — Agregations statistiques avancees ❌ NON TRAITE

Ajouter : `MEDIAN`, `STDDEV`, `VARIANCE`, `PERCENTILE25/75`, `COUNTDISTINCT`, `FIRST`, `LAST`

**Effort** : 1-2 jours

---

### P2.6 — Tests des contextes principaux ❌ NON TRAITE

Cibles par ordre de criticite : DataContext, BudgetContext, ForecastContext, PipelineContext, WidgetContext

**Effort** : 2-3 jours | **Objectif** : 60% couverture sur les 5 contextes

---

### P2.7 — Audit trail module finance ❌ NON TRAITE

**Actions** :
1. Creer `types/audit.ts` et `services/auditService.ts` (stockage IndexedDB)
2. Integrer dans BudgetContext et ForecastContext
3. Creer `components/budget/AuditTrailPanel.tsx` (timeline consultable + export CSV)

**Effort** : 2-3 jours

---

## P3 - Basse (sprint 3)

### P3.1 — Accessibilite WCAG 2.1 AA ❌ NON TRAITE
- Skip-to-content link, `aria-live` pour les toasts, `prefers-reduced-motion`, D&D clavier
- **Effort** : 2-3 jours

### P3.2 — Command palette (Ctrl+K) ❌ NON TRAITE
- Modal de recherche globale : pages, datasets, analyses, actions rapides
- **Effort** : 1-2 jours

### P3.3 — Composants UI manquants (Input, Select, Tooltip) ❌ NON TRAITE
- Standardiser les inputs dans `components/ui/`
- **Effort** : 2 jours

### P3.4 — Dark mode complet ❌ NON TRAITE
- Remplacer `bg-slate-*`, `text-gray-*` par tokens CSS
- **Effort** : 1-2 jours

### P3.5 — Bottom navigation mobile ❌ NON TRAITE
- 5 items + menu "Plus" en remplacement des 11 items horizontal
- **Effort** : 1-2 jours

### P3.6 — Math.random() dans FormattingModal ❌ NON TRAITE
- **Fichier** : `components/pivot/FormattingModal.tsx:44,69`
- Remplacer par `generateId()` de `utils/idUtils.ts`
- **Effort** : 10 minutes

---

## P4 - Backlog

| # | Fonctionnalite | Effort |
|---|----------------|--------|
| P4.1 | Data lineage visuel (graphe D3) | 4-5j |
| P4.2 | Templates dashboards (5 domaines metier) | 3-4j |
| P4.3 | Export PDF enrichi (page de garde) + PowerPoint | 3-4j |
| P4.4 | Annotations sur graphiques | 2-3j |
| P4.5 | ML avance forecasting (EMA, saisonnalite, IC) | 4-5j |

---

## Calendrier recommande

```
Semaine 1  : P0.1 (5 min) + P3.6 (10 min) + P1.4 CI/CD (0.5j) + P1.1 toasts debut
Semaine 2  : P1.1 toasts fin + P0.2 CSP nonce
Semaine 3  : P1.2 ETLPipeline decomposition
Semaine 4  : P1.3 Import decomposition
Semaine 5  : P1.5 S1-S2 any reduction + P1.6 console cleanup
Semaine 6  : P1.5 S3 + P2.5 agregations stats
Semaine 7  : P2.1 profilage donnees
Semaine 8  : P2.2 undo/redo
Semaine 9  : P2.3 scatter/waterfall + P2.4 drill-through
Semaine 10 : P2.6 tests contextes + P2.7 audit trail
Semaine 11 : P3.1 accessibilite + P3.4 dark mode
Semaine 12 : P3.2 command palette + P3.3 composants UI + P3.5 mobile
Semaines 13+ : P4.*
```

---

## Metriques de suivi

| Metrique | V1 | V2 | V3 | V4 (actuel) | Cible P1 | Cible P2 | Cible P3 |
|----------|-----|-----|-----|-------------|----------|----------|----------|
| `: any` | 279 | 417 | 321 | **305** | < 200 | < 150 | < 100 |
| `as any` | — | — | 93 | **47** | < 30 | < 15 | < 5 |
| `alert()` | 54 | 54 | 54 | **54** | 0 | 0 | 0 |
| `confirm()` | 24 | 24 | 24 | **0** ✅ | 0 | 0 | 0 |
| `console.*` | 77 | 77 | 77 | **70** | < 10 | < 5 | 0 prod |
| Fichiers > 1000 l. | 7 | 0 | 1 | **1** | 0 | 0 | 0 |
| Fichiers de tests | 13 | 16 | 32 | **32** | 38 | 48 | 55 |
| Score UX | 5.6 | 6.0 | 6.6 | **6.9** | 7.5 | 8.0 | 8.5 |
| Lighthouse A11y | ~55 | ~60 | ~65 | **~68** | 75 | 80 | 88 |
| Types de graphiques | 15 | 15 | 15 | **15** | 15 | 20 | 20 |
| Composants UI | 5 | 8 | 11 | **11** | 13 | 14 | 14 |
