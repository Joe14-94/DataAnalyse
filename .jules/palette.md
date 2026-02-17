## 2026-02-13 - [Consistent Drawer Accessibility]
**Learning:** Icon-only buttons in complex UI components like drawers often miss `aria-label` and `title` attributes, which significantly hinders accessibility and intuitive discovery. Standardizing these across all drawers ensures a cohesive user experience.
**Action:** Always verify that every icon-only button (especially "Close" or "Delete" actions) includes both an `aria-label` for screen readers and a `title` for hover tooltips.

## 2026-02-16 - [Universal Icon-only Button Labels]
**Learning:** Icon-only buttons outside of drawers (e.g., in inline edit modes or tables) are frequently overlooked for accessibility. Standardizing `title` and `aria-label` across all interactive icon-only elements is essential for WCAG 2.1 AA compliance.
**Action:** Beyond drawers, proactively check inline action buttons (Save, Cancel, Delete, Filter Remove) for descriptive labels and tooltips.
