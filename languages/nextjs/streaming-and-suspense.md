---
type: concept
tags:
  - language
  - nextjs
  - full-stack
  - async
  - concept
related:
  - languages/nextjs/layouts-and-pages
  - languages/nextjs/rendering-strategies
  - languages/react/suspense-and-concurrent
language: "nextjs"
---
# Streaming and Suspense

> Streaming sends a page's HTML in chunks as it becomes ready, using React `<Suspense>` to show fallbacks for slow parts while the rest of the page renders immediately.

---

## What is it?

**Streaming** lets the server send a route's shell right away and stream in the slower, data-dependent parts as they resolve, rather than blocking the whole response until everything is ready. It is powered by React **`<Suspense>`**: components that suspend (e.g., awaiting data) show a fallback, and the real content streams in when ready. Next.js wires this up automatically via `loading.tsx` and manually via `<Suspense>` boundaries.

---

## Why does it matter?

Without streaming, a page is as slow as its slowest data fetch — the user stares at a blank screen until *everything* is ready. Streaming improves perceived performance and Core Web Vitals: the shell and fast content paint immediately, and slow sections fill in progressively. It is the mechanism that makes dynamic rendering feel fast.

---

## How it works

### Automatic: loading.tsx

A `loading.tsx` file wraps the whole route segment in `<Suspense>` — the fallback shows instantly while the page streams.

```tsx
// app/dashboard/loading.tsx
export default function Loading() {
  return <DashboardSkeleton />;
}
```

### Granular: explicit Suspense boundaries

Wrap individual slow components so the rest of the page doesn't wait for them.

```tsx
// app/dashboard/page.tsx
import { Suspense } from "react";

export default function Dashboard() {
  return (
    <>
      <Header />                              {/* fast — streams immediately */}
      <Suspense fallback={<StatsSkeleton />}>
        <Stats />                             {/* slow — streams in when ready */}
      </Suspense>
      <Suspense fallback={<FeedSkeleton />}>
        <ActivityFeed />                      {/* independent boundary */}
      </Suspense>
    </>
  );
}

async function Stats() {
  const stats = await getStats(); // suspends this boundary only
  return <StatsView stats={stats} />;
}
```

Each `<Suspense>` streams independently — a slow `ActivityFeed` doesn't hold back `Stats`.

### Avoiding waterfalls

Fetch independent data in parallel so boundaries resolve concurrently, not one after another.

```tsx
// Start both before awaiting either
const statsPromise = getStats();
const feedPromise = getFeed();
```

### Relationship to rendering strategy

Streaming applies to dynamically rendered content. Combined with a static shell, you get a fast first paint plus fresh dynamic sections — the essence of modern Next.js UX (and Partial Prerendering, where supported).

---

## Examples

```tsx
// Stream a slow, personalized widget without blocking the static page
import { Suspense } from "react";

export default function ProductPage() {
  return (
    <>
      <ProductDetails />                       {/* static, instant */}
      <Suspense fallback={<p>Loading recommendations…</p>}>
        <Recommendations />                    {/* personalized, streamed */}
      </Suspense>
    </>
  );
}
```

---

## When to use

- Add `loading.tsx` to any segment that fetches server data for an instant loading state.
- Wrap independent slow sections in their own `<Suspense>` boundaries so fast content paints first.
- Start independent fetches in parallel to let boundaries resolve concurrently.
- Use streaming with dynamic rendering to keep perceived performance high on data-heavy pages.

## When NOT to use

- Do not wrap the entire page in one boundary if parts can render independently — you lose the benefit.
- Do not create data waterfalls by awaiting sequentially inside nested components.
- Do not stream tiny, fast pages where the added complexity buys nothing.
- Do not forget a meaningful fallback (skeletons over spinners) — it defines the perceived experience.

---

## References

- [Next.js — Loading UI and Streaming](https://nextjs.org/docs/app/building-your-application/routing/loading-ui-and-streaming)
- [React — `<Suspense>`](https://react.dev/reference/react/Suspense)
- [Next.js — Sequential vs parallel data fetching](https://nextjs.org/docs/app/building-your-application/data-fetching/fetching#parallel-and-sequential-data-fetching)
- [Web.dev — Core Web Vitals](https://web.dev/articles/vitals)
