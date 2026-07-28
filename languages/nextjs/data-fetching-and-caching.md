---
type: concept
tags:
  - language
  - nextjs
  - full-stack
  - concept
related:
  - languages/nextjs/rendering-strategies
  - languages/nextjs/server-actions-and-mutations
  - languages/react/data-fetching
language: "nextjs"
---
# Data Fetching and Caching

> Fetch data directly in Server Components with `async`/`await`, and control freshness through Next.js's caching layers — request memoization, the Data Cache, and revalidation.

---

## What is it?

In the App Router you fetch data where you use it — typically in an `async` Server Component — using the standard `fetch` API (extended by Next.js) or any data client. **Caching** determines whether a fetch's result is reused: Next.js layers **request memoization** (dedupe within one render), the **Data Cache** (persist across requests/deployments), and **revalidation** (time- or tag-based invalidation).

---

## Why does it matter?

Caching is what makes Next.js fast — but it is also the feature that most surprises newcomers, because behavior changed across versions and defaults differ. Knowing which layer applies, and how to opt in or out, is the difference between a snappy app serving cached HTML and one that either serves stale data or does redundant work on every request.

---

## How it works

### Fetch in a Server Component

```tsx
export default async function Page() {
  const res = await fetch("https://api.example.com/posts");
  const posts = await res.json();
  return <PostList posts={posts} />;
}
```

### The caching layers

| Layer | Scope | Purpose |
|---|---|---|
| Request Memoization | single render pass | dedupe identical `fetch`es across components |
| Data Cache | across requests/deploys | persist fetched data; the basis of static/ISR |
| Full Route Cache | built HTML/RSC payload | serve prerendered routes |
| Router Cache | client, per session | reuse RSC payloads during navigation |

### Controlling the Data Cache

```tsx
fetch(url, { cache: "force-cache" });          // cache indefinitely (default may vary by version)
fetch(url, { cache: "no-store" });             // never cache → dynamic, always fresh
fetch(url, { next: { revalidate: 60 } });      // ISR: refresh at most every 60s
fetch(url, { next: { tags: ["posts"] } });     // tag for on-demand invalidation
```

> Cache defaults have shifted between Next.js versions — always confirm the behavior for the version you use, and be explicit (`cache`/`revalidate`) rather than relying on the default.

### Revalidation (on demand)

After a mutation (often in a Server Action), invalidate what changed:

```tsx
import { revalidateTag, revalidatePath } from "next/cache";
revalidateTag("posts");        // refetch anything tagged "posts"
revalidatePath("/blog");       // refetch a route
```

### Request memoization for non-fetch clients

`fetch` is auto-memoized per render. For ORMs/DB clients, wrap the loader in React's `cache()` to dedupe within a render.

```tsx
import { cache } from "react";
export const getUser = cache(async (id: string) => db.user.findUnique({ where: { id } }));
```

### Parallel vs sequential

Kick off independent requests together to avoid waterfalls.

```tsx
const [user, posts] = await Promise.all([getUser(id), getPosts(id)]);
```

---

## Examples

```tsx
// Tag data on read, invalidate it on write — consistent cache after mutations
// read (Server Component)
const posts = await fetch(api("/posts"), { next: { tags: ["posts"] } }).then(r => r.json());

// write (Server Action)
"use server";
import { revalidateTag } from "next/cache";
export async function addPost(data: FormData) {
  await createPost(data);
  revalidateTag("posts"); // the list refetches on next render
}
```

---

## When to use

- Fetch in Server Components with `async`/`await`; colocate data with the UI that uses it.
- Use the **Data Cache** (`force-cache`/`revalidate`) for shared, cacheable data; `no-store` for per-request freshness.
- Tag cached reads and call `revalidateTag`/`revalidatePath` after mutations.
- Use `Promise.all` and React `cache()` to avoid waterfalls and duplicate work.

## When NOT to use

- Do not assume caching behavior — it varies by version; set `cache`/`revalidate` explicitly.
- Do not cache per-user/authenticated data with shared cache settings — it can leak across users; use `no-store` or dynamic rendering.
- Do not create request waterfalls by awaiting independent fetches sequentially.
- Do not forget to revalidate after mutations, or the UI shows stale data.

---

## References

- [Next.js — Data Fetching and Caching](https://nextjs.org/docs/app/building-your-application/data-fetching/fetching)
- [Next.js — Caching in Next.js](https://nextjs.org/docs/app/building-your-application/caching)
- [Next.js — revalidateTag / revalidatePath](https://nextjs.org/docs/app/api-reference/functions/revalidateTag)
- [React — cache()](https://react.dev/reference/react/cache)
