# Rapport d'Audit - DataScope Dashboard

**Application** : DataScope - Tableau de Bord d'Analyse de Données
**Version auditée** : 2026-02-04-03
**Date de l'audit** : 2026-02-06
**Stack** : React 18 / TypeScript 5 / Vite 5 / IndexedDB / Cloudflare Pages
**Volume de code** : ~35 700 lignes TypeScript, 12 pages, 36 composants, 11 contextes

---

## Table des matières

1. [Synthese executive](#1-synthese-executive)
2. [Points forts](#2-points-forts)
3. [Axes d'amelioration - Priorite critique](#3-priorite-critique)
4. [Axes d'amelioration - Priorite haute](#4-priorite-haute)
5. [Axes d'amelioration - Priorite moyenne](#5-priorite-moyenne)
6. [Axes d'amelioration - Priorite basse](#6-priorite-basse)
7. [Matrice recapitulative](#7-matrice-recapitulative)

---

## 1. Synthese executive

DataScope est une application SPA d'analyse de donnees locale, bien concue dans son architecture generale. L'approche "local-first" est coherente et bien implementee : les donnees restent dans le navigateur (IndexedDB), aucune telemetrie n'est envoyee, et l'integration O365 est optionnelle et explicitement declenchee par l'utilisateur.

Les principales forces de l'application sont sa richesse fonctionnelle (pivot, budget, ETL, dashboard, forecasting), son typage TypeScript strict, et son design system bien structure avec support multi-themes.

Les points d'attention principaux concernent la dependance a des CDN externes en runtime (Tailwind, esm.sh), l'absence de Content Security Policy, la taille excessive de certains fichiers (6 fichiers > 1000 lignes), et l'absence d'Error Boundaries React.

---

## 2. Points forts

### 2.1 Architecture local-first coherente (Fonctionnel)

- Toutes les donnees sont traitees et stockees localement dans IndexedDB (`utils.ts:79-203`)
- Aucune telemetrie, aucun tracking, aucun appel reseau non sollicite
- Migration automatique de localStorage vers IndexedDB avec nettoyage (`DataContext.tsx:91-111`)
- Compression intelligente des batches en format colonnaire pour economiser l'espace (`utils.ts:17-54`)
- L'integration O365 (OneDrive) est strictement optionnelle, initiee par l'utilisateur, et authentifiee via OAuth 2.0 + PKCE

### 2.2 Moteur de formules securise (Technique / Securite)

- Le parseur de formules (`utils.ts:1402-1764`) est un tokenizer/evaluateur custom
- **Aucun usage de `eval()`, `Function()`, ou `new Function()`** dans tout le codebase
- **Aucun usage de `dangerouslySetInnerHTML`**
- Whitelist de fonctions supportees (IF, SUM, AVERAGE, CONCAT, etc.)
- Gestion d'erreurs gracieuse avec retour `null` en cas d'erreur de syntaxe

### 2.3 Typage TypeScript robuste (Technique)

- Mode `strict: true` active dans tsconfig
- 8 fichiers de types bien organises par domaine (`types/common.ts`, `dataset.ts`, `dashboard.ts`, `pivot.ts`, `finance.ts`, `etl.ts`, `app.ts`, `o365.ts`)
- Types unions discrimines pour les variants (`WidgetType`, `ChartType`, `ViewMode`)
- Interfaces explicites pour les props des composants
- Seulement 2 usages de `useState<any>` dans tout le projet (`DataContext.tsx:46`, `DataExplorer.tsx:55`)

### 2.4 Design system structure et themable (Technique / UX)

- Tokens CSS complets definis via variables CSS dans `index.html:86-268`
- 9 palettes de couleurs (blue, indigo, emerald, rose, amber, slate, teal, violet, orange)
- Support mode sombre (dark mode)
- 3 styles visuels (defaut, material, glass avec backdrop-filter)
- Taille de police configurable via `--app-font-size`
- Composants UI reutilisables (`Button`, `Modal`, `Card`, `Tabs`, `Badge`, `Form`)

### 2.5 Performances correctes (Technique)

- Virtualisation des tableaux pivot via `@tanstack/react-virtual` (`PivotGrid.tsx`)
- Memoisation extensive : `useMemo` dans ChartModal (10+ usages), `React.memo` sur WidgetCard
- `useCallback` dans 7 fichiers (64 occurrences totales)
- Import dynamique pour les librairies lourdes : `import('jspdf')`, `import('../services/o365Service')`
- Debounce des calculs pivot (150ms) et sauvegarde IndexedDB differee

### 2.6 Accessibilite de base implementee (UX)

- `aria-busy`, `aria-label` sur Button (`components/ui/Button.tsx`)
- `role="dialog"`, `aria-modal="true"`, `aria-labelledby` sur Modal (`components/ui/Modal.tsx`)
- `role="tablist"`, `aria-selected`, `aria-controls` sur Tabs (`components/ui/Tabs.tsx`)
- Gestion du clavier (Escape pour fermer les modales)
- `focus-visible:ring-2` pour la navigation clavier

### 2.7 Richesse fonctionnelle (Fonctionnel)

- Import multi-format (CSV, Excel) avec detection automatique d'encodage et de separateur
- Tableaux croises dynamiques avec drill-down et comparaison temporelle
- Dashboard personnalisable avec widgets configurables et drag-and-drop
- Module budget avec versioning, workflow de validation et templates
- Pipeline ETL avec blending/jointures et validation
- Export multi-format (Excel, PDF, CSV, image)
- Sauvegarde/restauration complete de l'etat applicatif

---

## 3. Priorite critique

### 3.1 [SECURITE] Dependances CDN en runtime sans protection

**Fichier** : `index.html:16, 269-290`

L'application charge Tailwind CSS et toutes ses dependances JavaScript depuis des CDN externes en runtime :

```html
<script src="https://cdn.tailwindcss.com"></script>
```

```json
"react": "https://esm.sh/react@18.2.0",
"recharts": "https://esm.sh/recharts@2.12.2",
...
```

**Risques** :
- Si `cdn.tailwindcss.com` ou `esm.sh` sont compromis, du code malveillant peut etre injecte
- Aucun hash SRI (Subresource Integrity) n'est present
- L'application ne fonctionne pas hors-ligne sans ces CDN
- La version CDN de Tailwind n'est pas recommandee pour la production (performances, cache)

**Conflit de versions React** : L'import map reference React 18.2.0 pour les imports principaux, mais les lignes 286-287 pointent vers React 19.2.3 pour les sous-chemins (`react/`, `react-dom/`). Cela peut provoquer des bugs subtils lies a deux instances React coexistant dans le bundle.

**Recommandation** : Passer a un build Vite complet qui bundle toutes les dependances. Tailwind doit etre installe via PostCSS (`@tailwindcss/postcss` ou `tailwindcss` en devDependency). Les import maps doivent etre supprimes au profit du bundling Vite standard. Cela corrige simultanement la securite, les performances et le fonctionnement hors-ligne.

### 3.2 [SECURITE] Absence de Content Security Policy (CSP)

Aucune en-tete CSP ni meta-tag CSP n'est presente. Combinee avec les CDN externes et les scripts inline dans `index.html`, l'application est vulnerable a l'injection de scripts.

**Recommandation** : Ajouter une CSP stricte, soit via meta-tag dans `index.html`, soit via les headers Cloudflare (`_headers` file). Apres migration vers un build complet (point 3.1), la CSP peut etre tres restrictive :

```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self' https://graph.microsoft.com https://login.microsoftonline.com
```

---

## 4. Priorite haute

### 4.1 [TECHNIQUE] Fichiers mono-blocs excessivement volumineux

6 fichiers depassent 1000 lignes, certains largement :

| Fichier | Lignes | Responsabilites melangees |
|---------|--------|--------------------------|
| `pages/Budget.tsx` | 2 296 | UI + logique metier + formulaires + import/export |
| `utils.ts` | 2 037 | IndexedDB + formules + export PDF + parsing CSV + regression + diagnostics |
| `pages/AnalysisStudio.tsx` | 1 872 | Analyses + graphiques + export |
| `pages/DataExplorer.tsx` | 1 574 | Exploration + filtrage + blending |
| `pages/Settings.tsx` | 1 464 | Preferences + O365 + backup + referentiels |
| `pages/PivotTable.tsx` | 992 | Pivot + modales + configuration |

**Impact** :
- Difficulte de maintenance et de comprehension
- `PivotTable.tsx` declare 30+ `useState` dans un seul composant
- Violation du principe de responsabilite unique
- Re-rendus potentiellement excessifs (tout le state dans un composant)

**Recommandation** :
- Decomposer `utils.ts` en modules : `db.ts`, `formulaEngine.ts`, `csvParser.ts`, `exportUtils.ts`, `mathUtils.ts`
- Extraire la logique metier des pages en hooks customs (`useBudgetEditor`, `usePivotConfig`, etc.)
- Grouper les useState lies dans des `useReducer` (ex: les 30+ states de PivotTable)
- Decomposer les grandes pages en sous-composants (ex: `BudgetEditor`, `BudgetComparison`, `BudgetWorkflow`)

### 4.2 [TECHNIQUE] Absence d'Error Boundaries React

Aucun Error Boundary n'est implemente (le terme n'apparait que dans `MAINTENANCE.md` comme suggestion). Si un composant plante (erreur JavaScript), l'application entiere affiche un ecran blanc sans possibilite de recuperation.

**Impact** : Une erreur dans le rendu d'un graphique D3, d'un calcul pivot, ou d'un widget fait perdre l'acces a toute l'application. L'utilisateur doit rafraichir la page et peut perdre un etat non sauvegarde.

**Recommandation** : Ajouter des Error Boundaries autour :
- De chaque route/page (via un wrapper dans `App.tsx`)
- Des composants de graphiques (`WidgetDisplay`, `SunburstD3`, `ChartModal`)
- Du moteur pivot (`PivotGrid`)

### 4.3 [TECHNIQUE] Absence de code splitting au niveau des routes

Aucun `React.lazy()` ni `Suspense` n'est utilise. Les 12 pages et leurs 36 composants sont charges dans un seul bundle. Pour une application de cette taille (~35K lignes), cela impacte le temps de chargement initial.

**Recommandation** : Utiliser `React.lazy()` pour chaque route dans `App.tsx` :

```tsx
const Budget = React.lazy(() => import('./pages/Budget'));
const PivotTable = React.lazy(() => import('./pages/PivotTable'));
// etc.
```

Le code splitting de Vite (`vite.config.ts`) ne decoupe actuellement que les vendors (react, recharts, xlsx), pas les pages applicatives.

### 4.4 [SECURITE] Validation insuffisante des URLs d'images

Le champ `companyLogo` (`DataContext.tsx:40`) est un string stocke en IndexedDB sans validation. Il est utilise dans des templates HTML d'export (`<img src="${companyLogo}">`) sans verification du protocole.

**Risque** : Un logo malicieux (protocol `javascript:`, `data:text/html`, etc.) injecte via restauration de backup pourrait executer du code dans le contexte d'export.

**Recommandation** : Valider que `companyLogo` commence par `data:image/` ou `blob:` et rejeter tout autre protocole.

---

## 5. Priorite moyenne

### 5.1 [TECHNIQUE] Absence d'outillage qualite (ESLint, Prettier)

Aucune configuration ESLint, Prettier, ou StyleLint n'est presente. La coherence du code repose entierement sur la discipline des developpeurs.

**Impact** : Inconsistances de style, imports inutilises non detectes, patterns dangereux non detectes automatiquement (ex: usage de `any`).

**Recommandation** : Ajouter ESLint avec `@typescript-eslint` + `eslint-plugin-react-hooks` + `eslint-plugin-react-refresh`, et Prettier pour le formatage. Ajouter un script `lint` dans `package.json`.

### 5.2 [TECHNIQUE] 92 occurrences de `: any` dans le code

Le typage `any` est utilise dans 20 fichiers (92 occurrences). La majorite se concentre dans :
- `utils.ts` : 27 occurrences
- `hooks/useWidgetData.ts` : 14 occurrences
- `context/DataContext.tsx` : 9 occurrences
- `pages/DataExplorer.tsx` : 9 occurrences

**Impact** : Perte de la securite de typage, bugs potentiels non detectes a la compilation.

**Recommandation** : Remplacer progressivement les `any` par des types explicites ou `unknown` avec type guards. Activer la regle ESLint `@typescript-eslint/no-explicit-any` en warning puis en error.

### 5.3 [TECHNIQUE] Couverture de tests limitee

13 fichiers de tests existent, couvrant principalement la logique metier :
- Moteur pivot (`pivotEngine.test.ts`)
- Transformations ETL (`transformations.test.ts`)
- Formules calculees (`calculatedFieldActions.test.ts`)
- Utilitaires (`utils.test.ts`)

**Manques identifies** :
- Aucun test d'integration des pages (Budget, PivotTable, Dashboard)
- Un seul test de composant UI (`Button.test.tsx`)
- Aucun test des 11 contextes/providers
- Aucun test du service O365
- Aucun test end-to-end (Playwright, Cypress)

**Recommandation** : Prioriser les tests d'integration des workflows critiques (import de donnees, creation de pivot, export), et les tests des contextes (logique de persistence IndexedDB, migration localStorage).

### 5.4 [TECHNIQUE] Absence de CI/CD

Aucun pipeline CI/CD n'est configure (pas de `.github/workflows/`, pas de Cloudflare Pages CI). Le deploiement est uniquement manuel via `wrangler pages deploy dist`.

**Impact** : Pas de verification automatique (types, tests, lint) avant deploiement. Risque de regression en production.

**Recommandation** : Ajouter un workflow GitHub Actions minimal :
- `tsc --noEmit` (verification des types)
- `vitest run` (tests)
- `eslint .` (qualite de code)
- Build + deploiement automatique sur push sur la branche de production

### 5.5 [FONCTIONNEL] Internationalisation en dur

L'application est entierement en francais avec des chaines codees en dur dans les composants :

```tsx
// Settings.tsx
"Effacer la recherche"
"Sauvegarde le :"
"Vos informations sont stockees dans la memoire locale"
```

**Impact** : Impossible d'ajouter d'autres langues sans recrire les composants. Non bloquant si le public cible est exclusivement francophone, mais limitant pour une eventuelle ouverture.

**Recommandation** : Si le multilinguisme est envisage a terme, introduire `react-i18next` et extraire les chaines dans des fichiers JSON. Sinon, ce point peut rester en basse priorite.

### 5.6 [SECURITE] Tokens MSAL stockes dans localStorage

La configuration MSAL (`services/o365Service.ts:46`) utilise `cacheLocation: BrowserCacheLocation.LocalStorage`. Le localStorage est accessible a tout script JavaScript executant dans l'origine.

**Impact** : En l'absence de CSP (cf. 3.2), un script injecte pourrait voler les tokens OAuth. Le risque est attenue par le fait qu'il n'y a pas de XSS identifie et pas de contenu tiers injecte.

**Recommandation** : Apres mise en place de la CSP, migrer vers `BrowserCacheLocation.SessionStorage` pour limiter la persistance des tokens. Ou mieux, utiliser `BrowserCacheLocation.MemoryStorage` si la persistance de session n'est pas critique.

---

## 6. Priorite basse

### 6.1 [UX] Pas de support hors-ligne (Service Worker)

L'application n'a pas de Service Worker. Les donnees sont locales mais l'application elle-meme necessite un acces reseau pour charger les assets (surtout en configuration CDN actuelle).

**Recommandation** : Apres migration vers un build complet (point 3.1), ajouter un Service Worker avec strategie cache-first via `vite-plugin-pwa`.

### 6.2 [TECHNIQUE] Generation d'identifiants avec Math.random()

```typescript
// utils.ts:10-12
export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};
```

`Math.random()` n'est pas cryptographiquement securise. Pour une application locale sans composant collaboratif, le risque de collision est faible mais non nul pour de grands volumes.

**Recommandation** : Remplacer par `crypto.randomUUID()` (supporte nativement dans les navigateurs modernes) pour garantir l'unicite.

### 6.3 [UX] Accessibilite incomplete

L'a11y est bien implementee sur les composants UI de base, mais des lacunes existent :
- Pas de `skip-to-content` link
- Contrastes non verifies systematiquement (certains `txt-muted` sur fond clair)
- Pas de `aria-live` pour les notifications/toasts
- Le drag-and-drop des widgets n'a pas d'alternative clavier

**Recommandation** : Realiser un audit WCAG 2.1 AA sur les parcours critiques.

### 6.4 [TECHNIQUE] Imports statiques de librairies lourdes

`utils.ts:3-5` importe `jsPDF` et `html2canvas` au top-level, ce qui les inclut dans le bundle principal meme si l'export PDF n'est pas utilise :

```typescript
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
```

Certains composants font deja du lazy import (`ChartModal.tsx` : `await import('jspdf')`), mais le top-level import dans `utils.ts` annule ce benefice.

**Recommandation** : Supprimer les imports statiques de `jspdf` et `html2canvas` dans `utils.ts` et utiliser exclusivement des imports dynamiques.

### 6.5 [TECHNIQUE] Design system Tailwind inline dans index.html

La configuration Tailwind (tokens, theme) est definie en inline dans `index.html` (~250 lignes de CSS + JS). C'est fonctionnel mais peu maintenable.

**Recommandation** : Lors de la migration vers Tailwind en build-time (point 3.1), extraire la configuration dans `tailwind.config.ts` et les styles dans un fichier CSS dedie.

---

## 7. Matrice recapitulative

| # | Axe | Categorie | Priorite | Effort estime |
|---|-----|-----------|----------|---------------|
| 3.1 | CDN runtime sans SRI + conflit React 18/19 | Securite / Technique | Critique | Important |
| 3.2 | Absence de CSP | Securite | Critique | Faible |
| 4.1 | Fichiers > 1000 lignes (6 fichiers) | Technique | Haute | Important |
| 4.2 | Absence d'Error Boundaries | Technique | Haute | Faible |
| 4.3 | Pas de code splitting des routes | Technique | Haute | Faible |
| 4.4 | Validation URLs d'images manquante | Securite | Haute | Faible |
| 5.1 | Pas d'ESLint / Prettier | Technique | Moyenne | Moyen |
| 5.2 | 92 usages de `any` | Technique | Moyenne | Moyen |
| 5.3 | Couverture de tests limitee | Technique | Moyenne | Important |
| 5.4 | Absence de CI/CD | Technique | Moyenne | Moyen |
| 5.5 | i18n en dur (francais seulement) | Fonctionnel | Moyenne | Important |
| 5.6 | Tokens MSAL en localStorage | Securite | Moyenne | Faible |
| 6.1 | Pas de Service Worker | UX | Basse | Moyen |
| 6.2 | generateId avec Math.random() | Technique | Basse | Faible |
| 6.3 | Accessibilite incomplete | UX | Basse | Moyen |
| 6.4 | Imports statiques jsPDF/html2canvas | Technique | Basse | Faible |
| 6.5 | Config Tailwind inline dans HTML | Technique | Basse | Moyen |

---

**Legende effort** : Faible = quelques heures | Moyen = quelques jours | Important = une semaine ou plus
