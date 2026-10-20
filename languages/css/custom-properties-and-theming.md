---
type: concept
tags:
  - language
  - css
  - styling
  - frontend
related:
  - languages/react/styling
  - languages/nextjs/styling-and-assets
  - software-engineering/architecture/frontend/design-system-architecture
  - software-engineering/architecture/frontend/styling/design-tokens
  - languages/css/sass
  - languages/css/utility-first-css
language: "css"
---
# Custom Properties and Theming

> CSS custom properties are runtime variables that cascade and inherit like any other property, which makes them the native foundation for theming, dark mode, and design tokens — no preprocessor or JavaScript required.

---

## What is it?

Custom properties are named values you define once in CSS and reuse anywhere, such as a brand color or a spacing size. Change the value in one place and every use updates — even while the page is running.

```css
:root { --color-brand: #0b57d0; }
.button { background: var(--color-brand); }
```

- A custom property is any property whose name starts with `--`. It is read with `var(--name, fallback)`.
- Unlike Sass variables, which are replaced at build time, custom properties **live in the browser**: they participate in the cascade, inherit down the DOM, can be changed by media queries, selectors, or JavaScript, and are visible in DevTools.
- **`@property`** registers a custom property with a type, initial value, and inheritance flag, which makes it animatable and type-checked.

**Theming** is using these variables to switch a whole interface's look — light/dark, brands, density — by redefining a small set of values rather than rewriting component styles.

---

## Why does it matter?

- **One source, many contexts.** A component reads `var(--color-surface)` and does not know or care whether the current theme is light, dark, or a partner brand.
- **Runtime theming without rebuilds.** Switching themes is setting an attribute on `<html>`; no second stylesheet, no CSS-in-JS re-render.
- **Framework-agnostic.** The same variables work in plain CSS, CSS Modules, Tailwind (v4 exposes its theme as custom properties), and CSS-in-JS. They are the most portable contract a design system can offer.
- **Native dark mode.** `prefers-color-scheme`, `color-scheme`, and `light-dark()` make OS-aware theming a few lines of CSS.

---

## How it works

### Cascade and inheritance of variables

Custom properties are ordinary properties: they are resolved by the [cascade](cascade-specificity-and-inheritance.md) and **inherit by default**. A value set on an ancestor is visible to all descendants until something redefines it.

```
:root            --accent: blue      ← global default
 └─ .promo       --accent: orange    ← redefined for this subtree
     └─ .button  background: var(--accent)   → orange
 └─ .button      background: var(--accent)   → blue
```

Important details:

- `var()` is substituted at **computed-value time** on the element that uses it. Defining `--x: calc(var(--y) * 2)` on `:root` resolves `--y` on `:root`, not on the descendant that later reads `--x`.
- An unregistered custom property is just a token stream: `--size: 20` is valid even if later used where a length is needed. If substitution produces an invalid value, the declaration becomes **invalid at computed-value time** and the property falls back to its inherited or initial value — **not** to an earlier declaration in the cascade.
- The fallback in `var(--x, fallback)` applies only when `--x` is not defined (or is the guaranteed-invalid value), not when its value is wrong for the property.

### `@property`

```css
@property --angle {
  syntax: "<angle>";
  inherits: false;
  initial-value: 0deg;
}
```

Registering a property gives it:

- **Type checking** — an invalid assignment is ignored and the initial value is used.
- **Animation and transitions** — the browser knows how to interpolate `<angle>`, `<color>`, `<length>`, so gradients and other values built from variables can animate.
- **Control over inheritance** — `inherits: false` stops values leaking into descendants and can improve style recalculation cost.

Baseline: **Newly available** since July 2024 (Firefox 128); becomes widely available in early 2027.

### Theming layers: raw values vs. semantic variables

```
 Primitive (raw) tokens       Semantic tokens                 Component usage
 ──────────────────────       ───────────────                 ───────────────
 --blue-600: #0b57d0    ─┐    --color-action: var(--blue-600)   .btn { background: var(--color-action) }
 --gray-50:  #f8f9fa    ─┼─►  --color-surface: var(--gray-50)   .card { background: var(--color-surface) }
 --gray-900: #1f1f1f    ─┘    --color-text: var(--gray-900)     body { color: var(--color-text) }

 Themes redefine ONLY the semantic layer:
 [data-theme="dark"] { --color-surface: var(--gray-900); --color-text: var(--gray-50); }
```

Components consume **semantic** names (`--color-surface`, `--color-text-muted`, `--color-danger`), never raw palette values. A theme then remaps a few dozen semantic variables instead of touching every component. This is the CSS output of a **design token** pipeline — see [Design Tokens](../../software-engineering/architecture/frontend/styling/design-tokens.md) for how tokens are authored once and generated for CSS and other platforms.

### Dark mode

Three native building blocks:

| Feature | Role | Baseline |
|---|---|---|
| `@media (prefers-color-scheme: dark)` | Detect the OS/browser preference. | Widely available |
| `color-scheme: light dark` | Tell the browser the page supports both; native controls, scrollbars, and default canvas colors follow. | Widely available |
| `light-dark(<light>, <dark>)` | Return one of two colors based on the **used color scheme** of the element. Requires `color-scheme` to be set. | Newly available (since May 2024) |

With `light-dark()`, both values live next to each other, and forcing a theme on a subtree is just `color-scheme: dark` on that element.

### Color manipulation: `color-mix()`

`color-mix(in oklch, var(--color-action) 80%, black)` blends two colors in a chosen color space. It replaces Sass `darken()`/`lighten()` with a runtime operation that works on variables — so hover and disabled shades follow the theme automatically. Mixing in `oklch` or `oklab` gives perceptually even results. Baseline: **Widely available** (since November 2025).

**Relative color syntax** (`oklch(from var(--brand) calc(l - 0.1) c h)`) adjusts individual channels; it is Baseline newly available since September 2024.

---

## Examples

### Semantic theme with an OS default and a manual override

```css
:root {
  color-scheme: light dark;

  /* primitives */
  --gray-50: oklch(98% 0.005 250);
  --gray-900: oklch(22% 0.01 250);
  --blue-600: oklch(52% 0.2 260);
  --blue-300: oklch(78% 0.1 260);

  /* semantic layer: one declaration covers both schemes */
  --color-surface: light-dark(var(--gray-50), var(--gray-900));
  --color-text: light-dark(var(--gray-900), var(--gray-50));
  --color-action: light-dark(var(--blue-600), var(--blue-300));
  --color-action-hover: color-mix(in oklch, var(--color-action) 85%, var(--color-text));
}

/* Manual toggle: an attribute on <html> pins the scheme */
:root[data-theme="light"] { color-scheme: light; }
:root[data-theme="dark"]  { color-scheme: dark; }

body {
  background: var(--color-surface);
  color: var(--color-text);
}

.button {
  background: var(--color-action);
  color: var(--color-surface);

  &:hover { background: var(--color-action-hover); }
}
```

### Fallback without `light-dark()`

```css
:root {
  --color-surface: #ffffff;
  --color-text: #1f1f1f;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --color-surface: #121212;
    --color-text: #f0f0f0;
  }
}

:root[data-theme="dark"] {
  --color-surface: #121212;
  --color-text: #f0f0f0;
}
```

### Component API through variables

```css
.badge {
  --badge-bg: var(--color-action);     /* public knobs with defaults */
  --badge-fg: var(--color-surface);
  background: var(--badge-bg);
  color: var(--badge-fg);
}

.alert .badge { --badge-bg: var(--color-danger); }  /* consumer customizes, no override war */
```

### Animating a registered property

```css
@property --angle {
  syntax: "<angle>";
  inherits: false;
  initial-value: 0deg;
}

.spinner-border {
  background: conic-gradient(from var(--angle), var(--color-action), transparent);
  animation: spin 1s linear infinite;
}

@keyframes spin { to { --angle: 360deg; } }
```

Without `@property`, the gradient would jump between keyframes instead of rotating smoothly.

---

## When to use

- For every value that a theme, brand, or density mode might change: colors, radii, spacing, shadows, font families.
- As the **public styling API** of components — exposing `--component-*` knobs is cleaner than consumers overriding internal selectors.
- For dark mode, combining `color-scheme`, `light-dark()` (or `prefers-color-scheme`), and a manual toggle via an attribute on `<html>`.
- With `@property` when a variable must animate or must reject invalid values.
- As the output target of a design-token pipeline so web consumers get runtime-switchable themes.

## When NOT to use

- Do not expose raw palette variables (`--blue-600`) to components — themes then require editing components. Use semantic names.
- Do not create a variable for every single value; constants that never vary per theme or context can stay literal (or be build-time Sass/token constants).
- Do not use custom properties inside media query conditions (`@media (width > var(--bp))`) — it does not work; breakpoints need build-time values or custom media (not yet Baseline).
- Do not set frequently-changing variables (e.g. pointer position) on `:root` when only one element needs them — every descendant that inherits it must recalculate style. Set them on the element, or register with `inherits: false`.
- Do not rely on `light-dark()` alone for audiences on browsers older than mid-2024 without the media-query fallback.

---

## References

- W3C. [CSS Custom Properties for Cascading Variables Module Level 1](https://www.w3.org/TR/css-variables-1/). W3C.
- W3C. [CSS Properties and Values API Level 1 (`@property`)](https://www.w3.org/TR/css-properties-values-api-1/). W3C.
- W3C. [CSS Color Module Level 5 (`color-mix()`, `light-dark()`, relative color)](https://www.w3.org/TR/css-color-5/). W3C.
- MDN Web Docs. [Using CSS custom properties](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties). Mozilla.
- MDN Web Docs. [light-dark()](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/light-dark). Mozilla.
- web.dev. [@property: giving superpowers to CSS variables](https://web.dev/articles/at-property). Google.
- Design Tokens Community Group. [Design Tokens Format Module](https://www.designtokens.org/). W3C Community Group.
