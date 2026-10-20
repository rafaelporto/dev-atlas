# CSS

> A study guide to styling the web: how CSS itself works — the cascade, layout, responsive design, custom properties — and the approaches built on and around it, from Sass and CSS Modules to CSS-in-JS and utility-first CSS.

For how styles are organised, shared, and evolved across a codebase — design tokens, monorepos, micro-frontends, and rendering strategies — see [Styling Architecture](../../software-engineering/architecture/frontend/styling/README.md).

---

## Overview

| Article | Description |
|---|---|
| [Overview](overview.md) | What CSS is, from CSS1 to levels and modules, the cascade at a glance, the map of styling approaches, and Baseline for judging browser support |

---

## Fundamentals

| Article | Description |
|---|---|
| [Cascade, Specificity, and Inheritance](cascade-specificity-and-inheritance.md) | The cascade sort order, specificity, inheritance, `!important`, `@layer`, `@scope`, and `:where()`/`:is()` |
| [Layout: Flexbox and Grid](layout-flexbox-and-grid.md) | Box model, formatting and stacking contexts, positioning, Flexbox, Grid and subgrid, and choosing a layout model |
| [Responsive Design](responsive-design.md) | Media queries, container size and style queries, `clamp()`, dynamic viewport units, logical properties, and responsive images |
| [Custom Properties and Theming](custom-properties-and-theming.md) | Custom properties, how variables cascade, `@property`, semantic variables, dark mode with `light-dark()`, and `color-mix()` |
| [Modern CSS](modern-css.md) | Recent features — nesting, `:has()`, view transitions, anchor positioning, and more — with Baseline status and what each replaces |

---

## Approaches

| Article | Description |
|---|---|
| [Sass](sass.md) | SCSS, variables, mixins, maps, `@extend` pitfalls, `@use`/`@forward` and the `@import` deprecation, and Less/Stylus compared |
| [CSS Modules and Scoped Styles](css-modules-and-scoped-styles.md) | The global-namespace problem: CSS Modules, Vue/Svelte/Angular scoping, and native `@scope` and Shadow DOM |
| [CSS-in-JS](css-in-js.md) | Runtime CSS-in-JS (styled-components, Emotion) and its costs vs zero-runtime extraction (Vanilla Extract, Linaria, Panda, StyleX) |
| [Utility-First CSS](utility-first-css.md) | Utility-first and atomic CSS: Tailwind CSS v4, UnoCSS, benefits, costs, the `@apply` debate, and token-based theming |
| [Methodologies](methodologies.md) | BEM, OOCSS, SMACSS, ITCSS, CUBE CSS, and Atomic CSS — what each targets and how `@layer`/`@scope` absorb them |
| [Styling Approaches Comparison](styling-approaches-comparison.md) | Decision matrix and decision flow across eight styling approaches: scoping, runtime cost, SSR/RSC, theming, team scale |

---

## Quality

| Article | Description |
|---|---|
| [Toolchain](toolchain.md) | The CSS build pipeline — PostCSS, Lightning CSS, bundlers, minification, Stylelint, Prettier/Biome, browserslist, visual regression |
| [Performance](performance.md) | Render-blocking CSS, critical CSS, per-route splitting, unused-CSS removal, containment, animation, fonts, and measuring LCP/CLS |
| [Best Practices](best-practices.md) | Low specificity, role-based naming, custom properties, logical properties, colocation, accessibility, and the lint rules that enforce them |
