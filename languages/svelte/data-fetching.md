---
type: concept
tags:
  - language
  - svelte
  - typescript
  - async
related:
  - languages/svelte/routing
  - languages/svelte/reactivity-and-runes
  - languages/nextjs/data-fetching-and-caching
  - software-engineering/architecture/frontend/data-fetching-and-bff
language: "svelte"
---

# Data Fetching

> How SvelteKit loads data with `load` functions — running on the server or client, feeding pages typed data, and choosing where fetching happens.

---

## What is it?

In SvelteKit, data for a route is provided by a **`load` function** defined in a `+page.ts`, `+page.server.ts`, `+layout.ts`, or `+layout.server.ts` file. The framework calls `load` before rendering the route and passes its return value to the page as `data`. This replaces ad-hoc fetching in components with a structured, SSR-aware data layer.

---

## Why does it matter?

Fetching data inside a component (`onMount` + a `$state`) causes a loading flash and doesn't run during server-side rendering. SvelteKit's `load` functions solve this: they run on the server during SSR (so the first HTML already contains the data), participate in navigation (data loads before the new page shows), and give you a clear choice between **universal** loads (client + server) and **server-only** loads (for secrets and direct DB access). Understanding where a `load` runs is the core concept.

---

## How it works

### Universal vs server load

| File | Runs where | Use for |
|---|---|---|
| `+page.ts` (universal) | Server during SSR, then client on navigation | Public APIs, data safe to run in the browser |
| `+page.server.ts` (server-only) | Server always | Database access, secrets, private APIs |

```typescript
// +page.ts — universal load
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch, params }) => {
  const res = await fetch(`/api/products/${params.id}`);
  return { product: await res.json() };
};
```

```typescript
// +page.server.ts — server-only load (can touch the DB and secrets)
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
  const product = await db.getProduct(params.id); // never reaches the client
  return { product, isAdmin: locals.user?.role === 'admin' };
};
```

### Consuming the data

The return value is passed to the page as the typed `data` prop:

```svelte
<!-- +page.svelte -->
<script lang="ts">
  let { data } = $props(); // typed from ./$types
</script>
<h1>{data.product.name}</h1>
```

### SvelteKit's `fetch`

The `fetch` given to `load` is special: during SSR it can call the app's own `+server.ts` endpoints directly (no extra HTTP round-trip) and it forwards cookies/credentials. Always use the injected `fetch`, not the global one, inside `load`.

### Streaming with promises

Return a promise (unawaited) to stream slow data after the initial render — the page shows immediately and fills in when the promise resolves:

```typescript
export const load: PageLoad = async ({ fetch }) => {
  return {
    critical: await fetch('/api/summary').then((r) => r.json()), // awaited
    comments: fetch('/api/comments').then((r) => r.json()),      // streamed
  };
};
```

```svelte
{#await data.comments}
  <p>Loading comments…</p>
{:then comments}
  {#each comments as c (c.id)}<p>{c.text}</p>{/each}
{/await}
```

### Client-side fetching

For data that changes after load (polling, user-triggered), fetch in the component with runes — or use a server-state library. Server-state libraries (e.g. TanStack Query) still apply for caching/refetching beyond what `load` covers.

---

## Examples

Invalidating and re-running `load` after a mutation:

```svelte
<script lang="ts">
  import { invalidateAll } from '$app/navigation';

  async function addTodo(text: string) {
    await fetch('/api/todos', { method: 'POST', body: JSON.stringify({ text }) });
    await invalidateAll(); // re-runs load functions → data refreshes
  }
</script>
```

---

## When to use

- Use `load` (not component `onMount`) for a route's primary data — it's SSR-aware and blocks navigation until ready.
- Use `+page.server.ts` for DB access, secrets, and private APIs that must never reach the browser.
- Use `+page.ts` for public data that can safely run on both server and client.
- Stream slow, non-critical data by returning an unawaited promise.

## When NOT to use

- Don't fetch a route's main data in the component with `onMount` — you lose SSR and get a loading flash.
- Don't use the global `fetch` inside `load` — use the injected one for endpoint shortcuts and credential forwarding.
- Don't put secrets in a universal `+page.ts` — it runs in the browser; use `+page.server.ts`.

## References

- Svelte Team. [Loading data](https://svelte.dev/docs/kit/load). svelte.dev.
- Svelte Team. [Server-only modules](https://svelte.dev/docs/kit/server-only-modules). svelte.dev.
- Svelte Team. [Streaming with promises](https://svelte.dev/docs/kit/load#Streaming-with-promises). svelte.dev.
