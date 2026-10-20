---
type: concept
tags:
  - architecture
  - frontend
  - styling
  - css
  - concept
related:
  - software-engineering/architecture/frontend/design-system-architecture
  - software-engineering/architecture/frontend/component-driven-architecture
  - software-engineering/architecture/frontend/layered-frontend-architecture
  - languages/react/styling
  - languages/react/folder-structure
  - languages/css/cascade-specificity-and-inheritance
  - languages/css/methodologies
  - software-engineering/architecture/frontend/styling/design-tokens
language: null
---

# CSS Architecture and Organization

> Organise styles as layers with a one-way dependency direction and give every component a small public style API, so the cascade works for you instead of against you as the codebase grows.

---

## What is it?

CSS architecture is the set of decisions about where styles live in a project, which styles are allowed to affect which elements, and in what order they win when they disagree. It is the styling counterpart of [layered frontend architecture](../layered-frontend-architecture.md): instead of modules and imports, the units are style layers, selectors and the cascade.

Three questions define it:

- **Layering** — which kinds of style exist (settings, tokens, reset, layout, components, utilities) and in what priority order.
- **Placement** — which styles are global and which are colocated with the component that uses them.
- **Contract** — what a component exposes for styling from the outside (classes, variants, custom properties) and what it keeps private.

The tool you use to write CSS — plain CSS, Sass, CSS Modules, utility classes, CSS-in-JS — is a separate decision covered in [styling approaches compared](../../../../languages/css/styling-approaches-comparison.md). Every one of those tools still needs the three answers above.

---

## Why does it matter?

CSS is global, inherited and cascading by default. In a small project that is a feature; in a large one it produces a predictable set of failures:

- **Specificity wars** — a component needs to override a global rule, so someone adds a more specific selector, then someone else adds `!important`, and the next change must out-shout both.
- **Order-dependent bugs** — two stylesheets with equal specificity; whichever loads last wins, and the load order changes when a bundler splits chunks differently.
- **Fear of deletion** — nobody knows which pages a rule affects, so dead CSS is never removed and the stylesheet only grows.
- **Coupled components** — a page reaches into `.card .card__title span` to restyle a child, and refactoring the card's markup silently breaks the page.

A deliberate architecture replaces these accidents with rules: a fixed layer order (so priority is decided by intent, not by specificity or load order), a dependency direction (so lower layers never know about higher ones), and component boundaries (so markup can change without breaking consumers).

---

## How it works

### Layers ordered by reach and specificity

The core idea, popularised by Harry Roberts' ITCSS (Inverted Triangle CSS), is to order styles from **far-reaching and generic** to **narrow and explicit**. Each layer affects fewer elements than the one before it and is allowed to override it.

```
   ▼ wide reach, low specificity
  ┌───────────────────────────────────────────┐
  │ settings / tokens   values only, no output  │  custom properties, Sass variables
  ├───────────────────────────────────────────┤
  │ reset / base        bare element selectors  │  box-sizing, body, a, h1…
  ├───────────────────────────────────────────┤
  │ layout              structural primitives   │  .stack, .cluster, page grid
  ├───────────────────────────────────────────┤
  │ components          one block per component │  .button, .card, .dialog
  ├───────────────────────────────────────────┤
  │ utilities           single-purpose helpers  │  .visually-hidden, .mt-0
  └───────────────────────────────────────────┘
   ▲ narrow reach, highest priority
```

ITCSS itself uses seven layers (Settings, Tools, Generic, Elements, Objects, Components, Utilities); the five above are a common simplification. The number matters less than the rule: **each layer may only depend on layers above it in the diagram**.

### Mapping layers onto `@layer`

Before cascade layers, the order was enforced by import order and by keeping specificity low on purpose. Native `@layer` makes the order explicit and independent of specificity: a rule in a later layer beats a rule in an earlier layer, even if the earlier one has a more specific selector. Mechanics are covered in [cascade, specificity and inheritance](../../../../languages/css/cascade-specificity-and-inheritance.md); the architectural consequence is that you declare the order once, at the entry point:

```css
/* The first @layer statement fixes the order for the whole page. */
@layer tokens, reset, base, layout, components, utilities;
```

Three properties of layers shape the architecture:

- **Unlayered styles beat every layer** (for normal declarations). Anything not placed in a layer — a third-party stylesheet, a legacy file — sits above `utilities`. That is useful for migration (see [evolving and migrating styles](evolving-and-migrating-styles.md)) and dangerous by accident.
- **Layer order is decided by first appearance.** Declaring the order statement first, in one entry file, is what makes it deterministic.
- **Layers can nest** (`components.button`), which lets a design-system package own a sub-layer without negotiating global names.

Tokens are often placed in their own layer even though custom properties rarely conflict; keeping them separate makes "values" and "rules that use values" visibly different things.

### Global versus colocated

Not every style belongs next to a component. The split follows the layers:

| Style kind | Where it lives | Why |
|---|---|---|
| Tokens, reset, base element styles | Global, loaded once at the app entry | They apply everywhere by definition |
| Layout primitives | Global or in a shared `layout` package | Reused across pages; not owned by one feature |
| Component styles | Colocated with the component file | Deleted together, reviewed together, moved together |
| Page/feature composition | Colocated with the page | Arranges components; never restyles their internals |
| Utilities | Global, generated or hand-written | Small, stable, used across the app |

The test for colocation is deletion: if removing the component should remove the styles, they belong next to it.

### The component style API

A component's styling surface should be designed like any other public API. Consumers may use what is published; everything else is private.

- **Root class** — the single hook a parent may use for *placement* (margin, grid area, width), never for appearance.
- **Variants** — a closed set of modifiers (`data-variant="primary"`, `.button--danger`, a `variant` prop) for the appearance options the component supports.
- **Custom properties** — named knobs (`--button-padding-inline`, `--card-accent`) for the values the component deliberately lets consumers tune.
- **Parts** — for Web Components, `::part()` exposes specific internal elements explicitly.

What is **not** part of the API: descendant selectors into the component's internals (`.checkout .button span`), its internal class names, or its DOM structure. A consumer that depends on these breaks when the component's markup changes — which is exactly the coupling the API exists to prevent.

```
     consumer (page)                       component (button)
  ┌──────────────────────┐   public    ┌──────────────────────────┐
  │ .checkout__pay {      │ ─────────► │ root class (placement)   │
  │   grid-area: pay;     │            │ data-variant             │
  │   --button-accent: …; │            │ --button-* properties    │
  │ }                     │            ├──────────────────────────┤
  │                       │  ✗ never   │ .button__icon, span,     │
  │ .checkout .button svg │ ─────────► │ internal structure       │
  └──────────────────────┘            └──────────────────────────┘
```

### Dependency direction

Two dependency rules keep the system acyclic:

1. **Down the layers, never up.** Components reference tokens; tokens never reference components. A reset never mentions `.card`.
2. **Parent arranges, child paints.** A page sets where a component goes and may set its published custom properties; the component alone decides how it looks inside.

When a page needs something the component does not offer, the fix is to extend the component's API (a new variant or custom property), not to reach into it.

### Folder layouts

Two layouts cover most projects. Both encode the same layers; they differ in where component styles sit.

```
# Layer-first (classic, good for server-rendered sites and Sass codebases)
styles/
  main.css            ← @layer order + @imports, the only entry
  settings/  tokens.css
  base/      reset.css  elements.css
  layout/    stack.css  page-grid.css
  components/ button.css  card.css
  utilities/ helpers.css

# Feature-first (component frameworks)
src/
  styles/
    index.css         ← @layer order, tokens, reset, base, layout, utilities
  components/
    button/  Button.tsx  button.module.css
    card/    Card.tsx    card.module.css
  features/
    checkout/ Checkout.tsx  checkout.module.css
```

In the feature-first layout the global `styles/` folder holds everything *except* components, and each component file wraps its rules in `@layer components` (or relies on the bundler to place them there).

---

## Examples

Entry point that fixes the layer order and imports global layers. Third-party CSS is pushed into a low layer so it cannot override application components:

```css
/* src/styles/index.css */
@layer tokens, reset, vendor, base, layout, components, utilities;

@import url("./reset.css") layer(reset);
@import url("some-date-picker/dist/styles.css") layer(vendor);
@import url("./base.css") layer(base);
@import url("./tokens.css") layer(tokens);
@import url("./layout.css") layer(layout);
@import url("./utilities.css") layer(utilities);
```

A component with an explicit style API — variants via a data attribute, tunables via custom properties, everything else private:

```css
/* components/button/button.css */
@layer components {
  .button {
    /* Public knobs, with defaults taken from semantic tokens */
    --button-bg: var(--color-action-bg);
    --button-fg: var(--color-action-fg);
    --button-padding-inline: var(--space-4);

    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--button-padding-inline);
    background: var(--button-bg);
    color: var(--button-fg);
    border-radius: var(--radius-md);
  }

  .button[data-variant="danger"] {
    --button-bg: var(--color-danger-bg);
    --button-fg: var(--color-danger-fg);
  }

  /* Internal element: not part of the API, may change without notice */
  .button__icon { inline-size: 1em; block-size: 1em; }
}
```

A consumer that respects the contract — placement plus a published property, no reaching inside:

```css
/* features/checkout/checkout.css */
@layer components {
  .checkout__pay {
    grid-area: pay;                       /* placement: allowed */
    --button-padding-inline: var(--space-8); /* published knob: allowed */
  }

  /* ✗ Do not: couples checkout to button internals
  .checkout .button__icon { display: none; } */
}
```

---

## When to use

- Any codebase expected to outlive its first author or grow past a handful of pages.
- Projects with more than one source of CSS (an app, a design-system package, third-party widgets), where load order would otherwise decide priority.
- Teams that keep reaching for `!important` or ever-longer selectors to win an override — the symptom of missing layers.
- Component libraries, where a documented style API is what lets consumers customise without forking.

## When NOT to use

- A single landing page or prototype — one stylesheet with sensible ordering is enough; layer scaffolding is overhead.
- As a substitute for choosing a styling tool — an architecture does not decide between CSS Modules and utilities; see [styling approaches compared](../../../../languages/css/styling-approaches-comparison.md).
- Forcing a seven-layer ITCSS structure onto a utility-first project — Tailwind v4 already emits its own `theme`, `base`, `components` and `utilities` layers; align with them instead of nesting another full hierarchy around them.
- Exposing every internal value as a custom property "just in case" — an API with fifty knobs is no API; publish only what you are prepared to keep stable.

---

## References

- Roberts, Harry (author of ITCSS) — as presented in Kmetko, Lubos. [ITCSS: Scalable and Maintainable CSS Architecture](https://www.xfive.co/blog/itcss-scalable-maintainable-css-architecture/). xfive.
- Roberts, Harry. [The Specificity Graph](https://csswizardry.com/2014/10/the-specificity-graph/). CSS Wizardry.
- MDN Web Docs. [`@layer`](https://developer.mozilla.org/en-US/docs/Web/CSS/@layer).
- MDN Web Docs. [Cascade layers](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Styling_basics/Cascade_layers).
- MDN Web Docs. [`::part()`](https://developer.mozilla.org/en-US/docs/Web/CSS/::part).
