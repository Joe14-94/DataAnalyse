## 2026-02-01 - [Modal Keyboard Accessibility]
**Learning:** Pure React modal implementations often forget basic keyboard accessibility like the Escape key, which is a standard user expectation and a core accessibility requirement.
**Action:** Always include an Escape key listener in custom Modal components using useEffect.

## 2026-02-01 - [Automated Aria-Label Fallback]
**Learning:** Forcing developers to remember to add aria-labels to every icon-only button is error-prone. Providing a smart fallback in the base component (like using the title prop) ensures a baseline of accessibility.
**Action:** Implement automated fallbacks for accessibility attributes in core UI components (Button, Input, etc.).

## 2026-02-04 - [Ragged Hierarchy Node Preservation]
**Learning:** When building hierarchical trees for visualizations like Sunburst or Treemap, nodes that act as both parents and leaves (ragged hierarchy) can have their children overwritten if the leaf processing logic is too destructive.
**Action:** Ensure leaf node processing in hierarchical tree builders (like buildHierarchicalTree) accumulates values and preserves existing children rather than setting them to undefined.

## 2026-02-04 - [Design System Font Size Minimums]
**Learning:** Legacy components often use very small custom font sizes (8px-10px) for density. However, this violates modern accessibility standards and the project's design system.
**Action:** Standardize secondary text to text-xs (12px) globally to ensure readability while maintaining information density.
