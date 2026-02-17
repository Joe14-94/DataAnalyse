## 2026-02-13 - [Consistent Drawer Accessibility]
**Learning:** Icon-only buttons in complex UI components like drawers often miss `aria-label` and `title` attributes, which significantly hinders accessibility and intuitive discovery. Standardizing these across all drawers ensures a cohesive user experience.
**Action:** Always verify that every icon-only button (especially "Close" or "Delete" actions) includes both an `aria-label` for screen readers and a `title` for hover tooltips.

## 2026-02-16 - [Icon Affordance & Small Control Accessibility]
**Learning:** Small text-based controls like "+" and "-" often lack sufficient visual target area and semantic clarity for screen readers. Replacing them with standardized icons and adding explicit `aria-label` and `title` attributes significantly improves both the aesthetic quality and the accessibility of dense toolbars.
**Action:** When implementing increment/decrement or similar toggles, prefer Lucide icons over plain text and always provide localized `aria-label` and `title`.
