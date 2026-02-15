# Rapport d'Audit - DataScope Dashboard

**Application** : DataScope - Plateforme BI & Analyse de Donnees locale
**Date de l'audit** : 2026-02-13
**Stack** : React 18 / TypeScript 5 / Vite 5 / Tailwind 3 / IndexedDB / Cloudflare Pages
**Volume** : ~39 400 lignes TypeScript, 179 fichiers source, 11 pages, 71 composants, 11 hooks, 11 contextes, 32 fichiers de tests

---

## Table des matieres

- [Partie 1 - Audit technique](#partie-1---audit-technique)
  - [1. Points forts](#1-points-forts)
  - [2. Problemes restants](#2-problemes-restants)
  - [3. Bilan des corrections](#3-bilan-des-corrections-effectuees)
- [Partie 2 - Recommandations fonctionnelles BI](#partie-2---recommandations-fonctionnelles-bi)
  - [4. Inventaire fonctionnel](#4-inventaire-des-fonctionnalites-existantes)
  - [5. Fonctionnalites a apporter](#5-fonctionnalites-et-ameliorations-a-apporter)
- [Partie 3 - Analyse UX / Design](#partie-3---analyse-ux--design)
  - [6. Design system](#6-design-system)
  - [7. Layout et navigation](#7-layout-et-navigation)
  - [8. Analyse par page](#8-analyse-detaillee-par-page)
  - [9. Patterns UX transversaux](#9-patterns-ux-transversaux)
  - [10. Scoring et recommandations](#10-scoring-et-recommandations-ux)

---

# Partie 1 - Audit technique

## 1. Points forts

### 1.1 Architecture local-first coherente (Fonctionnel)

- Toutes les donnees sont traitees et stockees localement dans IndexedDB (`utils/db.ts`)
- Aucune telemetrie, aucun tracking, aucun appel reseau non sollicite
- Migration automatique de localStorage vers IndexedDB avec nettoyage (`DataContext.tsx:91-111`)
- Compression intelligente des batches en format colonnaire pour economiser l'espace (`utils/common.ts`)
- L'integration O365 (OneDrive) est strictement optionnelle, initiee par l'utilisateur, authentifiee via OAuth 2.0 + PKCE

### 1.2 Moteur de formules securise (Technique / Securite)

- Le parseur de formules (`logic/formulaEngine.ts`, ~400 lignes) est un tokenizer/evaluateur custom
- Aucun usage de `eval()` ou `Function()` dans le moteur de formules
- Whitelist de 30+ fonctions supportees FR/EN (IF, SUM, AVERAGE, CONCAT, DATEPART, TODAY, etc.)
- Cache de tokens pour performances
- Gestion d'erreurs gracieuse avec retour `null` en cas d'erreur de syntaxe
- **Le module ETL utilise desormais le meme parseur securise** (plus de `new Function()`)

### 1.3 Typage TypeScript avec controle ESLint (Technique)

- Mode `strict: true` active dans tsconfig
- 8 fichiers de types bien organises par domaine (`types/common.ts`, `dataset.ts`, `dashboard.ts`, `pivot.ts`, `finance.ts`, `etl.ts`, `app.ts`, `o365.ts`)
- Types unions discrimines pour les variants (`WidgetType`, `ChartType`, `ViewMode`)
- **ESLint configure** (`eslint.config.js`) avec `@typescript-eslint/no-explicit-any: warn`, `react-hooks` et `react-refresh`
- Seulement 1 `@ts-ignore` dans tout le projet, 2 `TODO/FIXME`

### 1.4 Build et securite web (Technique / Securite)

- **Tailwind en build-time** via PostCSS (`tailwind.config.js` + `postcss.config.js` + `index.css`) - plus de CDN runtime
- **CSP implementee** (`index.html:7`) avec restrictions sur `default-src`, `font-src`, `img-src`, `connect-src`
- **Plus d'import maps ni de CDN** : toutes les dependances sont bundlees par Vite
- **Tokens MSAL migres vers SessionStorage** (`o365Service.ts:46`) - plus de persistance en localStorage
- **Vite manual chunks** : `vendor-react`, `vendor-charts`, `vendor-utils` pour un caching optimal

### 1.5 Architecture modulaire exemplaire (Technique)

Le codebase a ete profondement restructure avec une separation nette entre logique, UI et etat.

**Decomposition de `utils.ts`** (2037 → 8 lignes de re-exports) en 8 modules :
- `utils/db.ts` - IndexedDB engine
- `utils/formulaEngine.ts` → `logic/formulaEngine.ts` - Parseur de formules
- `utils/csvParser.ts` - Parsing CSV/TSV
- `utils/exportUtils.ts` (504 lignes) - Export PDF/HTML/PNG avec imports dynamiques
- `utils/common.ts` - Utilitaires partages
- `utils/mathUtils.ts` - Regression lineaire
- `utils/dataGeneration.ts` - Donnees de demo
- `utils/diagnostics.ts` - Suite de diagnostics

**Decomposition de toutes les pages majeures** en hooks logiques + sous-composants :

| Page | Avant | Apres | Hook logique | Sous-composants |
|------|-------|-------|-------------|-----------------|
| `PivotTable.tsx` | 992 lignes | ~200 lignes | `usePivotLogic.ts` (988) | 12 composants dans `components/pivot/` |
| `Budget.tsx` | 2 296 lignes | ~160 lignes | `useBudgetLogic.ts` (598) | 9 composants dans `components/budget/` |
| `AnalysisStudio.tsx` | 1 872 lignes | ~170 lignes | `useAnalysisStudioLogic.ts` (894) | 4 composants dans `components/analytics/` |
| `DataExplorer.tsx` | 1 575 lignes | ~160 lignes | `useDataExplorerLogic.ts` (909) | 5 composants dans `components/data-explorer/` |
| `Settings.tsx` | 1 464 lignes | ~180 lignes | `useSettingsLogic.ts` (423) | 6 composants dans `components/settings/` |
| `Forecast.tsx` | 1 125 lignes | ~120 lignes | `useForecastLogic.ts` (269) | 7 composants dans `components/forecast/` |
| `ChartModal.tsx` | 1 593 lignes | 155 lignes | `useChartModalLogic.ts` (713) | 4 composants dans `components/pivot/chart/` |

**Resultat** : Les 6 pages decomposees ont **0 `useState`** directs ; toute la logique est dans les hooks custom.

### 1.6 Error Boundary et code splitting (Technique)

- **Error Boundary** (`components/ErrorBoundary.tsx`) : UI soignee avec affichage de l'erreur, boutons "Reessayer" et "Retour a l'accueil", message rassurant sur la preservation des donnees
- **Code splitting** : 11 pages chargees via `React.lazy()` (`App.tsx:8-18`) avec `<Suspense fallback={<LoadingPage />}>`
- **Imports dynamiques** : jsPDF et html2canvas charges a la demande (`exportUtils.ts`), pas dans le bundle principal

### 1.7 Performances optimisees (Technique)

- Virtualisation des tableaux via `@tanstack/react-virtual` (9 uses de `useVirtualizer` dans pivot, data explorer, multi-select)
- Memoisation extensive : 74 `useMemo`, 92 `useCallback`, 4 `React.memo`
- Debounce des calculs pivot (150ms) et sauvegarde IndexedDB differee
- Identifiants generes via `crypto.randomUUID()` (`utils/common.ts`)
- **Optimisations hot-path pivot** :
  - Cache global de parsing de dates avec limite 10 000 entrees (`utils/temporalComparison.ts`)
  - Lookup metrique memoize dans PivotFooter
  - Filtrage et aggregation temporelle en une seule passe
  - BOLT optimization pour datasets 10k+ lignes dans le pivot engine
  - String caching pour les valeurs repetees

### 1.8 Design system themable enrichi (UX)

- Tokens CSS complets dans `index.css` via `@layer base` : 9 palettes couleur, dark mode, 3 styles visuels (defaut, material, glass)
- Configuration Tailwind externalisee dans `tailwind.config.js` avec `darkMode: 'class'`, tokens d'espacement `ds-*`
- **11 composants UI reutilisables** dans `components/ui/` :
  - `Button.tsx` : 5 variants (primary, secondary, danger, outline, ghost) + 4 tailles + loading + icon + aria-label
  - `Modal.tsx` : `role="dialog"`, `aria-modal`, focus trap complet (Tab wrapping), auto-focus, restoration du focus, Escape
  - `Tabs.tsx` : Navigation clavier (ArrowLeft/Right, Home/End), `role="tablist"`, `aria-selected`
  - `MultiSelect.tsx` : Virtualisation (`useVirtualizer`), recherche, select/deselect all
  - `Typography.tsx` : Composants Text, Heading, Paragraph, Label
  - `Badge.tsx`, `Card.tsx`, `Form.tsx`, `Checkbox.tsx`, `SourceBadge.tsx`, `TreemapContent.tsx`

### 1.9 Couverture de tests en forte progression (Technique)

32 fichiers de tests (doublement par rapport a 16 precedemment) :

| Categorie | Fichiers de tests |
|-----------|-------------------|
| Logique metier (12) | `pivotEngine.test.ts`, `pivotEngine_empty_metrics.test.ts`, `pivotEngine_multi_metrics.test.ts`, `pivotToChart.test.ts`, `transformations.test.ts`, `bolt_transformations.test.ts`, `temporalComparisonUtils.test.ts`, `temporalComparison_no_metrics.test.ts`, `calculatedFieldActions.test.ts`, `pivotToDataset.test.ts`, `formulaDateFunctions.test.ts`, `etl_remediation.test.ts` |
| Hooks logiques (7) | `useBudgetLogic.test.tsx`, `useDataExplorerLogic.test.tsx`, `useAnalysisStudioLogic.test.tsx`, `useForecastLogic.test.tsx`, `useSettingsLogic.test.tsx`, `useWidgetData.test.ts`, `usePivotData.test.ts` |
| Composants & integration (8) | `Button.test.tsx`, `sunburst.test.ts`, `sunburst_bug.test.ts`, `pivotTemporalChart.test.ts`, `perf_optimization.test.ts`, `select.test.ts`, `filterMultiValue.test.ts`, `remediation_audit.test.ts` |
| Utilitaires (5) | `utils.test.ts`, `autoRefresh.test.ts`, `excelDates.test.ts`, `rename_comparison.test.ts`, `temporal_date_fix.test.ts` |

### 1.10 Onboarding fonctionnel (UX)

- **OnboardingTour** (187 lignes) : composant complet avec effet spotlight, positionnement intelligent, 5 etapes progressives
- Etapes : Bienvenue → Selection dataset → Import → Dashboard → Analyses avancees
- Boutons "Suivant" et "Passer", compteur d'etapes, animations fluides (fade-in, zoom-in-95)
- Memorisation via `hasSeenOnboarding` dans DataContext

### 1.11 Richesse fonctionnelle (Fonctionnel)

- Import multi-format (CSV, Excel, TSV, copier-coller) avec detection encodage, separateur et conversion dates Excel OLE
- Tableaux croises dynamiques avec drill-down, expand/collapse, comparaison temporelle, recherche optimisee
- Dashboard personnalisable avec widgets configurables (KPI 3 styles, Chart, List, Text, Report)
- Module budget avec versioning, workflow de validation et templates
- Module forecast avec 6 methodes de prevision et reconciliation MAPE/RMSE
- Pipeline ETL avec 14+ transformations
- Export multi-format (Excel, PDF, HTML interactif, PNG, CSV)
- 15 types de graphiques supportes
- Etats vides centralises pour une experience coherente

---

## 2. Problemes restants

### 2.1 [SECURITE - MOYENNE] CSP avec `unsafe-inline` dans `script-src`

**Fichier** : `index.html:7`

La CSP actuelle contient `script-src 'self' 'unsafe-inline'`. Le `unsafe-inline` affaiblit significativement la protection contre les XSS.

**Recommandation** : Pour la production, utiliser un nonce CSP genere par le serveur ou le plugin `vite-plugin-csp` pour eliminer `unsafe-inline`. Cloudflare Pages supporte les headers dynamiques via `_headers` avec nonce.

### 2.2 [SECURITE - MOYENNE] Validation de companyLogo incomplete

**Fichier** : `context/DataContext.tsx:857`

```typescript
if (shouldImport('companyLogo') && parsed.companyLogo) setCompanyLogo(parsed.companyLogo);
```

Lors de la restauration d'un backup, `companyLogo` est importe sans verification de protocole. Une validation existe en aval dans `exportUtils.ts:87` et `useChartModalLogic.ts:318` (`getSafeLogo` verifie `data:image/` ou `blob:`), mais pas a l'entree dans le state.

**Recommandation** : Ajouter la validation de protocole dans `importBackup` avant `setCompanyLogo`, pour bloquer les URIs malveillantes a la source.

### 2.3 [UX - HAUTE] 54 appels `alert()` natif dans 13 fichiers

Les `alert()` natifs bloquent le thread UI, ne respectent pas le design system et offrent une experience degradee.

**Top 5 des fichiers affectes** :

| Fichier | Occurrences |
|---------|-------------|
| `hooks/useBudgetLogic.ts` | 13 |
| `hooks/useSettingsLogic.ts` | 9 |
| `hooks/usePivotLogic.ts` | 7 |
| `utils/exportUtils.ts` | 4 |
| `components/settings/O365Section.tsx` | 3 |

**Recommandation** : Remplacer par un systeme de toasts (Sonner ou react-hot-toast) et des modales de confirmation stylisees. Effort faible, impact UX tres eleve.

### 2.4 [TECHNIQUE - MOYENNE] 321 occurrences de `: any` + 93 `as any`

Le nombre de `: any` a diminue (417 → 321, -23%) grace aux sprints de reduction. Les `as any` (93 occurrences dans 32 fichiers) contournent egalement le systeme de types.

**Top 10 des fichiers `: any`** :

| Fichier | Occurrences |
|---------|-------------|
| `pages/ETLPipeline.tsx` | 19 |
| `components/pivot/chart/ChartModalDisplay.tsx` | 16 |
| `hooks/useWidgetData.ts` | 14 |
| `components/pivot/PivotGrid.tsx` | 14 |
| `hooks/useChartModalLogic.ts` | 13 |
| `components/dashboard/WidgetDisplay.tsx` | 13 |
| `components/settings/SettingsModals.tsx` | 12 |
| `components/pivot/chart/ChartModalControls.tsx` | 11 |
| `utils/exportUtils.ts` | 9 |
| `context/DataContext.tsx` | 9 |

**Recommandation** : ESLint est configure avec `no-explicit-any: warn` — il faut maintenant traiter les warnings. Prioriser `ETLPipeline.tsx` (19), les composants chart (27 combines) et `WidgetDisplay` (13).

### 2.5 [TECHNIQUE - MOYENNE] 2 pages monolithiques restantes

| Fichier | Lignes | Probleme |
|---------|--------|----------|
| `pages/ETLPipeline.tsx` | 1 364 | **Plus gros fichier du projet** — pas de hook logique, pas de sous-composants |
| `pages/Import.tsx` | 916 | Logique inline, 11+ useState, pas de decomposition |

Ces 2 pages n'ont pas suivi le pattern hook+sous-composants applique aux 6 autres pages.

**Recommandation** : Decomposer selon le meme pattern : `useETLPipelineLogic.ts` + sous-composants ETL, `useImportLogic.ts` + sous-composants Import.

### 2.6 [TECHNIQUE - MOYENNE] Pas de pipeline CI/CD

- Pas de `.github/workflows/`
- Deploiement uniquement manuel (`wrangler pages deploy dist`)

**Recommandation** : Ajouter un workflow GitHub Actions minimal : `tsc --noEmit` + `vitest run` + `eslint .` + build.

### 2.7 [TECHNIQUE - MOYENNE] Couverture de tests encore partielle

32 fichiers de tests couvrant la logique metier et les hooks. Lacunes restantes :
- Aucun test d'integration des pages (Dashboard, Import, ETLPipeline)
- 1 seul test composant UI (`Button.test.tsx`)
- Aucun test des 11 contextes/providers (DataContext, BatchContext, etc.)
- Aucun test du service O365
- Aucun test E2E (Playwright, Cypress)

**Recommandation** : Prioriser les tests d'integration des workflows critiques (import de donnees, creation de pivot, export) et les tests des contextes.

### 2.8 [TECHNIQUE - BASSE] 77 instructions `console.*` residuelles

77 `console.log/error/warn` dans le code de production. Bruit dans la console du navigateur.

**Recommandation** : Ajouter la regle ESLint `no-console: warn` et nettoyer progressivement.

### 2.9 [TECHNIQUE - BASSE] 2 usages de `Math.random()` dans le code applicatif

**Fichier** : `components/pivot/FormattingModal.tsx` (2 occurrences)

Les 29 autres occurrences sont dans `dataGeneration.ts` (donnees de demo) et les fichiers de test — acceptables. Seules les 2 dans `FormattingModal.tsx` devraient utiliser `crypto.randomUUID()`.

### 2.10 [FONCTIONNEL - BASSE] Internationalisation en dur

Toutes les chaines sont en francais codees en dur (`<html lang="fr">`). Non bloquant si le public est francophone, mais limitant pour une ouverture future.

### 2.11 [UX - BASSE] Accessibilite partielle

**Progres** : 32 attributs `aria-*`, 30 `role=`, 12 `onKeyDown`, 8 `sr-only`. Modal avec focus trap complet. Tabs avec navigation clavier.

**Manques** :
- Pas de `aria-live` pour les notifications dynamiques
- Pas de `skip-to-content` link
- Pas de `prefers-reduced-motion` (animations non desactivables)
- Drag-and-drop inaccessible au clavier

### 2.12 [UX - BASSE] Pas de Service Worker / PWA

L'application necessite un acces reseau pour charger les assets. Un Service Worker permettrait un fonctionnement hors-ligne complet.

---

## 3. Bilan des corrections effectuees

| # | Point initial | Priorite | Statut | Preuve |
|---|---------------|----------|--------|--------|
| 3.1 | CDN runtime + conflit React 18/19 | Critique | **TRAITE** | `index.html` : plus de CDN, `tailwind.config.js` + `postcss.config.js` + `index.css` |
| 3.2 | Absence de CSP | Critique | **TRAITE** | `index.html:7` : meta CSP presente (reste `unsafe-inline`, cf. 2.1) |
| 3.3 | Injection `Function()` dans ETL | Critique | **TRAITE** | `utils/transformations.ts` : 0 occurrence de `Function(` — parseur securise utilise |
| 4.1 | Fichiers > 1000 lignes | Haute | **PARTIEL** | 6 pages decomposees. Restent `ETLPipeline.tsx` (1 364 lignes) et `Import.tsx` (916 lignes) |
| 4.2 | Pas d'Error Boundaries | Haute | **TRAITE** | `ErrorBoundary.tsx`, wrappee dans `App.tsx:32` |
| 4.3 | Pas de code splitting | Haute | **TRAITE** | 11 `React.lazy()` dans `App.tsx:8-18` + `<Suspense>` |
| 4.4 | Validation companyLogo | Haute | **PARTIEL** | Validation en sortie (`exportUtils.ts:87`, `getSafeLogo`), mais pas a l'entree (`DataContext.tsx:857`) |
| 5.1 | ESLint / Prettier | Moyenne | **TRAITE** | `eslint.config.js` avec `typescript-eslint`, `react-hooks`, `no-explicit-any: warn` |
| 5.2 | Usages de `: any` | Moyenne | **AMELIORE** | 417 → 321 occurrences (-23%). 93 `as any` restants. ESLint en warning |
| 5.3 | Tests limites | Moyenne | **AMELIORE** | 16 → 32 fichiers de tests. +7 tests hooks, +12 tests logique metier. Lacunes : contextes, E2E |
| 5.4 | CI/CD | Moyenne | **NON TRAITE** | Pas de `.github/workflows/` |
| 5.5 | i18n en dur | Moyenne | **NON TRAITE** | Aucun framework i18n |
| 5.6 | Tokens MSAL localStorage | Moyenne | **TRAITE** | `o365Service.ts:46` : `BrowserCacheLocation.SessionStorage` |
| 6.1 | Service Worker / PWA | Basse | **NON TRAITE** | Aucune configuration PWA |
| 6.2 | `generateId` Math.random() | Basse | **TRAITE** | `utils/common.ts` : `crypto.randomUUID()` (2 residuels dans FormattingModal) |
| 6.3 | Accessibilite | Basse | **AMELIORE** | Focus trap Modal, navigation clavier Tabs, aria-label Button, 32 aria-*, mais manques restants |
| 6.4 | Imports statiques jsPDF | Basse | **TRAITE** | `exportUtils.ts` : imports dynamiques |
| 6.5 | Config Tailwind inline | Basse | **TRAITE** | `tailwind.config.js` + `index.css` avec `@layer base/components` |
| 6.6 | Modal sans focus trap | Basse | **TRAITE** | `Modal.tsx` : Tab wrapping, auto-focus, Escape, restoration focus |
| 6.7 | MultiSelect sans recherche | Basse | **TRAITE** | `MultiSelect.tsx` : recherche + virtualisation `useVirtualizer` |
| 6.8 | Onboarding non fonctionnel | Basse | **TRAITE** | `OnboardingTour.tsx` (187 lignes) : 5 etapes, spotlight, fonctionnel |

**Score : 13 traites, 3 ameliores, 2 partiels, 2 non traites**

**Progres depuis la V2** : Corrections majeures sur la securite (Function() + MSAL), la qualite (ESLint + reduction any), l'UX (focus trap, onboarding, multiselect) et les tests (x2). Le point critique `Function()` est resolu.

---

# Partie 2 - Recommandations fonctionnelles BI

## 4. Inventaire des fonctionnalites existantes

| Module | Maturite | Points cles |
|--------|----------|-------------|
| Pivot Table | Avancee | Multi-sources, drill-down, expand/collapse hierarchique, 6 agregations, comparaison temporelle MTD/YTD, conditional formatting, style rules, recherche optimisee, reset button |
| Dashboard | Avancee | 5 types widgets (KPI 3 styles, Chart 15 types, List, Text, Report), filtres globaux date, export multi-format, fullscreen |
| ETL Pipeline | Intermediaire | 14+ transformations (filter, join, aggregate, union, pivot, unpivot, split, merge, calculate, sort, distinct, select, rename), preview live |
| Budget | Tres avancee | Versions, workflow (draft/submitted/validated/rejected/locked), templates, 5 types formules, import Excel, axes analytiques, composants UI dedies |
| Forecast | Tres avancee | 6 methodes (manual, copy-actual, driver, ML, trend, seasonal), rolling forecast, reconciliation MAPE/RMSE, drivers metier, composants specialises |
| Import | Avancee | Excel/CSV/TSV/copier-coller, auto-detection encodage/separateur, mapping intelligent, conversion dates Excel OLE, apprentissage mappings |
| Export | Avancee | PDF (jsPDF dynamique), HTML interactif, PNG (html2canvas dynamique), CSV/Excel |
| Formules | Avancee | 30+ fonctions FR/EN, parseur securise, cache, 14 actions sequentielles, fonctions date (DATEPART, TODAY, YEAR, MONTH, DAY) |
| Analysis Studio | Avancee | Snapshot/Trend, regression lineaire, sauvegarde/chargement, palettes couleur, modes (single/gradient/multi), cumul, UI decomposee |
| Comparaison temporelle | Avancee | Multi-sources, MTD/YTD, delta valeur/pourcentage, single-pass optimise, cache dates 10K |
| Data Blending | Intermediaire | Inner/left/right/full joins, cle primaire+secondaire, indication source par couleur |
| Champs calcules | Intermediaire | Formule libre + builder par actions, 14 operations chaine, types sortie configurables, reference `[Champ]` |
| O365 | POC | Auth OAuth 2.0 + PKCE, backup OneDrive, partage liens |
| Settings | Tres avancee | 25+ parametres, referentiels finance (PCG/IFRS), calendriers fiscaux, donnees de reference, diagnostics, 9 palettes |

### Types de graphiques (15)

bar, column, line, area, pie, donut, radial, radar, treemap, sunburst, funnel, stacked-bar, stacked-column, stacked-area, percent-bar/percent-column

### Agregations

count, sum, avg, min, max, list (pivot) + first, last (ETL)

---

## 5. Fonctionnalites et ameliorations a apporter

### Priorite 1 - Fondamentaux manquants

#### P1.1 - Qualite et profilage des donnees
**Justification** : Un outil BI sans profilage oblige l'utilisateur a decouvrir les problemes de qualite apres coup, dans les graphiques ou pivots. C'est le fondement de toute analyse fiable.

- Profil automatique a l'import : completude par colonne (% nulls), distribution (min/max/moyenne/mediane/ecart-type), cardinalite, detection de patterns (email, telephone, code postal)
- Score de qualite par dataset (completude, coherence, unicite)
- Detection d'outliers (IQR ou Z-score) avec marquage visuel
- Detection de doublons configurable (exact ou fuzzy)
- Regles de validation personnalisables (min/max, regex, foreign keys entre datasets)

**Impact** : Tres eleve | **Effort** : Important

#### P1.2 - Undo/Redo global
**Justification** : L'absence d'annulation freine l'exploration. L'utilisateur hesite a experimenter (supprimer une colonne, modifier une formule) par peur de perdre son etat. Aucun outil BI professionnel ne fonctionne sans undo.

- Stack d'historique (20-50 actions) via Immer.js ou patches
- Raccourcis Ctrl+Z / Ctrl+Y
- Indicateur visuel du nombre d'actions annulables
- Couvrir : modifications de donnees, config pivot, widgets, formules

**Impact** : Tres eleve | **Effort** : Moyen

#### P1.3 - Remplacement des 54 `alert()` par un systeme de notifications
**Justification** : Les 54 `alert()` natifs bloquent le thread UI, ne respectent pas le design system et cassent l'experience utilisateur. C'est le quick win le plus impactant.

- Toasts (Sonner ou React Hot Toast) : succes, erreur, warning, info
- Notifications non-bloquantes pour les operations longues (import, export, calcul pivot)
- Confirmation modale stylisee au lieu de `window.confirm()`
- Progress bar pour les operations longues (import gros fichier, export PDF)

**Impact** : Eleve | **Effort** : Faible

#### P1.4 - Audit trail et historique des modifications
**Justification** : Pour un outil budget/forecast, la tracabilite est non-negociable. L'absence d'audit trail rend impossible de savoir quand une valeur budgetaire a ete modifiee.

- Journal des modifications (timestamp, action, valeur avant/apres)
- Historique consultable par dataset, budget, forecast
- Diff visuel entre deux etats
- Possibilite de restaurer un etat anterieur

**Impact** : Eleve | **Effort** : Moyen

---

### Priorite 2 - Enrichissement analytique

#### P2.1 - Scatter plot et graphiques statistiques
**Justification** : L'absence de scatter plot est un trou fonctionnel majeur. C'est le graphique de base pour la correlation, la segmentation, et l'analyse multi-variables.

- Scatter plot (2 axes numeriques + taille de bulle + couleur par categorie)
- Bubble chart (3 dimensions)
- Heatmap / matrice de correlation
- Box plot pour la distribution
- Histogramme (bins automatiques ou manuels)
- Waterfall chart (essentiel pour le module finance)

**Impact** : Eleve | **Effort** : Moyen

#### P2.2 - Drill-through du dashboard vers les donnees
**Justification** : Cliquer sur un KPI ou un segment de graphique pour voir les lignes sous-jacentes est la base de l'exploration BI. Le drill-down existe dans le pivot, mais le passage dashboard vers donnees detaillees est absent.

- Clic sur widget KPI => drawer avec les lignes correspondantes
- Clic sur segment de graphique => filtrage et affichage des lignes
- Navigation dashboard => DataExplorer avec filtres pre-appliques
- Breadcrumb de navigation pour revenir au dashboard

**Impact** : Eleve | **Effort** : Moyen

#### P2.3 - Agregations statistiques avancees
**Justification** : Les 6 agregations actuelles (count, sum, avg, min, max, list) couvrent les cas basiques mais pas l'analyse statistique.

- `MEDIAN()`, `PERCENTILE(N)`, `STDDEV()`, `VARIANCE()`
- `COUNTDISTINCT()`, `FIRSTNONBLANK()`, `LASTNONBLANK()`
- Fonctions temporelles DAX-like : `PREVIOUSYEAR()`, `SAMEPERIOD()`, `YTD()`, `QTD()`

**Impact** : Moyen | **Effort** : Moyen

#### P2.4 - Data lineage
**Justification** : Avec les pipelines ETL, jointures, champs calcules et datasets derives, il devient impossible de savoir d'ou vient une donnee.

- Graphe visuel source => transformation => dataset derive => widget
- Clic sur un champ => provenance (source brute, formule, jointure)
- Impact analysis : modifier ce dataset source => quels widgets/budgets affectes ?

**Impact** : Moyen | **Effort** : Important

---

### Priorite 3 - Confort et productivite

#### P3.1 - Command palette (Ctrl+K)
Recherche globale : pages, datasets, analyses sauvegardees, actions rapides. Avec 11 pages et potentiellement des dizaines de datasets, la navigation par sidebar seule est lente.

**Impact** : Moyen | **Effort** : Faible

#### P3.2 - Commentaires et annotations sur les graphiques
Meme en usage individuel, annoter un graphique ("pic du a la campagne Q2") ou un KPI permet de conserver le contexte metier. Annotations positionnees, commentaires par widget, export avec annotations.

**Impact** : Moyen | **Effort** : Moyen

#### P3.3 - Templates de dashboards et d'analyses
Galerie de templates par domaine metier (finance, ventes, RH). Import/export de templates. Templates adaptatifs (detection des champs disponibles).

**Impact** : Moyen | **Effort** : Moyen

#### P3.4 - Export et partage enrichis
Export PDF avec page de garde configurable, pied de page, numerotation. Export PowerPoint. Export planifie. Embed iframe pour integration intranet.

**Impact** : Moyen | **Effort** : Important

---

### Priorite 4 - Intelligence et automatisation

#### P4.1 - Suggestions intelligentes de graphiques
Analyser les donnees (nombre de dimensions/mesures, cardinalite) pour recommander le type de visualisation optimal avec un score de pertinence. Le systeme de detection automatique existe (`pivotToChart.ts`) mais n'est pas expose en tant que suggestion utilisateur.

**Impact** : Faible | **Effort** : Moyen

#### P4.2 - ML avance pour le forecasting
Prophet-like decomposition (trend + saisonnalite + jours feries), EMA/WMA, detection automatique de periodicite, cross-validation temporelle, intervalles de confiance. Le framework est en place (`ForecastMethod`, `MLPredictions`) mais l'implementation ML est basique.

**Impact** : Faible | **Effort** : Important

---

### Matrice de priorisation fonctionnelle

| # | Fonctionnalite | Impact | Effort | ROI |
|---|----------------|--------|--------|-----|
| P1.3 | Toasts / Notifications (54 alert) | Eleve | Faible | **Tres eleve** |
| P1.2 | Undo/Redo | Tres eleve | Moyen | **Tres eleve** |
| P3.1 | Command palette (Ctrl+K) | Moyen | Faible | **Eleve** |
| P1.1 | Profilage donnees | Tres eleve | Important | Eleve |
| P1.4 | Audit trail | Eleve | Moyen | Eleve |
| P2.1 | Scatter/Heatmap/Waterfall | Eleve | Moyen | Eleve |
| P2.2 | Drill-through dashboard | Eleve | Moyen | Eleve |
| P2.3 | Agregations statistiques | Moyen | Moyen | Moyen |
| P3.2 | Annotations graphiques | Moyen | Moyen | Moyen |
| P3.3 | Templates dashboards | Moyen | Moyen | Moyen |
| P2.4 | Data lineage | Moyen | Important | Moyen |
| P3.4 | Export enrichi (PPT, planifie) | Moyen | Important | Moyen |
| P4.1 | Suggestions graphiques | Faible | Moyen | Faible |
| P4.2 | ML avance forecasting | Faible | Important | Faible |

---

# Partie 3 - Analyse UX / Design

## 6. Design system

### Points positifs

**Architecture de tokens solide** (`index.css`, `tailwind.config.js`)
- 9 palettes couleur semantiquement nommees (`--brand-50` a `--brand-900`)
- Tokens de surface, texte et statut bien structures (canvas, surface, txt-main, txt-secondary, txt-muted)
- 3 styles visuels (Default, Material, Glass avec backdrop-filter)
- Configuration Tailwind externalisee avec `darkMode: 'class'` et tokens d'espacement `ds-*`
- Variables CSS dans `@layer base` + styles composants dans `@layer components`

**Composants UI matures** (11 composants dans `components/ui/`)
- `Button.tsx` : 5 variants + 4 tailles + loading + icon + `aria-label` + `aria-busy`
- `Modal.tsx` : Focus trap complet (Tab wrapping Shift+Tab), auto-focus premier element, restoration du focus, Escape, `role="dialog"`, `aria-modal`, `aria-labelledby`
- `Tabs.tsx` : Navigation clavier (ArrowLeft/Right, Home/End), `role="tablist"`, `aria-selected`
- `MultiSelect.tsx` : Virtualisation (`useVirtualizer`), recherche textuelle, select/deselect all
- `Typography.tsx` : Composants semantiques (Heading, Text, Paragraph, Label)
- `Badge.tsx` : 6 variants coherents avec les status colors

### Axes d'amelioration

- **Pas de `prefers-reduced-motion`** : les animations (blobs glass, transitions) ne sont pas desactivables
- **Quelques couleurs Tailwind hardcodees** (`bg-slate-100`, `text-gray-600`) au lieu des tokens CSS dans certains composants, cassant le dark mode par endroits
- **Pas de composant Tooltip** reutilisable (tooltips implementes inline)
- **Pas de composant Input/Select** standardise dans `ui/` — les inputs sont codes inline dans chaque page

---

## 7. Layout et navigation

### Points positifs (`Layout.tsx`)

- Navigation claire en 11 sections avec icones Lucide coherentes
- Sidebar collapsible (256px → 64px) avec transition fluide (300ms)
- Indicateur de stockage en temps reel avec code couleur (vert < 70%, orange < 90%, rouge > 90%)
- IDs d'onboarding tour sur chaque element de navigation
- Sauvegarde rapide integree dans le footer de la sidebar
- HashRouter pour compatibilite Cloudflare Pages

### Axes d'amelioration

- **Pas de breadcrumb** : impossible de situer la page courante dans la hierarchie
- **Pas de recherche globale** : navigation exclusivement par menu
- **Mobile confus** : sidebar 11 items en mode horizontal, trop encombre ; une bottom navigation a 4-5 items + "Plus" serait preferable
- **Pas de notification de limite disque** proactive a l'approche de la saturation

---

## 8. Analyse detaillee par page

### 8.1 Dashboard

**Points positifs** : Grille responsive (4/2/1 colonnes), mode edition, empty state engageant ("Creer mon premier widget"), fullscreen par widget, filtres globaux date, drag & drop pour reordonnancement.

**Axes d'amelioration** :
- Pas de groupes/sections thematiques pour organiser les widgets
- Pas de refresh automatique des donnees
- Pas d'URL partageable pour un etat specifique du dashboard
- Pas de drill-through vers les donnees detaillees

### 8.2 Import

**Points positifs** : Workflow multi-etapes (Input => Mapping => Confirm), drag & drop avec feedback visuel, selecteur d'encodage, auto-mapping intelligent, apprentissage des mappings, support dates Excel OLE.

**Axes d'amelioration** :
- Page monolithique (916 lignes, 11+ useState) — a decomposer
- Validation tardive (erreurs a la confirmation, apres le mapping)
- Pas de preview avant/apres pour les transformations de nettoyage
- Pas de detection de doublons a l'import
- Pas de barre de progression pour les gros fichiers

### 8.3 Pivot Table

**Points positifs** : Drag & drop entre 4 zones (lignes, colonnes, valeurs, filtres), virtualisation `useVirtualizer`, comparaison temporelle MTD/YTD, conditional formatting, style rules, 15 types de graphiques, export multi-format, expand/collapse hierarchique, recherche optimisee, bouton reset. Architecture exemplaire : page ~200 lignes, logique dans `usePivotLogic.ts` (988 lignes).

**Axes d'amelioration** :
- Pas de feedback visuel pendant le drag (zones de depot non mises en surbrillance)
- Pas de mode "calcul differe" (chaque changement recalcule immediatement)
- D&D inaccessible au clavier

### 8.4 Data Explorer

**Points positifs** : Colonnes redimensionnables (corrige), edition inline, filtrage par colonne (regex ou exact), VLOOKUP entre datasets, champs calcules, conditional formatting. Decompose en 5 sous-composants (Header, Toolbar, Grid, Drawers, Modals) avec 0 useState dans la page.

**Axes d'amelioration** :
- Pas de reordonnancement de colonnes par drag
- Pas de grouping avec sous-totaux
- Pas d'export de la vue filtree seule
- VLOOKUP : UX confuse avec drawers imbriques

### 8.5 Analysis Studio

**Points positifs** : Basculement Snapshot/Trend fluide, 3 modes de couleur (Multi, Single, Gradient), 3 palettes (default, pastel, vibrant), sauvegarde/chargement d'analyses, cumul, unite personnalisable. Decompose en 4 sous-composants avec hook dedie.

**Axes d'amelioration** :
- Forecast prevu dans le code (`showForecast`) mais non implemente
- Pas de scatter plot
- Pas de query builder visuel pour les filtres

### 8.6 Budget

**Points positifs** : 6 onglets organises (liste, editeur, comparaison, workflow, templates, referentiels), edition inline, workflow de validation, import/export Excel, axes analytiques. Decompose en 9 sous-composants avec hook `useBudgetLogic`.

**Axes d'amelioration** :
- Pas de formules dans les cellules (saisie manuelle uniquement)
- Workflow sans representation graphique (flux gere dans le code mais non visualise)
- Pas d'audit trail des modifications budgetaires
- Pas d'export PDF

### 8.7 Forecast

**Points positifs** : 6 methodes de prevision, rolling forecast, reconciliation avec MAPE/RMSE, drivers metier. Decompose en 7 sous-composants specialises (Editor, List, Drivers, Reconciliation, MLPredictions, RollingForecast, Header).

**Axes d'amelioration** :
- ML basique (tendance lineaire et saisonnalite simple)
- Pas de graphique de reconciliation
- Pas de waterfall chart pour les ecarts budget/realise

### 8.8 ETL Pipeline

**Points positifs** : 14+ transformations, preview a chaque etape.

**Axes d'amelioration** :
- **Page monolithique** (1 364 lignes — plus gros fichier du projet), a decomposer en urgence
- Editeur visuel basique (pas de zoom, pas de minimap pour les pipelines complexes)
- Execution manuelle uniquement
- 19 occurrences de `: any`

### 8.9 Settings

**Points positifs** : Organisation par sections, referentiels financiers complets (PCG/IFRS, axes analytiques, calendriers fiscaux, donnees de reference), diagnostics integres, backup/restore avec selection partielle. Decompose en 6 sous-composants avec hook `useSettingsLogic`.

**Axes d'amelioration** :
- Restore sans validation complete du backup (companyLogo non valide)
- Diagnostics sans action corrective proposee

### 8.10 Help

**Points positifs** : Page informative statique, accessible par la navigation.

**Axes d'amelioration** :
- Contenu d'aide basique
- Pas d'aide contextuelle (tooltips sur les pages metier)
- Pas de recherche dans l'aide

### 8.11 Customization

**Points positifs** : Page dediee a la personnalisation (logo, branding).

**Axes d'amelioration** :
- Validation du logo uniquement par taille (1 Mo max), pas par type MIME
- 5 `as any` dans le code

---

## 9. Patterns UX transversaux

| Pattern | Implementation actuelle | Qualite |
|---------|------------------------|---------|
| Loading | `<Loader2 className="animate-spin" />` + page de chargement Suspense | Correcte |
| Succes | Messages texte ephemeres + 54 `alert()` natifs | **Insuffisant** |
| Erreur | `alert()` natif dans export et hooks | **Insuffisant** |
| Confirmation | `alert()` pour validation, pas de modale de confirmation | **Insuffisant** |
| Progression | Absente pour les operations longues | Manquant |
| Undo | Absent | Manquant |
| Crash recovery | ErrorBoundary avec "Reessayer" + "Accueil" | Bonne |
| Empty states | Centralises avec composant dedie, icons et CTA | **Bonne** |

### Onboarding
- **OnboardingTour fonctionnel** (187 lignes) : 5 etapes, spotlight avec cutout, positionnement intelligent
- Memorisation via `hasSeenOnboarding` dans DataContext
- Boutons "Suivant" et "Passer le tour", compteur d'etapes

### Raccourcis clavier
- Escape pour fermer les modales
- ArrowLeft/Right pour la navigation dans les tabs
- Tab/Shift+Tab avec focus trap dans les modales
- **Manquants** : Ctrl+S (sauvegarder), Ctrl+Z (undo), Ctrl+K (recherche), Ctrl+E (export)

---

## 10. Scoring et recommandations UX

| Categorie | Score | Justification |
|-----------|-------|---------------|
| Coherence visuelle | 8/10 | Design system solide, 9 palettes, tokens bien structures, 3 styles visuels |
| Composants reutilisables | **8/10** | 11 composants UI, focus trap Modal, virtualisation MultiSelect, Typography (+1 vs V2) |
| Architecture front | **8.5/10** | Code splitting, Error Boundary, 6/8 pages decomposees, hooks logiques, ESLint (+0.5 vs V2) |
| Accessibilite | **6/10** | Focus trap Modal, navigation clavier Tabs, ARIA sur les composants cles, 32 aria-* (+1 vs V2) |
| Performance percue | **7.5/10** | Virtualisation, lazy loading, hot-path pivot optimise, manual chunks Vite (+0.5 vs V2) |
| Responsive mobile | 5/10 | Layout adaptatif mais sidebar 11 items en bottom bar |
| Feedback utilisateur | 4/10 | 54 `alert()` natifs, pas de toasts, pas d'undo, pas de progress |
| Decouverte | **6/10** | OnboardingTour fonctionnel 5 etapes, IDs tour, mais pas d'aide contextuelle (+2 vs V2) |
| **Moyenne** | **6.6/10** | Progression de 6.0 → 6.6 grace a la securite, ESLint, Modal, Onboarding, tests x2 |

### Recommandations UX par impact

**Tier 1 - Impact eleve, effort modere**
1. Remplacer les 54 `alert()` par des toasts (Sonner) - 13 fichiers concernes
2. Bottom navigation mobile : 5 items + menu "Plus"
3. `prefers-reduced-motion` : desactiver les animations
4. Decomposer ETLPipeline.tsx (1 364 lignes) et Import.tsx (916 lignes)

**Tier 2 - Impact modere**
5. Breadcrumb de navigation contextuel
6. Undo/Redo (Ctrl+Z / Ctrl+Y) avec indicateur visuel
7. Feedback D&D dans le pivot : zones de depot en surbrillance
8. Progress bar pour operations longues (import, export, calcul)
9. Dark mode complet : remplacer les classes Tailwind hardcodees par tokens CSS
10. Composants Input/Select standardises dans `components/ui/`

**Tier 3 - Nice to have**
11. Command palette (Ctrl+K)
12. Raccourcis clavier documentes
13. Aide contextuelle (icones info avec tooltips)
14. Skeleton loaders au lieu de spinners

---

## Conclusion

DataScope a connu une progression significative depuis les audits precedents. Les corrections apportees couvrent les problemes les plus critiques :

**Progres majeurs depuis la V2** :
- Le point **critique** `new Function()` dans l'ETL est **resolu** — plus aucune injection de code possible
- La **securite MSAL** est corrigee (SessionStorage)
- **ESLint** est configure avec `no-explicit-any: warn` — la qualite est desormais outillee
- Les `: any` ont ete reduits de 23% (417 → 321)
- Les **tests ont double** (16 → 32 fichiers)
- Le **focus trap Modal** est implementee (conformite WCAG 2.1 AA)
- L'**OnboardingTour** est fonctionnel (5 etapes avec spotlight)
- Le **MultiSelect** a la virtualisation et la recherche
- Le **design system** est enrichi (Typography, Form, Card, etc.)

**Les 3 chantiers les plus impactants restants** :

1. **Feedback UX** (Haute) : Remplacer les 54 `alert()` par des toasts. C'est le quick win le plus impactant — effort faible, 13 fichiers a modifier, transformation immediate de l'experience utilisateur.

2. **Decomposition ETL + Import** (Haute) : `ETLPipeline.tsx` (1 364 lignes) est le plus gros fichier du projet et `Import.tsx` (916 lignes) a 11+ useState. Appliquer le meme pattern hook+sous-composants que les 6 autres pages.

3. **Qualite TypeScript** (Moyenne) : Continuer la reduction des 321 `: any` + 93 `as any`. Prioriser `ETLPipeline.tsx` (19), les composants chart (27) et `WidgetDisplay` (13). Ajouter la CI/CD pour prevenir les regressions.
