---
type: concept
tags:
  - language
  - css
  - styling
  - frontend
related:
  - languages/react/toolchain
  - languages/react/styling
  - languages/nextjs/styling-and-assets
  - software-engineering/architecture/frontend/frontend-stacks-and-tooling
  - languages/css/sass
  - languages/css/performance
  - software-engineering/architecture/frontend/styling/styling-in-monorepos
language: "css"
---
# CSS Toolchain

> The tools between the CSS you write and the CSS the browser receives — transformers (PostCSS, Lightning CSS), bundlers, minifiers, linters, formatters, and visual regression tests — all aimed at one shared browser target.

---

## What is it?

A CSS toolchain is the set of programs that read your stylesheets, change them so they work in the browsers you support, check them for mistakes, and package them for production. None of it is required — a browser happily loads a hand-written `.css` file — but every non-trivial project ends up with some of it.

The pieces fall into five jobs:

| Job | Typical tools |
|---|---|
| **Transform** (prefixes, syntax lowering, imports) | PostCSS + plugins (Autoprefixer, postcss-preset-env), Lightning CSS |
| **Bundle** (resolve imports, split per chunk, hash file names) | Vite, webpack (`css-loader` + `mini-css-extract-plugin`), esbuild |
| **Minify** | Lightning CSS, cssnano, esbuild |
| **Lint and format** | Stylelint, Prettier, Biome |
| **Guard visual output** | Playwright screenshot assertions, Chromatic |

A sixth piece ties them together: **browserslist**, a single declaration of which browsers you support, read by Autoprefixer, postcss-preset-env, Lightning CSS (via its `browserslistToTargets` helper), Babel, and others.

## Why does it matter?

- **Browser support without hand-written fallbacks.** You write `display: flex`, nesting, `oklch()` or logical properties once; the transformer adds prefixes or lowers syntax only for the browsers your target list says need it.
- **Production weight.** Minification, per-route splitting, and content-hashed file names (for long-lived caching) are bundler jobs. See [CSS performance](performance.md).
- **CSS fails silently.** A typo in a property name, an invalid value, or a duplicated selector produces no error — the rule is just dropped. Linters are the only compile-time feedback CSS gets.
- **Regressions are visual.** A change to a shared selector can break a page nobody looked at. Unit tests do not catch that; screenshot comparison does.

The cost: every layer is a dependency to upgrade and a config file to understand. Modern stacks reduce this by folding several jobs into one tool (Vite, Tailwind CSS v4, Lightning CSS).

## How it works

```
 source CSS / Sass / CSS Modules
          │
          ▼
 ┌──────────────────────┐   reads  ┌───────────────┐
 │ Transform            │◄─────────│ browserslist  │
 │ PostCSS plugins  or  │          │ (targets)     │
 │ Lightning CSS        │          └───────────────┘
 └──────────┬───────────┘
            ▼
 ┌──────────────────────┐
 │ Bundler              │  resolves @import / JS imports of .css,
 │ (Vite, webpack, ...) │  splits CSS per chunk, hashes file names
 └──────────┬───────────┘
            ▼
 ┌──────────────────────┐
 │ Minifier             │  Lightning CSS / cssnano / esbuild
 └──────────┬───────────┘
            ▼
   dist/assets/*.[hash].css + source maps

 Side channels (not in the build path):
   Stylelint ── lint in editor, pre-commit, CI
   Prettier / Biome ── format
   Playwright / Chromatic ── screenshot diffs in CI
```

### PostCSS: a plugin host, not a preprocessor

PostCSS parses CSS into an AST, passes it through a list of JavaScript plugins in order, and prints CSS back out. PostCSS by itself does nothing; each plugin does one job. Because plugins run in sequence, **order matters** — e.g. an import-inlining plugin must run before plugins that need to see the imported rules.

Common plugins:

- **Autoprefixer** — adds vendor prefixes (`-webkit-`, etc.) using data from Can I Use, but only for the browsers in your browserslist. It also removes outdated prefixes.
- **postcss-preset-env** — lets you write modern CSS (nesting, custom media queries, newer color functions, logical properties) and converts it to something your target browsers understand. It bundles Autoprefixer, so you do not add both.
- **postcss-import** — inlines `@import` files when no bundler does it for you.
- **cssnano** — PostCSS-based minifier.
- Framework plugins — e.g. `@tailwindcss/postcss` for Tailwind CSS v4.

### Lightning CSS: one native tool for several jobs

Lightning CSS is a CSS parser, transformer, bundler, and minifier written in Rust. It covers what Autoprefixer + postcss-preset-env + cssnano do (prefixing, syntax lowering, minification) plus CSS Modules, driven by browser targets. It does not run PostCSS plugins.

Where it shows up today:

- **Vite** uses Lightning CSS to **minify** CSS in production builds by default; PostCSS still handles transforms. Setting `css.transformer: 'lightningcss'` makes Lightning CSS do the transforms too (documented as experimental).
- **Tailwind CSS v4** embeds Lightning CSS for vendor prefixing and syntax transforms, so a Tailwind v4 project no longer adds Autoprefixer.

### How bundlers handle CSS

- **Vite** — CSS imported from JS is processed (PostCSS if a config exists, Sass if installed, `*.module.css` as CSS Modules), injected via `<style>` in dev with HMR, and extracted to hashed files in the build. CSS used by async chunks is split into separate files and loaded when the chunk loads.
- **webpack** — `css-loader` resolves `@import`/`url()` and turns CSS into a JS module; `style-loader` injects it at runtime (dev), while `mini-css-extract-plugin` extracts real `.css` files (production). `postcss-loader` slots in before `css-loader`. Minification usually comes from `css-minimizer-webpack-plugin`.
- **esbuild** — bundles CSS natively (both `.css` entry points and CSS imported from JS, which becomes a sibling `.css` output), supports CSS Modules via the `local-css` loader, and minifies. It has no plugin-level PostCSS integration out of the box.

### Source maps

Every transform step can emit a source map so DevTools shows the original file and line (your `.scss` or pre-PostCSS source) instead of the minified output. Vite enables CSS source maps in dev with `css.devSourcemap`; production CSS maps follow `build.sourcemap`. Shipping production maps publicly is a choice — they reveal source but help debugging.

### Linting and formatting

**Stylelint** is the standard CSS linter. It understands plain CSS and, via custom syntaxes, SCSS, Less, and CSS inside other files. Configuration is layered:

- **Shared configs** — `stylelint-config-standard` (conventions plus error-catching rules), `stylelint-config-standard-scss`, `stylelint-config-recess-order` / `stylelint-order` (property ordering).
- **Plugins** — add rules, e.g. property ordering, logical-property enforcement, or rules specific to a framework.

**Formatting** is a separate job. Prettier and Biome format CSS (Biome handles standard CSS; check its docs for preprocessor support). Let the formatter own whitespace and let Stylelint own correctness and conventions — current Stylelint versions no longer ship stylistic rules, so they do not fight.

### browserslist: one target for every tool

browserslist reads a query (from `package.json` `"browserslist"`, a `.browserslistrc` file, or an environment-specific section) and resolves it to concrete browser versions. Autoprefixer, postcss-preset-env, Babel, and Lightning CSS (through `browserslistToTargets`) all read the same list, so a single change moves the whole pipeline.

### Visual regression testing

Screenshot tests render a page or component, compare it pixel-by-pixel (with a tolerance) to a stored baseline, and fail on difference. **Playwright** has this built in (`toHaveScreenshot()`); **Chromatic** runs it as a hosted service over Storybook stories, with a review UI for accepting changes. Baselines must be generated on the same OS/browser as CI, or font rendering differences produce noise.

## Examples

### browserslist (`.browserslistrc`)

```text
# Shared by Autoprefixer, postcss-preset-env, Babel, Lightning CSS
> 0.5%
last 2 versions
not dead
```

Run `npx browserslist` to see which versions a query resolves to.

### PostCSS (`postcss.config.mjs`)

```js
export default {
  plugins: {
    "postcss-import": {},
    // Lowers modern syntax for the browserslist targets; includes Autoprefixer.
    "postcss-preset-env": {
      stage: 2,
      features: { "nesting-rules": true },
    },
  },
};
```

Source written in modern CSS:

```css
.card {
  padding-inline: 1rem;
  color: oklch(40% 0.1 250);

  & .title {
    font-weight: 600;
  }
}
```

The plugin chain emits flattened selectors (and fallbacks where the targets need them) — the source stays modern.

### Vite with Lightning CSS doing the transforms (`vite.config.ts`)

```ts
import { defineConfig } from "vite";
import browserslist from "browserslist";
import { browserslistToTargets } from "lightningcss";

export default defineConfig({
  css: {
    transformer: "lightningcss", // experimental: replaces PostCSS
    lightningcss: {
      targets: browserslistToTargets(browserslist()),
    },
    devSourcemap: true,
  },
  build: {
    cssMinify: "lightningcss", // the default; shown for clarity
  },
});
```

### webpack production CSS (excerpt)

```js
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");

module.exports = {
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, "css-loader", "postcss-loader"],
      },
    ],
  },
  plugins: [new MiniCssExtractPlugin({ filename: "[name].[contenthash].css" })],
  optimization: { minimizer: ["...", new CssMinimizerPlugin()] },
};
```

Loaders run right to left: `postcss-loader` first, then `css-loader`, then extraction.

### Stylelint (`stylelint.config.mjs`)

```js
export default {
  extends: ["stylelint-config-standard"],
  plugins: ["stylelint-order"],
  rules: {
    "selector-max-id": 0,
    "selector-max-specificity": "0,3,0",
    "declaration-no-important": true,
    "order/properties-alphabetical-order": null,
  },
  overrides: [
    { files: ["**/utilities/**/*.css"], rules: { "declaration-no-important": null } },
  ],
};
```

```json
{
  "scripts": {
    "lint:css": "stylelint \"src/**/*.css\"",
    "format": "prettier --write \"src/**/*.{css,scss}\""
  }
}
```

### Playwright screenshot assertion

```ts
import { test, expect } from "@playwright/test";

test("pricing page renders unchanged", async ({ page }) => {
  await page.goto("/pricing");
  await expect(page).toHaveScreenshot("pricing.png", { maxDiffPixelRatio: 0.01 });
});
```

## When to use

- **browserslist** — always, once there is any build step; it is the single source of truth for "which browsers".
- **Autoprefixer / postcss-preset-env** — when you need PostCSS anyway (other plugins, a framework that requires it) and want to write modern CSS.
- **Lightning CSS as transformer** — new projects without PostCSS plugin dependencies, where one fast native tool is simpler than a plugin chain.
- **Stylelint** — any codebase with more than one contributor; enforce the team's conventions (see [CSS best practices](best-practices.md)) in CI rather than in review.
- **Prettier or Biome** — always; pick the one the rest of the repo already uses.
- **Visual regression tests** — design systems, shared component libraries, and pages where a CSS change has wide blast radius.

## When NOT to use

- **Autoprefixer next to postcss-preset-env or Lightning CSS** — they already prefix; running both duplicates work and can conflict.
- **Autoprefixer in a Tailwind CSS v4 project** — Tailwind v4 already prefixes through Lightning CSS.
- **Long PostCSS chains to emulate a preprocessor** — if you need mixins, loops, and functions, use [Sass](sass.md) deliberately instead of a dozen plugins with unclear order.
- **Proposal-stage syntax via polyfill plugins** — low-stage postcss-preset-env features can change or be dropped; the source then depends on a plugin, not on CSS.
- **Stylistic lint rules alongside a formatter** — whitespace is the formatter's job; duplicated rules produce churn.
- **Pixel-perfect screenshot tests everywhere** — on dynamic content, animations, or unpinned fonts they become flaky and get ignored; mask dynamic regions or test only stable components.
- **Hand-rolled toolchain when the framework provides one** — Vite, Next.js, and similar already wire PostCSS, CSS Modules, splitting, and minification.

## References

- [PostCSS — official site](https://postcss.org/)
- [Autoprefixer — GitHub](https://github.com/postcss/autoprefixer)
- [postcss-preset-env — GitHub](https://github.com/csstools/postcss-plugins/tree/main/plugin-packs/postcss-preset-env)
- [Lightning CSS — official docs](https://lightningcss.dev/)
- [Vite — Features: CSS](https://vite.dev/guide/features#css)
- [webpack — mini-css-extract-plugin](https://webpack.js.org/plugins/mini-css-extract-plugin/)
- [esbuild — Content types: CSS](https://esbuild.github.io/content-types/#css)
- [Stylelint — Getting started](https://stylelint.io/user-guide/get-started)
- [browserslist — GitHub](https://github.com/browserslist/browserslist)
- [Playwright — Visual comparisons](https://playwright.dev/docs/test-snapshots)
- [Tailwind CSS v4.0 announcement](https://tailwindcss.com/blog/tailwindcss-v4)
