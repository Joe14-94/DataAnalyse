## 2026-02-13 - [Consistent Drawer Accessibility]
**Learning:** Icon-only buttons in complex UI components like drawers often miss `aria-label` and `title` attributes, which significantly hinders accessibility and intuitive discovery. Standardizing these across all drawers ensures a cohesive user experience.
**Action:** Always verify that every icon-only button (especially "Close" or "Delete" actions) includes both an `aria-label` for screen readers and a `title` for hover tooltips.

## 2026-02-15 - [Search and Bulk Actions for Selection Lists]
**Learning:** For drawers containing long lists of selectable items (like columns in VLOOKUP), a search filter combined with "Select All/None" actions is essential for efficiency. Filtering should dynamically scope the bulk actions to only visible items.
**Action:** Implement search bars and "Tout cocher" toggles in any multi-select list within drawers to handle large datasets (>50 items) gracefully.

## 2026-02-18 - [Standardizing Toolbar Icon Controls]
**Learning:** Dense toolbars often use character-based controls (like "+" and "-") for space efficiency, but these lack visual targets and accessibility metadata. Replacing them with Lucide icons combined with explicit `title` and `aria-label` improves both discovery and screen reader support.
**Action:** Always replace text-based controls in toolbars with standardized icons and ensure they have descriptive `title` and `aria-label` attributes.

## 2026-02-23 - [Design System Font Size Enforcement]
**Learning:** Recharts tooltips and custom bulk-action buttons often default to or use hardcoded small font sizes (10px) that violate accessibility standards and design system rules. Enforcing a minimum of 12px (text-xs) across all components, including chart overlays, is necessary for WCAG compliance.
**Action:** Always check Recharts `contentStyle` and raw HTML buttons for hardcoded pixel font sizes and replace them with standard Tailwind classes or 12px equivalents.

## 2026-02-23 - [Metadata and Inline Action Standardization]
**Learning:** Metadata consistency (versioning and copyright) and standardizing accessibility labels for inline editing actions (Confirm/Cancel) significantly improves the professional feel and usability of the administration pages.
**Action:** Always verify that inline icon buttons for "Confirm" and "Cancel" have matching aria-labels and titles, and ensure the application version and copyright year are updated in each iteration.

## 2026-02-24 - [Semantic Tabbed Switchers]
**Learning:** Using simple buttons for mode switching (like Snapshot vs. Trend) lacks the semantic structure of a tabbed interface. Implementing `role="tablist"` and `role="tab"` with `aria-selected` provides much clearer context for screen reader users about the mutually exclusive nature of the modes.
**Action:** Always use ARIA tab roles for mutually exclusive view switches and ensure all interactive elements in headers have explicit `aria-label` attributes if they lack visible text labels.
