---
type: concept
tags:
  - language
  - react-native
  - react
  - typescript
  - mobile
  - networking
  - async
related:
  - languages/react-native/state-management
  - languages/react-native/architecture
  - languages/react-native/dependency-injection
  - languages/react/data-fetching
  - software-engineering/architecture/frontend/data-fetching-and-bff
language: "react-native"
---
# Data Fetching

> Server data is a cache, not application state. Treat it as one, and loading states, retries, staleness, and offline behaviour stop being your problem.

---

## What is it?

Data fetching in React Native means calling an HTTP API with `fetch` and getting the result onto the screen. The naive version — `useEffect` plus `useState` — works for one screen and falls apart at three.

A query library (TanStack Query is the standard choice) manages the cache: deduplicating concurrent requests, refetching when appropriate, retrying failures, and tracking whether data is fresh or stale.

---

## Why does it matter?

Mobile networks are slow, unreliable, and intermittent in a way desktop networks are not. A user walks into a lift, switches from Wi-Fi to cellular, or backgrounds the app for an hour and returns.

Hand-rolled fetching handles none of that. Worse, the manual version quietly ships three bugs almost every time: a race condition when the screen's parameter changes mid-request, a state update on an unmounted component, and no retry on a transient failure.

---

## How it works

### Why `useEffect` is not enough

```tsx
// ✗ Three bugs, all of them subtle
function PostScreen({ id }: { id: string }) {
  const [post, setPost] = useState<Post | null>(null);

  useEffect(() => {
    fetch(`/api/posts/${id}`)
      .then((r) => r.json())
      .then(setPost);        // may resolve after id changed — stale data wins
  }, [id]);                  // no cleanup, no error handling, no retry
}
```

If `id` changes while the first request is in flight, the responses can arrive out of order and the wrong post renders. There is no error path, no retry, no caching — a return visit refetches from scratch.

### The query cache

```tsx
const { data, isLoading, isError, refetch } = useQuery({
  queryKey: ["posts", id],
  queryFn: () => postRepository.getById(id),
});
```

The `queryKey` identifies the cache entry. When `id` changes the key changes, and the library handles ordering, cancellation, deduplication, and retry. Two components asking for the same key share one request.

### Setting it up

```tsx
// app/_layout.tsx
import { QueryClient, QueryClientProvider, focusManager, onlineManager } from "@tanstack/react-query";
import NetInfo from "@react-native-community/netinfo";
import { AppState, type AppStateStatus } from "react-native";
import { useEffect } from "react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 2,
      refetchOnReconnect: true,
    },
  },
});

// Teach the library what "online" means on a device
onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => setOnline(!!state.isConnected)),
);

export default function RootLayout() {
  useEffect(() => {
    const sub = AppState.addEventListener("change", (status: AppStateStatus) =>
      focusManager.setFocused(status === "active"),
    );
    return () => sub.remove();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Stack />
    </QueryClientProvider>
  );
}
```

Those two listeners are the React Native-specific part. On the web the library uses `window` focus and `navigator.onLine`; on a device it needs `AppState` and NetInfo instead. Without them, data never refreshes when the user returns to the app.

### A typed HTTP client

Keep transport concerns in one place rather than scattering `fetch` across features:

```ts
// src/shared/lib/http.ts
import { env } from "./env";

export class HttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = "HttpError";
  }
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${env.EXPO_PUBLIC_API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  if (!response.ok) {
    throw new HttpError(response.status, `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}
```

### Validating what comes back

An API response is untrusted input. Parsing it gives you a real type instead of a hopeful one:

```ts
import { z } from "zod";

const postSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  publishedAt: z.coerce.date(),
});

export type Post = z.infer<typeof postSchema>;

export const postRepository = {
  getById: async (id: string): Promise<Post> =>
    postSchema.parse(await request(`/posts/${id}`)),

  list: async (): Promise<Post[]> =>
    postSchema.array().parse(await request("/posts")),
};
```

This turns a malformed payload into a clear error at the boundary rather than `undefined.title` deep inside a component.

### Mutations

```tsx
const queryClient = useQueryClient();

const { mutate, isPending } = useMutation({
  mutationFn: postRepository.create,
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ["posts"] }),
});
```

Invalidating on success is the simple path: the list refetches and shows the new item. For a snappier feel, update the cache optimistically and roll back on error.

### Offline

```tsx
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
```

Persisting the cache means a user who opens the app without connectivity sees the last known data instead of an empty screen. Combined with `refetchOnReconnect`, the app updates itself as soon as the network returns.

---

## Examples

A feature's full data layer — repository, hook, screen:

```ts
// src/features/posts/hooks/usePosts.ts
import { useQuery } from "@tanstack/react-query";
import { postRepository } from "../api/postRepository";

export function usePosts() {
  return useQuery({
    queryKey: ["posts"],
    queryFn: postRepository.list,
    staleTime: 5 * 60_000,
  });
}
```

```tsx
// app/(tabs)/feed.tsx
import { ActivityIndicator, Text, View } from "react-native";
import { usePosts } from "@/features/posts/hooks/usePosts";
import { PostList } from "@/features/posts/components/PostList";

export default function FeedScreen() {
  const { data, isLoading, isError, refetch, isRefetching } = usePosts();

  if (isLoading) return <ActivityIndicator style={{ marginTop: 48 }} />;

  if (isError) {
    return (
      <View style={{ padding: 16, gap: 12 }}>
        <Text>Could not load posts.</Text>
        <Button title="Try again" onPress={() => refetch()} />
      </View>
    );
  }

  return (
    <PostList
      posts={data}
      isRefreshing={isRefetching}
      onRefresh={refetch}
      onSelect={(id) => router.push(`/posts/${id}`)}
    />
  );
}
```

The screen renders states; the hook owns caching; the repository owns transport and validation. Each is testable on its own — the repository against a stubbed `fetch`, the hook against a stubbed repository, the screen against a stubbed hook.

---

## When to use

- **TanStack Query** for anything read from an API. The threshold at which it pays for itself is roughly the second screen.
- **A repository module per feature**, so components never call `fetch` directly and the API shape can change in one place.
- **Schema validation at the boundary** for any response you do not control end to end.
- **Cache persistence** whenever the app is useful with stale data — most content apps are.

## When NOT to use

- Do not use `useEffect` + `useState` for fetching beyond a throwaway prototype.
- Do not copy query results into a client store. Two sources of truth, and the copy goes stale silently.
- Do not set `staleTime: 0` everywhere — every screen focus refires the request and burns the user's data allowance.
- Do not retry non-idempotent mutations automatically. A retried payment is worse than a failed one.
- Do not skip the `AppState` and NetInfo wiring. Without it, refetch-on-focus and refetch-on-reconnect never fire on a device.

---

## References

- [Networking — React Native](https://reactnative.dev/docs/network)
- [TanStack Query — React Native](https://tanstack.com/query/latest/docs/framework/react/react-native)
- [TanStack Query — caching and invalidation](https://tanstack.com/query/latest/docs/framework/react/guides/caching)
- [Network connectivity — Expo](https://docs.expo.dev/versions/latest/sdk/netinfo/)
- [Zod — schema validation](https://zod.dev/)
