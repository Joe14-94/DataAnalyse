## 2026-02-13 - [Consistent Drawer Accessibility]
**Learning:** Icon-only buttons in complex UI components like drawers often miss `aria-label` and `title` attributes, which significantly hinders accessibility and intuitive discovery. Standardizing these across all drawers ensures a cohesive user experience.
**Action:** Always verify that every icon-only button (especially "Close" or "Delete" actions) includes both an `aria-label` for screen readers and a `title` for hover tooltips.

## 2026-02-15 - [Search and Bulk Actions for Selection Lists]
**Learning:** For drawers containing long lists of selectable items (like columns in VLOOKUP), a search filter combined with "Select All/None" actions is essential for efficiency. Filtering should dynamically scope the bulk actions to only visible items.
**Action:** Implement search bars and "Tout cocher" toggles in any multi-select list within drawers to handle large datasets (>50 items) gracefully.

## 2026-02-18 - [Standardizing Toolbar Icon Controls]
**Learning:** Dense toolbars often use character-based controls (like "+" and "-") for space efficiency, but these lack visual targets and accessibility metadata. Replacing them with Lucide icons combined with explicit `title` and `aria-label` improves both discovery and screen reader support.
**Action:** Always replace text-based controls in toolbars with standardized icons and ensure they have descriptive `title` and `aria-label` attributes.
