# Analyse Technique DataScope - Février 2026

## 1. Stack Technique
*   **Frontend** : React 18.2.0, Vite 5.1.6, TypeScript 5.2.2 (ES2020).
*   **Style** : Tailwind CSS 3.4.19.
*   **Performance** : @tanstack/react-virtual v3.
*   **Auth** : @azure/msal-browser 3.30.0.
*   **Déploiement** : Cloudflare Pages (Wrangler 3.0.0).

## 2. Stratégie de Tests
*   **Automatisés** : Vitest (unitaires/intégration), Playwright (E2E/visuels).
*   **Statiques** : ESLint 9, TypeScript Strict.
*   **Processus** : Validation via `VALIDATION_PLAN.md`.

## 3. Architecture
*   **Logic** : Logique métier isolée dans `/logic`.
*   **Hooks** : Gestion d'état complexe via `useReducer`.
*   **UI** : Composants atomiques dans `/components/ui`.

## 4. Contraintes & Accessibilité
*   **Performance** : > 100 000 lignes supportées.
*   **Sécurité** : `FormulaParser` interne sécurisé.
*   **Accessibilité** : Cible WCAG 2.1 AA.
*   **Navigateurs** : Evergreen (ES2020+, IndexedDB).
