---
type: concept
tags:
  - language
  - vue
  - typescript
  - state-management
related:
  - languages/vue/reactivity-and-composition-api
  - languages/vue/composables
  - languages/react/state-management
  - software-engineering/architecture/frontend/state-management-architecture
language: "vue"
---

# State Management

> Managing shared application state in Vue — from reactivity-based stores to Pinia, the official solution — and choosing by scale.

---

## What is it?

**State management** is how a Vue app shares data that outlives a single component: the current user, a cart, UI flags, cached data. Vue's spectrum runs from local `ref`/`reactive` state, to a shared reactive object or [composable](composables.md), to **Pinia** — the official, dedicated store library for Vue 3.

---

## Why does it matter?

Not all state needs a store. Vue's reactivity makes it tempting (and often correct) to share a plain reactive object for simple cases. But as an app grows — many components reading and writing the same data, needing devtools, hot-module-reload safety, and SSR support — an ad-hoc shared object breaks down. Pinia provides structure (typed stores, actions, getters) without the boilerplate of older Vuex, and knowing where the line is prevents both over- and under-engineering.

---

## How it works

### The spectrum

```
   local ref   →   shared composable   →   Pinia store
   (one comp.)   (a few components)       (app-wide, structured, devtools)
```

### Simple shared state (small cases)

A reactive object exported from a module is shared by everything that imports it:

```typescript
// stores/counter.ts (lightweight, no library)
import { reactive } from 'vue';
export const counter = reactive({ count: 0, inc() { this.count++; } });
```

This works but lacks devtools integration, SSR safety, and clear conventions — fine for tiny apps, not for large ones.

### Pinia (the official store)

A Pinia store defines state, getters (derived), and actions (mutations/async). The setup syntax mirrors `<script setup>`:

```typescript
// stores/cart.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useCartStore = defineStore('cart', () => {
  // state
  const items = ref<Item[]>([]);
  // getters
  const count = computed(() => items.value.length);
  const total = computed(() => items.value.reduce((s, i) => s + i.price, 0));
  // actions
  function add(item: Item) { items.value.push(item); }
  function clear() { items.value = []; }

  return { items, count, total, add, clear };
});
```

Components use it as a composable:

```vue
<script setup lang="ts">
import { useCartStore } from '@/stores/cart';
import { storeToRefs } from 'pinia';

const cart = useCartStore();
const { count, total } = storeToRefs(cart); // keep reactivity when destructuring
</script>

<template>
  <p>{{ count }} items — {{ total }}</p>
  <button @click="cart.clear()">Clear</button>
</template>
```

`storeToRefs` is important: destructuring the store directly would lose reactivity for state/getters (actions can be destructured directly).

### Server state is separate

Data fetched from an API is a **cache**, not client state. Prefer a server-state library (TanStack Query, Nuxt loaders) for it rather than a Pinia store — see [data fetching](data-fetching.md) and [state management architecture](../../software-engineering/architecture/frontend/state-management-architecture.md).

---

## Examples

A store consumed and reset from different components stays in sync automatically:

```typescript
export const useUiStore = defineStore('ui', () => {
  const sidebarOpen = ref(false);
  const toggleSidebar = () => (sidebarOpen.value = !sidebarOpen.value);
  return { sidebarOpen, toggleSidebar };
});
```

Any component calling `useUiStore()` shares the one instance — a header can toggle the sidebar that a layout component renders.

---

## When to use

- **Local `ref`/`reactive`** for state owned by one component.
- **Shared composable / reactive module** for small, simple cross-component state.
- **Pinia** for app-wide client state that needs structure, TypeScript support, devtools, and SSR safety — the default for non-trivial apps.

## When NOT to use

- Don't reach for Pinia when a couple of props or a shared composable would do.
- Don't put server-fetched data in Pinia and hand-manage its freshness — use a server-cache library.
- Don't destructure a store without `storeToRefs` — you'll silently lose reactivity on state and getters.

## References

- Pinia Team. [Pinia — The Vue Store](https://pinia.vuejs.org/introduction.html). pinia.vuejs.org.
- Vue Team. [State Management](https://vuejs.org/guide/scaling-up/state-management.html). vuejs.org.
- Pinia Team. [Defining a Store](https://pinia.vuejs.org/core-concepts/). pinia.vuejs.org.
