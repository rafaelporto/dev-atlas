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
  - languages/css/modern-css
  - languages/css/toolchain
  - software-engineering/architecture/frontend/styling/evolving-and-migrating-styles
language: "css"
---
# Sass

> Sass is a CSS preprocessor that adds variables, nesting, mixins, functions and a module system at build time — still useful for authoring large stylesheets and design-system code, but much of what made it essential is now native CSS.

---

## What is it?

Sass is a language that looks like CSS with extra features, and a compiler turns it into the plain CSS that browsers read. You write `.scss` files, a build step runs, and `.css` comes out.

Two syntaxes exist, both compiled by the same tool:

| Syntax | Extension | Shape |
|---|---|---|
| **SCSS** ("Sassy CSS") | `.scss` | A superset of CSS: braces and semicolons. Any valid CSS file is valid SCSS. This is what almost everyone uses. |
| **Indented syntax** | `.sass` | The original syntax: no braces or semicolons, indentation defines nesting. Still supported, rarely chosen for new code. |

**Dart Sass** is the reference — and today the only maintained — implementation, distributed on npm as `sass` (pure JS) and `sass-embedded` (native Dart binary driven from Node, faster). The older implementations are gone: Ruby Sass reached end of life in 2019, and LibSass (and `node-sass`, which wrapped it) were deprecated in 2020. If a project still depends on `node-sass`, it is running unmaintained code that lacks the module system.

Sass sits in the "author-time abstraction" slot of a styling stack: it changes how you *write* CSS, not how CSS behaves in the browser. It is orthogonal to scoping strategies — you can compile SCSS through [CSS Modules](css-modules-and-scoped-styles.md), Vue/Svelte/Angular component styles, or plain global files.

---

## Why does it matter?

Sass appeared in 2006 when CSS had no variables, no nesting, no math beyond fixed units, and no way to split code into reusable units. It solved real problems:

- **Repetition** — one `$brand` variable instead of the same hex code in 200 places.
- **Organisation** — partials and modules to split a stylesheet into files without extra HTTP requests.
- **Generation** — loops and maps to produce spacing scales, utility classes, or color palettes from data.
- **Encapsulated helpers** — mixins for media queries, focus rings, or truncation, reused everywhere.

Much of the industry's existing CSS — Bootstrap's source, for example, is written in Sass — still depends on it, so engineers meet it constantly in legacy and design-system code.

The question has shifted from "should we use a preprocessor?" to "which Sass features still earn a build step?" Native CSS now has [custom properties](custom-properties-and-theming.md), nesting, `calc()`/`clamp()`, `color-mix()`, cascade layers and `@scope` (see [modern CSS](modern-css.md)). Sass remains strongest where work happens *at compile time*: loops, maps, compile-time functions, and module-level privacy.

---

## How it works

### The compile step

```
 _tokens.scss ─┐
 _mixins.scss ─┼──▶ Dart Sass ──▶ main.css ──▶ PostCSS / bundler ──▶ browser
 main.scss ────┘   (resolve modules,
                    evaluate vars, mixins,
                    loops, functions)
```

Everything Sass-specific disappears at build time. The browser never sees a `$variable` or a `@mixin` — which is both the strength (zero runtime cost) and the limit (no runtime changes) of the approach. Bundlers (Vite, webpack via `sass-loader`, Next.js, Angular CLI) run the compiler for you when you import a `.scss` file. See [toolchain](toolchain.md) for where Sass sits relative to PostCSS and Lightning CSS.

### Variables

```scss
$space-unit: 0.25rem;
$radius: 6px !default; // overridable when the module is configured
```

Sass variables are **lexically scoped and resolved at compile time**. They do not cascade, do not inherit through the DOM, and cannot change in response to a media query, a class, or JavaScript at runtime.

### Nesting and the parent selector

```scss
.card {
  padding: 1rem;

  &__title { font-weight: 600; }      // .card__title  (string concatenation)
  &:hover  { box-shadow: 0 1px 4px rgb(0 0 0 / 0.2); }
  .theme-dark & { background: #111; } // .theme-dark .card
}
```

Sass's `&` can concatenate suffixes (`&__title`), which native CSS nesting cannot — native `&` is a selector reference, not a string. Deep nesting is the classic Sass smell: it produces long, high-specificity selectors that mirror the DOM and break when markup changes. Keep nesting to one or two levels.

### Mixins and functions

- A **mixin** (`@mixin` / `@include`) emits *declarations or rules* — a reusable block of CSS, optionally parameterised, optionally accepting a content block (`@content`).
- A **function** (`@function` / `@return`) computes and returns a *value*.

Since Dart Sass 1.33, `/` as division is deprecated (it is ambiguous with CSS's `/` separator, as in `grid-area: 1 / 2`); use `math.div()` from `sass:math`.

### Maps and control flow

Maps are key/value data structures; `@each`, `@for`, `@if` and `@while` iterate and branch over them at compile time. This is how design-system code generates utilities or custom properties from a single token table.

### `@extend` and its pitfalls

`@extend` makes one selector inherit another's rules by **rewriting selectors**, not by copying declarations:

```scss
%button-base { padding: 0.5rem 1rem; border-radius: 4px; } // placeholder: never emitted alone
.btn-primary { @extend %button-base; background: navy; }
.btn-ghost   { @extend %button-base; background: transparent; }
// → .btn-primary, .btn-ghost { padding: …; border-radius: …; }
```

It looks like a smaller-output alternative to mixins, but it misbehaves at scale:

- **Selector explosion** — extending a selector that appears in many compound or nested rules multiplies combinations; output can grow instead of shrink.
- **Action at a distance** — the extended rules move to wherever the *original* selector lives in the file, which can change source order and therefore which rule wins.
- **Media query boundaries** — you cannot extend a selector defined outside the current `@media` block from inside it.
- **Module boundaries** — under `@use`, an `@extend` only affects modules *upstream* of the extending file, which surprises people migrating from `@import`.

Community guidance (for example Harry Roberts, *When to use @extend; when to use a mixin*, a community post) converges on: prefer mixins; if you use `@extend`, extend only `%placeholders` and only for things that are genuinely related. Gzip already compresses repeated mixin output well, so the size argument for `@extend` is weak.

### The module system: `@use` and `@forward`

Introduced in 2019, the module system replaces `@import`:

| | `@import` (deprecated) | `@use` / `@forward` |
|---|---|---|
| Scope | Everything lands in one global namespace | Members are namespaced (`tokens.$brand`) |
| Loading | A file imported twice is compiled twice (duplicated CSS) | Each module is loaded once per compilation |
| Privacy | None | Members starting with `-` or `_` are private to the module |
| Configuration | Override globals before importing | `@use "lib" with ($radius: 8px)` configures `!default` variables explicitly |
| Re-export | Implicit | `@forward` re-exports members, with `show`/`hide` filters and `as prefix-*` |
| Built-ins | Global functions (`darken()`, `map-get()`) | Built-in modules: `sass:math`, `sass:map`, `sass:color`, `sass:list`, `sass:string`, `sass:meta`, `sass:selector` |

**Deprecation status (verified against sass-lang.com, October 2026):** `@import` and global built-in functions have emitted deprecation warnings since **Dart Sass 1.80.0** (October 2024). They will be removed in **Dart Sass 3.0.0**, which the Sass team says will ship *no sooner than two years after 1.80.0*. At the time of writing the current stable line is 1.10x and 3.0.0 has not been released. The official `sass-migrator module` tool rewrites `@import`-based code to `@use`/`@forward`. Note that plain-CSS `@import url(...)` is a different, native rule and is not affected.

A typical library entry point:

```
styles/
├── abstracts/
│   ├── _tokens.scss     # $variables, maps
│   ├── _mixins.scss     # @use "tokens"; mixins
│   └── _index.scss      # @forward "tokens"; @forward "mixins";
└── main.scss            # @use "abstracts" as a;
```

### Sass variables vs CSS custom properties

| | Sass `$variable` | CSS `--custom-property` |
|---|---|---|
| Resolved | At compile time | At runtime, per element |
| Cascades / inherits | No | Yes — can be overridden on any subtree |
| Changes with media query, class, JS | No (requires recompiling) | Yes |
| Usable in media query conditions and selectors | Yes | No (`@media (min-width: var(--x))` is invalid) |
| Visible in DevTools | No (only the computed output) | Yes |
| Typed | No | Optionally, via `@property` registration |

They are complementary, not rivals. The durable pattern is: keep the **source of truth** in Sass maps (or in a token pipeline — see [design tokens](../../software-engineering/architecture/frontend/styling/design-tokens.md)), and **emit custom properties** for anything that must vary at runtime (themes, dark mode, per-component overrides). See [custom properties and theming](custom-properties-and-theming.md).

### What native CSS now covers

| Sass feature | Native equivalent | Status |
|---|---|---|
| Variables | Custom properties | Universal; different semantics (runtime) |
| Nesting | CSS nesting | Baseline since 2023; no string concatenation of `&` |
| Math | `calc()`, `min()`, `max()`, `clamp()`, `round()`, trig functions | Broadly supported |
| Color functions (`darken`, `mix`) | `color-mix()`, relative color syntax, `oklch()` | Broadly supported |
| Partials / organisation | `@layer` for ordering; bundlers for concatenation | `@layer` broadly supported |
| Scoping by nesting under a root | `@scope` | Baseline (newly available) since March 2026 |
| `@function` | CSS custom functions (`@function`) | Chromium only (since Chrome 139); not cross-browser |
| `@if` | CSS `if()` | Chromium only; not cross-browser |
| `@mixin` | CSS mixins | Specified as a proposal; not shipped |
| Loops, maps, `@each` | — | No native equivalent |

Practical reading: for a new project, Sass is optional. Teams keep it for loops/maps, compile-time helpers, and existing code; plain CSS plus PostCSS covers the rest.

### Less and Stylus

Two other preprocessors from the same era solved the same problems with different trade-offs.

| | Sass (SCSS) | Less | Stylus |
|---|---|---|---|
| Implementation | Dart (npm: `sass`, `sass-embedded`) | JavaScript (npm: `less`) | JavaScript (npm: `stylus`) |
| Variables | `$name` | `@name` (clashes visually with at-rules) | Bare `name = value` |
| Mixins | `@mixin` / `@include` | Any class can be mixed in: `.rounded();` | Transparent mixins: call like a property |
| Logic | `@if`, `@each`, `@for`, maps, modules | Guards (`when`), recursive mixins; no real loops | Full expressions, very permissive syntax |
| Module system | `@use` / `@forward` | `@import` with options | `@import` / `@require` |
| Variable evaluation | Eager | Lazy (last definition wins, even if declared later) | Eager |
| Notable users | Bootstrap 4+, most of the ecosystem | Bootstrap 3, Ant Design up to v4 | Some older Node/Express-era projects |
| Ecosystem momentum | The de facto standard | Maintained, but shrinking | Legacy — the repository is still maintained, but new adoption is rare |

**Less** is closest to plain CSS and could historically run in the browser; its lazy evaluation and mixin-any-class model are convenient but harder to reason about in large codebases. **Stylus** offers the most flexible syntax (optional braces, colons and semicolons), which made it popular briefly but also hard to lint and tool. For new work, neither offers anything Sass or native CSS does not; meet them mainly when maintaining older code. Migration paths usually go Less/Stylus → SCSS (syntax is close) or straight to plain CSS with custom properties.

---

## Examples

### A token module with private helpers

```scss
// abstracts/_tokens.scss
@use "sass:map";

$radius: 6px !default;

$-palette: (                       // private: leading "-"
  "brand-500": oklch(0.55 0.18 250),
  "brand-600": oklch(0.48 0.18 250),
  "neutral-900": oklch(0.2 0 0),
);

@function color($name) {
  @if not map.has-key($-palette, $name) {
    @error "Unknown color token `#{$name}`.";
  }
  @return map.get($-palette, $name);
}

// Emit runtime custom properties from compile-time data
@mixin custom-properties {
  @each $name, $value in $-palette {
    --color-#{$name}: #{$value};
  }
  --radius: #{$radius};
}
```

```scss
// abstracts/_index.scss
@forward "tokens";
@forward "mixins";
```

```scss
// main.scss
@use "abstracts" as a with ($radius: 8px);

:root {
  @include a.custom-properties;
}

.button {
  border-radius: var(--radius);           // runtime: themable
  background: var(--color-brand-500);
  &:hover { background: var(--color-brand-600); }
}

.legacy-badge {
  color: a.color("neutral-900");          // compile-time: fixed value, @error on typos
}
```

### A breakpoint mixin with `@content`

```scss
// abstracts/_mixins.scss
@use "sass:map";

$-breakpoints: (sm: 40rem, md: 48rem, lg: 64rem);

@mixin above($bp) {
  @media (min-width: map.get($-breakpoints, $bp)) {
    @content;
  }
}
```

```scss
@use "abstracts" as a;

.grid {
  display: grid;
  gap: 1rem;
  @include a.above(md) { grid-template-columns: repeat(2, 1fr); }
  @include a.above(lg) { grid-template-columns: repeat(3, 1fr); }
}
```

This is one place Sass still clearly wins: custom properties cannot be used in media query conditions, so a single compile-time breakpoint map is hard to replicate natively (custom media queries, `@custom-media`, are specified but not shipped cross-browser; PostCSS can polyfill them).

### Generating a spacing scale

```scss
@use "sass:math";

$space-steps: (0, 1, 2, 3, 4, 6, 8, 12, 16);

@each $step in $space-steps {
  .mt-#{$step} { margin-block-start: math.div($step, 4) * 1rem; }
}
// .mt-0 { margin-block-start: 0rem; } … .mt-16 { margin-block-start: 4rem; }
```

### Migrating off `@import`

```bash
npx sass-migrator module --migrate-deps src/styles/main.scss
```

The migrator converts `@import` to `@use`, adds namespaces, and rewrites global built-ins (`map-get()` → `map.get()`, `darken()` → `color.adjust()`/`color.scale()`). Review the diff: configuration of `!default` variables and `@extend` across files are the usual manual follow-ups.

---

## When to use

- **Design-system or theme code that generates CSS from data** — palettes, spacing scales, utility classes, or custom properties emitted from maps.
- **Existing Sass codebases** — Bootstrap customisation, mature design systems, or apps with years of SCSS; keep it, and migrate `@import` to `@use` before Dart Sass 3.0.
- **Compile-time guarantees** — `@error` on unknown tokens, private module members, explicit module configuration.
- **Breakpoints and other values needed in media queries or selectors**, where custom properties cannot reach.
- **As an authoring layer inside other approaches** — SCSS in CSS Modules, Vue `<style lang="scss">`, or Angular component styles.

---

## When NOT to use

- **Only for variables and nesting** — native custom properties and CSS nesting cover this; a preprocessor build step adds tooling and compile time for little gain.
- **For runtime theming** — Sass variables cannot change after compilation; use custom properties (emit them from Sass if needed).
- **With deep nesting that mirrors the DOM** — it produces brittle, high-specificity selectors; this is a Sass anti-pattern, not a feature.
- **Leaning on `@extend` for code reuse** — prefer mixins or utility classes; `@extend` reorders and multiplies selectors.
- **Choosing Less or Stylus for new projects** — smaller ecosystems, no advantage over Sass or native CSS.
- **Starting new code with `@import` or `node-sass`** — both are deprecated; new code should use `@use`/`@forward` on Dart Sass.
- **In a utility-first or zero-runtime CSS-in-JS stack** — those already provide tokens and generation; adding Sass duplicates the token source.

---

## References

- [Sass documentation](https://sass-lang.com/documentation/) — official
- [Sass syntax: SCSS and indented](https://sass-lang.com/documentation/syntax/) — official
- [`@use`](https://sass-lang.com/documentation/at-rules/use/) and [built-in modules](https://sass-lang.com/documentation/modules/) — official
- [`@extend`](https://sass-lang.com/documentation/at-rules/extend/) — official, including the upstream-only rule under modules
- [Breaking change: `@import` and global built-in functions](https://sass-lang.com/documentation/breaking-changes/import/) — official deprecation timeline
- [LibSass is deprecated](https://sass-lang.com/blog/libsass-is-deprecated/) — official Sass blog
- [Dart Sass releases](https://github.com/sass/dart-sass/releases) — official
- [Bootstrap: Sass customization](https://getbootstrap.com/docs/5.3/customize/sass/) — official Bootstrap docs
- [Less features](https://lesscss.org/features/) — official
- [Stylus](https://stylus-lang.com) — official
- [MDN: CSS nesting](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_nesting)
- [MDN: Using CSS custom properties](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties)
- [When to use @extend; when to use a mixin](https://csswizardry.com/2014/11/when-to-use-extend-when-to-use-a-mixin/) — community post by Harry Roberts
