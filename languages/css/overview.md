---
type: concept
tags:
  - language
  - css
  - styling
  - frontend
  - overview
related:
  - languages/react/styling
  - languages/nextjs/styling-and-assets
  - software-engineering/architecture/frontend/design-system-architecture
  - software-engineering/architecture/frontend/rendering-patterns
  - languages/css/cascade-specificity-and-inheritance
  - languages/css/styling-approaches-comparison
  - languages/css/modern-css
  - software-engineering/architecture/frontend/styling/css-architecture-and-organization
language: "css"
---
# CSS Overview

> CSS is the declarative language browsers use to turn a document into pixels — a cascade of rules resolved per element — and every styling approach on the web, from Sass to Tailwind to CSS-in-JS, ultimately compiles down to it.

---

## What is it?

CSS (Cascading Style Sheets) is the language that tells a browser how a web page should look: colors, fonts, spacing, layout, and animation. HTML says *what* the content is; CSS says *how* it is presented.

A stylesheet is a list of **rules**. Each rule pairs a **selector** (which elements) with **declarations** (which property gets which value):

```css
.card {             /* selector */
  padding: 1rem;    /* declaration: property + value */
  border-radius: 8px;
}
```

Many rules can target the same element with conflicting values. The browser resolves those conflicts with the **cascade** — the "C" in CSS and the core idea that makes the language both powerful and surprising.

### A short history

| Period | Milestone |
|---|---|
| 1996 | **CSS1** — fonts, colors, margins, basic box model. |
| 1998 | **CSS2** — positioning, z-index, media types. **CSS 2.1** (Recommendation 2011) fixed and clarified it; it is still the base of the core spec. |
| 2011 onward | **CSS3 is not a single spec.** The W3C CSS Working Group split CSS into independent **modules** (Selectors, Color, Flexbox, Grid, Cascade…), each versioned by its own **level** (e.g. Selectors Level 4, Color Level 5). |
| Today | There is **no "CSS4"**. The CSSWG publishes periodic **snapshots** that list which module levels are considered stable. Features ship module by module, browser by browser. |

The practical consequence: "does CSS support X?" is never answered by a version number, but by **browser support for that specific feature** — which is what Baseline tracks (see below).

---

## Why does it matter?

- **It is the only styling language the browser runs.** Sass, CSS Modules, Tailwind, styled-components, vanilla-extract — every approach is a different way of *authoring* or *delivering* CSS. Understanding the underlying language is what lets you debug any of them.
- **Native CSS has absorbed most reasons to use tooling.** Variables (custom properties), nesting, scoping (`@layer`, `@scope`), container queries, and color functions now exist natively. Many preprocessor and JavaScript workarounds from the 2010s are no longer necessary — see [Modern CSS](modern-css.md).
- **Styling decisions are architectural.** Choosing between global CSS, scoped CSS, CSS-in-JS, or utility classes affects bundle size, server rendering, theming, and how a design system scales across teams.

---

## How it works

### The pipeline at a glance

```
 HTML ──► DOM tree ──┐
                     ├─► match selectors ─► cascade ─► inheritance ─► computed values
 CSS  ──► CSSOM ─────┘    (per element)    (pick a     (fill in       │
                                            winner)     missing)      ▼
                                                                    layout ─► paint ─► composite
```

1. The browser parses HTML into the **DOM** and CSS into the **CSSOM**.
2. For every element and every property, it collects the declarations whose selectors match.
3. The **cascade** picks a winner among conflicting declarations: origin and importance, then cascade layers, then specificity, then source order. See [Cascade, Specificity and Inheritance](cascade-specificity-and-inheritance.md).
4. Properties with no winning declaration either **inherit** from the parent (e.g. `color`, `font-family`) or take their **initial value** (e.g. `margin: 0`).
5. Values are computed (`em` → px, `var()` substituted), then layout positions boxes ([Layout: Flexbox and Grid](layout-flexbox-and-grid.md)), and paint/composite draws them.

### The map of styling approaches

Each approach answers the same questions differently: *where do styles live, how are names scoped, when are they generated, and how are they shipped?*

| Approach | One line | Article |
|---|---|---|
| **Native CSS** | Plain `.css` files, now with variables, nesting, layers, and container queries built in. | [Modern CSS](modern-css.md) |
| **Preprocessors** | A language that compiles to CSS (Sass/SCSS, Less) adding mixins, functions, loops, and modules at build time. | [Sass](sass.md) |
| **Post-processors** | Tools that transform CSS after it is written (PostCSS, Lightning CSS): prefixing, minifying, lowering modern syntax for old browsers. | [Toolchain](toolchain.md) |
| **Scoped CSS / CSS Modules** | Real CSS whose class names are rewritten per file (or per component, as in Vue and Svelte) so they cannot collide. | [CSS Modules and Scoped Styles](css-modules-and-scoped-styles.md) |
| **CSS-in-JS (runtime)** | Styles written in JavaScript and injected at runtime (styled-components, Emotion); dynamic but with runtime cost. | [CSS-in-JS](css-in-js.md) |
| **CSS-in-JS (zero-runtime)** | Styles written in TypeScript but extracted to static CSS at build time (vanilla-extract, Linaria, Panda CSS). | [CSS-in-JS](css-in-js.md) |
| **Utility-first** | Small single-purpose classes composed in markup (Tailwind CSS, UnoCSS); the build ships only the classes used. | [Utility-first CSS](utility-first-css.md) |
| **Methodologies** | Naming and layering conventions for global CSS (BEM, ITCSS, CUBE CSS, OOCSS) — discipline instead of tooling. | [Methodologies](methodologies.md) |
| **Design tokens** | Named design decisions (`color.primary`, `space.4`) stored once and generated into CSS variables and other platforms. | [Design Tokens](../../software-engineering/architecture/frontend/styling/design-tokens.md) |

For a side-by-side decision guide see [Styling Approaches Comparison](styling-approaches-comparison.md); for team-scale structure see [CSS Architecture and Organization](../../software-engineering/architecture/frontend/styling/css-architecture-and-organization.md).

### Judging browser support: Baseline

**Baseline** is a cross-browser support label maintained by the W3C WebDX Community Group and shown on MDN, web.dev, and Can I Use. It covers the core browser set: Chrome, Edge, Firefox, and Safari (desktop and mobile).

| Status | Meaning |
|---|---|
| **Limited availability** | Not yet in all core browsers. Use with a fallback or progressive enhancement. |
| **Newly available** | Shipped in the latest stable version of every core browser. Users on older versions may lack it. |
| **Widely available** | 30 months have passed since it became newly available. Safe for most audiences without fallbacks. |

Teams typically set a policy such as "use Widely available freely; use Newly available with `@supports` fallbacks." The articles in this section cite Baseline status as reported by the `web-features` dataset in October 2026; check MDN for the current state.

---

## Examples

### A minimal, modern stylesheet

```css
@layer reset, base, components, utilities;   /* explicit cascade order */

@layer base {
  :root {
    --color-text: light-dark(#1a1a1a, #f0f0f0);
    --color-surface: light-dark(#ffffff, #121212);
    color-scheme: light dark;                 /* follow the OS theme */
  }

  body {
    color: var(--color-text);
    background: var(--color-surface);
    font: 1rem/1.5 system-ui, sans-serif;
  }
}

@layer components {
  .card {
    padding: 1rem;
    border-radius: 0.5rem;

    & h2 { margin-block-start: 0; }          /* native nesting */

    &:has(img) { padding-block-start: 0; }   /* parent selector */
  }
}
```

### Guarding a newer feature with `@supports`

```css
.tooltip {
  position: absolute;          /* fallback for browsers without anchor positioning */
  inset-block-start: 100%;
}

@supports (anchor-name: --a) {
  .trigger { anchor-name: --trigger; }
  .tooltip {
    position-anchor: --trigger;
    inset-block-start: anchor(bottom);
  }
}
```

---

## When to use

- Every web UI uses CSS; the question is only how it is authored and delivered.
- Prefer **plain modern CSS** (with layers, nesting, custom properties) as the default for content sites, server-rendered apps, and design systems meant to be framework-agnostic.
- Add tooling (preprocessor, CSS Modules, utility framework, zero-runtime CSS-in-JS) when it solves a concrete problem the team has: name collisions, type-safe tokens, or delivery speed.

## When NOT to use

- Do not reach for a framework or CSS-in-JS library before learning the cascade — most "CSS is broken" bugs are specificity or inheritance misunderstandings that tooling only hides.
- Do not encode logic or data in CSS (e.g. using generated content for meaningful text) — it is invisible to assistive technology and hard to test.
- Do not judge feature support by "CSS3/CSS4" labels or blog-post dates — check Baseline for the specific feature.

---

## References

- W3C CSS Working Group. [CSS Snapshot 2025](https://www.w3.org/TR/css-2025/). W3C.
- W3C. [Cascading and Inheritance (CSS Cascade Level 5)](https://www.w3.org/TR/css-cascade-5/). W3C.
- MDN Web Docs. [CSS: Cascading Style Sheets](https://developer.mozilla.org/en-US/docs/Web/CSS). Mozilla.
- web.dev. [Baseline](https://web.dev/baseline). Google.
- W3C WebDX Community Group. [web-features](https://github.com/web-platform-dx/web-features). GitHub.
