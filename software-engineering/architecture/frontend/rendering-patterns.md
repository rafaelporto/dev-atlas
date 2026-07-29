---
type: concept
tags:
  - architecture
  - frontend
  - rendering
  - concept
  - decision-support
related:
  - languages/nextjs/rendering-strategies
  - languages/nextjs/server-and-client-components
  - languages/react/server-components
  - languages/react/rendering-and-reconciliation
  - languages/react/suspense-and-concurrent
language: null
---
# Rendering Patterns

> Where and when your HTML is produced — in the browser, on a server ahead of time, or per request — and the trade-offs each choice makes between speed, freshness, cost, and SEO.

This is the framework-agnostic taxonomy. For a specific implementation, see [Next.js rendering strategies](../../../languages/nextjs/rendering-strategies.md); the categories here also describe Nuxt, SvelteKit, Astro, Qwik, and Remix.

---

## What is it?

Rendering is the act of turning your components and data into HTML the browser can paint. A **rendering pattern** is a choice about *where* that work happens (client vs. server) and *when* it happens (at build time, per request, or in the browser after load). The same component tree can be rendered by any of these strategies; the pattern is an architectural decision layered on top.

The core patterns:

- **CSR** — Client-Side Rendering: the server sends a near-empty HTML shell plus JavaScript; the browser builds the DOM.
- **SSR** — Server-Side Rendering: HTML is generated on the server per request, then made interactive in the browser (hydration).
- **SSG** — Static Site Generation: HTML is generated once at build time and served from a CDN.
- **ISR** — Incremental Static Regeneration: SSG that re-generates individual pages in the background on a schedule or on demand.
- **Streaming SSR** — the server flushes HTML in chunks as it becomes ready, instead of waiting for the whole page.
- **Islands** — a mostly static page with small interactive regions ("islands") that hydrate independently.
- **RSC** — React Server Components: components that render only on the server and ship zero JavaScript, interleaved with client components.
- **Resumability** — the app serializes its state into the HTML so the client can continue without re-running setup work (hydration's alternative).

A related, higher-level split is **SPA vs. MPA**: a Single-Page Application loads once and swaps views on the client (classic CSR); a Multi-Page Application serves a fresh document per navigation (classic server-rendered). Modern meta-frameworks blend both.

---

## Why does it matter?

The rendering pattern is the single biggest lever on how a page *feels* and what it costs to run. It determines:

- **Time to first content** — does the user see meaningful HTML immediately, or a spinner while JavaScript downloads and runs?
- **Time to interactivity** — how long until clicks actually work?
- **SEO and link previews** — crawlers and social scrapers see the initial HTML; an empty CSR shell indexes poorly.
- **Data freshness** — is the content baked in hours ago, or generated for this exact request?
- **Infrastructure cost** — static files on a CDN are nearly free; per-request server rendering costs CPU on every hit.

Choosing wrong is expensive in a way that's hard to undo: a content site built as a pure CSR SPA fights SEO and first-paint forever; a highly personalized dashboard forced into SSG can't show per-user data. Getting the pattern right up front is cheaper than migrating later.

---

## How it works

### The rendering timeline

The patterns differ in *when* each phase happens and *who* does it:

```
              build time          request time            in browser
              ──────────          ────────────            ──────────
  SSG    │ render → HTML │──────────────────────────►│ hydrate → interactive │
  ISR    │ render → HTML │ (revalidate in background) │ hydrate → interactive │
  SSR    │               │ render → HTML per request  │ hydrate → interactive │
  Stream │               │ flush HTML in chunks  ────►│ hydrate as chunks land│
  CSR    │               │ send shell + JS       ────►│ fetch → render → paint│
```

- **CSR** does everything in the browser: fast to deploy, but the user waits for JS to download, parse, run, and fetch data before seeing content.
- **SSR** moves rendering to the server so the first response already contains the content; the browser then *hydrates* — re-attaching event listeners to the server-rendered DOM.
- **SSG** does the server work once at build; every visitor gets a cached file. Fastest and cheapest, but content is only as fresh as the last build.
- **ISR** keeps SSG's speed while letting individual pages refresh without a full rebuild.
- **Streaming SSR** overlaps server rendering with transfer — the shell and above-the-fold content arrive first, slow parts (a personalized feed) stream in behind a placeholder.

### The hydration cost

SSR and SSG give a fast *visual* first paint, but the page isn't interactive until hydration finishes — and hydration re-runs component logic on the client and ships all that JavaScript. For a heavy page this creates the "uncanny valley" where content is visible but clicks do nothing. Three responses to this problem define the newer patterns:

- **Islands** — only hydrate the interactive regions; the static majority ships no JS at all (Astro, Marko).
- **RSC** — server components never ship to the client; only client components hydrate, shrinking the JS bundle (React, Next.js App Router).
- **Resumability** — skip hydration entirely by serializing state into HTML and resuming on demand (Qwik).

### Trade-off summary

| Pattern | First paint | Interactive | Data freshness | SEO | Server cost |
|---|---|---|---|---|---|
| CSR | Slow | Slow | Real-time | Poor | Very low |
| SSR | Fast | Medium (hydration) | Per request | Excellent | High |
| SSG | Fastest | Medium (hydration) | Build-time only | Excellent | Very low |
| ISR | Fastest | Medium (hydration) | Near-fresh | Excellent | Low |
| Streaming SSR | Fast (progressive) | Progressive | Per request | Excellent | High |
| Islands | Fast | Fast (partial JS) | Depends on source | Excellent | Low–medium |
| RSC | Fast | Fast (less JS) | Per request | Excellent | Medium–high |

---

## Examples

The patterns are configuration/architecture, not application code — the illustrative snippet below (one framework's syntax) shows how a meta-framework selects a pattern per route, which is how the choice is expressed in practice.

```tsx
// A meta-framework typically picks the pattern via a route-level export or config,
// not by rewriting the component. Same component tree, different rendering strategy:

export const dynamic = "force-static";   // → SSG: render once at build
// export const revalidate = 60;         // → ISR: re-generate at most every 60s
// export const dynamic = "force-dynamic";// → SSR: render per request

export default async function ProductPage({ params }: { params: { id: string } }) {
  const product = await getProduct(params.id); // runs on server for SSG/ISR/SSR
  return <ProductDetail product={product} />;
}
```

For a pure CSR SPA the same page would ship a shell and fetch `getProduct` from the browser instead. The component (`ProductDetail`) is identical across all of these — only *where and when* it runs changes.

---

## When to use

- **CSR** — highly interactive apps behind a login where SEO is irrelevant (dashboards, editors, internal tools).
- **SSG** — content that changes rarely and is the same for everyone (docs, marketing, blogs).
- **ISR** — large content sites that need freshness without rebuilding thousands of pages (e-commerce catalogs, news).
- **SSR** — per-request or personalized content that also needs SEO (a logged-in home feed with shareable URLs).
- **Streaming SSR / RSC** — pages with a fast static shell but slow or heavy data, where you want content to appear progressively and ship less JavaScript.
- **Islands** — content-first pages with a few interactive widgets (a blog post with a comment box and a search bar).

## When NOT to use

- **CSR for public, content-driven pages** — you sacrifice SEO and first-paint for no benefit.
- **SSG for personalized or frequently changing data** — stale or wrong content; use ISR or SSR.
- **SSR for everything by default** — you pay server cost on every request, including pages that could be static.
- **Adding streaming/RSC/islands to a small app** — the added mental overhead isn't justified when a simple SSG or CSR build would ship faster.

---

## References

- Osmani, Addy, and Jason Miller. [Rendering on the Web](https://web.dev/articles/rendering-on-the-web). web.dev, Google.
- patterns.dev. [Rendering Patterns](https://www.patterns.dev/vanilla/rendering-patterns/). patterns.dev.
- Meta. [Server Components](https://react.dev/reference/rsc/server-components). React Documentation.
- Astro. [Islands Architecture](https://docs.astro.build/en/concepts/islands/). Astro Documentation.
