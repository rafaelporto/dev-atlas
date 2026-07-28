---
type: concept
tags:
  - language
  - nextjs
  - full-stack
  - decision-support
  - concept
related:
  - languages/nextjs/data-fetching-and-caching
  - languages/nextjs/server-and-client-components
  - languages/nextjs/streaming-and-suspense
language: "nextjs"
---
# Rendering Strategies

> Next.js can render a route statically at build time, dynamically per request, or incrementally revalidate cached HTML — and the strategy is chosen per route based on how you fetch data.

---

## What is it?

A **rendering strategy** is when and where a route's HTML is produced. Next.js supports **static rendering** (at build time), **dynamic rendering** (per request on the server), **incremental static regeneration (ISR)** (static HTML that revalidates on a schedule), and **client-side rendering** (in the browser, for interactive Client Components). In the App Router the strategy is largely **inferred** from your data-fetching choices rather than configured explicitly.

---

## Why does it matter?

Rendering strategy is the biggest lever on performance, cost, and freshness. Static pages are fast and cheap (served from a CDN) but can be stale; dynamic pages are always fresh but do work per request. Choosing correctly — often mixing strategies within one app — is a core Next.js skill, and misunderstanding what makes a route "go dynamic" is a common source of surprise.

---

## How it works

### The options

| Strategy | When HTML is made | Freshness | Cost per request | Use for |
|---|---|---|---|---|
| Static (SSG) | build time | stale until rebuild | lowest (CDN) | marketing, docs, blogs |
| ISR | build + periodic revalidate | eventually fresh | low | catalogs, content that changes occasionally |
| Dynamic (SSR) | per request | always fresh | higher | personalized/auth pages, real-time data |
| Client (CSR) | in browser | client-driven | n/a (client) | highly interactive widgets |

### What makes a route static vs dynamic

By default the App Router renders **statically**. A route becomes **dynamic** when it uses request-time data or dynamic APIs — e.g., reading `cookies()`/`headers()`, using `searchParams`, or an uncached `fetch`.

```tsx
// Static: cached fetch → HTML built once, served from cache
const data = await fetch(url, { cache: "force-cache" });

// Dynamic: reading cookies opts the route into per-request rendering
import { cookies } from "next/headers";
const session = (await cookies()).get("session");
```

### ISR via revalidation

```tsx
// Rebuild this page's HTML at most once per hour, on demand after that
const data = await fetch(url, { next: { revalidate: 3600 } });
```

Or `export const revalidate = 3600` for a whole route.

### Forcing a strategy

Route segment config gives explicit control when inference isn't what you want:

```tsx
export const dynamic = "force-dynamic";   // always render per request
export const dynamic = "force-static";    // require static; error on dynamic APIs
export const revalidate = 60;             // ISR window in seconds
```

### Streaming

Dynamic rendering can **stream** — send the shell immediately and stream slower parts as they resolve — via `loading.tsx`/`<Suspense>` (see streaming-and-suspense).

---

## Examples

```tsx
// Mixed app: a static marketing page and a dynamic dashboard in the same project
// app/page.tsx — static (cached fetch)
export default async function Home() {
  const posts = await fetch(api("/posts"), { next: { revalidate: 3600 } }).then(r => r.json());
  return <PostList posts={posts} />;
}

// app/dashboard/page.tsx — dynamic (per-user)
import { cookies } from "next/headers";
export default async function Dashboard() {
  const session = (await cookies()).get("session"); // → dynamic rendering
  const data = await getUserData(session);
  return <Overview data={data} />;
}
```

---

## When to use

- Use **static/ISR** for content that is the same for all users (pages, docs, catalogs) — fastest and cheapest.
- Use **dynamic** for personalized, authenticated, or real-time data that must be fresh per request.
- Use **ISR** when data changes occasionally and slight staleness is acceptable — best of both.
- Mix strategies per route; combine dynamic rendering with **streaming** to keep perceived performance high.

## When NOT to use

- Do not force everything dynamic — you lose CDN caching and pay per request unnecessarily.
- Do not read `cookies()`/`headers()`/`searchParams` in a route you intended to be static — it silently goes dynamic.
- Do not use ISR for strongly personalized data — cached HTML would leak across users.
- Do not rely on client-side rendering for content that needs SEO or fast first paint.

---

## References

- [Next.js — Rendering: Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
- [Next.js — Partial Prerendering & rendering strategies](https://nextjs.org/docs/app/building-your-application/rendering)
- [Next.js — Route Segment Config](https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config)
- [Next.js — Incremental Static Regeneration (revalidate)](https://nextjs.org/docs/app/building-your-application/data-fetching/incremental-static-regeneration)
