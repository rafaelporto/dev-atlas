---
type: concept
tags:
  - language
  - nextjs
  - react
  - full-stack
  - overview
related:
  - languages/react/overview
  - languages/nextjs/app-router
  - languages/nextjs/rendering-strategies
language: "nextjs"
---
# Next.js Overview

> Next.js is a full-stack React framework that adds server-side rendering, file-based routing, React Server Components, and a build/deploy toolchain on top of React.

---

## What is it?

Next.js is a **framework built on React**. Where React is a library for building UIs, Next.js supplies the surrounding structure a real application needs: **routing** (file-based), **rendering strategies** (server, static, streaming), **data fetching and caching**, **server-side code** (Server Components, Server Actions, Route Handlers), and an optimized build and deployment pipeline. It is maintained by Vercel.

The modern Next.js is the **App Router** (the `app/` directory), built around React Server Components. An older **Pages Router** (`pages/`) still exists and is supported, but new projects should use the App Router.

---

## Why does it matter?

Plain React ships a client-side bundle and leaves routing, SSR, data fetching, and bundling to you. Next.js provides opinionated, integrated answers, so teams ship faster with better defaults for performance and SEO. React Server Components — which Next.js pioneered in production — let most of the UI render on the server, sending less JavaScript to the browser.

---

## How it works

### The pieces

```
┌──────────────────────────────────────────────┐
│ app/ (file-based routing + layouts)            │
├──────────────────────────────────────────────┤
│ Server Components (default) · Client Components │
│ Server Actions · Route Handlers (APIs)          │
├──────────────────────────────────────────────┤
│ Rendering: static · dynamic · streaming         │
│ Caching layers · data fetching                   │
├──────────────────────────────────────────────┤
│ React + the Next.js compiler/bundler             │
└──────────────────────────────────────────────┘
```

### Server-first rendering

In the App Router, components are **Server Components by default** — they run on the server, can access data directly, and send only rendered HTML plus minimal JS. You opt specific components into the client with `"use client"` when you need interactivity, state, or browser APIs.

### File-based routing

Folders under `app/` become routes; special files (`page`, `layout`, `loading`, `error`, `route`) define behavior. See the app-router article.

### Full-stack in one project

Route Handlers (`route.ts`) build APIs; Server Actions run server code from forms/events — so the backend and frontend live in one codebase and share types.

---

## Examples

```tsx
// app/page.tsx — a Server Component fetching data directly, no client JS needed
async function getProducts() {
  const res = await fetch("https://api.example.com/products", {
    next: { revalidate: 3600 }, // cache for an hour
  });
  return res.json();
}

export default async function HomePage() {
  const products = await getProducts();
  return (
    <ul>
      {products.map((p: { id: string; name: string }) => (
        <li key={p.id}>{p.name}</li>
      ))}
    </ul>
  );
}
```

---

## When to use

- Content and marketing sites needing SEO and fast first paint (static + streaming).
- Full-stack React apps where you want backend and frontend in one project.
- Dashboards and apps that benefit from server-side data access and reduced client JS.
- Teams wanting integrated routing, caching, and deployment rather than assembling their own stack.

## When NOT to use

- Purely client-side apps with no SEO or SSR needs — a Vite + React SPA is lighter.
- Simple static content a static-site generator or plain HTML could serve.
- When you need a non-React framework, or a backend in another language that already exists — Next.js couples you to React and its server model.
- Highly custom server requirements that fight the framework's caching/rendering model.

---

## References

- [Next.js — Documentation](https://nextjs.org/docs)
- [Next.js — App Router](https://nextjs.org/docs/app)
- [React — Server Components](https://react.dev/reference/rsc/server-components)
- [Next.js — Getting Started](https://nextjs.org/docs/app/getting-started)
