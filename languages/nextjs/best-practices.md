---
type: concept
tags:
  - language
  - nextjs
  - full-stack
  - best-practice
related:
  - languages/nextjs/server-and-client-components
  - languages/nextjs/data-fetching-and-caching
  - languages/nextjs/architecture
language: "nextjs"
---
# Next.js Best Practices

> Default to Server Components, push the client boundary to the leaves, fetch data where you use it, be explicit about caching, and validate/authorize on the server.

---

## What is it?

A consolidated checklist of production-grade Next.js conventions, drawn from the framework's own guidance. They center on the App Router's defining choices: the server/client split, the caching model, data fetching in Server Components, and security of Server Actions and Route Handlers.

---

## Why does it matter?

Next.js has strong defaults, but its flexibility means it is easy to accidentally ship a huge client bundle, serve stale (or leaked) cached data, or expose an unprotected mutation. These practices keep an app fast, correct, and secure as it grows — and align it with how the framework is designed to be used.

---

## How it works

### Components

- **Default to Server Components.** Add `"use client"` only for interactivity, state, effects, or browser APIs.
- **Keep the client boundary at the leaves** — small islands — to minimize shipped JavaScript.
- Pass Server Components into Client Components as `children` to interleave.

### Data and caching

- **Fetch where you use it**, in async Server Components; colocate data with UI.
- **Be explicit about caching** (`cache`/`revalidate`/tags) — defaults vary by version; don't rely on them.
- **Never cache per-user data with shared settings** — use `no-store` or dynamic rendering to avoid leaks.
- **Revalidate after mutations** (`revalidateTag`/`revalidatePath`) so the UI isn't stale.
- **Avoid waterfalls** — start independent fetches in parallel; dedupe with React `cache()`.

### Rendering

- Prefer **static/ISR** for shared content; use **dynamic** only when needed; **stream** slow parts with `<Suspense>`/`loading.tsx`.
- Check the build output's static/dynamic labels to confirm intent.

### Mutations and APIs

- Use **Server Actions** for your own UI's mutations; **Route Handlers** for public/external APIs.
- **Validate and authorize on the server** inside every action and handler — treat all input as untrusted.

### Security

- Keep secrets server-only (`server-only`, unprefixed env vars); only `NEXT_PUBLIC_*` reaches the client.
- Do coarse gatekeeping in middleware, but enforce authorization again deeper in the stack.

### Assets and performance

- Use `next/image` and `next/font`; set a `priority` LCP image.
- Lazy-load heavy client widgets with `next/dynamic`; analyze the bundle periodically.

### Structure

- Keep `app/` for routing; put data access/logic in a server-only `lib/`; organize by feature as it grows.

---

## Examples

```tsx
// Idiomatic: server data fetch + tagged cache + small client island
// app/posts/page.tsx (Server Component)
async function getPosts() {
  return fetch(api("/posts"), { next: { tags: ["posts"], revalidate: 60 } })
    .then((r) => r.json());
}

export default async function Posts() {
  const posts = await getPosts();
  return (
    <>
      <PostList posts={posts} />          {/* server-rendered, no client JS */}
      <NewPostForm />                      {/* client island via a Server Action */}
    </>
  );
}
```

---

## When to use

- Apply these defaults on every Next.js project; enforce lint/typecheck/tests in CI.
- Default to server rendering and explicit caching; validate and authorize on the server.
- Optimize assets and bundles, and confirm the static/dynamic split in the build output.

## When NOT to use

- Do not mark large trees `"use client"` for one interactive child — isolate the leaf.
- Do not rely on implicit cache defaults or cache per-user data with shared settings.
- Do not skip validation/authorization in Server Actions or Route Handlers.
- Do not expose secrets via `NEXT_PUBLIC_` or import server-only code into Client Components.
- Do not over-structure a small app before it needs it.

---

## References

- [Next.js — Building Your Application (guides)](https://nextjs.org/docs/app/building-your-application)
- [Next.js — Composition Patterns](https://nextjs.org/docs/app/building-your-application/rendering/composition-patterns)
- [Next.js — Caching](https://nextjs.org/docs/app/building-your-application/caching)
- [Next.js — Production Checklist](https://nextjs.org/docs/app/guides/production-checklist)
