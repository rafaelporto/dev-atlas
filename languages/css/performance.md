---
type: concept
tags:
  - language
  - css
  - styling
  - frontend
related:
  - languages/nextjs/optimization
  - languages/nextjs/styling-and-assets
  - software-engineering/architecture/frontend/rendering-patterns
  - languages/react/styling
  - software-engineering/architecture/frontend/styling/styling-and-rendering-strategies
  - languages/css/toolchain
language: "css"
---
# CSS Performance

> CSS blocks the first paint, so the goal is to ship less of it, ship the part the first screen needs first, and avoid styles that make the browser redo layout or paint on every frame.

---

## What is it?

CSS performance is about how quickly a page becomes visible and how smoothly it moves, as far as the stylesheets are responsible. It has two halves:

- **Load performance** — how much CSS is downloaded and parsed before the browser can show anything.
- **Runtime performance** — how much work styles cause while the page is in use: recalculating styles, laying out boxes, painting pixels, and compositing layers during scrolling and animation.

## Why does it matter?

- **CSS is render-blocking.** The browser will not paint until it has downloaded and parsed every stylesheet linked in `<head>` (without a non-matching `media` attribute). Large or slow stylesheets delay **Largest Contentful Paint (LCP)** directly.
- **Fonts and late styles move things.** Web fonts swapping in and CSS arriving after content cause layout shifts, measured as **Cumulative Layout Shift (CLS)**.
- **Animations on the wrong properties jank.** Animating `width`, `top`, or `margin` triggers layout on every frame; on mid-range phones that drops frames and hurts **Interaction to Next Paint (INP)** when the main thread is busy.
- **CSS only grows.** Nobody deletes a rule they are not sure is unused, so stylesheets accumulate dead weight that every visitor downloads.

LCP, CLS, and INP are Google's Core Web Vitals; they are used in search ranking and are the most common performance budget in practice.

## How it works

### The rendering pipeline

```
 HTML ──► DOM ─┐
               ├─► Style ──► Layout ──► Paint ──► Composite
 CSS ──► CSSOM ┘   (match    (geometry)  (pixels)   (layers, GPU)
                    rules)

 Change to...                        re-runs from
 width, height, top, margin, font    Layout  (most expensive)
 color, background, box-shadow       Paint
 transform, opacity, filter*         Composite only (cheapest)
 (* filter is compositor-friendly in most engines, not all cases)
```

The browser needs both the DOM and the CSSOM before it renders. A stylesheet discovered late (e.g. via `@import` inside another stylesheet) adds a full round trip before first paint.

### Load: ship less, ship the critical part first

**Critical CSS.** Extract the rules needed for above-the-fold content, inline them in a `<style>` in `<head>`, and load the rest without blocking. Tools: **Beasties** (maintained fork of Google's archived Critters; inlines rules matched by the document without a headless browser), **critical** / **Penthouse** (render the page and keep only above-the-fold rules). Trade-off: inlined CSS is not cached across pages and duplicates bytes in every HTML response — worth it for landing pages, less so for an authenticated SPA.

**Split per route.** Bundlers emit CSS per chunk: Vite splits CSS used by async chunks into separate files and loads them with the chunk; webpack does the same with `mini-css-extract-plugin`. A route-level code split therefore also splits its CSS. See [CSS toolchain](toolchain.md).

**Remove unused CSS.**

- **Utility frameworks** (Tailwind CSS) scan source files and generate only classes that appear in them — unused-CSS removal is built in. Dynamic class names built by string concatenation are invisible to the scanner.
- **PurgeCSS** does the same for arbitrary CSS: it scans content files for selectors and drops rules that never match. It needs a safelist for classes added at runtime (by JS libraries, CMS content, state classes).
- **Scoped styles** ([CSS Modules](css-modules-and-scoped-styles.md), component frameworks) make dead code visible: delete the component, its CSS goes with it.

**Minify and compress.** Minifiers (Lightning CSS, cssnano, esbuild) remove whitespace and merge rules; Brotli/gzip at the server do most of the remaining work.

**Avoid `@import` in production CSS.** Each `@import` is discovered only after its parent is parsed, serialising downloads. Let the bundler inline imports.

### Runtime: let the browser skip work

**`content-visibility: auto`** tells the browser to skip layout and paint for an element's contents until it nears the viewport (Baseline since September 2024). Pair it with `contain-intrinsic-size` so the skipped element reserves space; otherwise the scrollbar jumps and CLS rises. Content stays in the DOM and accessibility tree, and find-in-page still works.

**`contain`** (`layout`, `paint`, `size`, `style`, or the shorthands `content`/`strict`) promises that an element's internals do not affect the outside, letting the browser limit recalculation to that subtree. Useful for widgets that update often (feeds, dashboards, chat).

**Compositor-only animation.** Animate `transform` and `opacity`. They can run on the compositor thread without layout or paint, so they stay smooth even when the main thread is busy.

**`will-change` caveats.** `will-change: transform` hints that the element should be promoted to its own layer in advance. Each layer costs memory (GPU texture); applying it to many elements, or permanently, makes things slower. Add it shortly before an animation and remove it after, or rely on the browser's own heuristics. It is a last resort for a measured problem, not a default.

**Avoid layout thrash.** This is mostly a JavaScript problem — reading layout (`offsetHeight`) after writing styles forces synchronous layout — but CSS that depends on content size (deeply nested auto-sized grids/tables) makes each layout more expensive.

### Selector cost — and why it rarely matters

Browsers match selectors right to left: for `.nav li a`, they start from every `a` and walk up the ancestors. In theory, long descendant selectors and universal key selectors are slower. In practice, engines use Bloom filters, rule hashing by the rightmost compound, and invalidation sets; selector matching is rarely the bottleneck. It shows up only with very large DOMs plus frequent style invalidation (e.g. toggling a class on `<body>` that thousands of rules depend on). Measure with the DevTools "Selector stats" in the Performance panel before rewriting selectors for speed. Keep selectors short for **maintainability**, not speed (see [CSS best practices](best-practices.md)).

### Fonts

- `font-display: swap` shows fallback text immediately and swaps in the web font when ready (no invisible text, but a possible layout shift). `optional` uses the web font only if it is already available almost instantly — best for CLS. `fallback` sits between.
- Reduce the shift with fallback metric overrides: `size-adjust`, `ascent-override`, `descent-override` on a local fallback `@font-face`, so the fallback occupies the same space as the web font.
- `<link rel="preload" as="font" crossorigin>` for the one or two fonts used above the fold; subset fonts and serve WOFF2.

### Measuring

| Tool | What it tells you |
|---|---|
| **Lighthouse** (DevTools, PageSpeed Insights) | "Eliminate render-blocking resources", "Reduce unused CSS", LCP/CLS in a lab run |
| **DevTools Coverage panel** | Bytes of each stylesheet actually used on the current page (per page and state — not proof a rule is dead site-wide) |
| **DevTools Performance panel** | Recalculate Style / Layout / Paint costs per frame; selector stats; layout-shift regions |
| **Rendering tab** | Paint flashing, layer borders, layout-shift regions highlighted live |
| **Field data** (CrUX, `web-vitals` library) | Real-user LCP, CLS, INP — the numbers that matter |

## Examples

### Inlined critical CSS with the rest loaded non-blocking

```html
<head>
  <style>
    /* critical: header, hero, base typography — generated at build time */
    body { margin: 0; font-family: system-ui, sans-serif; }
    .hero { min-block-size: 60vh; display: grid; place-items: center; }
  </style>
  <link rel="preload" href="/assets/main.4f3a.css" as="style"
        onload="this.onload=null;this.rel='stylesheet'">
  <noscript><link rel="stylesheet" href="/assets/main.4f3a.css"></noscript>
</head>
```

### Media-specific stylesheets do not block render

```html
<link rel="stylesheet" href="/print.css" media="print">
<link rel="stylesheet" href="/wide.css" media="(min-width: 64rem)">
```

The browser still downloads both but, when the media query does not match, at low priority and without blocking first paint.

### Skipping off-screen rendering

```css
.feed-item {
  content-visibility: auto;
  contain-intrinsic-size: auto 320px; /* remembers the real size once rendered */
}

.dashboard-widget {
  contain: content; /* layout + paint + style containment */
}
```

### Compositor-friendly animation

```css
/* Bad: triggers layout on every frame */
.drawer--bad {
  transition: left 300ms ease;
  left: -20rem;
}
.drawer--bad.is-open { left: 0; }

/* Good: compositor only */
.drawer {
  transition: transform 300ms ease;
  transform: translateX(-100%);
}
.drawer.is-open { transform: translateX(0); }

/* Hint only while the user is about to interact, not permanently */
.drawer-toggle:hover + .drawer { will-change: transform; }

@media (prefers-reduced-motion: reduce) {
  .drawer { transition: none; }
}
```

### Font loading with a metric-matched fallback

```css
@font-face {
  font-family: "Inter";
  src: url("/fonts/inter-var.woff2") format("woff2");
  font-display: swap;
  font-weight: 100 900;
}

/* Fallback adjusted to occupy the same space as Inter */
@font-face {
  font-family: "Inter Fallback";
  src: local("Arial");
  size-adjust: 107%;
  ascent-override: 90%;
}

body { font-family: "Inter", "Inter Fallback", sans-serif; }
```

The override values are illustrative; generate real ones per font (frameworks such as Next.js `next/font` compute them automatically).

### PurgeCSS in a PostCSS pipeline

```js
// postcss.config.mjs
import purgecss from "@fullhuman/postcss-purgecss";

export default {
  plugins: [
    process.env.NODE_ENV === "production" &&
      purgecss({
        content: ["./src/**/*.{html,tsx,vue}"],
        safelist: [/^is-/, /^has-/], // state classes added at runtime
      }),
  ].filter(Boolean),
};
```

## When to use

- **Critical CSS inlining** — content sites, landing pages, and SSR/SSG pages where first visit LCP matters and CSS is large.
- **Per-route CSS splitting** — multi-route apps where each route uses a distinct set of components.
- **PurgeCSS** — legacy or framework CSS (e.g. a full Bootstrap build) where most rules go unused and content files are statically scannable.
- **`content-visibility: auto`** — long pages of independent sections: feeds, article archives, documentation, long lists not already virtualised.
- **`contain`** — self-contained widgets that update often.
- **`transform`/`opacity` animations** — every animation that can be expressed with them.
- **`font-display` + metric overrides** — every site that loads web fonts.

## When NOT to use

- **Critical CSS for authenticated SPAs** — the shell is small, CSS is cached after the first visit, and the extraction step adds build complexity for little gain.
- **Inlining all CSS** — defeats caching; every navigation re-downloads it inside HTML.
- **PurgeCSS on dynamic class names** — classes built at runtime (`"btn-" + variant`) get removed, breaking the UI in production only. Use full class names or a safelist.
- **`content-visibility` on above-the-fold content** — it delays rendering of what the user sees first, and without `contain-intrinsic-size` it causes layout shifts.
- **Blanket `will-change` or `transform: translateZ(0)` hacks** — each promoted layer costs GPU memory; too many layers make compositing slower.
- **Rewriting selectors for speed without a profile** — selector matching is almost never the bottleneck; readability wins.
- **Optimising from Coverage numbers alone** — Coverage reflects one page in one state; rules for hover, modals, or other routes show as "unused".

## References

- [web.dev — Render-blocking CSS](https://web.dev/articles/critical-rendering-path/render-blocking-css)
- [web.dev — Extract critical CSS](https://web.dev/articles/extract-critical-css)
- [web.dev — content-visibility](https://web.dev/articles/content-visibility)
- [web.dev — Web Vitals](https://web.dev/articles/vitals)
- [web.dev — Stick to compositor-only properties](https://web.dev/articles/stick-to-compositor-only-properties-and-manage-layer-count)
- [MDN — will-change](https://developer.mozilla.org/en-US/docs/Web/CSS/will-change)
- [MDN — CSS containment](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment)
- [MDN — font-display](https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/font-display)
- [Chrome DevTools — Coverage](https://developer.chrome.com/docs/devtools/coverage)
- [PurgeCSS — official docs](https://purgecss.com/)
- [Beasties — GitHub](https://github.com/danielroe/beasties)
