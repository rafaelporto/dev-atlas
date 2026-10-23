---
type: concept
tags:
  - architecture
  - frontend
  - styling
  - css
  - rendering
related:
  - software-engineering/architecture/frontend/rendering-patterns
  - languages/javascript-typescript/frameworks/react/server-components
  - languages/javascript-typescript/frameworks/react/styling
  - languages/javascript-typescript/frameworks/nextjs/styling-and-assets
  - languages/javascript-typescript/frameworks/nextjs/rendering-strategies
  - languages/javascript-typescript/frameworks/nextjs/streaming-and-suspense
  - languages/css/css-in-js
  - languages/css/performance
language: null
---

# Styling and Rendering Strategies

> Where and when HTML is produced decides when CSS must be available, who generates it and how it is cached — so the rendering strategy, not taste, should narrow the styling approach.

---

## What is it?

Every page needs its CSS to arrive before, or together with, the HTML it styles — otherwise the user sees unstyled content that suddenly jumps into place. How hard that is depends on how the page is rendered: in the browser, on a server per request, at build time, in streamed chunks, or as server components.

[Rendering Patterns](../rendering-patterns.md) defines those strategies (CSR, SSR, SSG, ISR, streaming, islands, RSC). This article asks one question about each: **what does this strategy require from the styling layer?** It covers critical CSS, render-blocking behaviour, build-time extraction versus runtime generation, style order during hydration, per-route code splitting and caching.

---

## Why does it matter?

Styling choices that are harmless in one rendering model are expensive or broken in another:

- A runtime CSS-in-JS library is fine in a client-rendered dashboard, but on the server it must collect styles during every render, and in React Server Components most such libraries cannot run at all.
- A single large stylesheet is fine for a static site cached at the edge, but in a client-side app with fifty routes it delays first paint for CSS the first route never uses.
- Streaming HTML in chunks only helps if each chunk's CSS arrives in time; otherwise every streamed section flashes unstyled.

Choosing the styling approach before the rendering strategy (or ignoring the link) produces Flash of Unstyled Content (FOUC), slow first paint, server CPU cost, and migrations later. Choosing it after narrows the options to the ones that fit.

---

## How it works

### CSS is render-blocking by design

Browsers do not paint a page until the stylesheets referenced in `<head>` have loaded and parsed. This is deliberate: painting before CSS arrives would produce FOUC. The architectural consequences:

- **Every byte of CSS in `<head>` delays first paint.** Less CSS on the critical path means faster first render.
- **CSS added later (by JavaScript, after paint) is not blocking — and that is the problem.** Elements already painted get restyled when it arrives, causing layout shift and FOUC.

Two techniques follow:

- **Critical CSS** — inline the rules needed for above-the-fold content in a `<style>` tag in the HTML, and load the rest without blocking. It shortens first paint at the cost of a build step and duplicated bytes (critical rules are not cached separately).
- **Per-route splitting** — ship only the CSS a route needs, so the blocking set stays small.

### Build-time extraction versus runtime generation

The second axis is **when the CSS text is created**:

```
                         build time                  request time                browser
                         ──────────                  ────────────                ───────
  Static CSS / Modules   compile → .css files ───────────────────────────────► cached <link>
  Utility-first (TW)     scan → one .css file ────────────────────────────────► cached <link>
  Zero-runtime CSS-in-JS extract → .css files ────────────────────────────────► cached <link>
  Runtime CSS-in-JS                                   render → collect styles ─► inline <style>
                                                      (SSR)                      + JS re-inserts on
                                                                                  hydrate / update
```

- **Extracted CSS** (plain CSS, Sass, CSS Modules, utility-first frameworks, zero-runtime CSS-in-JS such as vanilla-extract, Linaria, Panda or StyleX) produces static files. They are cacheable, fingerprintable, independent of the rendering strategy, and cost nothing at request time.
- **Runtime CSS-in-JS** (styled-components, Emotion in its default mode) generates CSS while components render. In the browser this costs JavaScript execution on every render that changes styles. On the server it requires a per-request style registry that collects rules during rendering and inlines them into the HTML, and a client runtime that must agree with the server output during hydration.

The tool mechanics are in [CSS-in-JS](../../../../languages/css/css-in-js.md); the point here is that runtime generation **ties CSS production to the render**, so it inherits every constraint of the rendering strategy.

### Strategy by strategy

**CSR / SPA.** The HTML is an empty shell, so there is no FOUC risk for content (nothing is painted until JavaScript renders it), but the app shell's CSS should still be in a `<link>` so the loading state is styled. The main concerns are **bundle size** and **per-route splitting**: bundlers can emit a CSS chunk per lazy-loaded route, loaded alongside its JavaScript chunk. Runtime CSS-in-JS works but adds to main-thread cost on every interaction. Route CSS is usually not removed after navigation, so route-level CSS must be scoped (hashed or prefixed) to avoid leaking into the next route.

**SSR.** The server sends styled HTML, so the CSS must be ready when the HTML is. Extracted CSS goes in `<link>` tags in `<head>`; runtime CSS-in-JS requires the server-side collection step (extra CPU per request) and inline `<style>` tags, which are not cached across pages. During hydration, client-inserted styles must not reorder relative to server-rendered ones, or the cascade changes between server paint and client takeover.

**SSG / ISR.** Rendering happens at build (or revalidation) time, so even runtime CSS-in-JS is "free" per request — but it still ships its client runtime for hydration. Static CSS files with content hashes in their names fit perfectly: immutable, cached at the CDN and in the browser, shared across pages.

**Streaming SSR.** HTML arrives in chunks behind Suspense boundaries. CSS for a streamed section must arrive no later than that section. Global CSS in `<head>` covers this trivially. Per-component CSS needs framework support: React 19, for example, lets `<link rel="stylesheet">` and `<style>` carry a `precedence` prop so React hoists them into `<head>`, deduplicates them by `href`, orders them by precedence, and holds back revealing a Suspense boundary until its external stylesheet has loaded. Runtime CSS-in-JS libraries that collect styles in one pass at the end of the render do not fit chunked output well.

**React Server Components.** Server components never run on the client and cannot use React context or hooks — which most runtime CSS-in-JS libraries depend on for theming and style injection. Those libraries therefore force `"use client"` on every styled component, discarding the main benefit of RSC. Extracted approaches (CSS Modules, utility classes, zero-runtime CSS-in-JS) work in server components because the component only references class names. The styled-components maintainer put the library into maintenance mode in March 2025 and advised against it for new projects, citing exactly this incompatibility. See [React Server Components](../../../../languages/javascript-typescript/frameworks/react/server-components.md).

**Islands.** The page is static HTML with small interactive regions. Page CSS should be static and global or per-page; each island's CSS should be extracted and loaded with the page, not injected when the island hydrates (which would be after first paint). Runtime CSS-in-JS inside an island only works for styles that appear after interaction.

### Caching

Static CSS files with content-hashed names (`app.3f9a1c.css`) can be cached as immutable for a long time and shared across every page that uses them. Inline styles (critical CSS, runtime CSS-in-JS output) are re-sent with every HTML response. The trade:

- **Large shared stylesheet** — one request, excellent cache reuse across navigations, but larger first-visit cost.
- **Many small per-route stylesheets** — smaller first paint, more requests, and a cache that fragments as routes change independently.
- **Inline critical CSS + cached remainder** — best first visit, slightly larger HTML on every visit.

### Decision table

| Strategy | FOUC risk | Runtime CSS-in-JS | Recommended styling | Key concern |
|---|---|---|---|---|
| CSR / SPA | Low (nothing painted before JS) | Works; main-thread cost | Any extracted approach; per-route CSS chunks | Bundle size; route CSS must be scoped |
| SSR | High if CSS is late | Works with server collection; CPU per request | Extracted CSS in `<head>`; critical CSS for heavy pages | Server cost; hydration order |
| SSG / ISR | Low with `<link>` in `<head>` | Works at build; still ships client runtime | Static hashed files at the CDN | Cache strategy |
| Streaming SSR | High for late chunks | Poor fit | Global CSS or framework-managed per-component stylesheets | CSS must precede each chunk |
| RSC | — | Generally incompatible (forces client components) | CSS Modules, utility-first, zero-runtime CSS-in-JS | Keep styled components server-renderable |
| Islands | Low for static parts | Only post-interaction | Static page CSS; extracted island CSS loaded with the page | Do not inject CSS on hydration |

---

## Examples

Critical CSS inlined, remainder loaded without blocking (a static or SSR page):

```html
<head>
  <style>
    /* critical: above-the-fold layout and typography only */
    :root { --color-text: #1a1a1a; --space-4: 1rem; }
    body { margin: 0; font-family: system-ui, sans-serif; color: var(--color-text); }
    .hero { padding: var(--space-4); min-block-size: 60vh; }
  </style>
  <link rel="preload" href="/assets/app.3f9a1c.css" as="style"
        onload="this.onload=null;this.rel='stylesheet'">
  <noscript><link rel="stylesheet" href="/assets/app.3f9a1c.css"></noscript>
</head>
```

A server component styled with CSS Modules — no client runtime, works with streaming and RSC:

```tsx
// ProductCard.tsx — a server component; only class names reach the client
import styles from "./product-card.module.css";

export async function ProductCard({ id }: { id: string }) {
  const product = await getProduct(id);
  return (
    <article className={styles.card}>
      <h2 className={styles.title}>{product.name}</h2>
    </article>
  );
}
```

```css
/* product-card.module.css — extracted at build, cached as a static file */
.card  { padding: var(--space-4); border-radius: var(--radius-md); }
.title { font-size: var(--font-size-lg); }
```

Per-component stylesheet that a streaming React 19 renderer hoists, deduplicates and waits for before revealing the boundary:

```tsx
function Reviews() {
  return (
    <>
      <link rel="stylesheet" href="/assets/reviews.8c21.css" precedence="default" />
      <section className="reviews">{/* … */}</section>
    </>
  );
}
```

---

## When to use

- Choosing a styling approach for a new project — decide the rendering strategy first, then rule out styling options that conflict with it using the table above.
- Diagnosing FOUC, layout shift or slow first paint on server-rendered or streamed pages.
- Planning a move to RSC or streaming, which may force a styling migration (see [Evolving and Migrating Styles](evolving-and-migrating-styles.md)).
- Setting cache and CDN policies for CSS assets.

## When NOT to use

- **Hand-maintaining critical CSS** — it rots the moment a component changes; generate it in the build or rely on small per-route CSS instead.
- **Inlining all CSS into every HTML response** — it defeats caching across navigations; inline only what the first paint needs.
- **Adopting runtime CSS-in-JS for a new RSC or streaming app** — the incompatibility is structural, not a missing feature.
- **Splitting CSS per component in a small static site** — dozens of tiny requests cost more than one cached file.
- **Optimising CSS delivery before measuring** — check render-blocking time and layout shift in real metrics first; the rendering strategy usually matters more than micro-optimising CSS (see [CSS performance](../../../../languages/css/performance.md)).

---

## References

- Osmani, Addy, and Jason Miller. [Rendering on the Web](https://web.dev/articles/rendering-on-the-web). web.dev.
- web.dev. [Render-blocking CSS](https://web.dev/articles/critical-rendering-path/render-blocking-css).
- web.dev. [Extract critical CSS](https://web.dev/articles/extract-critical-css) and [Defer non-critical CSS](https://web.dev/articles/defer-non-critical-css).
- React. [`<link>`](https://react.dev/reference/react-dom/components/link) and [`<style>`](https://react.dev/reference/react-dom/components/style) — `precedence`, hoisting and Suspense integration. react.dev.
- Next.js. [CSS — ordering, merging, development vs production](https://nextjs.org/docs/app/getting-started/css). nextjs.org.
- Roberts, Harry (CSS performance consultant). [CSS and Network Performance](https://csswizardry.com/2018/11/css-and-network-performance/). CSS Wizardry.
