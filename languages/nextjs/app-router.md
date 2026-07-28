---
type: concept
tags:
  - language
  - nextjs
  - full-stack
  - concept
related:
  - languages/nextjs/layouts-and-pages
  - languages/nextjs/route-handlers
  - languages/react/routing
language: "nextjs"
---
# The App Router

> The App Router maps folders under `app/` to URL routes and uses a small set of special files — `page`, `layout`, `loading`, `error`, `route` — to define each segment's behavior.

---

## What is it?

The **App Router** is Next.js's routing system (the `app/` directory), built on React Server Components. Routes are defined by the **file system**: each folder is a URL segment, and reserved filenames give a segment its UI, layout, loading state, error boundary, or API handler.

---

## Why does it matter?

File-based routing removes a whole category of manual route configuration and keeps a route's UI, data, loading, and error handling colocated. The special-file conventions encode best practices (nested layouts, streaming loading UI, per-segment error boundaries) that would otherwise be boilerplate.

---

## How it works

### Folders are segments; special files define behavior

```
app/
├── layout.tsx            # root layout (required) — wraps everything
├── page.tsx              # "/"
├── dashboard/
│   ├── layout.tsx        # layout for /dashboard/*
│   ├── page.tsx          # "/dashboard"
│   ├── loading.tsx       # streamed fallback while the segment loads
│   ├── error.tsx         # error boundary (must be a Client Component)
│   └── settings/
│       └── page.tsx      # "/dashboard/settings"
└── blog/
    └── [slug]/
        └── page.tsx      # "/blog/:slug"
```

### The special files

| File | Role |
|---|---|
| `page.tsx` | The route's unique UI; makes the segment publicly routable |
| `layout.tsx` | Shared UI that wraps children; **preserves state** across navigations within it |
| `template.tsx` | Like layout but re-mounts on navigation (fresh state each time) |
| `loading.tsx` | Instant loading UI (wraps the segment in `<Suspense>`) |
| `error.tsx` | Error boundary for the segment (Client Component) |
| `not-found.tsx` | UI for `notFound()` or unmatched routes |
| `route.ts` | An API endpoint (Route Handler) instead of a page |

### Dynamic and special segments

```
[id]        → dynamic segment           (/users/123)
[...slug]   → catch-all                  (/docs/a/b/c)
[[...slug]] → optional catch-all
(group)     → route group (no URL segment; organizes files/layouts)
```

### Navigation

Client navigation uses `<Link>` and `useRouter`; the router prefetches and does client-side transitions without full reloads (see navigation-and-linking).

### Params

```tsx
// app/blog/[slug]/page.tsx — params is a promise in current Next.js
export default async function Post({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <article>{slug}</article>;
}
```

---

## Examples

```tsx
// app/layout.tsx — the required root layout defines <html> and <body>
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

```tsx
// app/dashboard/loading.tsx — shown instantly while dashboard data streams in
export default function Loading() {
  return <p>Loading dashboard…</p>;
}
```

---

## When to use

- Use the App Router for all new Next.js projects.
- Use nested `layout.tsx` for shared chrome (nav, sidebars) that should persist across child navigations.
- Use `loading.tsx` and `error.tsx` per segment to get streaming loading states and localized error handling for free.
- Use route groups `(group)` to organize files and share layouts without changing URLs.

## When NOT to use

- Do not mix Pages Router (`pages/`) and App Router (`app/`) patterns carelessly in new code — standardize on App Router.
- Do not put interactive state in a `layout.tsx` expecting it to reset on navigation — use `template.tsx` for that.
- Do not create deeply nested segment folders when a route group or flatter structure is clearer.
- Do not forget that `error.tsx` must be a Client Component (`"use client"`).

---

## References

- [Next.js — Routing Fundamentals](https://nextjs.org/docs/app/building-your-application/routing)
- [Next.js — Pages and Layouts](https://nextjs.org/docs/app/building-your-application/routing/layouts-and-templates)
- [Next.js — Dynamic Routes](https://nextjs.org/docs/app/building-your-application/routing/dynamic-routes)
- [Next.js — Route Groups](https://nextjs.org/docs/app/building-your-application/routing/route-groups)
