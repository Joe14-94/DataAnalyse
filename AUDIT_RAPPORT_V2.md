# Rapport d'Audit V2 - DataScope Dashboard

**Application** : DataScope - Plateforme BI & Analyse de Donnees
**Version auditee** : 2026-02-04-03
**Date** : 2026-02-06
**Stack** : React 18 / TypeScript 5 / Vite 5 / IndexedDB / Cloudflare Pages
**Volume** : ~35 700 lignes TypeScript, 12 pages, 36 composants, 11 contextes, 8 modules logiques

---

## Table des matieres

- [Partie 1 - Suivi de l'audit precedent](#partie-1---suivi-de-laudit-precedent)
- [Partie 2 - Recommandations fonctionnelles BI](#partie-2---recommandations-fonctionnelles-bi)
- [Partie 3 - Analyse UX / Design](#partie-3---analyse-ux--design)

---

# Partie 1 - Suivi de l'audit precedent

## Synthese

| Priorite | Total | Traite | Partiel | Non traite |
|----------|-------|--------|---------|------------|
| Critique | 2 | 0 | 0 | 2 |
| Haute | 4 | 0 | 1 | 3 |
| Moyenne | 6 | 0 | 1 | 5 |
| Basse | 5 | 0 | 0 | 5 |
| **Total** | **17** | **0** | **2** | **15** |

Un nouveau probleme critique a ete decouvert lors de cette seconde passe.

---

## Detail point par point

### PRIORITE CRITIQUE

#### 3.1 CDN runtime sans SRI + conflit React 18/19
**Statut : NON TRAITE**

- `index.html:16` : `<script src="https://cdn.tailwindcss.com"></script>` toujours present, sans attribut `integrity`
- `index.html:272-287` : Import map toujours present avec conflit de versions :
  - Ligne 272 : `"react": "https://esm.sh/react@18.2.0"`
  - Ligne 286 : `"react/": "https://esm.sh/react@^19.2.3/"`
  - Ligne 287 : `"react-dom/": "https://esm.sh/react-dom@^19.2.3/"`
- Pas de `tailwind.config.ts` ni `postcss.config.*` (Tailwind non installe en build-time)
- Pas de hash SRI sur aucune ressource externe

#### 3.2 Absence de Content Security Policy
**Statut : NON TRAITE**

- Aucun `<meta http-equiv="Content-Security-Policy">` dans `index.html`
- Pas de fichier `_headers` pour Cloudflare Pages
- Aucune configuration CSP dans `vite.config.ts`

#### NOUVEAU - Injection de code via `new Function()` dans l'ETL
**Statut : CRITIQUE - decouvert lors de cette passe**

- `utils/transformations.ts:384` :
  ```typescript
  const result = Function('"use strict"; return (' + expression + ')')();
  ```
- L'expression est construite en remplacant `[ColName]` par des valeurs utilisateur
- Un backup malveillant ou une formule ETL forgee peut executer du code arbitraire
- Le parseur securise de `utils.ts` (FormulaParser) n'est PAS utilise ici ; c'est `Function()` qui est utilise a la place
- Contraste avec le moteur de formules principal qui est safe (pas de `eval`/`Function`)

---

### PRIORITE HAUTE

#### 4.1 Fichiers > 1000 lignes
**Statut : NON TRAITE**

| Fichier | Lignes | Audit V1 | Maintenant |
|---------|--------|----------|------------|
| `pages/Budget.tsx` | 2 296 | 2 296 | Inchange |
| `utils.ts` | 2 037 | 2 037 | Inchange |
| `pages/AnalysisStudio.tsx` | 1 872 | 1 872 | Inchange |
| `pages/DataExplorer.tsx` | 1 574 | 1 574 | Inchange |
| `pages/Settings.tsx` | 1 464 | 1 464 | Inchange |
| `pages/Forecast.tsx` | 1 125 | Non mentionne | Nouveau > 1000 |
| `pages/PivotTable.tsx` | 992 | 992 | Inchange (proche limite) |

Aucune decomposition effectuee. Forecast.tsx depasse desormais les 1000 lignes.

#### 4.2 Absence d'Error Boundaries
**Statut : NON TRAITE**

- Aucun composant `ErrorBoundary` dans le codebase
- Aucun `componentDidCatch` implementee
- Le terme n'apparait que dans `MAINTENANCE.md`

#### 4.3 Pas de code splitting des routes
**Statut : NON TRAITE**

- `App.tsx:1-44` : 12 imports statiques de pages
- Zero `React.lazy()`, zero `<Suspense>` dans le codebase
- `vite.config.ts` : code splitting limite aux vendors (react, recharts, xlsx)

#### 4.4 Validation URLs companyLogo
**Statut : PARTIELLEMENT TRAITE**

- `pages/Customization.tsx:17` : Validation taille < 1 Mo lors de l'upload
- `pages/Customization.tsx:24` : `readAsDataURL()` produit un `data:image/*` (securise)
- MAIS : `DataContext.tsx:77,102` : `setCompanyLogo(parsed.companyLogo)` lors de la restauration de backup, sans verification de protocole
- Un backup forge avec `companyLogo: "javascript:alert(1)"` serait accepte

---

### PRIORITE MOYENNE

#### 5.1 ESLint / Prettier
**Statut : NON TRAITE** - Aucun fichier `.eslintrc*`, `eslint.config.*`, `.prettierrc*`. Aucun script `lint` dans `package.json`.

#### 5.2 Usages de `any`
**Statut : NON TRAITE** - Le comptage exhaustif revele ~289 occurrences de `: any` dans 20+ fichiers (vs 92 estimees dans l'audit V1). Fichiers les plus affectes : `utils.ts` (27), `hooks/useWidgetData.ts` (14), `context/DataContext.tsx` (9).

#### 5.3 Couverture de tests
**Statut : PARTIELLEMENT AMELIORE** - 13 fichiers de tests. Couverture de la logique metier (pivot, transformations, formules). Manques : aucun test d'integration des pages, aucun test des 11 contextes, aucun test E2E, 1 seul test composant UI (Button).

#### 5.4 CI/CD
**Statut : NON TRAITE** - Pas de `.github/workflows/`, deploiement uniquement manuel via `wrangler pages deploy dist`.

#### 5.5 i18n
**Statut : NON TRAITE** - Aucune librairie i18n, chaines francaises codees en dur dans tous les composants.

#### 5.6 Tokens MSAL en localStorage
**Statut : NON TRAITE** - `services/o365Service.ts:46` : `cacheLocation: BrowserCacheLocation.LocalStorage` inchange.

---

### PRIORITE BASSE

| # | Point | Statut |
|---|-------|--------|
| 6.1 | Service Worker / PWA | NON TRAITE |
| 6.2 | `generateId` avec `Math.random()` (`utils.ts:11`) | NON TRAITE |
| 6.3 | Accessibilite incomplete (pas de `aria-live`, `skip-to-content`) | NON TRAITE |
| 6.4 | Imports statiques jsPDF/html2canvas (`utils.ts:4-5`) | NON TRAITE |
| 6.5 | Config Tailwind inline dans HTML | NON TRAITE |

---

# Partie 2 - Recommandations fonctionnelles BI

## Inventaire des fonctionnalites existantes

### Modules et maturite

| Module | Maturite | Commentaire |
|--------|----------|-------------|
| Pivot Table | Avancee | Multi-sources, drill-down, 6 agregations, temporal, conditional formatting, 15 types graphiques |
| Dashboard | Avancee | 5 types widgets (KPI 3 styles, Chart 15 types, List, Text, Report), filtres globaux, export multi-format |
| ETL Pipeline | Avancee | 18 transformations, editeur visuel nodes+connexions, preview live |
| Budget | Tres avancee | Versions, workflow (draft/submitted/validated/rejected/locked), templates, 5 types formules, import/export |
| Forecast | Tres avancee | 5 methodes (manual, copy, driver, ML, trend, seasonal), rolling, reconciliation, MAPE/RMSE |
| Import | Avancee | Excel/CSV/TSV/copier-coller, auto-detection encodage/separateur, mapping intelligent |
| Export | Avancee | PDF, HTML interactif, PNG, CSV/Excel |
| Formules | Avancee | 30+ fonctions FR/EN, parseur securise, cache, 14 actions sequentielles |
| Analysis Studio | Intermediaire | Snapshot/Trend, 15 types graphiques, regression lineaire, save/load |
| Comparaison temporelle | Intermediaire | Multi-sources, MTD/YTD, delta valeur/pourcentage |
| O365 | POC | Auth OAuth 2.0 + PKCE, backup OneDrive, partage liens |
| Settings | Tres avancee | 25+ parametres, referentiels finance (PCG/IFRS), diagnostics |

### Types de graphiques supportes (15)

bar, column, line, area, pie, donut, radial, radar, treemap, sunburst, funnel, stacked-bar, stacked-column, stacked-area, percent-bar/percent-column

### Agregations supportees

count, sum, avg, min, max, list (pivot) + first, last (ETL)

---

## Fonctionnalites et ameliorations a apporter

### Priorite 1 - Fondamentaux manquants (impact direct sur l'utilisabilite)

#### P1.1 - Qualite et profilage des donnees
**Justification** : Un outil BI sans profilage de donnees oblige l'utilisateur a decouvrir les problemes de qualite apres coup, dans les graphiques ou les pivots. C'est le fondement de toute analyse fiable.

**Fonctionnalites a implementer** :
- Profil automatique a l'import : completude par colonne (% nulls), distribution (min/max/moyenne/mediane/ecart-type), cardinalite, detection de patterns (email, telephone, code postal)
- Score de qualite par dataset (completude, coherence, unicite, fraicheur)
- Detection d'outliers (IQR ou Z-score) avec marquage visuel
- Detection de doublons configurable (exact ou fuzzy)
- Regles de validation personnalisables (min/max, regex, foreign keys entre datasets)

**Module concerne** : Import + DataExplorer
**Effort** : Important

---

#### P1.2 - Undo/Redo global
**Justification** : L'absence d'annulation est un frein majeur a l'exploration. L'utilisateur hesite a experimenter (supprimer une colonne, modifier une formule, reorganiser le pivot) par peur de perdre son etat. Aucun outil BI professionnel ne fonctionne sans undo.

**Fonctionnalites a implementer** :
- Stack d'historique (20-50 actions) via Immer.js ou patches
- Raccourcis clavier Ctrl+Z / Ctrl+Y
- Indicateur visuel du nombre d'actions annulables
- Couvrir : modifications de donnees, changements de config pivot, ajout/suppression de widgets, formules

**Module concerne** : Transversal (DataContext)
**Effort** : Moyen

---

#### P1.3 - Systeme de notifications et feedback structure
**Justification** : L'application utilise `alert()` natif et `window.confirm()` pour le feedback. C'est bloquant, non stylise, et ne permet pas de notification asynchrone (fin d'import, succes de sauvegarde, erreur de formule).

**Fonctionnalites a implementer** :
- Librairie de toasts (Sonner ou React Hot Toast) : succes, erreur, warning, info
- Notifications non-bloquantes pour les operations longues (import, export PDF, calcul pivot)
- Confirmation modale stylisee au lieu de `window.confirm()`
- Progress bar pour les operations longues (import gros fichier, export)

**Module concerne** : Transversal
**Effort** : Faible

---

#### P1.4 - Audit trail et historique des modifications
**Justification** : Pour un outil budget/forecast, la tracabilite est non-negociable. L'absence d'audit trail signifie qu'on ne peut pas savoir quand une valeur budgetaire a ete modifiee, ni revenir a un etat precedent.

**Fonctionnalites a implementer** :
- Journal des modifications (timestamp, action, valeur avant/apres)
- Historique consultable par dataset, budget, forecast
- Diff visuel entre deux etats (comme git diff)
- Possibilite de restaurer un etat anterieur specifique

**Module concerne** : Budget, Forecast, DataExplorer
**Effort** : Moyen

---

### Priorite 2 - Enrichissement analytique (differenciation)

#### P2.1 - Scatter plot et graphiques statistiques
**Justification** : L'absence de scatter plot est un trou fonctionnel majeur pour un outil d'analyse. C'est le graphique de base pour la correlation, la segmentation, et l'analyse multi-variables.

**Fonctionnalites a implementer** :
- Scatter plot (2 axes numeriques + optionnellement taille de bulle + couleur par categorie)
- Bubble chart (3 dimensions)
- Heatmap / matrice de correlation
- Box plot pour la distribution
- Histogramme (bins automatiques ou manuels)
- Waterfall chart (essentiel pour le module finance)

**Module concerne** : Dashboard, AnalysisStudio, ChartModal
**Effort** : Moyen

---

#### P2.2 - Drill-through du dashboard vers les donnees
**Justification** : Pouvoir cliquer sur un KPI ou un segment de graphique et voir les lignes de donnees sous-jacentes est la base de l'exploration BI. Le drill-down existe dans le pivot, mais le passage dashboard vers donnees detaillees est absent.

**Fonctionnalites a implementer** :
- Clic sur un widget KPI => ouverture d'un drawer avec les lignes correspondantes
- Clic sur un segment de graphique (barre, part de camembert) => filtrage et affichage des lignes
- Navigation dashboard => DataExplorer avec filtres pre-appliques
- Breadcrumb de navigation pour revenir au dashboard

**Module concerne** : Dashboard, WidgetDisplay, DataExplorer
**Effort** : Moyen

---

#### P2.3 - Planification et rafraichissement automatique des pipelines ETL
**Justification** : Les pipelines ETL sont actuellement executees manuellement. Pour un usage reel, il faut pouvoir programmer leur execution a intervalles reguliers (par exemple : re-importer et transformer un fichier depose dans un dossier).

**Fonctionnalites a implementer** :
- Timer configurable par pipeline (toutes les X minutes/heures)
- Execution automatique a l'ouverture de l'application
- Log d'execution avec succes/echec et duree
- Notification en cas d'echec

**Module concerne** : ETL Pipeline, PipelineContext
**Effort** : Moyen

---

#### P2.4 - Data lineage (tracabilite des donnees)
**Justification** : Avec les pipelines ETL, les jointures, les champs calcules et les datasets derives de pivots, il devient vite impossible de savoir d'ou vient une donnee. Le data lineage repond a la question "d'ou vient ce chiffre ?".

**Fonctionnalites a implementer** :
- Graphe visuel source => transformation => dataset derive => widget
- Clic sur un champ => voir sa provenance (source brute, formule, jointure)
- Impact analysis : si je modifie ce dataset source, quels widgets/budgets sont affectes ?

**Module concerne** : Transversal
**Effort** : Important

---

### Priorite 3 - Confort et productivite

#### P3.1 - Command palette (Ctrl+K)
**Justification** : Avec 12 pages, des dizaines de datasets, d'analyses sauvegardees et de budgets, la navigation par la sidebar devient lente. Un raccourci de recherche globale (comme dans VS Code, Notion, ou Slack) ameliore considerablement la productivite.

**Fonctionnalites** :
- Recherche globale : pages, datasets, analyses sauvegardees, actions
- Actions rapides : "Nouveau dataset", "Exporter le pivot", "Ouvrir les parametres"
- Raccourcis clavier documentes

**Effort** : Faible

---

#### P3.2 - Commentaires et annotations sur les graphiques/KPIs
**Justification** : Meme en usage individuel, pouvoir annoter un graphique ("pic du a la campagne marketing Q2") ou un KPI permet de conserver le contexte metier.

**Fonctionnalites** :
- Annotations positionnees sur les graphiques (clic droit => ajouter note)
- Commentaires par widget de dashboard
- Commentaires par cellule de budget (partiellement present, a enrichir)
- Export des annotations avec les rapports

**Effort** : Moyen

---

#### P3.3 - Templates de dashboards et d'analyses
**Justification** : Des templates pre-configures (dashboard finance, analyse des ventes, suivi RH) accelerent la prise en main et montrent les possibilites de l'outil.

**Fonctionnalites** :
- Galerie de templates par domaine metier
- Import/export de templates de dashboard
- Templates adaptatifs (detection des champs disponibles dans le dataset)

**Effort** : Moyen

---

#### P3.4 - Export et partage enrichis
**Justification** : Les exports PDF et HTML sont fonctionnels mais basiques. Pour un usage professionnel, il manque la personnalisation fine du rendu.

**Fonctionnalites** :
- Export PDF : page de garde configurable, pied de page, numerotation
- Export PowerPoint : graphiques exportes en slides
- Export planifie (generer un rapport PDF chaque semaine automatiquement)
- Embed iframe : generer un widget isolable pour integration dans un intranet
- Waterfall chart dedié pour les rapports financiers

**Effort** : Important

---

### Priorite 4 - Intelligence et automatisation

#### P4.1 - Suggestions intelligentes de graphiques
**Justification** : L'auto-detection existe (sunburst pour hierarchies, line pour temporel) mais peut aller plus loin. Analyser les donnees pour recommander le type de visualisation optimal.

**Fonctionnalites** :
- Analyse du nombre de dimensions/mesures et de la cardinalite pour recommander un type
- Score de pertinence par type de graphique
- Suggestions de dimensions/mesures pertinentes

**Effort** : Moyen

---

#### P4.2 - ML avance pour le forecasting
**Justification** : Le module forecast supporte trend et seasonal basiques. Pour des previsions fiables, il faut des modeles plus robustes.

**Fonctionnalites** :
- Prophet-like decomposition (trend + saisonnalite + jours feries)
- Moyenne mobile ponderee (WMA, EMA)
- Detection automatique de la periodicite
- Cross-validation temporelle pour mesurer la fiabilite du modele
- Intervalles de confiance parametrables

**Effort** : Important

---

## Matrice de priorisation fonctionnelle

| # | Fonctionnalite | Impact utilisateur | Effort | ROI |
|---|----------------|-------------------|--------|-----|
| P1.1 | Profilage donnees | Tres eleve | Important | Eleve |
| P1.2 | Undo/Redo | Tres eleve | Moyen | Tres eleve |
| P1.3 | Toasts / Notifications | Eleve | Faible | Tres eleve |
| P1.4 | Audit trail | Eleve | Moyen | Eleve |
| P2.1 | Scatter/Heatmap/Waterfall | Eleve | Moyen | Eleve |
| P2.2 | Drill-through dashboard | Eleve | Moyen | Eleve |
| P2.3 | Planification ETL | Moyen | Moyen | Moyen |
| P2.4 | Data lineage | Moyen | Important | Moyen |
| P3.1 | Command palette (Ctrl+K) | Moyen | Faible | Eleve |
| P3.2 | Annotations graphiques | Moyen | Moyen | Moyen |
| P3.3 | Templates dashboards | Moyen | Moyen | Moyen |
| P3.4 | Export enrichi (PPT, planifie) | Moyen | Important | Moyen |
| P4.1 | Suggestions graphiques | Faible | Moyen | Faible |
| P4.2 | ML avance forecasting | Faible | Important | Faible |

---

# Partie 3 - Analyse UX / Design

## 1. Design System

### Points positifs

**Architecture de tokens solide** (`index.html:17-268`)
- 9 palettes couleur semantiquement nommees (`--brand-50` a `--brand-900`)
- Tokens de surface, texte, et statut bien structures (`--canvas`, `--surface`, `--txt-main`, `--success-bg`, etc.)
- 3 styles visuels (Default, Material avec ombrage eleve, Glass avec backdrop-filter)
- Variables CSS propres qui facilitent le theming

**Composants UI reutilisables**
- `Button.tsx` : 5 variants (primary, secondary, danger, outline, ghost) + 4 tailles + loading + icon
- `Modal.tsx` : ARIA complet (`role="dialog"`, `aria-modal`, `aria-labelledby`), fermeture Escape
- `Tabs.tsx` : Navigation clavier complete (ArrowLeft/Right, Home/End), ARIA correct (`role="tablist"`, `aria-selected`)
- `Badge.tsx` : 6 variants coherents avec les status colors
- `MultiSelect.tsx` : Select/Deselect all, detection clic exterieur

### Axes d'amelioration

**Design system incomplet**
- Pas de systeme d'espacement formalise : `p-6`, `gap-4`, `mt-2` codes en dur partout au lieu de tokens
- Pas de fichier de design tokens exporte (Figma, Style Dictionary)
- Composant `Form.tsx` basique : pas de helper text, pas d'etat valide, pas de FormField wrapper
- `Modal.tsx` : pas de focus trap (le focus peut s'echapper du modal - violation WCAG 2.1 AA)
- `Button.tsx` : pas de variant `warning`, icon-only ajoute un `mr-2` inutile quand il n'y a pas de texte
- `MultiSelect.tsx` : pas de recherche dans les options, pas de virtualisation (lent avec 100+ items)
- `Checkbox.tsx` : pas d'etat indeterminate pour la selection partielle
- Pas de `prefers-reduced-motion` : les animations (blobs glass, transitions) ne sont pas desactivables

**Comparaison standards** :
- **Metabase** : Design system plus simple mais entierement tokennise (couleurs, spacing, radius, shadows)
- **Power BI** : Fluent UI complet avec focus trap, reduced motion, responsive natif
- DataScope est visuellement soigne mais il manque la rigueur systemique

---

## 2. Layout et Navigation

### Points positifs (`Layout.tsx`, `Sidebar.tsx`)

- Navigation claire en 12 sections avec icones Lucide coherentes
- Sidebar collapsible avec indicateur de stockage en temps reel (barre de progression coloree)
- IDs d'onboarding tour sur chaque element de navigation (`tour-nav-dashboard`, etc.)
- Sauvegarde rapide integree dans le footer de la sidebar
- Responsive : sidebar collapse en mobile

### Axes d'amelioration

- **Pas de breadcrumb** : impossible de situer la page courante dans la hierarchie, surtout quand on navigue entre pivot, analyse sauvegardee, et retour dashboard
- **Pas de recherche globale** : avec 12 pages et potentiellement des dizaines de datasets/analyses, la navigation exclusivement par menu est lente
- **Mobile confus** : la sidebar passe en barre horizontale en bas, ce qui prend trop d'espace vertical avec 12 items. Une bottom navigation a 4-5 items principaux + "More" serait preferable
- **Bouton collapse sans label** : ChevronLeft/Right seul, sans `aria-label` explicite
- **Pas de notification de limite disque** : a 90% de stockage, la barre est rouge mais il n'y a pas de toast/alerte proactive

---

## 3. Analyse detaillee par page

### 3.1 Dashboard (`pages/Dashboard.tsx`)

**Points positifs** :
- Grille 4 colonnes responsive (lg), 2 colonnes (md), 1 colonne (sm)
- Mode edition explicite pour reorganiser les widgets
- Empty state engageant : message + CTA "Creer mon premier widget"
- Fullscreen mode pour la presentation
- Filtres globaux avec date range
- Drag & drop pour reordonner les widgets

**Axes d'amelioration** :
- **Pas de persistance de l'ordre** apres drag & drop (l'ordre se perd au rechargement)
- **Pas de groupes/sections** pour organiser thematiquement les widgets (ex: "Finance", "Ventes")
- **Grille non responsive en mode widget** : les widgets ne s'adaptent pas individuellement au contenu
- **Pas de refresh automatique** des donnees dans les widgets
- **Pas d'URL partageable** pour un etat specifique du dashboard (filtres, periode)

**Comparaison** : Power BI et Looker Studio permettent des sections/pages dans un dashboard, un rafraichissement automatique, et des URLs parametrables. Metabase propose des filtres globaux avec URL synchronisee.

---

### 3.2 Import (`pages/Import.tsx`)

**Points positifs** :
- Workflow en 3 etapes clair (Input => Mapping => Confirm)
- Drag & drop de fichier avec feedback visuel (`scale-[1.02]`, bordure brand)
- Selecteur d'encodage (auto, UTF-8, Windows-1252) - essentiel pour le public francophone
- Auto-mapping intelligent avec seuil de similarite a 75%
- Actions de nettoyage (trim, upper, lower, suppression doublons)
- Preview paginee (10/25/50 lignes)
- Apprentissage des mappings pour les imports recurrents

**Axes d'amelioration** :
- **Validation tardive** : les erreurs n'apparaissent qu'a la confirmation, apres le mapping de milliers de lignes
- **Pas de preview avant/apres** pour les transformations de nettoyage (on applique "trim" sans voir le resultat)
- **Pas de detection de doublons** a l'import : les lignes dupliquees sont importees silencieusement
- **Confirmations via `alert()` natif** : bloquant et non style
- **Pas de rollback** en cas d'erreur d'import (les donnees potentiellement corrompues restent)
- **Pas de progression** pour les gros fichiers (>10k lignes)

---

### 3.3 Pivot Table (`pages/PivotTable.tsx`)

**Points positifs** :
- Drag & drop fluide entre 4 zones (Lignes, Colonnes, Valeurs, Filtres)
- Virtualisation @tanstack/react-virtual pour les grands volumes (overscan: 20)
- Mode comparaison temporelle avec delta valeur/pourcentage
- Conditional formatting configurable
- 15 types de graphiques avec auto-detection intelligente
- Export multi-format (HTML interactif, PDF, CSV)
- Champs calcules au niveau du pivot

**Axes d'amelioration** :
- **82 `useState` dans un seul composant** : c'est le probleme technique le plus impactant sur l'UX car il provoque des re-renders excessifs et des lags perceptibles
- **Pas de feedback visuel pendant le drag** : on ne voit pas ou on peut deposer le champ
- **Pas de preview avant calcul** : chaque changement de configuration recalcule immediatement (peut bloquer l'UI)
- **Persistance de l'etat fragile** : `savePivotState` existe mais n'est pas fiable entre les sessions
- **Limite de 15 metriques hardcodee** sans message d'erreur explicite si depassee
- **D&D inaccessible au clavier** : impossible d'utiliser le pivot sans souris

**Comparaison** : Les TCD d'Excel et Power BI proposent un panneau lateral avec des cases a cocher (plus accessible) et un calcul differe (bouton "Actualiser"). Looker Studio utilise un state management centralise.

---

### 3.4 Data Explorer (`pages/DataExplorer.tsx`)

**Points positifs** :
- Colonnes redimensionnables par drag
- Edition inline directe dans la grille
- Filtrage par colonne (regex ou exact)
- VLOOKUP/enrichissement entre datasets
- Champs calcules
- Conditional formatting
- Selection de ligne avec drawer de detail

**Axes d'amelioration** :
- **~15 `useState` dans un composant** : meme probleme que PivotTable
- **Pas de reordonnancement de colonnes** : l'ordre est fixe apres import
- **Pas de grouping** : impossible de grouper par colonne et voir des sous-totaux
- **Pas d'export de la vue filtree** : on ne peut pas exporter en CSV le resultat d'un filtre
- **Edition sans confirmation** : les modifications sont sauvegardees silencieusement
- **VLOOKUP : UX confuse** avec des drawers imbriques pour configurer la jointure

---

### 3.5 Analysis Studio (`pages/AnalysisStudio.tsx`)

**Points positifs** :
- Basculement fluide Snapshot <=> Trend avec changement de type de graphique auto
- Modes de couleur (Multi, Single, Gradient)
- Sauvegarde/chargement d'analyses
- Forecast pret dans le code (state `showForecast`)

**Axes d'amelioration** :
- **Forecast non implemente** : l'etat `showForecast` existe mais aucun composant ne l'utilise
- **Pas de scatter plot** : manque le graphique de base pour la correlation
- **Dual axis confus** : le support `metric2` existe mais l'UX n'est pas claire
- **Pas de query builder visuel** : les filtres sont un tableau de `FilterRule` sans interface graphique intuitive

---

### 3.6 Budget (`pages/Budget.tsx`)

**Points positifs** :
- 6 onglets bien organises (Liste, Editeur, Comparaison, Workflow, Templates, Referentiels)
- Edition inline des cellules de periode
- Gestion des versions avec workflow de validation
- Import/export Excel avec templates telechargeables
- Support des axes analytiques

**Axes d'amelioration** :
- **2296 lignes dans un fichier** : composant trop gros, maintenance difficile
- **Pas de formules dans les cellules** : les valeurs sont saisies manuellement, pas de propagation
- **Workflow sans UI visible** : les statuts (draft/submitted/validated) sont geres dans le code mais l'interface ne montre pas clairement le flux de validation
- **Pas d'audit trail** : impossible de savoir quand et par qui une valeur a ete modifiee
- **Pas d'export PDF** : seulement Excel

---

### 3.7 Forecast (`pages/Forecast.tsx`)

**Points positifs** :
- 5 methodes de prevision bien documentees
- Rolling forecast avec historique de snapshots
- Reconciliation avec metriques (MAPE, RMSE)
- Drivers pour les previsions basees sur des indicateurs

**Axes d'amelioration** :
- **ML basique** : detection de tendance lineaire et saisonnalite simple, pas de modeles robustes
- **Pas de graphique de reconciliation** : les ecarts sont affiches en tableaux mais pas visuellement
- **Pas de waterfall chart** : essentiel pour montrer les contributions aux ecarts budget/realise

---

### 3.8 ETL Pipeline (`pages/ETLPipeline.tsx`)

**Points positifs** :
- Editeur visuel avec nodes et connexions
- 18 types de transformations couvrant les besoins standards
- Preview des donnees a chaque etape
- Validation de la configuration

**Axes d'amelioration** :
- **Canvas non zoomable** : pour les pipelines complexes, l'espace est vite sature
- **Pas de minimap** : pas de vue d'ensemble du pipeline
- **Execution uniquement manuelle** : pas de planification
- **SECURITE** : utilisation de `new Function()` au lieu du parseur securise (cf. partie 1)

---

### 3.9 Settings (`pages/Settings.tsx`)

**Points positifs** :
- Organisation par sections claires avec recherche
- Referentiels financiers complets (PCG, IFRS, axes analytiques, calendriers fiscaux)
- Diagnostics integres avec suite de tests
- Backup/Restore avec selection partielle
- Preview des preferences en temps reel

**Axes d'amelioration** :
- **1464 lignes** : page trop volumineuse, devrait etre decomposee en sous-routes
- **Restore sans validation** : un backup corrompu peut ecraser toutes les donnees sans verification
- **O365 POC incomplet** : le feature flag est actif mais l'integration est minimale
- **Diagnostics sans action corrective** : affiche les resultats mais ne propose pas de resolution

---

## 4. Patterns UX transversaux

### Feedback utilisateur
| Pattern | Implementation | Qualite |
|---------|---------------|---------|
| Loading | `<Loader2 className="animate-spin" />` | Correcte |
| Succes | Messages texte avec auto-dismiss 3-5s | Basique |
| Erreur | `alert()` natif | Insuffisant |
| Confirmation | `window.confirm()` | Insuffisant |
| Progression | Absente pour les operations longues | Manquant |
| Undo | Absent | Manquant |

### Etats vides (Empty States)
- **Dashboard** : Bon - message + CTA "Creer mon premier widget"
- **Autres pages** : Variable - certaines affichent un message generique, d'autres un ecran vide

### Onboarding
- Composant `<OnboardingTour />` present dans le Layout mais non implemente (pas d'integration avec une librairie de tour guide)
- IDs de tour places sur la navigation (`tour-nav-*`) mais non actifs
- Page Help existante mais documentation limitee

### Raccourcis clavier
- Escape pour fermer les modales
- ArrowLeft/Right pour la navigation dans les tabs
- **Manquants** : Ctrl+S (sauvegarder), Ctrl+Z (undo), Ctrl+K (recherche), Ctrl+E (export)

### Dark Mode
- Supporte via toggle dans les settings
- Variables CSS bien definies pour le mode sombre
- **Lacunes** : Certaines couleurs sont hardcodees en classes Tailwind (`bg-slate-100`, `text-gray-600`) au lieu d'utiliser les tokens CSS, ce qui brise le dark mode dans ces zones

---

## 5. Scoring UX/UI

| Categorie | Score | Justification |
|-----------|-------|---------------|
| Coherence visuelle | 8/10 | Bon design system, tokens bien structures |
| Composants reutilisables | 7/10 | 36 composants mais manques (focus trap, indeterminate, etc.) |
| Accessibilite | 5/10 | ARIA correct sur Button/Modal/Tabs, mais pas de focus trap, D&D inaccessible, pas de skip-link, pas d'aria-live |
| Performance percue | 6/10 | Virtualisation OK mais 82 states dans PivotTable = re-renders perceptibles |
| Responsive mobile | 5/10 | Layout adaptatif mais UX mobile non concue (sidebar 12 items en bottom bar) |
| Feedback utilisateur | 4/10 | alert() natif, pas de toasts, pas d'undo, pas de progress |
| Decouverte des fonctionnalites | 4/10 | Onboarding non implemente, pas d'aide contextuelle |
| Gestion d'etat des pages | 3/10 | 82 useState dans PivotTable, pas de state management structure |
| **Moyenne** | **5.25/10** | |

---

## 6. Recommandations UX prioritaires

### Tier 1 - Impact eleve, effort modere
1. **Remplacer `alert()`/`confirm()` par des toasts** (Sonner) - toutes les pages
2. **Refactoring etat PivotTable** : grouper les 82 `useState` en 4-5 `useReducer` thematiques
3. **Focus trap dans Modal.tsx** : conformite WCAG 2.1 AA
4. **Bottom navigation mobile** : 5 items principaux + menu "Plus"
5. **`prefers-reduced-motion`** : desactiver les animations pour les utilisateurs sensibles

### Tier 2 - Impact modere
6. **Breadcrumb** de navigation contextuel
7. **Undo/Redo** (Ctrl+Z / Ctrl+Y) avec indicateur visuel
8. **Feedback D&D** dans le pivot : zones de depot mises en surbrillance
9. **Progress bar** pour les operations longues (import, export, calcul)
10. **Dark mode complet** : remplacer les classes Tailwind hardcodees par des tokens CSS

### Tier 3 - Nice to have
11. **Command palette** (Ctrl+K) pour navigation rapide
12. **Raccourcis clavier** documentes et configurables
13. **Onboarding tour** fonctionnel (Shepherd.js ou similar)
14. **Aide contextuelle** (icones info avec tooltips)
15. **Animations refinées** : skeleton loaders au lieu de spinners

---

## Conclusion generale

DataScope est une application BI remarquablement riche pour un projet de cette taille. L'architecture fonctionnelle (pivot, budget, forecast, ETL, 15 types de graphiques, formules bilingues) est au niveau d'outils professionnels.

**Les 3 chantiers les plus impactants a lancer** :

1. **Securite et build** (Critique) : Migrer vers un build Vite complet, eliminer les CDN runtime, ajouter une CSP, corriger `new Function()` dans l'ETL. C'est la fondation sur laquelle tout le reste repose.

2. **State management et stabilite** (Haute) : Refactorer les composants a 80+ states (PivotTable, DataExplorer), ajouter des Error Boundaries, implementer le code splitting. Cela ameliorera la performance percue, la maintenabilite, et la robustesse.

3. **Feedback et UX** (Haute) : Remplacer les `alert()` par des toasts, ajouter undo/redo, implementer le profilage de donnees. Ce sont les fonctionnalites qui transforment un outil technique en produit utilisable au quotidien.
