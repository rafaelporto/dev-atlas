---
type: concept
tags:
  - language
  - nextjs
  - react
  - full-stack
  - concept
related:
  - languages/react/server-components
  - languages/nextjs/rendering-strategies
  - languages/nextjs/server-actions-and-mutations
language: "nextjs"
---
# Server and Client Components

> In the App Router every component is a Server Component by default; you opt the interactive parts into the browser with `"use client"`, keeping most code and data on the server.

---

## What is it?

The App Router is built on **React Server Components (RSC)**. **Server Components** render on the server, can access data and secrets directly, and ship **no JavaScript** to the browser. **Client Components** (marked with the `"use client"` directive) run in the browser and provide interactivity — state, effects, event handlers, and browser APIs.

---

## Why does it matter?

This split is the defining feature of modern Next.js. Rendering most of the tree on the server means less JavaScript downloaded and parsed, direct and secure data access (no client-exposed API keys), and better performance by default. But the boundary has rules — cross them wrong and you either leak secrets to the client or get a build error.

---

## How it works

### Server Components (the default)

```tsx
// app/products/page.tsx — no "use client"; runs on the server
import { db } from "@/lib/db"; // safe: never sent to the browser

export default async function Products() {
  const products = await db.product.findMany(); // direct data access
  return <ProductList products={products} />;
}
```

Server Components can be `async`, `await` data directly, read env secrets, and import server-only libraries. They cannot use `useState`, `useEffect`, or event handlers.

### Client Components

```tsx
"use client";
import { useState } from "react";

export function Counter() {
  const [n, setN] = useState(0);
  return <button onClick={() => setN(n + 1)}>{n}</button>;
}
```

`"use client"` at the top of a file marks it — and everything it imports — as client code. It is a **boundary**: it applies to that module and its client subtree.

### Composition: pass Server Components as children

A Client Component can't import a Server Component, but it can receive one as `children`/props — the key pattern for interleaving.

```tsx
// Server Component composes a client shell with server content inside
<ClientTabs>
  <ServerData />   {/* rendered on the server, passed through */}
</ClientTabs>
```

### The boundary rules

- Server → Client: pass **serializable** props only (no functions except Server Actions, no class instances).
- Client components can't use server-only APIs (`fs`, direct DB) — keep those on the server.
- Use the `server-only` package to guarantee a module never gets bundled for the client.

### When you need `"use client"`

Interactivity (`onClick`), state/effects (`useState`/`useEffect`), browser APIs (`window`, `localStorage`), and most third-party UI libraries that use them.

---

## Examples

```tsx
// Keep the client boundary at the leaves: server page + small client island
// app/post/[id]/page.tsx (Server Component)
export default async function Post({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await getPost(id);           // server data access
  return (
    <article>
      <h1>{post.title}</h1>
      <LikeButton postId={id} initial={post.likes} /> {/* client island */}
    </article>
  );
}
```

```tsx
// LikeButton.tsx
"use client";
import { useState } from "react";
export function LikeButton({ postId, initial }: { postId: string; initial: number }) {
  const [likes, setLikes] = useState(initial);
  return <button onClick={() => setLikes(likes + 1)}>♥ {likes}</button>;
}
```

---

## When to use

- Keep components as **Server Components by default** — data fetching, layouts, static content.
- Add `"use client"` only where you need interactivity, state, effects, or browser APIs.
- Push the client boundary to the **leaves** (small islands) to minimize shipped JavaScript.
- Pass Server Components into Client Components as `children` when you need to interleave.

## When NOT to use

- Do not mark large trees `"use client"` just because one child needs interactivity — isolate the interactive leaf.
- Do not import server-only code (DB, secrets, `fs`) into a Client Component — it errors or leaks; use `server-only`.
- Do not pass non-serializable props (functions, class instances) from Server to Client Components.
- Do not use `useState`/`useEffect`/event handlers in a Server Component — it must be a Client Component.

---

## References

- [Next.js — Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
- [Next.js — Client Components](https://nextjs.org/docs/app/building-your-application/rendering/client-components)
- [Next.js — Composition Patterns](https://nextjs.org/docs/app/building-your-application/rendering/composition-patterns)
- [React — Server Components](https://react.dev/reference/rsc/server-components)
