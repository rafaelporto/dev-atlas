---
type: concept
tags:
  - language
  - css
  - styling
  - frontend
related:
  - languages/javascript-typescript/frameworks/react/styling
  - languages/javascript-typescript/frameworks/nextjs/styling-and-assets
  - software-engineering/architecture/frontend/design-system-architecture
  - software-engineering/architecture/frontend/rendering-patterns
  - languages/css/sass
  - languages/css/toolchain
  - software-engineering/architecture/frontend/styling/evolving-and-migrating-styles
language: "css"
---
# Modern CSS

> Since 2022, native CSS has gained nesting, a parent selector, cascade layers, scoping, container queries, typed variables, view transitions, anchor positioning, entry animations, and perceptual color — replacing many Sass features and JavaScript workarounds that used to be mandatory.

---

## What is it?

"Modern CSS" is the set of features that reached all major browsers in roughly the last five years and changed how stylesheets are written day to day. Many of them existed before only as preprocessor features (Sass nesting, color functions) or as JavaScript code (toggling parent classes, measuring elements to position a tooltip, orchestrating page transitions).

This article is a field guide: for each feature, what it does, what it replaces, and its **Baseline** status — whether it is safe to use without fallbacks. See the [CSS overview](overview.md) for how Baseline levels are defined.

*Status snapshot: Baseline data from the `web-features` dataset (v3.43), October 2026. Statuses only move forward; check MDN for the current value.*

---

## Why does it matter?

- **Less tooling.** Teams that adopted Sass only for nesting and variables, or CSS-in-JS only for scoping, can now drop that dependency. Fewer build steps, less lock-in.
- **Less JavaScript.** Parent-state styling, tooltip positioning, entry animations, and page transitions move from JS to declarative CSS that runs off the main thread where possible and works without hydration.
- **Better components.** Container queries, `@scope`, and `@layer` let components be styled in isolation and reused in any slot — goals that previously required a framework.
- **Outdated habits cost money.** Code reviews still produce clearfixes, `100vh` bugs, and JS resize observers for problems CSS now solves in one line.

---

## How it works

### Feature map

| Feature | What it does | Replaces | Baseline (Oct 2026) |
|---|---|---|---|
| Native nesting | Nest rules inside rules with `&` | Sass/Less/PostCSS nesting | **Widely** (since Jun 2026) |
| `:has()` | Style an element based on its descendants or following siblings | JS that toggles parent classes | **Widely** (since Jun 2026) |
| `@layer` | Explicit cascade order | Import-order fragility, `!important` wars | **Widely** (since Sep 2024) |
| `@scope` | Subtree-limited rules with proximity | BEM prefixes, build-time scoping | **Newly** (since Mar 2026) |
| Container size queries | Style by container size | JS `ResizeObserver` + classes | **Widely** (since Aug 2025) |
| Container style queries | Style by a container's custom property | Variant modifier classes | **Newly** (since May 2026) |
| `@property` | Typed, animatable custom properties | JS-driven gradient/number animation | **Newly** (since Jul 2024) |
| View transitions (same-document) | Animated DOM state changes | FLIP animation libraries | **Newly** (since Oct 2025) |
| View transitions (cross-document) | Animated navigation between pages (MPA) | SPA routers adopted only for transitions | **Limited** (no Firefox) |
| Anchor positioning | Position an element relative to another | Popper.js / Floating UI measurement | Core: **Newly** (since Jan 2026); full feature: **Limited** |
| `@starting-style` | Define "before" styles for entry transitions | `requestAnimationFrame`/`setTimeout` class toggles | **Newly** (since Aug 2024) |
| `oklch()` / `oklab()` | Perceptual color spaces, wide gamut | Hex/HSL, Sass `darken()`/`lighten()` | **Widely** (since Nov 2025) |
| `color-mix()` | Blend colors at runtime | Sass color functions | **Widely** (since Nov 2025) |
| Subgrid | Nested grids share parent tracks | Fixed heights, JS equal-height scripts | **Widely** (since Mar 2026) |

### Native nesting

```css
.card {
  padding: 1rem;
  & .title { font-weight: 600; }
  &:hover { box-shadow: var(--shadow-2); }
  @media (width >= 48rem) { padding: 2rem; }
}
```

Differences from Sass: `&` behaves like `:is()` (so specificity is the most specific selector in the parent list), and there is **no string concatenation** — `&__title` (the BEM trick) does not work. Nested type selectors (`h2 { }` directly inside a rule) work in current browsers without `&`.

### `:has()` — the relational selector

`:has()` selects an element if a relative selector matches from it: a parent with a given child, an element followed by a given sibling, a form with an invalid field. It lets state flow **upwards** in CSS, replacing JavaScript that toggled classes on ancestors. Keep arguments simple; broad patterns like `body:has(...)` are evaluated on many DOM changes.

### `@layer` and `@scope`

Cascade layers give the stylesheet an explicit precedence order that beats specificity; `@scope` limits rules to a DOM subtree with optional lower boundary and resolves ties by proximity. Both are covered in depth in [Cascade, Specificity and Inheritance](cascade-specificity-and-inheritance.md).

### Container queries

Components query the size of their container (`@container (inline-size >= 30rem)`) or the value of a custom property on it (`@container style(--variant: compact)`), and use container units (`cqi`). Details in [Responsive Design](responsive-design.md).

### `@property`

Registers a custom property with a syntax (`<color>`, `<length>`, `<angle>`…), an initial value, and inheritance behavior. Registered properties are type-checked and can be **transitioned and animated** — e.g. animating a gradient angle or a numeric counter. See [Custom Properties and Theming](custom-properties-and-theming.md).

### View transitions

```
 state A ──► browser snapshots old DOM ──► DOM updated ──► snapshots new DOM
                                                       │
                       ::view-transition-old(name) ◄──┴──► ::view-transition-new(name)
                       cross-fade / morph, styled with CSS animations
```

- **Same-document**: call `document.startViewTransition(() => updateDOM())`; elements with a matching `view-transition-name` morph between states. Newly available since October 2025; `view-transition-class` (style many transitions at once) reached Baseline at the same time.
- **Cross-document** (multi-page apps): opt in with `@view-transition { navigation: auto; }` on both pages. Supported in Chromium and Safari, not Firefox — a safe progressive enhancement because unsupported browsers just navigate normally.

### Anchor positioning

```css
.trigger { anchor-name: --menu-trigger; }

.menu {
  position: absolute;
  position-anchor: --menu-trigger;
  position-area: block-end span-inline-end;  /* below, aligned to start */
  position-try-fallbacks: flip-block;        /* flip above if no room below */
}
```

Replaces measuring with `getBoundingClientRect()` and repositioning on scroll/resize (Popper.js, Floating UI). The core pieces (`anchor-name`, `anchor()`, `position-area`, `position-try-fallbacks`) became Baseline newly available in January 2026 (Firefox 147 was the last engine), and `position-anchor` followed in September 2026; some sub-features, such as `position-visibility: anchor-visible`, were not yet interoperable, so the feature as a whole is still listed as limited. Pairs naturally with the `popover` attribute.

### `@starting-style` and discrete transitions

Transitions need a "from" value, which an element does not have on its first render or when changing from `display: none`. `@starting-style` defines that initial state; `transition-behavior: allow-discrete` lets `display` and `overlay` participate so the exit animation plays before the element disappears. Both newly available since August 2024. The `overlay` property (keeps a closing popover or dialog in the top layer during its exit animation) is still limited. Browsers that cannot animate a particular case simply show/hide the element without animation.

### Modern color

- **`oklch(L C H)`** — lightness, chroma, hue in a perceptually uniform space: equal lightness steps *look* equal, and hue changes do not shift perceived brightness the way HSL does. It also reaches wide-gamut (P3) colors.
- **`color-mix(in oklch, a 70%, b)`** and **relative colors** (`oklch(from var(--c) calc(l + 0.1) c h)`, newly available since September 2024) derive shades at runtime from variables, so derived colors follow the theme.

### Subgrid

`grid-template-rows: subgrid` lets a nested grid reuse its parent's tracks, so titles, bodies, and footers of sibling cards align. See [Layout: Flexbox and Grid](layout-flexbox-and-grid.md).

### On the horizon (limited availability as of October 2026)

Not yet in every engine, so only as progressive enhancement: scroll-driven animations (`animation-timeline: scroll()`), the `if()` function, custom media queries (`@custom-media`), and customizable `<select>` (`appearance: base-select`).

---

## Examples

### Sass → native CSS

```scss
// Before: SCSS
$brand: #0b57d0;
.button {
  background: $brand;
  &:hover { background: darken($brand, 10%); }
  .icon { margin-inline-end: 0.25rem; }
}
```

```css
/* After: native CSS, no build step, theme-aware at runtime */
:root { --brand: oklch(52% 0.2 260); }

.button {
  background: var(--brand);
  &:hover { background: color-mix(in oklch, var(--brand) 85%, black); }
  & .icon { margin-inline-end: 0.25rem; }
}
```

### `:has()` instead of JavaScript state classes

```css
/* Highlight a field group when its input is invalid — no JS listener */
.field:has(input:user-invalid) {
  --field-border: var(--color-danger);
}

/* Card layout changes only when it contains an image */
.card:has(> img) {
  grid-template-columns: 8rem 1fr;
}

/* Lock page scroll while a modal dialog is open */
html:has(dialog[open]:modal) { overflow: hidden; }
```

### Entry and exit animation for a popover

```css
[popover] {
  opacity: 1;
  translate: 0 0;
  transition:
    opacity 200ms,
    translate 200ms,
    display 200ms allow-discrete,
    overlay 200ms allow-discrete;

  @starting-style {          /* state on first appearance */
    opacity: 0;
    translate: 0 -0.5rem;
  }
}

[popover]:not(:popover-open) {  /* exit state */
  opacity: 0;
  translate: 0 -0.5rem;
}
```

### Same-document view transition

```css
.thumbnail.is-selected { view-transition-name: hero; }
.detail-image          { view-transition-name: hero; }

::view-transition-group(hero) { animation-duration: 300ms; }

@media (prefers-reduced-motion: reduce) {
  ::view-transition-group(*) { animation: none; }
}
```

```js
// Feature-detect: older browsers update the DOM without animation
if (document.startViewTransition) {
  document.startViewTransition(() => showDetail(id));
} else {
  showDetail(id);
}
```

### Feature detection with `@supports`

```css
@supports selector(:has(a)) { /* :has()-dependent styles */ }
@supports (anchor-name: --x) { /* anchor positioning */ }
@supports (container-type: inline-size) { /* container queries */ }
```

---

## When to use

- **Widely available** features (nesting, `:has()`, `@layer`, container size queries, subgrid, `oklch()`, `color-mix()`) — use freely in new code and when touching legacy code.
- **Newly available** features (`@scope`, style queries, `@property`, same-document view transitions, `@starting-style`, core anchor positioning) — use when your audience is on evergreen browsers, or as progressive enhancement with a sensible fallback.
- **Limited** features (cross-document view transitions, scroll-driven animations) — only where the unsupported experience is still complete (e.g. no animation).
- When evaluating whether to keep Sass, CSS-in-JS, or a JS positioning library — check which of its jobs native CSS now covers. See [Sass](sass.md) and [CSS-in-JS](css-in-js.md) for the trade-offs, and [Toolchain](toolchain.md) for lowering new syntax for older browsers.

## When NOT to use

- Do not ship newly available features without fallbacks if analytics show a meaningful share of users on browsers older than the feature's release.
- Do not rewrite a working, stable Sass codebase only to use native nesting — the gain is small unless you are also removing the build step or adopting runtime theming.
- Do not port BEM's `&__element` concatenation to native nesting — it is not supported; it silently produces a different selector.
- Do not use `:has()` with very broad subjects (`*:has(...)`, `body:has(...)` on frequently mutating pages) without checking style-recalculation cost.
- Do not use view transitions or entry animations without honoring `prefers-reduced-motion`.

---

## References

- W3C. [CSS Nesting Module](https://www.w3.org/TR/css-nesting-1/). W3C.
- W3C. [Selectors Level 4 — `:has()`](https://www.w3.org/TR/selectors-4/#relational). W3C.
- W3C. [CSS View Transitions Module Level 1](https://www.w3.org/TR/css-view-transitions-1/). W3C.
- W3C. [CSS Anchor Positioning](https://www.w3.org/TR/css-anchor-position-1/). W3C.
- W3C. [CSS Transitions Level 2 (`@starting-style`)](https://www.w3.org/TR/css-transitions-2/). W3C.
- W3C. [CSS Color Module Level 4 (`oklch()`)](https://www.w3.org/TR/css-color-4/). W3C.
- MDN Web Docs. [CSS reference](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference). Mozilla.
- web.dev. [Baseline](https://web.dev/baseline). Google.
- W3C WebDX Community Group. [web-features dataset](https://github.com/web-platform-dx/web-features). GitHub.
