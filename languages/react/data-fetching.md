# Data Fetching

> Server data is not local state. Use a query library (TanStack Query, SWR) to handle caching, revalidation, deduping, and loading states — or fetch on the server with RSC.

---

## What is it?

**Data fetching** in React is the act of loading data from a remote source (HTTP API, GraphQL endpoint, database). Three common approaches today:

1. **Query libraries** — TanStack Query, SWR. The standard for client-side fetching in React.
2. **Server Components** — fetch on the server, pass data down (Next.js App Router, React Router v7+).
3. **Framework loaders** — `loader` functions in React Router or Remix, executed before a route renders.

What you should not do: hand-roll fetching with `useEffect` + `useState` for anything non-trivial.

---

## Why does it matter?

A naive `useEffect` + `fetch` is wrong in subtle ways:

- No cancellation when the component unmounts or the input changes (race conditions).
- No caching — every mount refetches.
- No deduplication — five components needing the same data make five requests.
- No retry, no background revalidation, no stale-while-revalidate.
- No deduping of inflight requests when navigating quickly.

Libraries solve all of this in a few lines. Use them.

---

## How it works

### TanStack Query

```tsx
import { useQuery } from "@tanstack/react-query";

function UserCard({ userId }: { userId: string }) {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["user", userId],
    queryFn: () => fetchUser(userId),
  });

  if (isLoading) return <Spinner />;
  if (error)     return <ErrorBanner error={error} />;
  return <h1>{user!.name}</h1>;
}
```

- `queryKey` identifies the query. Same key → shared cache, dedup, single fetch.
- `queryFn` returns a promise. Anything that resolves to data works (fetch, axios, GraphQL client, your own function).
- Built-in: stale time, retry, background refetch, optimistic updates, infinite queries, pagination.

### Mutations

```tsx
import { useMutation, useQueryClient } from "@tanstack/react-query";

function CreatePostButton() {
  const qc = useQueryClient();
  const { mutate, isPending } = useMutation({
    mutationFn: (post: NewPost) => createPost(post),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["posts"] }),
  });

  return (
    <button onClick={() => mutate({ title: "Hi" })} disabled={isPending}>
      {isPending ? "Creating…" : "Create"}
    </button>
  );
}
```

`invalidateQueries` marks affected queries as stale; they refetch automatically.

### SWR

A lighter alternative:

```tsx
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then(r => r.json());

function User({ id }: { id: string }) {
  const { data, error, isLoading } = useSWR<User>(`/api/users/${id}`, fetcher);
  if (isLoading) return <Spinner />;
  if (error)     return <Error />;
  return <h1>{data!.name}</h1>;
}
```

Smaller API; similar semantics (cache, dedupe, revalidate). TanStack Query is the more popular choice for richer use cases (mutations, infinite queries, prefetching).

### Server Components

In RSC frameworks, fetch on the server — no client-side library needed for read-only data:

```tsx
// app/users/[id]/page.tsx
export default async function UserPage({ params }: { params: { id: string } }) {
  const user = await db.users.findById(params.id);
  return <h1>{user.name}</h1>;
}
```

For mutations, use Server Actions. For client-side interactivity that needs cached data, combine RSC with TanStack Query (hydrate on the server, take over on the client).

### Framework loaders

React Router / Remix `loader` functions run before the route renders:

```tsx
export async function loader({ params }: LoaderArgs) {
  return { user: await fetchUser(params.id) };
}

export default function UserRoute() {
  const { user } = useLoaderData<typeof loader>();
  return <h1>{user.name}</h1>;
}
```

Loaders avoid the render-fetch-render waterfall and run in parallel for nested routes.

### Avoiding the waterfall

A common pitfall: child components fetch in sequence because each waits for the previous to render. Prefer:

- **Prefetching** at the parent — `queryClient.prefetchQuery` or framework loaders.
- **Suspense** with parallel queries — start multiple queries at once.
- **RSC** — server fetches everything in parallel before sending HTML.

---

## Examples

### Pagination

```tsx
const { data } = useQuery({
  queryKey: ["posts", page],
  queryFn: () => fetchPosts(page),
  placeholderData: (prev) => prev,   // smooth UX while next page loads
});
```

### Infinite scroll

```tsx
const { data, fetchNextPage, hasNextPage } = useInfiniteQuery({
  queryKey: ["feed"],
  queryFn: ({ pageParam = 0 }) => fetchFeed(pageParam),
  getNextPageParam: (last) => last.nextCursor,
  initialPageParam: 0,
});
```

### Optimistic update

```tsx
const { mutate } = useMutation({
  mutationFn: toggleLike,
  onMutate: async (postId) => {
    await qc.cancelQueries({ queryKey: ["post", postId] });
    const previous = qc.getQueryData(["post", postId]);
    qc.setQueryData(["post", postId], (old: Post) => ({ ...old, liked: !old.liked }));
    return { previous };
  },
  onError:   (_, postId, ctx) => qc.setQueryData(["post", postId], ctx?.previous),
  onSettled: (_, __, postId)  => qc.invalidateQueries({ queryKey: ["post", postId] }),
});
```

---

## When to use

- **TanStack Query** — most apps fetching from REST/GraphQL APIs.
- **SWR** — when you want a lighter API; less feature-rich.
- **Server Components** — when your framework supports them and most data is read-only.
- **Framework loaders** — when using React Router v7+/Remix, especially for SSR/SSG.

---

## When NOT to use

- Don't fetch in `useEffect` for any data you'd want cached, deduplicated, or revalidated.
- Don't fetch the same data in multiple components without a shared cache.
- Don't put query state into Zustand/Redux — query libraries *are* the cache.
- Don't trigger fetches in render — wrap them in queries, loaders, or RSC.

---

## References

- [TanStack Query](https://tanstack.com/query)
- [SWR](https://swr.vercel.app)
- [Next.js — Data Fetching](https://nextjs.org/docs/app/building-your-application/data-fetching)
- [React Router — Loading Data](https://reactrouter.com/start/data/data-loading)
