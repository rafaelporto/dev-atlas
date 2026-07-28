---
type: concept
tags:
  - language
  - nextjs
  - full-stack
  - concept
related:
  - languages/nextjs/app-router
  - languages/nextjs/streaming-and-suspense
  - languages/nextjs/navigation-and-linking
language: "nextjs"
---
# Layouts, Pages, and UI States

> Pages render a route's content, layouts wrap pages with shared, state-preserving UI, and `loading`/`error`/`not-found` files declaratively handle each segment's UI states.

---

## What is it?

In the App Router, a **page** (`page.tsx`) is the unique UI for a route, and a **layout** (`layout.tsx`) is shared UI wrapping one or more pages. Alongside them, convention files handle the transient states of a segment: **`loading.tsx`** (pending), **`error.tsx`** (failure), and **`not-found.tsx`** (missing). Together they cover the full lifecycle of a route's UI.

---

## Why does it matter?

Every route needs to answer: what's the shared chrome, what shows while data loads, and what shows on error or when the resource doesn't exist. The App Router turns these from hand-wired boilerplate into files with defined semantics — including automatic `<Suspense>` and error-boundary wiring — so consistent UX is the default.

---

## How it works

### Nested layouts

Layouts nest: the root layout wraps every route; a segment layout wraps that segment's pages. Layouts **preserve state** and do not re-render on navigation between their children.

```tsx
// app/dashboard/layout.tsx — persistent sidebar across all /dashboard/* pages
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid">
      <Sidebar />
      <main>{children}</main>
    </div>
  );
}
```

### Layout vs template

- `layout.tsx` — persists across navigations (state kept, not re-mounted).
- `template.tsx` — a new instance per navigation (state reset; useful for enter animations or per-navigation effects).

### Loading UI

A `loading.tsx` wraps the segment's page in `<Suspense>` automatically, showing instantly while the server streams the page in.

```tsx
// app/dashboard/loading.tsx
export default function Loading() {
  return <Skeleton />;
}
```

### Error UI

`error.tsx` is a Client Component that catches render/data errors in its segment and offers recovery via `reset()`.

```tsx
"use client";
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div>
      <p>Something went wrong.</p>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```

A `global-error.tsx` catches errors in the root layout itself.

### Not found

Call `notFound()` from a Server Component to render the nearest `not-found.tsx`.

```tsx
import { notFound } from "next/navigation";
const post = await getPost(slug);
if (!post) notFound();
```

### Metadata

Pages and layouts export `metadata` (or a `generateMetadata` function) for `<head>` tags — title, description, Open Graph.

```tsx
export const metadata = { title: "Dashboard", description: "Your overview" };
```

---

## Examples

```tsx
// app/blog/[slug]/page.tsx — page + dynamic metadata + not-found handling
import { notFound } from "next/navigation";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  return { title: post?.title ?? "Not found" };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();
  return <article>{post.body}</article>;
}
```

---

## When to use

- Use nested layouts for shared chrome that should persist across child navigations.
- Add `loading.tsx` to any segment with server data so users see instant feedback.
- Add `error.tsx` per segment to localize failures and offer recovery.
- Use `notFound()` + `not-found.tsx` for missing resources; export `metadata` for SEO.

## When NOT to use

- Do not put per-page, resettable state in a `layout.tsx` — it won't reset; use `template.tsx`.
- Do not skip `loading`/`error` files on data-driven segments — you lose streaming and graceful failure.
- Do not fetch the same data separately in a layout and its page without relying on request-level caching/dedup.
- Do not build a custom 404 by conditional rendering when `notFound()` + `not-found.tsx` is the idiomatic path.

---

## References

- [Next.js — Layouts and Templates](https://nextjs.org/docs/app/building-your-application/routing/layouts-and-templates)
- [Next.js — Loading UI and Streaming](https://nextjs.org/docs/app/building-your-application/routing/loading-ui-and-streaming)
- [Next.js — Error Handling](https://nextjs.org/docs/app/building-your-application/routing/error-handling)
- [Next.js — Metadata](https://nextjs.org/docs/app/building-your-application/optimizing/metadata)
