## 2026-02-13 - [Consistent Drawer Accessibility]
**Learning:** Icon-only buttons in complex UI components like drawers often miss `aria-label` and `title` attributes, which significantly hinders accessibility and intuitive discovery. Standardizing these across all drawers ensures a cohesive user experience.
**Action:** Always verify that every icon-only button (especially "Close" or "Delete" actions) includes both an `aria-label` for screen readers and a `title` for hover tooltips.

## 2026-02-15 - [Search and Bulk Actions for Selection Lists]
**Learning:** For drawers containing long lists of selectable items (like columns in VLOOKUP), a search filter combined with "Select All/None" actions is essential for efficiency. Filtering should dynamically scope the bulk actions to only visible items.
**Action:** Implement search bars and "Tout cocher" toggles in any multi-select list within drawers to handle large datasets (>50 items) gracefully.
