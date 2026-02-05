## 2026-02-01 - [Modal Keyboard Accessibility]
**Learning:** Pure React modal implementations often forget basic keyboard accessibility like the Escape key, which is a standard user expectation and a core accessibility requirement.
**Action:** Always include an Escape key listener in custom Modal components using useEffect.

## 2026-02-01 - [Automated Aria-Label Fallback]
**Learning:** Forcing developers to remember to add aria-labels to every icon-only button is error-prone. Providing a smart fallback in the base component (like using the title prop) ensures a baseline of accessibility.
**Action:** Implement automated fallbacks for accessibility attributes in core UI components (Button, Input, etc.).
