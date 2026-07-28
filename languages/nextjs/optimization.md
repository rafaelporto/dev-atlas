---
type: concept
tags:
  - language
  - nextjs
  - full-stack
  - concept
related:
  - languages/nextjs/styling-and-assets
  - languages/nextjs/rendering-strategies
  - languages/nextjs/best-practices
language: "nextjs"
---
# Optimization

> Next.js optimizes performance through automatic code-splitting, image/font components, metadata for SEO, and bundle controls — with the goal of shipping less JavaScript and improving Core Web Vitals.

---

## What is it?

Optimization in Next.js is the set of built-in and opt-in techniques for making an app fast: **code-splitting** (per-route bundles), **lazy loading** with `next/dynamic`, **asset optimization** (`next/image`, `next/font`), **metadata** for SEO and social sharing, and **bundle analysis** to keep JavaScript small. Because Server Components already ship less JS, much of this is about controlling the remaining client bundle and the head.

---

## Why does it matter?

Performance directly affects conversion, SEO ranking, and user experience — quantified by **Core Web Vitals** (LCP, CLS, INP). Next.js gives strong defaults, but the biggest wins come from understanding what ends up in the client bundle and trimming it: fewer Client Components, lazy-loaded heavy widgets, and optimized assets.

---

## How it works

### Automatic code-splitting

Each route ships only the JavaScript it needs; shared code is chunked automatically. Server Components contribute **zero** client JS — the single biggest lever is keeping components on the server.

### Lazy-loading with next/dynamic

Defer heavy client-only components (charts, editors) until needed.

```tsx
import dynamic from "next/dynamic";
const Chart = dynamic(() => import("./Chart"), {
  loading: () => <p>Loading chart…</p>,
  ssr: false, // client-only heavy widget
});
```

### Metadata for SEO

Export `metadata` (static) or `generateMetadata` (dynamic) from pages/layouts.

```tsx
export const metadata = {
  title: { default: "My App", template: "%s · My App" },
  description: "…",
  openGraph: { images: ["/og.png"] },
};
```

Special files `sitemap.ts`, `robots.ts`, and `opengraph-image.tsx` generate the corresponding SEO assets.

### Asset optimization

`next/image` and `next/font` (see styling-and-assets) handle the heaviest assets. Use `priority` for the LCP image.

### Bundle analysis

Measure what ships to the client and trim it.

```bash
# with @next/bundle-analyzer configured
ANALYZE=true npm run build
```

Look for large dependencies pulled into Client Components; move logic to the server or lazy-load.

### Third-party scripts

Use `next/script` with the right strategy (`afterInteractive`, `lazyOnload`) so analytics/embeds don't block rendering.

```tsx
import Script from "next/script";
<Script src="https://example.com/analytics.js" strategy="lazyOnload" />
```

### Caching and rendering

Prefer static/ISR where possible and stream dynamic content (see rendering-strategies and streaming-and-suspense) — serving cached HTML from a CDN is the cheapest fast path.

---

## Examples

```tsx
// Keep an interactive-heavy dependency out of the initial bundle
import dynamic from "next/dynamic";
const RichEditor = dynamic(() => import("@/components/RichEditor"), { ssr: false });

export function Compose() {
  return <RichEditor />; // its JS loads only when this renders
}
```

---

## When to use

- Keep components on the server by default; add `"use client"` only where needed — the top performance lever.
- Lazy-load heavy client widgets with `next/dynamic`.
- Add `metadata`/`generateMetadata`, `sitemap`, and `robots` for SEO; set an LCP `priority` image.
- Analyze the bundle periodically and trim large client dependencies.
- Load third-party scripts via `next/script` with an appropriate strategy.

## When NOT to use

- Do not eagerly import heavy client libraries into shared components — they bloat every route's bundle.
- Do not over-split with `next/dynamic` to the point of many tiny requests and jank — split by real cost.
- Do not neglect metadata — it costs little and drives SEO/social previews.
- Do not chase micro-optimizations before measuring; profile with the build output and Core Web Vitals first.

---

## References

- [Next.js — Optimizing (overview)](https://nextjs.org/docs/app/building-your-application/optimizing)
- [Next.js — Lazy Loading (`next/dynamic`)](https://nextjs.org/docs/app/building-your-application/optimizing/lazy-loading)
- [Next.js — Metadata](https://nextjs.org/docs/app/building-your-application/optimizing/metadata)
- [Next.js — Analyzing bundles / Scripts](https://nextjs.org/docs/app/building-your-application/optimizing/scripts)
