## 0) Contexte projet (stack et contraintes)

### Stack
Les versions sont données à titre indicatif et en version minimale. Les version utilisées doivent être up to date.
- Frontend: React 18.2.0 + Vite 5.1.6
- TypeScript: 5.2.2 (target ES2020) — **mode strict**
- Styling: Tailwind CSS 3.4.19
- Perf list/viewport: @tanstack/react-virtual v3
- Auth: @azure/msal-browser 3.30.0
- Déploiement: Cloudflare Pages (Wrangler 3.0.0)
- Tests: Vitest (unitaires/intégration), Playwright (E2E + visuels)
- Validation: le process est défini dans `VALIDATION_PLAN.md` (source of truth)

### Contraintes non négociables
- Performance: l’app doit supporter **> 100 000 lignes** (virtualisation obligatoire dès que pertinent)
- Sécurité: FormulaParser interne à traiter comme surface sensible (pas d’exécution arbitraire)
- Accessibilité: cible **WCAG 2.1 AA**
- Navigateurs: evergreen (ES2020+), IndexedDB disponible

---

## 1) Principes anti-régression (à respecter strictement)

1) Changements petits et localisés
- Pas de refactor global, pas de renommage massif, pas de reformat de repo entier, sauf demande explicite.

2) “Quality gates” obligatoires
- Lint + Typecheck + Tests + Build doivent passer avant de considérer la tâche terminée.
- Si un check ne peut pas être exécuté (rare), expliquer précisément pourquoi + proposer une alternative.

3) Zéro surprise produit
- Pas de changement de comportement implicite (ex: tri, pagination, raccourcis clavier, navigation).
- Toute modification UX doit être décrite + test manuel reproductible.

4) Accessibilité et performance sont des features
- Ne jamais “réparer vite” en cassant focus management / navigation clavier / virtualisation.

5) Pas de secrets
- Ne jamais ajouter de secrets en dur (clientId, tenant, redirect URIs, endpoints privés, etc).
- Utiliser des variables d’environnement.

---

## 2) Carte du repo (architecture)

### Dossiers clés
- `/logic` : logique métier isolée (fonctions pures, règles, transformations)
- `/components/ui` : composants atomiques UI (présentation, réutilisables)
- Hooks: état complexe via `useReducer` (éviter la logique métier dans les composants)

### Règles d’architecture
- La logique métier vit dans `/logic`, testée via Vitest.
- Les composants UI restent “dumb” autant que possible.
- Les hooks orchestrent (useReducer, side effects), mais ne dupliquent pas la logique de `/logic`.
- Éviter les dépendances circulaires entre `logic` et UI.

---

## 3) Commandes “source of truth” (à exécuter)

> IMPORTANT: Les scripts exacts sont ceux du `package.json` + `VALIDATION_PLAN.md`.
> Si divergence, `VALIDATION_PLAN.md` fait foi.

### Installation
Détecter le package manager via lockfile :
- si `pnpm-lock.yaml` -> `pnpm install --frozen-lockfile`
- si `package-lock.json` -> `npm ci`
- si `yarn.lock` -> `yarn install --frozen-lockfile`
- si `bun.lockb` -> `bun install --frozen-lockfile`

### Qualité (obligatoire)
- Lint: `npm run lint` (ou équivalent)
- Typecheck: `npm run typecheck` (ou `tsc -p tsconfig.json --noEmit`)
- Unit/Integration: `npm test` (ou `npm run test`)
- Build: `npm run build`

### E2E / visuel (si la tâche touche l’UI, le routing, l’auth, ou la perf)
- Playwright: `npm run test:e2e` (si script existant)
- Pour régression visuelle: exécuter le(s) test(s) Playwright adaptés ou générer des captures si le repo le supporte.

---

## 4) Definition of Done (checklist livraison)

À la fin, fournir systématiquement :

1) Résumé (3–8 bullets)
- intention, impact, limites

2) Liste des fichiers modifiés (groupés)
- “logic”, “ui”, “tests”, “config”

3) Checks exécutés (copier/coller les commandes)
- install
- lint
- typecheck
- tests
- build
- + e2e si applicable

4) Tests ajoutés / mis à jour
- bugfix => test qui reproduit le bug
- feature => tests “happy path” + edge cases

5) Validation manuelle (2–6 étapes)
- étapes exactes pour vérifier dans le navigateur

6) Risques et rollback
- ce qui pourrait casser + comment revenir en arrière

---

## 5) Conventions TypeScript / React (SPA)

### TypeScript
- Interdit: `any` (sauf wrapper temporaire avec TODO + explication)
- Préférer des types “narrow” (union discriminée) plutôt que `string`/`object` génériques.
- Les fonctions dans `/logic` doivent être pures, typées, testées.

### React
- Éviter les re-renders inutiles (surtout listes massives)
  - stabiliser les props (memoization), éviter créer des fonctions inline dans les hot paths
- Séparer container (données/état) vs présentational (UI)
- Éviter les effets de bord dans le rendu

### Tailwind
- Respecter les patterns existants (tokens, classes utilitaires autorisées)
- Éviter d’introduire des styles globaux non nécessaires
- Garder la lisibilité (regrouper classes, éviter duplication extrême)

---

## 6) Performance: contrainte “> 100 000 lignes” (règles concrètes)

Objectif: ne jamais rendre 100k éléments DOM.

Règles:
- Toute liste potentiellement grande doit utiliser `@tanstack/react-virtual`.
- Les rows doivent être:
  - cheap à render (éviter gros sous-arbres, éviter calculs lourds)
  - key stables
  - event handlers stables (références stables dans les hot paths)
- Les sélecteurs / filtres / tris doivent être:
  - dans `/logic` (pur)
  - testés
  - optimisés (éviter O(n²), éviter allocations inutiles si possible)
- Mesurer l’impact:
  - si un changement touche le rendu des rows, ajouter un micro-test/perf guard si le repo en a,
    sinon documenter clairement les risques.

---

## 7) Accessibilité (WCAG 2.1 AA): règles minimales

Pour toute UI touchée/ajoutée :
- Sémantique native d’abord (button, input, label, nav, main, etc)
- Navigation clavier:
  - focus visible
  - ordre de tab logique
  - modals/popovers: focus trap + restore focus
- Libellés:
  - label associés, aria-label si nécessaire
- Couleurs:
  - éviter des états basés uniquement sur la couleur
- Préférer réduire motion si animation (respect `prefers-reduced-motion` si applicable)

Si la tâche modifie un composant interactif (modal, menu, select, table):
- ajouter au moins un test (Vitest ou Playwright) qui couvre clavier/focus si possible.

---

## 8) Auth MSAL (@azure/msal-browser)

Règles:
- Ne jamais hardcoder `clientId`, `tenantId`, `authority`, `redirectUri`.
- Centraliser la config MSAL dans un module unique (ex: `src/auth/msal.ts`).
- Tester les flows:
  - utilisateur non connecté
  - session expirée / refresh
  - erreur auth (affichage message + fallback safe)
- Les composants UI ne doivent pas contenir la logique de token parsing.

---

## 9) Sécurité: FormulaParser interne

- Ne jamais utiliser `eval`, `new Function`, ou exécution arbitraire.
- Toute modification du parser doit être couverte par:
  - tests unitaires (cas valides + invalides)
  - tests de sécurité (inputs malveillants: très long, deeply nested, caractères inattendus)
- Éviter la complexité exponentielle (risque DoS) :
  - limiter profondeur, taille, et/ou temps si le code existant a des garde-fous.

---

## 10) Politique de dépendances

- Ne pas ajouter de nouvelles dépendances sans raison explicite.
- Si une dépendance est ajoutée:
  - expliquer le besoin
  - vérifier taille/impact
  - préférer une alternative native si simple

---

## 11) Déploiement Cloudflare Pages / Wrangler

- Ne pas modifier la config de déploiement sans demande explicite.
- Toute modif build doit préserver la sortie attendue (souvent `dist/` pour Vite).
- Si des variables d’environnement sont nécessaires:
  - documenter dans `.env.example`
  - ne jamais committer `.env`

---

## 12) Instructions spécifiques à Jules (workflow)

- Toujours produire un plan avant code, puis exécuter en suivant les quality gates.
- Comme les plans peuvent être auto-approuvés, appliquer strictement ce guide même sans feedback humain.
- Si une tâche UI est ambiguë, proposer 2 options dans le plan + indiquer tradeoffs (perf/a11y).
- Si besoin de contexte visuel: demander des captures/maquettes à fournir à la création de tâche.
- A chaque nouvelle itération, le numéro de version situé en bas à droite de l'application doit être incrémentée selon le format suivant : JJ-MM-AAAA-Numéro d'itération
- Lire le fichier Fonctionnalités.md pour identifier toutes les fonctionnalités intégrées dans l'application et le mettre systématiquement à jour avec les nouveaux besoins formulés et intégrés au code.

Fin.