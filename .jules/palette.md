# Palette's Journal - UX & Accessibility Learnings

## 2026-02-13 - [Accessibility in Custom Components]
**Learning:** Foundational UI components like Checkboxes often use `display: none` (Tailwind `hidden`) for native inputs to achieve custom styling, which completely breaks keyboard navigation and screen reader accessibility.
**Action:** Always use `sr-only` instead of `hidden` for native inputs, and utilize the `peer` class with `peer-focus-visible` to provide visual focus indicators on the custom replacement elements.

## 2026-02-13 - [Modal Accessibility Standards]
**Learning:** Generic Modal components frequently miss ARIA attributes that are critical for screen readers to understand the context.
**Action:** Always include `role="dialog"`, `aria-modal="true"`, and link the title via `aria-labelledby`. Ensure close buttons have descriptive `aria-label` props rather than relying on hardcoded strings or icons.

## 2026-02-14 - [Keyboard Navigation in Tabs]
**Learning:** Modern tab components often lack standardized keyboard interaction (Arrow keys, Home, End), making them difficult for power users and keyboard-only users.
**Action:** Implement `role="tablist"`, `role="tab"`, and `role="tabpanel"` correctly, and use a simple DOM-based traversal in the `onKeyDown` handler of the `TabList` to manage focus and selection efficiently. Always sanitize IDs generated from user-provided values to ensure valid HTML.

## 2026-02-14 - [Enhanced Button Patterns]
**Learning:** Adding an `isLoading` state to core button components significantly improves perceived performance and prevents duplicate form submissions. Using `focus-visible` instead of `focus` for focus rings provides a cleaner experience for mouse users while maintaining high accessibility for keyboard-only users.
**Action:** Always implement `isLoading` states in primary action buttons and prefer `focus-visible` for all interactive elements to follow modern UX standards.
