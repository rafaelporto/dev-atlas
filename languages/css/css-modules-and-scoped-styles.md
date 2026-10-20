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
  - languages/vue/template-syntax-and-components
  - languages/svelte/components-and-templates
  - languages/angular/components-and-templates
  - software-engineering/architecture/frontend/component-driven-architecture
  - languages/css/cascade-specificity-and-inheritance
  - software-engineering/architecture/frontend/styling/styling-micro-frontends
  - languages/css/styling-approaches-comparison
language: "css"
---
# CSS Modules and Scoped Styles

> Scoped styling keeps a component's CSS from leaking into the rest of the page — by rewriting class names at build time (CSS Modules), by adding per-component attributes or classes (Vue, Svelte, Angular), or natively with `@scope` and Shadow DOM.

---

## What is it?

Scoped styles are CSS rules that only affect the part of the page they were written for, so a `.title` rule in one component cannot accidentally restyle a `.title` somewhere else.

CSS has no built-in notion of "this file belongs to this component": every selector in every loaded stylesheet applies to the whole document. Scoping techniques add that boundary. They fall into three families:

| Family | Mechanism | Examples |
|---|---|---|
| **Build-time class renaming** | Each class name is rewritten to a unique identifier and exported to JavaScript | CSS Modules |
| **Build-time selector rewriting** | The compiler tags a component's elements with a unique attribute or class and appends it to every selector | Vue `<style scoped>`, Svelte component styles, Angular Emulated encapsulation |
| **Native browser scoping** | The browser itself limits where selectors match | `@scope`, Shadow DOM |

[Naming methodologies](methodologies.md) such as BEM attack the same problem by convention instead of tooling.

---

## Why does it matter?

The global namespace is CSS's oldest scaling problem:

- **Collisions** — two teams both write `.button`; whichever loads last wins, and the result depends on bundle order.
- **Fear of deletion** — nobody can prove a selector is unused, so dead CSS accumulates forever.
- **Specificity wars** — to beat a rule you do not own, you add a class, then an ID, then `!important`.
- **Leaky refactors** — renaming markup in one component silently breaks a descendant selector written elsewhere.

Scoping turns "any rule can affect any element" into "a component's rules affect that component", which makes styles as locally reasonable as the component code beside them. It also makes deletion safe: remove the component and its styles go with it.

What scoping does **not** solve: consistency of values (that is [design tokens](../../software-engineering/architecture/frontend/styling/design-tokens.md) and [custom properties](custom-properties-and-theming.md)), ordering between layers of CSS (that is `@layer` — see [cascade, specificity and inheritance](cascade-specificity-and-inheritance.md)), or inherited properties like `color` and `font-family`, which still flow into scoped subtrees in every technique except none.

---

## How it works

### CSS Modules

CSS Modules is a community specification (not a W3C standard) implemented by bundlers — Vite, webpack's `css-loader`, Next.js, Parcel, Lightning CSS, and others. By convention, files named `*.module.css` (or `.module.scss`) are treated as modules.

```
 Button.module.css               build                    output
 ┌───────────────────┐                        ┌─────────────────────────────────┐
 │ .root { … }       │  ──▶  rename classes ──▶│ .Button_root_x7f2a { … }        │
 │ .primary { … }    │       export a map     │ .Button_primary_k91c { … }      │
 └───────────────────┘                        └─────────────────────────────────┘
                                 │
                                 ▼
         import styles from "./Button.module.css"
         styles = { root: "Button_root_x7f2a", primary: "Button_primary_k91c" }
```

Key features:

- **Local by default** — every class and `@keyframes` name is renamed. Element selectors (`button`), attribute selectors and IDs are *not* renamed, so `button { … }` in a module is still global. Use classes.
- **`:global`** — opts a selector out of renaming: `:global(.is-open) .root { … }` or a `:global { … }` block. Use it for state classes set by third-party code or for styling markup you do not render.
- **`composes`** — a class can include other classes, from the same file or another module: `composes: base from "./shared.module.css";`. At build time this exports *both* class names on the consuming key, so the element receives multiple classes rather than duplicated declarations. Composition order across files is not guaranteed to match source order — avoid composing classes that set the same property.
- **Naming conventions** — bundlers can export `kebab-case` classes as `camelCase` keys (`localsConvention` in Vite/`css-loader`). Many teams write camelCase class names to avoid bracket access.
- **Tooling** — class names stay real CSS, so DevTools, linters, Sass and PostCSS all work. In development, readable patterns like `[name]_[local]_[hash]` help debugging.

**TypeScript typings.** By default TypeScript knows nothing about `.module.css` imports. Options, from loosest to strictest:

1. An ambient declaration — every key is `string`; typos are not caught.
2. A language-service plugin (such as `typescript-plugin-css-modules`) — editor autocomplete and errors, not enforced by `tsc`.
3. Generated `.d.ts` files (such as `typed-css-modules`, or bundler plugins that emit them) — real compile-time checking; the declarations must be regenerated as CSS changes.

### Framework-scoped styles

Component frameworks with single-file components scope styles by rewriting selectors at compile time.

**Vue — `<style scoped>`**

The compiler adds a `data-v-<hash>` attribute to every element in the component's template and appends `[data-v-<hash>]` to each selector's last compound:

```
.title { … }   ──▶   .title[data-v-7ba5bd90] { … }
```

- A child component's **root element** receives both the parent's and the child's attribute, so the parent can position the child's root (by design).
- `:deep(.x)` reaches into child components; `:slotted(.x)` targets slot content; `:global(.x)` escapes scoping.
- `<style module>` gives CSS Modules semantics instead, exposed as `$style` (or `useCssModule()`).
- `v-bind()` inside `<style>` binds a CSS value to component state; Vue compiles it to a hashed custom property set inline on the component root.
- Caveats from the Vue docs: element selectors combined with attribute selectors are slower than class selectors, and content inserted with `v-html` is not scoped.

**Svelte — component styles**

Styles in a component's `<style>` block are scoped by default. The compiler adds a hash class (`svelte-xyz123`) to matched elements and to the selectors, which adds **0-1-0 specificity** to each scoped selector — so component styles usually beat global styles of the same shape regardless of load order. Repeated occurrences in a selector use `:where(.svelte-xyz123)` to avoid stacking more specificity. `@keyframes` are scoped too; `:global(...)` and `:global { … }` opt out. Svelte also warns about, and removes, selectors that match nothing in the template.

**Angular — view encapsulation**

Each component chooses an `encapsulation` mode:

| Mode | Behaviour |
|---|---|
| `ViewEncapsulation.Emulated` (default) | Adds generated attributes (`_ngcontent-…`, `_nghost-…`) to the template and its selectors. Component styles stay inside; global styles still apply inward. Supports `:host` and `:host-context()`. |
| `ViewEncapsulation.ShadowDom` | Renders the component inside a real shadow root; styles are isolated by the browser, global styles do **not** apply inward. |
| `ViewEncapsulation.ExperimentalIsolatedShadowDom` | An experimental stricter Shadow DOM mode listed in current Angular docs; treat as unstable. |
| `ViewEncapsulation.None` | No scoping: component styles are added to the document as global CSS. |

`::ng-deep` pierces encapsulation but is kept only for backwards compatibility; the Angular team discourages new use. Prefer custom properties or explicit inputs for parent-to-child styling.

### Native: `@scope`

`@scope` limits selectors to a subtree, optionally with a lower boundary ("donut scope"):

```css
@scope (.card) to (.card__content) {
  img { border-radius: 8px; }   /* images in the card chrome, not in the slotted content */
}
```

- Selectors inside the block do not gain the scope root's specificity (`:scope` itself counts as a pseudo-class, 0-1-0).
- **Scope proximity** is a new cascade criterion: when two scoped rules conflict with equal specificity, the one whose root is closer in the DOM wins — useful for nested themes.
- Support: Chromium and Safari shipped it first, Firefox followed in version 146 (December 2025), and `@scope` became Baseline newly available in March 2026, when the web-features dataset records full support across all three engines. Check your browser targets before relying on it without fallback.
- Unlike build-time scoping, `@scope` does not rename anything; names can still collide *within* a scope. It complements, rather than replaces, CSS Modules or a naming convention.

### Native: Shadow DOM

A shadow root is a separate DOM tree attached to an element (used by Web Components). Styles inside it do not leak out, and document selectors do not match in.

```
document styles ──X──▶ [shadow root] ──X──▶ document
                        │
inherited properties ───┼──▶ (color, font, …) DO cross
custom properties ──────┼──▶ (--brand, …) DO cross   ← the theming channel
::part(name) ───────────┼──▶ styles elements the component explicitly exposes
```

- `:host` / `:host(.variant)` — style the custom element from inside.
- `::slotted(selector)` — style top-level light-DOM children passed into a `<slot>`.
- `::part(name)` — the component marks internals with `part="label"`; outside CSS can then target `my-button::part(label)`. Only what is exposed is styleable.
- **Inherited properties and custom properties cross the boundary.** Design-system Web Components therefore read `var(--…)` tokens set by the host page — the standard way to theme them.
- Styles can be shared across many shadow roots via constructable stylesheets (`adoptedStyleSheets`), and declarative shadow DOM (`<template shadowrootmode="open">`) allows server rendering.

Shadow DOM gives the strongest isolation, which is also its cost: global resets, utility classes and typography styles from the page do not apply inside unless re-imported.

### Comparing the options

| | CSS Modules | Vue scoped | Svelte | Angular Emulated | `@scope` | Shadow DOM |
|---|---|---|---|---|---|---|
| Mechanism | Rename classes | Attribute per component | Hash class | Attributes | Native cascade | Separate tree |
| Global styles reach in | Yes | Yes | Yes | Yes | Yes | Only inherited props, custom props, `::part` |
| Escape hatch | `:global` | `:deep`, `:global` | `:global` | `::ng-deep` (discouraged) | Write outside the scope | `::part`, custom props |
| Specificity added | None | +attribute (0-1-0) | +class (0-1-0) | +attribute (0-1-0) | None | n/a (separate tree) |
| Framework-agnostic | Yes (bundler) | No | No | No | Yes | Yes |
| Requires build step | Yes | Yes | Yes | Yes | No | No |

---

## Examples

### CSS Modules with `composes`, `:global` and typed imports

```css
/* shared.module.css */
.focusRing:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}
```

```css
/* Button.module.css */
.root {
  composes: focusRing from "./shared.module.css";
  padding: 0.5rem 1rem;
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.primary {
  background: var(--color-brand);
  color: var(--color-on-brand);
}

/* Third-party code toggles a global class on <html> */
:global(.reduced-motion) .root {
  transition: none;
}
```

```ts
// src/types/css-modules.d.ts — loosest option: every key is a string
declare module "*.module.css" {
  const classes: { readonly [key: string]: string };
  export default classes;
}
```

```tsx
import styles from "./Button.module.css";

type Props = { variant?: "primary" | "default"; children: React.ReactNode };

export function Button({ variant = "default", children }: Props) {
  const className = [styles.root, variant === "primary" && styles.primary]
    .filter(Boolean)
    .join(" ");
  return <button className={className}>{children}</button>;
}
// Rendered: class="Button_root_x7f2a shared_focusRing_p01b Button_primary_k91c"
```

### Vue scoped styles with `:deep` and `v-bind`

```vue
<script setup lang="ts">
const props = defineProps<{ accent: string }>();
</script>

<template>
  <section class="panel">
    <slot />
  </section>
</template>

<style scoped>
.panel {
  border-inline-start: 4px solid v-bind("props.accent");
  padding: 1rem;
}
/* style links rendered by a child component */
.panel :deep(a) { text-decoration-thickness: 2px; }
</style>
```

### Svelte

```svelte
<p class="note">Saved.</p>

<style>
  .note { color: var(--color-success); }       /* → .note.svelte-1a2b3c */
  :global(body.compact) .note { margin: 0; }   /* opt out for an outer selector */
</style>
```

### Angular encapsulation choice

```ts
@Component({
  selector: "app-badge",
  template: `<span class="badge"><ng-content /></span>`,
  styles: `
    :host { display: inline-block; }
    .badge { padding: 0 0.5rem; background: var(--badge-bg, var(--color-neutral-100)); }
  `,
  encapsulation: ViewEncapsulation.Emulated, // default; ShadowDom for true isolation
})
export class BadgeComponent {}
```

The parent themes the badge by setting `--badge-bg`, not by reaching in with `::ng-deep`.

### Native `@scope` with proximity

```css
@scope (.theme-light) { a { color: var(--blue-700); } }
@scope (.theme-dark)  { a { color: var(--blue-200); } }
```

```html
<div class="theme-dark">
  <div class="theme-light">
    <a href="/docs">Docs</a> <!-- light wins: its scope root is closer -->
  </div>
</div>
```

Without `@scope`, the two selectors have equal specificity and the later rule wins regardless of nesting.

### A themable Web Component

```css
/* inside the shadow root of <ds-button> */
:host { display: inline-flex; }
:host([variant="primary"]) .btn { background: var(--ds-color-brand, navy); }
.btn { padding: var(--ds-space-2, 0.5rem) var(--ds-space-4, 1rem); }
```

```html
<!-- shadow template: <button class="btn" part="control"><slot></slot></button> -->
```

```css
/* page CSS */
ds-button { --ds-color-brand: oklch(0.55 0.2 145); }   /* token crosses the boundary */
ds-button::part(control) { letter-spacing: 0.02em; }   /* only the exposed part */
```

---

## When to use

- **CSS Modules** — component codebases (React, Preact, Solid, plain TS) that want real CSS files with collision-free names and no runtime; also as a migration target from global CSS, one component at a time.
- **Framework-scoped styles** — the default in Vue, Svelte and Angular; use them unless you have a strong reason to adopt another system.
- **`@scope`** — styling regions of server-rendered or CMS markup where you cannot control class names; nested themes that need proximity; donut-shaped boundaries around slotted content.
- **Shadow DOM** — Web Components and design systems shipped to unknown host pages, embeddable widgets, and micro-frontends that must not be affected by host CSS (see [styling micro-frontends](../../software-engineering/architecture/frontend/styling/styling-micro-frontends.md)).

---

## When NOT to use

- **Relying on scoping to fix value consistency** — scoped styles still drift without shared tokens.
- **Heavy use of `:global`, `:deep` or `::ng-deep`** — if most rules escape scoping, the component boundary is wrong; expose custom properties or variants instead.
- **Element selectors inside CSS Modules** (`button { … }`) — they are not renamed and leak globally.
- **`composes` for overriding** — composed classes that set the same property resolve by stylesheet order, which you do not control.
- **Shadow DOM for ordinary app components** — you lose global resets, utilities and typography and must re-import them per root; the isolation is rarely worth it inside a single app.
- **`@scope` as the only defence in apps with legacy browser targets** — it is newly Baseline; check support data.
- **Angular `ViewEncapsulation.None` by default** — it turns component styles into unscoped global CSS that depends on load order.

---

## References

- [CSS Modules](https://github.com/css-modules/css-modules) — community specification
- [Vite: CSS Modules](https://vite.dev/guide/features.html#css-modules) — official
- [typed-css-modules](https://github.com/Quramy/typed-css-modules) — community tool for generating `.d.ts` files
- [Vue: SFC CSS features](https://vuejs.org/api/sfc-css-features.html) — official
- [Svelte: Scoped styles](https://svelte.dev/docs/svelte/scoped-styles) — official
- [Angular: Styling components](https://angular.dev/guide/components/styling) — official
- [MDN: `@scope`](https://developer.mozilla.org/en-US/docs/Web/CSS/@scope)
- [MDN: Using shadow DOM](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM)
- [MDN: `::part()`](https://developer.mozilla.org/en-US/docs/Web/CSS/::part) and [`:host`](https://developer.mozilla.org/en-US/docs/Web/CSS/:host)
- [web.dev: New to the web platform in December 2025](https://web.dev/blog/web-platform-12-2025) — Firefox 146 ships `@scope`
