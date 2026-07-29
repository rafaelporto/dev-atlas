---
type: concept
tags:
  - architecture
  - frontend
  - backend
  - full-stack
  - concept
related:
  - languages/react/data-fetching
  - languages/nextjs/data-fetching-and-caching
  - languages/nextjs/route-handlers
  - software-engineering/architecture/microservices
language: null
---
# Data Fetching & Backend-for-Frontend

> How the UI gets its data — where the fetch happens, how many round-trips it takes, what caches sit in between, and whether a dedicated backend should shape responses for the frontend.

This is the cross-cutting data-flow layer between the UI and your services. For concrete client APIs, see [React data fetching](../../../languages/react/data-fetching.md) and [Next.js data fetching and caching](../../../languages/nextjs/data-fetching-and-caching.md).

---

## What is it?

Data fetching is the boundary where a frontend stops being self-contained and starts depending on the network. The architectural questions are:

- **Where** does the fetch run — in the browser (client) or on a server rendering the page (server)?
- **How many** round-trips does a screen need, and are they sequential (a waterfall) or parallel?
- **What** shape does the data arrive in — exactly what the screen needs, or a generic payload the client must stitch together?
- **What caches** sit between the UI and the source of truth?

A **Backend-for-Frontend (BFF)** is one common answer to the "what shape" question: a thin server layer dedicated to a specific frontend (web, mobile) that calls the underlying services, aggregates and trims their responses, and returns exactly what that UI needs. It is the frontend's own backend, owned by the frontend team.

---

## Why does it matter?

The gap between UI and services is where most perceived slowness and accidental complexity live:

- **Request waterfalls** — component A fetches, then its child B fetches based on A's result, then C on B's. Three sequential round-trips stack their latencies, and the user watches spinners cascade.
- **Over-fetching** — a generic endpoint returns 40 fields when the screen shows 3, wasting bandwidth (worse on mobile networks).
- **Under-fetching** — an endpoint returns too little, so the client fires N follow-up requests (the "N+1" problem over HTTP).
- **Chatty clients** — a screen assembled from six microservices means six calls from the browser, each with its own auth, latency, and failure mode.

A deliberate fetching architecture — parallelizing independent requests, moving aggregation to a BFF, and layering caches — turns a chatty, waterfall-prone UI into one that shows content fast and stays resilient when a downstream service is slow.

---

## How it works

### Client vs. server fetching

```
Client-side fetch                     Server-side fetch (SSR / RSC / BFF)
─────────────────                     ───────────────────────────────────
browser → service                     browser → your server → service(s)
· data updates without reload         · first paint already has data (SEO)
· secrets exposed in browser          · secrets stay on the server
· one hop, but from the user's net    · aggregation close to the services
· good for post-load interactions     · good for initial render + fan-out
```

Real apps mix both: render the initial screen on the server (fast first paint, SEO, secrets hidden), then fetch incremental updates from the client (a "load more", a live counter).

### The Backend-for-Frontend

Without a BFF, the browser talks to many services directly and does the aggregation itself. With a BFF, one server-side layer per frontend does that work:

```
        Without BFF                              With BFF
        ───────────                              ────────
   ┌─────────┐                            ┌─────────┐
   │ Browser │                            │ Browser │  one tailored request
   └────┬────┘  6 chatty calls            └────┬────┘
   ┌────┼────┬────┬────┬────┐             ┌────▼────┐  aggregates + trims
   ▼    ▼    ▼    ▼    ▼    ▼             │   BFF   │  (owned by frontend team)
  ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐          └────┬────┘
  │s1│ │s2│ │s3│ │s4│ │s5│ │s6│           ┌───┼───┬───┬───┬───┐
  └──┘ └──┘ └──┘ └──┘ └──┘ └──┘           ▼   ▼   ▼   ▼   ▼   ▼
                                         (same services, called server-side)
```

The BFF is the frontend's analogue of an API gateway, but scoped and shaped to *one* client. A web BFF and a mobile BFF can return different shapes from the same services. It relates directly to [microservices](../microservices.md): the BFF is where the fan-out to many services is contained instead of leaking into the browser.

### REST vs. GraphQL at this boundary

Over/under-fetching is partly a protocol question:

- **REST** — fixed endpoints return fixed shapes; tailoring to a screen means either generic endpoints (over-fetch) or many specific ones. A BFF is the usual fix.
- **GraphQL** — the client asks for exactly the fields it needs in one request; the server resolves them across services. It can subsume much of what a BFF does, at the cost of running a GraphQL layer.

### Caching layers

Between the UI and the source of truth sit several caches, each with a different scope and invalidation story:

```
Browser memory  →  Client query cache  →  CDN / edge  →  BFF cache  →  Service / DB
(this tab)          (dedupe, stale-       (shared,       (aggregated   (source of
                     while-revalidate)     public data)   responses)     truth)
```

The closer the cache is to the user, the faster the hit — and the harder correct invalidation becomes. The architectural job is deciding *which* data is safe to cache *where*, and how each layer is invalidated.

---

## Examples

The illustrative snippet (one framework's syntax) shows fixing a waterfall by parallelizing independent requests, and a BFF endpoint aggregating services server-side.

```tsx
// ✗ Waterfall: three sequential awaits stack their latencies.
async function load(userId: string) {
  const user = await fetchUser(userId);
  const orders = await fetchOrders(userId);      // doesn't depend on `user`
  const recommendations = await fetchRecs(userId); // doesn't depend on the others
  return { user, orders, recommendations };
}

// ✓ Independent requests run in parallel — one round-trip's worth of latency.
async function load(userId: string) {
  const [user, orders, recommendations] = await Promise.all([
    fetchUser(userId),
    fetchOrders(userId),
    fetchRecs(userId),
  ]);
  return { user, orders, recommendations };
}
```

```ts
// A BFF endpoint: called once by the web client, it fans out to services
// server-side and returns exactly the shape the dashboard screen needs.
export async function GET(req: Request) {
  const userId = getUserId(req);
  const [profile, orders, recs] = await Promise.all([
    services.users.get(userId),
    services.orders.listRecent(userId, { limit: 5 }),
    services.recommendations.get(userId),
  ]);
  // Trim + reshape to the screen's needs — no over-fetching reaches the browser.
  return Response.json({
    name: profile.name,
    recentOrders: orders.map((o) => ({ id: o.id, total: o.total })),
    recommended: recs.slice(0, 3),
  });
}
```

---

## When to use

- **Server-side fetching** for the initial render of public or SEO-relevant pages, and to keep API secrets off the client.
- **Client-side fetching** for data that updates after load (pagination, live values, post-interaction refetches).
- **A BFF** when a single screen aggregates several services, when web and mobile need different response shapes, or when you want to keep orchestration and secrets out of the browser.
- **GraphQL** when clients need flexible, per-screen field selection across many entities and you can run the extra layer.

## When NOT to use

- **A BFF for a simple app with one backend** — it's an extra deployable to own for no aggregation benefit; call the API directly.
- **Fetching everything on the client for content pages** — you lose SEO and first-paint; render on the server.
- **Sequential awaits for independent data** — parallelize; a waterfall is almost never intentional.
- **Caching mutable, user-specific data at shared layers (CDN)** — you'll serve one user's data to another; cache only what's safe at each layer.

---

## References

- Newman, Sam. [Backends For Frontends](https://samnewman.io/patterns/architectural/bff/). samnewman.io.
- patterns.dev. [Client-side vs. Server-side Rendering / Data Fetching](https://www.patterns.dev/). patterns.dev.
- TanStack. [Important Defaults — Caching & Staleness](https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults). TanStack Query Documentation.
- GraphQL Foundation. [Thinking in Graphs / Best Practices](https://graphql.org/learn/thinking-in-graphs/). graphql.org.
