---
type: concept
tags:
  - language
  - css
  - styling
  - frontend
  - best-practice
related:
  - languages/react/styling
  - languages/react/accessibility
  - software-engineering/architecture/frontend/design-system-architecture
  - software-engineering/architecture/frontend/component-driven-architecture
  - languages/css/cascade-specificity-and-inheritance
  - languages/css/methodologies
  - software-engineering/architecture/frontend/styling/css-architecture-and-organization
language: "css"
---
# CSS Best Practices

> Keep specificity low and flat, name things by role, put values behind custom properties, design mobile- and container-first, colocate styles with components, never trade away accessibility — and let a linter enforce it.

---

## What is it?

These are concrete habits that keep stylesheets predictable as a codebase and team grow. Each one prevents a specific failure: rules that cannot be overridden, names that lie after a redesign, values copied in forty places, layouts that break on small screens, or interfaces that some users cannot operate.

They apply whatever the delivery mechanism — plain CSS, [Sass](sass.md), [CSS Modules](css-modules-and-scoped-styles.md), [CSS-in-JS](css-in-js.md), or [utility-first](utility-first-css.md) — with adjustments noted where relevant.

## Why does it matter?

CSS is global by default and resolves conflicts by [cascade, specificity, and order](cascade-specificity-and-inheritance.md). Without discipline, each fix raises specificity a little, until the only way to change anything is `!important` or another nested selector — the "specificity war". Meanwhile hard-coded values drift (seven greys that were meant to be one), and accessibility regressions ship silently because CSS has no compiler errors.

Good practices make three things cheap: **overriding** (a component can be restyled without a fight), **changing** (a token changes in one place), and **deleting** (removing a component removes its styles).

## How it works

### 1. Keep specificity low and flat

Aim for one class per selector. Specificity is a `(id, class, type)` triple; the flatter the distribution, the more "last rule wins" and the less "heaviest selector wins".

```
 Specificity of common selectors
 #header .nav a          (1,1,1)   ← hard to override
 .nav .item a            (0,2,1)
 .nav-link               (0,1,0)   ← target
 :where(.nav) a          (0,0,1)   ← :where() contributes zero
```

- **`:where()`** wraps selectors with zero specificity — ideal for resets and library defaults that consumers must override easily. `:is()` takes the specificity of its most specific argument; prefer `:where()` for defaults.
- **`@layer`** orders whole groups of rules: a later layer beats an earlier one regardless of selector specificity. Declare the order once (`@layer reset, base, components, utilities;`) and specificity stops mattering across layers. Unlayered styles beat all layers — keep app code in layers too, or third-party CSS in a low layer.

### 2. Avoid `!important` — except in utilities

`!important` jumps above normal declarations and can only be beaten by another `!important` (and, with layers, the order inverts for important declarations). Legitimate uses: single-purpose utility classes that must always win (`.visually-hidden`, `.hidden`), and overriding third-party inline styles you cannot change. Everything else is a specificity problem that `@layer` or a flatter selector solves.

### 3. Name by role, not appearance

`.btn-primary`, `.alert-danger`, `.card-title` survive a redesign; `.blue-button`, `.big-red-text`, `.mt-17` do not. Utility classes are the deliberate exception — they name the effect on purpose and live inside a constrained scale. See [methodologies](methodologies.md) for BEM and friends.

### 4. Custom properties over magic numbers

Put colors, spacing, radii, font sizes, durations, and z-indices behind custom properties (and, at scale, [design tokens](../../software-engineering/architecture/frontend/styling/design-tokens.md)). Components consume semantic names (`--color-surface`), which map to raw palette values (`--blue-600`). Theming and dark mode become a matter of reassigning variables. See [custom properties and theming](custom-properties-and-theming.md).

### 5. Use logical properties

`margin-inline-start`, `padding-block`, `inset-inline-end`, `inline-size` follow the writing direction, so right-to-left and vertical languages work without override stylesheets. Physical properties (`left`, `margin-right`) are still correct for things that are truly physical (a shadow offset, a drawing).

### 6. Mobile-first and container-first

Write the base style for the smallest context, then add `min-width` media queries — fewer overrides than shrinking a desktop layout. For reusable components, prefer **container queries** (`@container`) over viewport queries: a card should respond to the width of the slot it is placed in, not the window. Use intrinsic layout (`minmax()`, `auto-fit`, `clamp()`, `flex-wrap`) before adding breakpoints. See [responsive design](responsive-design.md).

### 7. No ID selectors, no deep descendant chains

IDs carry specificity `(1,0,0)` — one ID beats any number of classes — and are unique, so the rule is not reusable. Use IDs for fragment links and ARIA references, not styling. Deep chains (`.page .sidebar ul li a span`) couple CSS to DOM structure: any markup change breaks them, and they raise specificity. Target the element with its own class instead. Native CSS nesting makes deep chains easy to write by accident — keep nesting to one or two levels.

### 8. Colocate styles with components

Keep a component's styles next to its markup (`Button.tsx` + `Button.module.css`, a Vue/Svelte `<style>` block, or utilities in the template). Deleting the component deletes its CSS; ownership is obvious. Keep only true globals (reset, tokens, base typography) in shared files. See [CSS architecture and organization](../../software-engineering/architecture/frontend/styling/css-architecture-and-organization.md).

### 9. Accessibility is a styling concern

- **Visible focus.** Never `outline: none` without a replacement. Use `:focus-visible` so keyboard users get a clear indicator while mouse clicks do not show a ring. WCAG 2.2 adds requirements that focus is not obscured and (at AAA) that the indicator is large and contrasting enough.
- **`prefers-reduced-motion`** — remove or soften non-essential animation, parallax, and auto-playing motion.
- **`prefers-contrast`** and **`forced-colors`** — strengthen borders and avoid conveying state by color alone; in forced-colors mode, use system colors (`CanvasText`, `Highlight`) and do not rely on backgrounds or box-shadows for meaning.
- **Contrast ratios** — WCAG AA: 4.5:1 for normal text, 3:1 for large text and for UI components and focus indicators.
- **Do not hide content assistive tech needs.** `display: none` and `visibility: hidden` remove content from the accessibility tree. For text that should be read but not seen, use a visually-hidden utility. Do not use CSS `content` for meaningful text either.
- **`rem` for font sizes** so text respects the user's browser font-size setting; `px` for borders and hairlines is fine. Never disable zoom.
- **Do not reorder visually** with `order`, `flex-direction: row-reverse`, or grid placement in a way that diverges from DOM order — keyboard and screen reader order follow the DOM.

### 10. Enforce with a linter

Conventions that are not checked decay. [Stylelint](toolchain.md) rules map directly onto the practices above:

| Practice | Stylelint rule / plugin |
|---|---|
| No IDs | `selector-max-id: 0` |
| Low specificity | `selector-max-specificity`, `selector-max-compound-selectors` |
| Shallow nesting | `max-nesting-depth` |
| No `!important` | `declaration-no-important` (override for utility files) |
| No magic values | `scale-unlimited/declaration-strict-value` (plugin) — require `var()` for colors, z-index |
| Logical properties | `stylelint-use-logical` (plugin) |
| Naming convention | `selector-class-pattern` |
| Units for fonts | `declaration-property-unit-allowed-list` |
| Valid CSS | `property-no-unknown`, `declaration-block-no-duplicate-properties` (from `stylelint-config-standard`) |

Contrast and focus visibility cannot be fully linted from CSS alone; add axe-based checks (e.g. `@axe-core/playwright`) in tests.

## Examples

### Layer order, zero-specificity defaults, and a utility

```css
@layer reset, tokens, base, components, utilities;

@layer reset {
  :where(*, *::before, *::after) { box-sizing: border-box; }
  :where(body) { margin: 0; }
}

@layer tokens {
  :root {
    --space-2: 0.5rem;
    --space-4: 1rem;
    --radius-md: 0.5rem;
    --color-brand: oklch(55% 0.18 255);
    --color-on-brand: white;
    --color-focus: oklch(65% 0.2 255);
    --duration-fast: 150ms;
  }
}

@layer base {
  html { font-size: 100%; }          /* respect user setting */
  body { font-size: 1rem; line-height: 1.5; }
}

@layer components {
  .button {
    padding-block: var(--space-2);
    padding-inline: var(--space-4);
    border-radius: var(--radius-md);
    background: var(--color-brand);
    color: var(--color-on-brand);
    transition: background-color var(--duration-fast);
  }

  .button:focus-visible {
    outline: 3px solid var(--color-focus);
    outline-offset: 2px;
  }
}

@layer utilities {
  .visually-hidden {
    position: absolute !important;
    inline-size: 1px !important;
    block-size: 1px !important;
    overflow: hidden !important;
    clip-path: inset(50%) !important;
    white-space: nowrap !important;
  }
}
```

### Before and after: specificity and naming

```css
/* Before: ID, deep chain, appearance name, magic numbers */
#sidebar ul li a.blue-link {
  color: #1d4ed8;
  margin-left: 13px;
}

/* After: one class, role name, tokens, logical property */
.sidebar-link {
  color: var(--color-link);
  margin-inline-start: var(--space-3);
}
```

### Container-first component

```css
.card-slot { container-type: inline-size; }

.card {
  display: grid;
  gap: var(--space-4);
}

@container (min-width: 30rem) {
  .card { grid-template-columns: 8rem 1fr; }
}
```

### User preferences

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

@media (prefers-contrast: more) {
  .button { border: 2px solid currentColor; }
}

@media (forced-colors: active) {
  .button:focus-visible { outline-color: Highlight; }
}
```

The reduced-motion reset is a deliberate, documented use of `!important`: it must beat every component rule.

## When to use

- **Every shared or long-lived stylesheet** — the cost of these habits is small up front and compounds over time.
- **`@layer`** — when mixing a reset, third-party CSS, components, and utilities in one app.
- **`:where()`** — resets, library and design-system defaults meant to be overridden.
- **Custom properties** — any value used more than once or likely to change with theme.
- **Container queries** — components placed in slots of varying width (sidebars, grids, dashboards).
- **Lint enforcement** — any team larger than one; codify the rules instead of repeating them in review.

## When NOT to use

- **Dogma over context** — a one-off marketing page or prototype does not need layers, tokens, and a lint config.
- **Tokens for everything** — a value used once inside one component (an icon nudge) does not need a global token; local custom properties or a comment suffice.
- **`:where()` on component styles that must not be accidentally overridden** — zero specificity means any element selector wins.
- **Logical properties for physical effects** — a drop shadow cast to the right should stay physical.
- **Blanket bans in third-party overrides** — overriding a library with inline `!important` styles may genuinely require `!important`; scope the lint exception to that file.
- **Semantic names in a utility-first codebase** — inventing `.card-title` classes inside a Tailwind project reintroduces the naming problem utilities were adopted to avoid; extract a component instead.
- **`outline: none` "for design reasons"** — never acceptable without an equally visible `:focus-visible` replacement.

## References

- [MDN — Specificity](https://developer.mozilla.org/en-US/docs/Web/CSS/Specificity)
- [MDN — @layer](https://developer.mozilla.org/en-US/docs/Web/CSS/@layer)
- [MDN — :where()](https://developer.mozilla.org/en-US/docs/Web/CSS/:where)
- [MDN — CSS logical properties and values](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_logical_properties_and_values)
- [MDN — CSS container queries](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries)
- [MDN — :focus-visible](https://developer.mozilla.org/en-US/docs/Web/CSS/:focus-visible)
- [MDN — prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)
- [W3C — WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [W3C — Understanding SC 1.4.3 Contrast (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
- [Stylelint — Rules](https://stylelint.io/user-guide/rules)
- [web.dev — Learn CSS](https://web.dev/learn/css)
