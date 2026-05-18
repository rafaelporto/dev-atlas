# Suspense and Concurrent Features

> Suspense lets components "wait" for something (data, code, an image) and show a fallback in the meantime. Concurrent features (`useTransition`, `useDeferredValue`) keep the UI responsive during slow updates.

---

## What is it?

**Suspense** is a React mechanism for declaring a fallback UI while a subtree is "not ready" — usually because data is loading, code is being fetched (lazy loading), or an image is decoding. A `<Suspense>` boundary catches the wait and shows its fallback until the children resolve.

**Concurrent features** let React work on multiple renders at once, prioritise urgent updates over background work, and avoid blocking the main thread:

- **`useTransition`** — mark a state update as non-urgent.
- **`useDeferredValue`** — defer using a value while a more urgent render proceeds.
- **`Suspense` + streaming** — render a tree progressively as data arrives.

---

## Why does it matter?

Together, these features make it possible to express "show this fallback while X loads" as a declarative tree, instead of writing imperative loading-state code in every component. They also let React keep the UI snappy under expensive work — typing in an input stays responsive while a slow filtered list updates in the background.

---

## How it works

### `<Suspense>`

```tsx
<Suspense fallback={<Spinner />}>
  <Profile userId={id} />
</Suspense>
```

The fallback is shown until every component inside has resolved its dependencies. A "dependency" is something that throws a promise during render — typically achieved through a data-fetching library (TanStack Query, Relay), `lazy()` for code splitting, or `use()` with a promise in RSC.

### Code splitting with `lazy`

```tsx
const Editor = lazy(() => import("./Editor"));

<Suspense fallback={<EditorSkeleton />}>
  <Editor />
</Suspense>
```

The bundle for `Editor` is fetched on demand.

### `useTransition`

`useTransition` marks a state update as a **transition** — a non-urgent update React can interrupt if something more urgent (typing, clicking) happens.

```tsx
function FilterableList({ items }: { items: Item[] }) {
  const [query, setQuery] = useState("");
  const [filtered, setFiltered] = useState(items);
  const [isPending, startTransition] = useTransition();

  function handleChange(value: string) {
    setQuery(value); // urgent: keep the input responsive

    startTransition(() => {
      setFiltered(items.filter(i => i.name.includes(value))); // non-urgent
    });
  }

  return (
    <>
      <input value={query} onChange={e => handleChange(e.target.value)} />
      {isPending && <Spinner />}
      <ItemList items={filtered} />
    </>
  );
}
```

### `useDeferredValue`

`useDeferredValue` returns a copy of a value that "lags behind" during expensive renders:

```tsx
function ProductsPage({ query }: { query: string }) {
  const deferred = useDeferredValue(query);
  return <ProductList query={deferred} />;
}
```

The list is rendered with the deferred value, freeing the input above to remain responsive. When the urgent render completes, React renders again with the current value.

`useDeferredValue` vs `useTransition`:

- `useTransition` — you own the setter; you decide which update is the transition.
- `useDeferredValue` — you don't own the setter (the value comes from above as a prop or context); defer your *use* of it.

### Streaming with Server Components

In Next.js App Router (and other RSC frameworks), each `<Suspense>` boundary streams independently. The browser receives the shell immediately, and each section fills in as its server-side work completes:

```tsx
export default async function Page() {
  return (
    <>
      <Header />
      <Suspense fallback={<SidebarSkeleton />}>
        <Sidebar />
      </Suspense>
      <Suspense fallback={<FeedSkeleton />}>
        <Feed />
      </Suspense>
    </>
  );
}
```

The user sees the header while sidebar and feed are still loading on the server.

---

## Examples

### Lazy route

```tsx
const Settings = lazy(() => import("./routes/Settings"));

<Routes>
  <Route
    path="/settings/*"
    element={
      <Suspense fallback={<PageSkeleton />}>
        <Settings />
      </Suspense>
    }
  />
</Routes>
```

### Search with `useDeferredValue`

```tsx
function Search() {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const stale = query !== deferredQuery;

  return (
    <>
      <input value={query} onChange={e => setQuery(e.target.value)} />
      <div style={{ opacity: stale ? 0.5 : 1 }}>
        <Results query={deferredQuery} />
      </div>
    </>
  );
}
```

The visual cue (`opacity: 0.5`) tells the user the results are catching up.

---

## When to use

- **`<Suspense>`** — at every boundary where loading is independent (route, panel, widget).
- **`lazy()`** — for routes and rarely-used components to shrink the initial bundle.
- **`useTransition`** — when a state update triggers expensive renders that shouldn't block typing or clicks.
- **`useDeferredValue`** — when the slow input is a prop or context value you don't directly set.

---

## When NOT to use

- Don't wrap every component in `<Suspense>` — pick boundaries that map to UI sections.
- Don't use `useTransition` to "fix" a slow render — first investigate whether the work is actually needed (often it isn't).
- Don't use `useDeferredValue` and `useTransition` together for the same flow — pick the one that matches who owns the state.
- Don't combine multiple legacy data-fetching patterns inside the same Suspense boundary — race conditions and undefined states follow.

---

## References

- [`<Suspense>` reference — react.dev](https://react.dev/reference/react/Suspense)
- [`useTransition` reference — react.dev](https://react.dev/reference/react/useTransition)
- [`useDeferredValue` reference — react.dev](https://react.dev/reference/react/useDeferredValue)
- [`lazy()` reference — react.dev](https://react.dev/reference/react/lazy)
- [Next.js — Streaming with Suspense](https://nextjs.org/docs/app/building-your-application/routing/loading-ui-and-streaming)
