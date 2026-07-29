---
type: concept
tags:
  - language
  - vue
  - typescript
  - async
related:
  - languages/vue/composables
  - languages/vue/reactivity-and-composition-api
  - languages/vue/state-management
  - software-engineering/architecture/frontend/data-fetching-and-bff
language: "vue"
---

# Data Fetching

> How Vue components load remote data — from plain `fetch` in composables to dedicated server-state libraries and Nuxt's data loaders.

---

## What is it?

**Data fetching** in Vue is how components get data from a server and keep the UI in sync with it. Vue core doesn't prescribe a data layer; the options range from calling `fetch`/`axios` inside a [composable](composables.md), to a dedicated **server-state** library like **TanStack Query (Vue Query)**, to framework-level loaders in **Nuxt**.

---

## Why does it matter?

Naive fetching (call the API in `onMounted`, store the result in a `ref`) works but quietly grows into a pile of manual concerns: loading and error flags, refetching when inputs change, caching, deduplicating requests, and avoiding race conditions. Recognizing that **server state is different from client state** — it's a cache of something you don't own — is the key insight that tells you when to graduate from hand-rolled fetching to a purpose-built library.

---

## How it works

### The baseline: a fetch composable

For simple cases, encapsulate fetching in a composable that exposes `data`, `error`, and `loading`:

```typescript
// composables/useUser.ts
import { ref, watchEffect, unref, type MaybeRef } from 'vue';

export function useUser(id: MaybeRef<string>) {
  const data = ref<User | null>(null);
  const error = ref<Error | null>(null);
  const loading = ref(false);

  watchEffect(async () => {
    loading.value = true;
    error.value = null;
    try {
      const res = await fetch(`/api/users/${unref(id)}`);
      data.value = await res.json();
    } catch (e) {
      error.value = e as Error;
    } finally {
      loading.value = false;
    }
  });

  return { data, error, loading };
}
```

Because it uses `watchEffect` over a `MaybeRef` id, it **refetches automatically** when the id changes — but it still has no caching or deduplication.

### Server-state libraries: TanStack Query

For real apps, a server-state library handles caching, background refetching, deduplication, and invalidation for you:

```vue
<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query';

const { data, isPending, isError } = useQuery({
  queryKey: ['users', props.id],       // cache key; refetches when it changes
  queryFn: () => fetch(`/api/users/${props.id}`).then((r) => r.json()),
});
</script>

<template>
  <p v-if="isPending">Loading…</p>
  <p v-else-if="isError">Failed</p>
  <h2 v-else>{{ data.name }}</h2>
</template>
```

Mutations (writes) invalidate cached queries so dependent views refresh automatically.

### Framework loaders: Nuxt

In Nuxt, data is loaded with `useFetch`/`useAsyncData`, which run on the server during SSR and hydrate on the client — no loading flash for the first paint:

```vue
<script setup lang="ts">
const { data: posts } = await useFetch('/api/posts'); // runs SSR + client
</script>
```

---

## Examples

Choosing the right tool by state kind:

```
   ┌── Is it data owned by the server (fetched, can go stale)? ──┐
   │                                                              │
  yes → server state                                    no → client state
   │                                                              │
  TanStack Query / Nuxt useFetch                    ref/reactive + composable
  (cache, refetch, dedupe, invalidate)              (see reactivity article)
```

Putting fetched server data into a global Pinia store *and* manually keeping it fresh is the classic over-engineering trap — a server-cache library already does that job.

---

## When to use

- **Fetch composable**: small apps or a couple of endpoints with simple needs.
- **TanStack Query**: any app with meaningful server state — caching, background refresh, dedup, and invalidation out of the box.
- **Nuxt `useFetch`/`useAsyncData`**: when you're on Nuxt and want SSR-friendly data loading.

## When NOT to use

- Don't reinvent caching/refetching/deduplication by hand once the app is non-trivial — use a server-state library.
- Don't store server data in Pinia just to have it "in the store"; keep server cache in a cache library and client/UI state in Pinia.
- Don't fetch in `onMounted` without handling the param-change case — the component instance is reused across route params.

## References

- Vue Team. [Fetching Data](https://vuejs.org/guide/scaling-up/ssr.html). vuejs.org.
- TanStack. [Vue Query — Overview](https://tanstack.com/query/latest/docs/framework/vue/overview). tanstack.com.
- Nuxt Team. [Data Fetching](https://nuxt.com/docs/getting-started/data-fetching). nuxt.com.
