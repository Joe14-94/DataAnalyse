# Palette's Journal - UX & Accessibility Learnings

## 2026-02-13 - [Accessibility in Custom Components]
**Learning:** Foundational UI components like Checkboxes often use `display: none` (Tailwind `hidden`) for native inputs to achieve custom styling, which completely breaks keyboard navigation and screen reader accessibility.
**Action:** Always use `sr-only` instead of `hidden` for native inputs, and utilize the `peer` class with `peer-focus-visible` to provide visual focus indicators on the custom replacement elements.

## 2026-02-13 - [Modal Accessibility Standards]
**Learning:** Generic Modal components frequently miss ARIA attributes that are critical for screen readers to understand the context.
**Action:** Always include `role="dialog"`, `aria-modal="true"`, and link the title via `aria-labelledby`. Ensure close buttons have descriptive `aria-label` props rather than relying on hardcoded strings or icons.
