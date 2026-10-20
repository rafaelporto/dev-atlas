---
type: concept
tags:
  - language
  - css
  - styling
  - frontend
related:
  - software-engineering/architecture/frontend/design-system-architecture
  - software-engineering/architecture/frontend/component-driven-architecture
  - languages/react/styling
  - languages/css/cascade-specificity-and-inheritance
  - software-engineering/architecture/frontend/styling/css-architecture-and-organization
language: "css"
---
# CSS Methodologies

> BEM, OOCSS, SMACSS, ITCSS, CUBE CSS and Atomic CSS are community conventions — not standards — for naming and organising CSS so it stays predictable as a codebase grows; each targets a different failure (naming collisions, duplication, ordering, specificity), and modern features like `@layer` and `@scope` now enforce parts of them natively.

---

## What is it?

A CSS methodology is an agreed set of rules for how a team names classes and arranges stylesheets, so that anyone can guess what a class does and where its CSS lives.

None of these are W3C specifications. They are **community methodologies**, each published by an individual or company, and they are adopted by convention, linting and code review — the browser does not know about them.

| Methodology | Author / origin | Primary target |
|---|---|---|
| **BEM** (Block, Element, Modifier) | Yandex, early 2010s | Naming: collisions and implicit relationships |
| **OOCSS** (Object-Oriented CSS) | Nicole Sullivan, 2008–2009 | Duplication: reusable visual "objects" |
| **SMACSS** (Scalable and Modular Architecture for CSS) | Jonathan Snook, 2011 | Categorisation: what kind of rule is this? |
| **ITCSS** (Inverted Triangle CSS) | Harry Roberts, ~2014 | Ordering and specificity across the whole codebase |
| **CUBE CSS** (Composition, Utility, Block, Exception) | Andy Bell, 2020 | Working *with* the cascade instead of against it |
| **Atomic CSS** | Thierry Koblentz / Yahoo (Atomizer), 2013 | Eliminating per-component CSS entirely |

---

## Why does it matter?

CSS fails at scale in predictable ways: global names collide, specificity escalates, source order decides winners silently, and nobody can delete anything. Tools (CSS Modules, scoped styles, CSS-in-JS, utility frameworks) solve some of these mechanically; methodologies solve them socially, and they remain relevant because:

- **Not every codebase has a build-time scoping tool** — server-rendered templates, CMS themes, WordPress, email-adjacent markup, design systems shipped as plain CSS.
- **Scoping does not solve ordering or layering** — even with CSS Modules, a codebase still needs to decide where resets, base element styles, layout primitives and utilities live and which wins.
- **They encode trade-offs worth knowing** — utility-first is Atomic CSS plus tooling; component-scoped styles are BEM blocks enforced by a compiler; `@layer` is ITCSS in the browser.

See [CSS architecture and organization](../../software-engineering/architecture/frontend/styling/css-architecture-and-organization.md) for how these ideas shape a whole frontend.

---

## How it works

### BEM — Block, Element, Modifier

Naming encodes structure:

```
.block                  standalone component        .card
.block__element         part of a block             .card__title
.block--modifier        variant or state            .card--featured
.block__element--mod    variant of a part           .card__title--muted
```

Rules: style only with single classes (no IDs, no element selectors, no nesting by descendant), so every selector has the same specificity (0-1-0) and source order inside a block is the only tiebreaker. Elements belong to exactly one block; a block can be nested inside another, but never styled by it — the parent positions the child with a **mix** (`class="card__media media"`).

Trade-offs: verbose class names; deep element chains (`.card__header__title`) are a common mistake (BEM elements are flat). Frameworks with scoped styles enforce BEM's goal (no leakage) mechanically, which is why BEM is less common in component codebases — but it is still the standard naming choice for plain-CSS design systems.

### OOCSS — Object-Oriented CSS

Two principles:

1. **Separate structure from skin** — layout properties (dimensions, spacing, display) live in one class; visual properties (colors, borders, shadows) in another, so either can be reused independently.
2. **Separate container from content** — an object looks the same wherever it is placed; avoid `.sidebar h3`, prefer `.heading-small`.

Its canonical example is the **media object** (image on one side, text on the other), reused across comments, profile headers and list items. OOCSS introduced the idea that reusable CSS is a set of composable *objects* — the ancestor of layout primitives (stack, cluster, sidebar) and of utility classes.

### SMACSS

Categorises every rule into one of five types, each with its own conventions:

| Category | Contents | Typical convention |
|---|---|---|
| Base | Element defaults (`html`, `a`, `input`) | Element selectors only |
| Layout | Major page regions | `l-` prefix (`.l-sidebar`) |
| Module | Reusable components | Plain names (`.card`, `.card-title`) |
| State | Temporary conditions | `is-` prefix (`.is-active`, `.is-hidden`) |
| Theme | Alternative looks | `theme-` prefix |

Its lasting contributions are the vocabulary ("module", `is-` state classes, which BEM and CUBE users still adopt) and the idea of reducing the "depth of applicability" — how deep in the DOM a selector reaches.

### ITCSS — Inverted Triangle CSS

Orders the whole codebase from **generic, far-reaching, low-specificity** rules to **explicit, narrow, high-specificity** ones:

```
 ┌────────────────────────────────────────────┐  Settings    tokens, variables (no CSS output)
 │                                            │  Tools       mixins, functions (no CSS output)
  \                                          /   Generic     resets, box-sizing, normalize
   \                                        /    Elements    bare element styles (h1, a, button)
    \                                      /     Objects     layout patterns (.o-container, .o-stack)
     \                                    /      Components  UI pieces (.c-card, .c-button)
      \                                  /       Utilities   overrides (.u-hidden) — may use !important
       └────────────────────────────────┘
   reach: wide → narrow     specificity: low → high     source order: first → last
```

Because each layer only ever overrides the ones above it, specificity and source order move in the same direction, and conflicts become rare. Prefixes (`o-`, `c-`, `u-`) are a common companion convention from Harry Roberts's namespacing guidance.

**`@layer` maps naturally onto ITCSS.** Cascade layers make the triangle enforceable by the browser: rules in a later layer win over earlier layers regardless of selector specificity. ITCSS's ordering stops depending on file concatenation order and careful selector discipline:

```css
@layer generic, elements, objects, components, utilities;
```

Settings and Tools produce no CSS and remain in your token pipeline or preprocessor. See [cascade, specificity and inheritance](cascade-specificity-and-inheritance.md) for layer precedence details, including that *unlayered* styles beat all layered ones.

### CUBE CSS

A methodology by Andy Bell that embraces the cascade and global styles first, then adds structure:

| Letter | Meaning | Example |
|---|---|---|
| **C**omposition | Layout primitives that arrange content, not style it | `.flow`, `.cluster`, `.sidebar`, `.wrapper` |
| **U**tility | Single-job classes, often generated from tokens | `.bg-primary`, `.text-step-2` |
| **B**lock | Component-specific styles — kept small because global styles and utilities do most of the work | `.card` |
| **E**xception | Deviations expressed as data attributes, not modifier classes | `[data-state="reversed"]` |

Global CSS (typography, element defaults, tokens) is written first and does most of the styling — "be the browser's mentor, not its micro-manager", in the author's framing. CUBE is a pragmatic hybrid of OOCSS compositions, utility classes and BEM-like blocks, and fits well with modern intrinsic layout (`clamp()`, flexbox/grid wrapping) and `@layer`.

### Atomic CSS

One class per declaration (`.D-f { display: flex }`, `.P-10px { padding: 10px }`), composed in markup. There is no per-component CSS to write, name or delete; the stylesheet grows with the number of *distinct declarations*, not with the number of components. Atomic CSS is the foundation of [utility-first CSS](utility-first-css.md) (Tailwind, UnoCSS) and of atomic CSS-in-JS compilers (StyleX, Panda CSS — see [CSS-in-JS](css-in-js.md)).

### What each methodology targets

| Problem | BEM | OOCSS | SMACSS | ITCSS | CUBE | Atomic |
|---|---|---|---|---|---|---|
| Name collisions | Strong | Weak | Medium | Medium (prefixes) | Medium | Strong (names are declarations) |
| Specificity wars | Strong (flat classes) | Medium | Medium | Strong | Medium | Strong |
| Ordering / which rule wins | Weak | Weak | Medium | Strong | Medium | Strong (one rule per property) |
| Duplication | Weak | Strong | Medium | Medium | Strong | Strong |
| File organisation | Weak | Weak | Strong | Strong | Medium | n/a |
| Works with the cascade | Avoids it | Avoids it | Partially | Orders it | Embraces it | Avoids it |

### Combining with modern CSS

Methodologies combine — most real codebases use a hybrid — and native features absorb parts of them:

| Native feature | Absorbs |
|---|---|
| `@layer` | ITCSS ordering; SMACSS categories as layers; utilities winning without `!important` |
| `@scope` | Part of BEM's purpose (limit where selectors reach) without encoding it in names; donut scopes for blocks containing slotted content |
| CSS nesting | BEM-like grouping of a block's rules in one place (without Sass's `&__element` concatenation) |
| Custom properties | OOCSS "skins" and SMACSS themes as variables instead of extra classes |
| `:where()` | Zero-specificity base and element styles, easy to override |
| Data / ARIA attribute selectors | CUBE exceptions and SMACSS states (`[aria-expanded="true"]` instead of `.is-open`) |

Build-time scoping (CSS Modules, Vue/Svelte/Angular — see [CSS Modules and scoped styles](css-modules-and-scoped-styles.md)) removes the need for BEM's naming discipline *inside* a component, but not the need for a layered global architecture around components.

---

## Examples

### BEM block with a mix

```html
<article class="card card--featured">
  <img class="card__media" src="/cover.avif" alt="">
  <div class="card__body flow">
    <h3 class="card__title">Release notes</h3>
    <p class="card__summary">What changed in 4.2.</p>
  </div>
</article>
```

```css
.card { display: grid; border-radius: var(--radius-md); background: var(--color-surface); }
.card--featured { border: 2px solid var(--color-brand); }
.card__media { aspect-ratio: 16 / 9; object-fit: cover; }
.card__title { font-size: var(--step-1); }
```

### ITCSS with cascade layers

```css
/* main.css */
@layer generic, elements, objects, components, utilities;

@import url("generic/reset.css") layer(generic);
@import url("elements/typography.css") layer(elements);
@import url("objects/stack.css") layer(objects);
@import url("components/card.css") layer(components);
@import url("utilities/visually-hidden.css") layer(utilities);
```

```css
/* elements/typography.css */
:where(h1, h2, h3) { line-height: 1.2; text-wrap: balance; }

/* objects/stack.css */
.o-stack > * + * { margin-block-start: var(--stack-space, 1rem); }

/* utilities/visually-hidden.css — wins over components by layer order, no !important */
.u-visually-hidden { position: absolute; inline-size: 1px; block-size: 1px; overflow: hidden; clip-path: inset(50%); }
```

### CUBE CSS

```html
<article class="card flow bg-surface" data-state="reversed">
  <img src="/team.avif" alt="">
  <div class="cluster">…</div>
</article>
```

```css
/* Composition */
.flow > * + * { margin-block-start: var(--flow-space, 1em); }
.cluster { display: flex; flex-wrap: wrap; gap: var(--space-s); align-items: center; }

/* Utility */
.bg-surface { background: var(--color-surface); }

/* Block */
.card { display: grid; gap: var(--space-m); padding: var(--space-m); }

/* Exception */
.card[data-state="reversed"] { direction: rtl; }
.card[data-state="reversed"] > * { direction: ltr; }
```

### SMACSS states as attributes

```css
/* SMACSS-style state class */
.nav-item.is-active { font-weight: 600; }

/* Modern equivalent driven by accessibility state */
.nav-item[aria-current="page"] { font-weight: 600; }
```

---

## When to use

- **Plain-CSS codebases without build-time scoping** — server-rendered apps, CMS themes, static sites: BEM or CUBE for naming, ITCSS for ordering.
- **Design systems distributed as CSS** to consumers you do not control — predictable names (BEM) and explicit layers (ITCSS + `@layer`) are the contract.
- **Global architecture around scoped components** — even with CSS Modules or Vue scoped styles, an ITCSS-like layering of reset, base, layout and utilities keeps the global layer sane.
- **Onboarding and code review** — a named methodology gives reviewers shared vocabulary ("that's an exception, use a data attribute").
- **CUBE CSS** when you want to lean on global typography and intrinsic layout and keep component CSS minimal.

---

## When NOT to use

- **Applying BEM naming inside already-scoped components** — `styles.card__title` in a CSS Module duplicates what the compiler guarantees; plain names suffice.
- **Treating any methodology as a standard** — they are conventions; adapt them, and document your local variant.
- **Mixing several naming schemes without a written rule** — BEM in one folder, SMACSS prefixes in another and utilities everywhere is worse than any single choice.
- **Strict ITCSS file ordering without `@layer`** in bundler setups that reorder imports — use layers so order is declared, not incidental.
- **Hand-written Atomic CSS** at scale — without a generator (Tailwind, UnoCSS, StyleX) the naming and coverage cost is high.
- **Methodology over product** — a small app with five components does not need a seven-layer triangle.

---

## References

- [BEM methodology](https://en.bem.info) — official Yandex BEM site (community methodology); also summarised at getbem.com
- [OOCSS wiki](https://github.com/stubbornella/oocss/wiki) — Nicole Sullivan, author's project (community methodology)
- [SMACSS](https://smacss.com) — Jonathan Snook, author's book site (community methodology)
- [CSS Guidelines](https://cssguidelin.es) — Harry Roberts, author's guidelines covering namespacing and specificity (community)
- [ITCSS: Scalable and Maintainable CSS Architecture](https://www.xfive.co/blog/itcss-scalable-maintainable-css-architecture/) — community write-up of Harry Roberts's ITCSS
- [CUBE CSS](https://cube.fyi) — Andy Bell, author's documentation site (community methodology)
- [Atomizer / ACSS](https://acss.io) — Yahoo's atomic CSS tool
- [Challenging CSS Best Practices](https://www.smashingmagazine.com/2013/10/challenging-css-best-practices-atomic-approach/) — Thierry Koblentz, community article
- [MDN: `@layer`](https://developer.mozilla.org/en-US/docs/Web/CSS/@layer)
- [MDN: `@scope`](https://developer.mozilla.org/en-US/docs/Web/CSS/@scope)
