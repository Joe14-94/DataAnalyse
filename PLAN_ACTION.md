# Plan d'Action - DataScope

**Redige le** : 2026-02-13
**Base** : Audit technique V3 (meme date)
**Score UX actuel** : 6.6/10 | **Cible** : 8.0/10

---

## Vue d'ensemble

| Priorite | Nb actions | Effort total estime | Impact attendu |
|----------|-----------|---------------------|----------------|
| P0 - Bloquant | 2 actions | 1-2 jours | Securite + dette technique critique |
| P1 - Haute | 6 actions | 8-12 jours | UX +1.0 pt, qualite code, maintenabilite |
| P2 - Moyenne | 7 actions | 10-15 jours | Fonctionnalites BI, robustesse |
| P3 - Basse | 6 actions | 8-12 jours | Confort, accessibilite, productivite |
| P4 - Backlog | 5 actions | 15-20 jours | Differenciation, intelligence |
| **Total** | **26 actions** | **~42-61 jours** | **Score cible 8.0/10** |

---

## P0 - Bloquant (a traiter immediatement)

### P0.1 — Validation du companyLogo a l'import de backup

**Constat** : `DataContext.tsx:857` importe le champ `companyLogo` sans validation de protocole. Un backup forge pourrait injecter une URI malveillante (`javascript:`, `data:text/html`, URL externe).

**Fichiers concernes** :
- `context/DataContext.tsx:857` (entree)
- `utils/exportUtils.ts:87` (sortie — deja valide)
- `hooks/useChartModalLogic.ts:318` (sortie — deja valide)

**Actions** :
1. Creer une fonction `validateLogoUri(uri: string): string | undefined` dans `utils/common.ts`
   - Accepter uniquement `data:image/png`, `data:image/jpeg`, `data:image/gif`, `data:image/svg+xml`, `data:image/webp`, `blob:`
   - Rejeter tout le reste (retourner `undefined`)
2. Appliquer dans `DataContext.tsx:857` avant `setCompanyLogo`
3. Appliquer dans `Customization.tsx` lors de l'upload du logo
4. Ecrire un test unitaire avec cas valides et malveillants

**Effort** : 0.5 jour | **Critere de validation** : Aucune URI non-image ne peut entrer dans le state

---

### P0.2 — Suppression de `unsafe-inline` dans la CSP

**Constat** : `index.html:7` contient `script-src 'self' 'unsafe-inline'`. Meme sans `Function()` (corrige), le `unsafe-inline` reste une surface d'attaque XSS.

**Fichiers concernes** :
- `index.html:7` (meta CSP)
- `vite.config.ts` (ajout plugin)
- `public/_headers` (a creer pour Cloudflare Pages)

**Actions** :
1. Installer `vite-plugin-csp-guard` ou `vite-plugin-html-csp` pour generer un nonce a chaque build
2. Remplacer `'unsafe-inline'` par `'nonce-{generated}'` dans `script-src`
3. Verifier que les styles inline Tailwind fonctionnent toujours (le `style-src 'unsafe-inline'` peut rester pour les styles)
4. Creer `public/_headers` pour Cloudflare Pages avec la CSP dynamique :
   ```
   /*
     Content-Security-Policy: default-src 'self'; script-src 'self'; ...
   ```
5. Tester le build + deploiement

**Effort** : 1 jour | **Critere de validation** : `unsafe-inline` absent de `script-src`, application fonctionnelle

---

## P1 - Haute (sprint 1, semaines 1-2)

### P1.1 — Remplacer les 54 `alert()` + 24 `confirm()` par un systeme de notifications

**Constat** : 54 `alert()` dans 13 fichiers + 24 `window.confirm()` dans 12 fichiers bloquent le thread UI et cassent l'experience.

**Fichiers concernes (top par nombre d'occurrences)** :

| Fichier | `alert()` | `confirm()` | Total |
|---------|-----------|-------------|-------|
| `hooks/useBudgetLogic.ts` | 13 | 3 | 16 |
| `hooks/useSettingsLogic.ts` | 9 | 5 | 14 |
| `hooks/usePivotLogic.ts` | 7 | 0 | 7 |
| `utils/exportUtils.ts` | 4 | 0 | 4 |
| `pages/Budget.tsx` | 3 | 4 | 7 |
| `hooks/useDataExplorerLogic.ts` | 3 | 2 | 5 |
| `components/settings/O365Section.tsx` | 3 | 0 | 3 |
| `pages/ETLPipeline.tsx` | 2 | 1 | 3 |
| `pages/Import.tsx` | 3 | 1 | 4 |
| `components/forecast/ForecastList.tsx` | 2 | 3 | 5 |
| `components/pivot/TemporalSourceModal.tsx` | 3 | 0 | 3 |
| `hooks/useForecastLogic.ts` | 0 | 1 | 1 |
| `pages/Customization.tsx` | 1 | 1 | 2 |
| `components/settings/SettingsModals.tsx` | 0 | 1 | 1 |
| `components/pivot/SourceManagementModal.tsx` | 0 | 1 | 1 |
| `components/data-explorer/DataExplorerHeader.tsx` | 0 | 1 | 1 |

**Actions** :
1. Installer `sonner` (3 KB gzip, zero-dependency)
2. Ajouter `<Toaster />` dans `App.tsx` apres `<DataProvider>`
3. Creer un fichier `utils/notify.ts` avec des helpers :
   ```typescript
   import { toast } from 'sonner';
   export const notify = {
     success: (msg: string) => toast.success(msg),
     error: (msg: string) => toast.error(msg),
     warning: (msg: string) => toast.warning(msg),
     info: (msg: string) => toast.info(msg),
   };
   ```
4. Creer un composant `components/ui/ConfirmDialog.tsx` base sur `Modal.tsx` pour remplacer `confirm()`
5. Remplacer les 54 `alert()` fichier par fichier en utilisant `notify.*`
6. Remplacer les 24 `confirm()` par `ConfirmDialog` (avec callback async)
7. Configurer le theming Sonner pour matcher le design system (dark mode, couleurs brand)

**Effort** : 2-3 jours | **Critere de validation** : 0 `alert()` et 0 `confirm()` dans le code, toasts stylises

---

### P1.2 — Decomposer ETLPipeline.tsx (1 364 lignes)

**Constat** : Plus gros fichier du projet. Pas de hook logique, pas de sous-composants. 19 occurrences de `: any`. Ne suit pas le pattern applique aux 6 autres pages.

**Fichiers concernes** :
- `pages/ETLPipeline.tsx` (1 364 lignes, a decomposer)
- `context/PipelineContext.tsx` (contexte existant)
- `utils/transformations.ts` (575 lignes, logique de transformation)

**Actions** :
1. Creer `hooks/useETLPipelineLogic.ts` — extraire tous les `useState`, `useEffect`, `useCallback`, `useMemo`
2. Creer les sous-composants dans `components/etl/` :
   - `ETLPipelineHeader.tsx` — barre d'outils et selection de pipeline
   - `ETLNodeEditor.tsx` — edition d'un noeud de transformation
   - `ETLCanvas.tsx` — zone de visualisation des noeuds et connexions
   - `ETLPreview.tsx` — preview des donnees a chaque etape
   - `ETLModals.tsx` — modales de configuration des transformations
3. Reduire `pages/ETLPipeline.tsx` a ~150-200 lignes (import hook + render sous-composants)
4. Typer les 19 `: any` lors de la decomposition (profiter du refactoring)
5. Ecrire des tests pour le hook `useETLPipelineLogic`

**Effort** : 3-4 jours | **Critere de validation** : Page < 200 lignes, 0 useState dans la page, 0 `: any` dans les nouveaux fichiers

---

### P1.3 — Decomposer Import.tsx (916 lignes)

**Constat** : 11+ `useState` directs dans la page, logique inline, pas de hook logique. Meme pattern a appliquer.

**Fichiers concernes** :
- `pages/Import.tsx` (916 lignes)

**Actions** :
1. Creer `hooks/useImportLogic.ts` — toute la logique d'import (state, handlers, validation)
2. Creer les sous-composants dans `components/import/` :
   - `ImportSourceSelector.tsx` — choix du mode (fichier, coller, Excel)
   - `ImportFileDropZone.tsx` — zone de drag & drop avec feedback
   - `ImportMappingEditor.tsx` — configuration du mapping colonnes
   - `ImportPreview.tsx` — apercu des donnees avant import
   - `ImportActions.tsx` — boutons de navigation entre etapes
3. Reduire `pages/Import.tsx` a ~150 lignes
4. Ajouter une barre de progression pour les gros fichiers (> 10 000 lignes)
5. Ecrire des tests pour `useImportLogic`

**Effort** : 2-3 jours | **Critere de validation** : Page < 200 lignes, 0 useState, barre de progression visible

---

### P1.4 — Pipeline CI/CD minimale

**Constat** : Aucun `.github/workflows/`. Deploiement manuel uniquement. Pas de garde-fou automatise.

**Fichiers a creer** :
- `.github/workflows/ci.yml`

**Actions** :
1. Creer le workflow CI :
   ```yaml
   name: CI
   on: [push, pull_request]
   jobs:
     quality:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-node@v4
           with: { node-version: 20 }
         - run: npm ci
         - run: npx tsc --noEmit          # Type check
         - run: npx eslint .              # Lint
         - run: npx vitest run            # Tests
         - run: npm run build             # Build
   ```
2. Ajouter un badge CI dans le README
3. Optionnel : ajouter le deploiement Cloudflare Pages automatique sur merge dans `main`

**Effort** : 0.5 jour | **Critere de validation** : Pipeline verte sur un push

---

### P1.5 — Reduire les `: any` sous la barre des 200

**Constat** : 321 `: any` + 93 `as any` = 414 contournements de type. ESLint est configure en `warn` mais les warnings ne sont pas traites.

**Plan de reduction par sprint (fichiers prioritaires)** :

| Sprint | Fichiers cibles | `: any` a eliminer | Objectif cumule |
|--------|-----------------|---------------------|-----------------|
| S1 | `ETLPipeline.tsx` (19), `ChartModalDisplay.tsx` (16), `WidgetDisplay.tsx` (13) | 48 | 273 |
| S2 | `useWidgetData.ts` (14), `PivotGrid.tsx` (14), `useChartModalLogic.ts` (13) | 41 | 232 |
| S3 | `SettingsModals.tsx` (12), `ChartModalControls.tsx` (11), `exportUtils.ts` (9) | 32 | 200 |
| S4 | `DataContext.tsx` (9), `PivotFooter.tsx` (9), `DataExplorerGrid.tsx` (9), `SettingsMainSections.tsx` (9) | 36 | 164 |

**Actions** :
1. Creer des interfaces/types pour les structures recurrentes (chart data, pivot config, widget props)
2. Remplacer les `: any` par les types corrects fichier par fichier
3. Passer les `as any` les plus risques en assertions typees (`as SpecificType`)
4. Monter ESLint de `warn` a `error` pour `no-explicit-any` apres le S3
5. Ajouter `"noUnusedLocals": true` et `"noUnusedParameters": true` dans `tsconfig.json`

**Effort** : 3-4 jours (1 jour par sprint) | **Critere de validation** : < 200 `: any`, ESLint en `error`

---

### P1.6 — Nettoyage des 77 `console.*` de production

**Constat** : 77 `console.log/warn/error` dans 24 fichiers polluent la console du navigateur.

**Fichiers prioritaires** :
- `logic/pivotToChart.ts` (16 occurrences)
- `services/o365Service.ts` (10)
- `components/settings/O365Section.tsx` (7)
- `context/DataContext.tsx` (4)
- `utils/temporalComparison.ts` (4)
- `hooks/useWidgetData.ts` (4)

**Actions** :
1. Supprimer tous les `console.log` de debug (la majorite)
2. Remplacer les `console.error` de production par un logger conditionnel :
   ```typescript
   // utils/logger.ts
   export const logger = {
     error: (msg: string, ...args: unknown[]) => {
       if (import.meta.env.DEV) console.error(msg, ...args);
     },
     warn: (msg: string, ...args: unknown[]) => {
       if (import.meta.env.DEV) console.warn(msg, ...args);
     },
   };
   ```
3. Conserver `console.error` dans `ErrorBoundary.tsx` (utile pour le diagnostic)
4. Ajouter la regle ESLint `no-console: ["warn", { allow: ["error"] }]`

**Effort** : 1 jour | **Critere de validation** : 0 `console.log` en production, `console.error` uniquement dans ErrorBoundary et logger

---

## P2 - Moyenne (sprint 2, semaines 3-5)

### P2.1 — Profilage et qualite des donnees

**Constat** : Aucune visibilite sur la qualite des donnees importees. L'utilisateur decouvre les problemes dans les visualisations.

**Actions** :
1. Creer `logic/dataProfiling.ts` :
   - `profileColumn(values: unknown[])` : type detecte, completude (% non-null), cardinalite, min/max/moyenne/mediane pour les numeriques, longueur min/max/moyenne pour les textes
   - `profileDataset(data: Record<string, unknown>[])` : score global de qualite, colonnes problematiques
   - `detectOutliers(values: number[], method: 'iqr' | 'zscore')` : detection d'outliers
   - `detectDuplicates(data: Record<string, unknown>[], keys: string[])` : detection de doublons
2. Creer `components/data-explorer/DataProfilingPanel.tsx` :
   - Panneau lateral dans DataExplorer affichant le profil par colonne
   - Histogramme de distribution (mini-chart Recharts)
   - Indicateurs couleur (vert/orange/rouge) par completude
   - Bouton "Supprimer les doublons" et "Traiter les valeurs manquantes"
3. Afficher un resume de qualite automatique apres chaque import dans `Import.tsx`
4. Ecrire des tests pour `dataProfiling.ts`

**Effort** : 3-4 jours | **Critere de validation** : Profil visible apres import, score de qualite affiche

---

### P2.2 — Undo/Redo global

**Constat** : Aucune possibilite d'annulation. L'utilisateur hesite a experimenter.

**Actions** :
1. Installer `immer` et creer un middleware undo/redo :
   ```typescript
   // hooks/useUndoRedo.ts
   interface UndoStack<T> {
     past: T[];
     present: T;
     future: T[];
     canUndo: boolean;
     canRedo: boolean;
     undo: () => void;
     redo: () => void;
     push: (state: T) => void;
   }
   ```
2. Integrer dans les contextes principaux (DataContext, PivotConfig, WidgetContext)
3. Enregistrer les raccourcis clavier :
   - `Ctrl+Z` : undo
   - `Ctrl+Y` / `Ctrl+Shift+Z` : redo
4. Ajouter un indicateur visuel dans le header :
   - Boutons undo/redo avec compteur d'actions disponibles
   - Tooltip "3 actions annulables"
5. Couvrir : modifications de donnees, config pivot, ajout/suppression widgets, modifications budget
6. Limite : 30 etats maximum dans la pile (au-dela, les plus anciens sont supprimes)

**Effort** : 3-4 jours | **Critere de validation** : Ctrl+Z fonctionne dans DataExplorer, PivotTable et Dashboard

---

### P2.3 — Scatter plot, waterfall et graphiques statistiques

**Constat** : 15 types de graphiques mais aucun scatter plot, waterfall ou box plot — essentiels pour un outil BI.

**Fichiers concernes** :
- `logic/pivotToChart.ts` (952 lignes — detecteur de type de graphique)
- `components/pivot/chart/ChartModalDisplay.tsx`

**Actions** :
1. Ajouter les types dans `types/pivot.ts` : `'scatter' | 'bubble' | 'waterfall' | 'boxplot' | 'heatmap'`
2. Implementer dans `pivotToChart.ts` :
   - `scatter` : 2 axes numeriques + couleur par categorie (utiliser `<ScatterChart>` de Recharts)
   - `waterfall` : barres empilees avec total cumule (important pour le module finance)
   - `boxplot` : quartiles, mediane, outliers (calcul dans `logic/pivotEngine.ts`)
   - `heatmap` : matrice de couleurs (utiliser D3.js existant)
3. Mettre a jour l'auto-detection dans `pivotToChart.ts` :
   - 2 colonnes numeriques sans dimension → recommander scatter
   - Dimension temporelle + valeurs positives/negatives → recommander waterfall
4. Ajouter les icones dans le selecteur de type de graphique
5. Ecrire des tests pour chaque nouveau type

**Effort** : 3-4 jours | **Critere de validation** : 20 types de graphiques, scatter fonctionnel avec 2 axes

---

### P2.4 — Drill-through du dashboard vers les donnees

**Constat** : Cliquer sur un widget KPI ou un segment de graphique ne permet pas de voir les donnees sous-jacentes.

**Actions** :
1. Ajouter un handler `onDrillThrough` dans `components/dashboard/WidgetDisplay.tsx`
2. Creer `components/dashboard/DrillThroughDrawer.tsx` :
   - Drawer lateral affichant les lignes du dataset filtrees
   - En-tete avec le filtre applique (ex: "Ventes > Region = Nord")
   - Tableau virtualise des lignes correspondantes
   - Bouton "Ouvrir dans Data Explorer" (navigation avec filtres pre-appliques)
3. Modifier `WidgetCard.tsx` pour propager le clic sur les segments de graphique
4. Ajouter le support dans `useWidgetData.ts` pour filtrer les donnees source
5. Implementer la navigation vers DataExplorer avec query params :
   ```
   /#/data?dataset=xxx&filter=Region:Nord
   ```

**Effort** : 2-3 jours | **Critere de validation** : Clic sur KPI → drawer avec donnees, lien vers DataExplorer

---

### P2.5 — Agregations statistiques avancees

**Constat** : 6 agregations basiques (count, sum, avg, min, max, list). Manque les agregations statistiques.

**Fichiers concernes** :
- `logic/pivotEngine.ts:567` (calcul des agregations)
- `types/pivot.ts` (type `AggType`)

**Actions** :
1. Ajouter dans `types/pivot.ts` :
   ```typescript
   type AggType = 'count' | 'sum' | 'avg' | 'min' | 'max' | 'list'
     | 'median' | 'stddev' | 'variance' | 'percentile25' | 'percentile75'
     | 'countDistinct' | 'first' | 'last';
   ```
2. Implementer dans `logic/pivotEngine.ts` les fonctions de calcul
3. Ajouter dans le selecteur d'agregation du pivot (dropdown dans PivotSidePanel)
4. Ecrire des tests unitaires pour chaque nouvelle agregation

**Effort** : 1-2 jours | **Critere de validation** : median et stddev fonctionnels dans le pivot

---

### P2.6 — Couverture de tests des contextes

**Constat** : 32 fichiers de tests mais 0 test pour les 11 contextes/providers.

**Fichiers cibles (par ordre de criticite)** :
1. `context/DataContext.tsx` (949 lignes — contexte principal)
2. `context/BudgetContext.tsx` (523 lignes)
3. `context/ForecastContext.tsx` (689 lignes)
4. `context/PipelineContext.tsx`
5. `context/WidgetContext.tsx`

**Actions** :
1. Creer un helper de test `__tests__/testUtils.tsx` avec un wrapper provider
2. Ecrire des tests pour `DataContext` : import/export backup, gestion datasets, migration localStorage
3. Ecrire des tests pour `BudgetContext` : CRUD budgets, workflow de validation
4. Ecrire des tests pour `ForecastContext` : CRUD forecasts, reconciliation
5. Viser 60% de couverture sur les contextes critiques

**Effort** : 2-3 jours | **Critere de validation** : 5 fichiers de tests contextes, > 60% couverture

---

### P2.7 — Audit trail pour le module finance

**Constat** : Aucune tracabilite des modifications budgetaires. Non-negociable pour un outil finance.

**Actions** :
1. Creer `types/audit.ts` :
   ```typescript
   interface AuditEntry {
     id: string;
     timestamp: string;
     action: 'create' | 'update' | 'delete' | 'submit' | 'validate' | 'reject';
     entity: 'budget' | 'forecast' | 'dataset';
     entityId: string;
     field?: string;
     oldValue?: unknown;
     newValue?: unknown;
     description: string;
   }
   ```
2. Creer `services/auditService.ts` :
   - Stockage dans IndexedDB (table dediee)
   - Retention configurable (30/60/90 jours)
   - Methodes : `log()`, `getByEntity()`, `getByDateRange()`, `export()`
3. Integrer dans `BudgetContext` et `ForecastContext` (wrapper autour des mutations)
4. Creer `components/budget/AuditTrailPanel.tsx` :
   - Timeline des modifications par budget/forecast
   - Filtrage par date, action, champ
   - Export CSV du journal

**Effort** : 2-3 jours | **Critere de validation** : Toute modification budget loguee, historique consultable

---

## P3 - Basse (sprint 3, semaines 6-8)

### P3.1 — Accessibilite WCAG 2.1 AA

**Constat** : 32 `aria-*`, focus trap Modal OK, mais manques significatifs.

**Actions** :
1. **Skip-to-content** : Ajouter un lien masque en haut de `Layout.tsx`
   ```html
   <a href="#main-content" className="sr-only focus:not-sr-only ...">Aller au contenu</a>
   ```
2. **`aria-live`** : Ajouter une region `aria-live="polite"` pour les notifications toast
3. **`prefers-reduced-motion`** : Wrapper les animations dans une media query
   ```css
   @media (prefers-reduced-motion: reduce) {
     *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
   }
   ```
4. **D&D clavier** : Ajouter des boutons "Monter/Descendre" comme alternative au drag dans le pivot
5. **Focus visible** : Verifier que `focus-visible` est applique sur tous les elements interactifs
6. **Contraste** : Verifier les ratios de contraste des textes `txt-muted` en dark mode

**Effort** : 2-3 jours | **Critere de validation** : Score Lighthouse Accessibilite > 85

---

### P3.2 — Command palette (Ctrl+K)

**Constat** : Navigation exclusivement par sidebar. Lent avec 11 pages et potentiellement des dizaines de datasets.

**Actions** :
1. Creer `components/CommandPalette.tsx` :
   - Modal avec champ de recherche en focus automatique
   - Categories : Pages, Datasets, Analyses sauvegardees, Actions rapides
   - Navigation fleches haut/bas + Enter pour selectionner
   - Fuzzy search (filtrage par sous-chaine)
2. Enregistrer le raccourci `Ctrl+K` dans `Layout.tsx`
3. Actions rapides : "Nouvel import", "Nouveau pivot", "Exporter le dashboard", "Sauvegarder"
4. Afficher les raccourcis clavier a cote des actions

**Effort** : 1-2 jours | **Critere de validation** : Ctrl+K ouvre la palette, navigation fonctionnelle

---

### P3.3 — Composants UI manquants (Input, Select, Tooltip)

**Constat** : 11 composants dans `components/ui/` mais pas de `Input`, `Select`, ou `Tooltip` standardises. Codes inline dans chaque page.

**Actions** :
1. Creer `components/ui/Input.tsx` : label, placeholder, erreur, icone, tailles (sm/md/lg), variantes
2. Creer `components/ui/Select.tsx` : options, placeholder, recherche, groupes
3. Creer `components/ui/Tooltip.tsx` : positionnement automatique, delai, arrow
4. Remplacer progressivement les inputs inline dans les pages par ces composants
5. Documenter les props dans les fichiers (JSDoc ou commentaires)

**Effort** : 2 jours | **Critere de validation** : 14 composants UI, usage dans au moins 3 pages

---

### P3.4 — Dark mode complet

**Constat** : Tokens CSS bien structures mais certains composants utilisent des classes Tailwind hardcodees (`bg-slate-100`, `text-gray-600`) au lieu des tokens, cassant le dark mode.

**Actions** :
1. Auditer tous les fichiers pour les classes Tailwind non-tokenisees :
   - `bg-slate-*` → `bg-canvas` ou `bg-surface`
   - `text-gray-*` → `text-txt-main` ou `text-txt-secondary`
   - `border-gray-*` → `border-border-default`
2. Remplacer chaque occurrence par le token CSS correspondant
3. Tester visuellement chaque page en dark mode
4. Ajouter un test visuel (screenshot) pour prevenir les regressions

**Effort** : 1-2 jours | **Critere de validation** : 0 classe Tailwind hardcodee, dark mode sans defaut visuel

---

### P3.5 — Mobile : bottom navigation optimisee

**Constat** : Sidebar 11 items en mode horizontal sur mobile — trop encombre et confus.

**Actions** :
1. Remplacer la sidebar horizontale mobile par une bottom navigation a 5 items :
   - Dashboard, Import, Pivot, Analytics, Plus (menu)
2. Le bouton "Plus" ouvre un drawer avec les 6 autres pages
3. Adapter les breakpoints dans `Layout.tsx` :
   - Mobile (< 768px) : bottom nav 5 items
   - Tablet (768-1024px) : sidebar collapsee
   - Desktop (> 1024px) : sidebar complete

**Effort** : 1-2 jours | **Critere de validation** : Bottom nav visible sur mobile, navigation fluide

---

### P3.6 — Math.random() residuels

**Constat** : 2 occurrences dans `components/pivot/FormattingModal.tsx`. Les 29 autres sont dans `dataGeneration.ts` (demo) et tests (acceptables).

**Actions** :
1. Remplacer `Math.random()` par `crypto.randomUUID()` dans `FormattingModal.tsx`
2. Verifier qu'aucune autre occurrence n'apparait dans le code applicatif

**Effort** : 0.25 jour | **Critere de validation** : 0 `Math.random()` hors `dataGeneration.ts` et tests

---

## P4 - Backlog (a planifier)

### P4.1 — Data lineage visuel

**Constat** : Avec les pipelines ETL, jointures et champs calcules, il est impossible de tracer l'origine d'une donnee.

**Actions** :
1. Creer `logic/lineageEngine.ts` : graphe de dependances (dataset → transformation → dataset derive → widget)
2. Creer `components/LineageGraph.tsx` : visualisation D3.js du graphe
3. Clic sur un champ → panneau lateral avec la provenance complete
4. Impact analysis : quels widgets/budgets sont affectes si un dataset source change

**Effort** : 4-5 jours

---

### P4.2 — Templates de dashboards

**Constat** : Aucun template pre-configure. L'utilisateur part de zero a chaque fois.

**Actions** :
1. Creer 5 templates metier : Finance (KPI tresorerie + ecarts budget), Ventes (CA/marge + top clients), RH (effectifs + masse salariale), Marketing (acquisition + conversion), General (KPIs + tendances)
2. Galerie de templates dans Dashboard avec apercu
3. Import/export de templates (JSON)
4. Detection automatique des champs compatibles

**Effort** : 3-4 jours

---

### P4.3 — Export enrichi (PDF, PowerPoint)

**Constat** : Export PDF basique via jsPDF. Pas de PowerPoint. Pas de page de garde.

**Actions** :
1. Ajouter page de garde configurable (logo, titre, date, auteur) dans l'export PDF
2. Pied de page avec numerotation
3. Integrer `pptxgenjs` pour l'export PowerPoint
4. Template d'export : choix des widgets a inclure, ordre, commentaires

**Effort** : 3-4 jours

---

### P4.4 — Annotations et commentaires sur graphiques

**Constat** : Impossible d'annoter un graphique pour conserver le contexte metier.

**Actions** :
1. Ajouter un mode annotation dans les graphiques (clic pour placer un point + texte)
2. Stockage dans le state du widget
3. Export avec annotations (PNG, PDF)
4. Commentaires par widget dans le dashboard

**Effort** : 2-3 jours

---

### P4.5 — ML avance pour le forecasting

**Constat** : Framework ML en place mais implementation basique (tendance lineaire + saisonnalite simple).

**Actions** :
1. Implementer EMA (Exponential Moving Average) et WMA (Weighted Moving Average)
2. Detection automatique de periodicite (autocorrelation)
3. Decomposition trend + saisonnalite + residus
4. Cross-validation temporelle avec score MAPE/RMSE
5. Intervalles de confiance visuels sur le graphique de prevision

**Effort** : 4-5 jours

---

## Calendrier propose

```
Semaine 1  : P0.1 + P0.2 + P1.1 (securite + alert/confirm)
Semaine 2  : P1.2 + P1.3 (decomposition ETL + Import)
Semaine 3  : P1.4 + P1.5 S1-S2 (CI/CD + any reduction)
Semaine 4  : P1.5 S3-S4 + P1.6 (any reduction + console cleanup)
Semaine 5  : P2.1 + P2.5 (profilage donnees + agregations)
Semaine 6  : P2.2 + P2.4 (undo/redo + drill-through)
Semaine 7  : P2.3 + P2.6 (graphiques stats + tests contextes)
Semaine 8  : P2.7 + P3.1 (audit trail + accessibilite)
Semaine 9  : P3.2 + P3.3 + P3.6 (command palette + composants UI + cleanup)
Semaine 10 : P3.4 + P3.5 (dark mode + mobile)
Semaines 11+ : P4.* (backlog, a prioriser selon les retours utilisateurs)
```

---

## Metriques de suivi

| Metrique | Valeur actuelle | Cible P1 | Cible P2 | Cible P3 |
|----------|-----------------|----------|----------|----------|
| `: any` | 321 | < 200 | < 150 | < 100 |
| `as any` | 93 | < 60 | < 30 | < 15 |
| `alert()` | 54 | 0 | 0 | 0 |
| `confirm()` | 24 | 0 | 0 | 0 |
| `console.*` | 77 | < 10 | < 5 | 0 (prod) |
| Fichiers > 500 lignes | 22 | 18 | 15 | 12 |
| Fichiers > 1000 lignes | 1 | 0 | 0 | 0 |
| Fichiers de tests | 32 | 38 | 48 | 55 |
| Score UX | 6.6/10 | 7.2 | 7.8 | 8.0 |
| Score Lighthouse A11y | ~65 | 75 | 80 | 85 |
| Types de graphiques | 15 | 15 | 20 | 20 |
| Composants UI | 11 | 13 | 14 | 14 |
