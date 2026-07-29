---
type: concept
tags:
  - language
  - vue
  - typescript
  - reactive
  - best-practice
related:
  - languages/vue/reactivity-and-composition-api
  - languages/vue/state-management
  - languages/react/rules-of-hooks-and-custom-hooks
language: "vue"
---

# Composables

> Reusable functions that encapsulate stateful, reactive logic — Vue's primary mechanism for sharing behavior across components.

---

## What is it?

A **composable** is a function that uses Vue's reactivity APIs (`ref`, `computed`, `watch`, lifecycle hooks) to encapsulate and reuse **stateful logic**. By convention its name starts with `use` (`useMouse`, `useFetch`, `useLocalStorage`). It's the Composition API's answer to sharing logic — the equivalent of React's custom hooks.

---

## Why does it matter?

Before composables, sharing stateful logic between Vue components meant mixins (which collide and obscure origins) or renderless components (verbose). Composables solve this cleanly: a plain function returns reactive state and functions, its dependencies are explicit, and multiple composables combine without naming clashes. This is what makes Composition-API code scale — cross-cutting concerns (mouse position, fetching, form state, timers) become small, testable, reusable units.

---

## How it works

### Anatomy of a composable

A composable creates reactive state, wires up any effects/lifecycle, and returns what callers need:

```typescript
// composables/useMouse.ts
import { ref, onMounted, onUnmounted } from 'vue';

export function useMouse() {
  const x = ref(0);
  const y = ref(0);

  function update(e: MouseEvent) {
    x.value = e.clientX;
    y.value = e.clientY;
  }

  onMounted(() => window.addEventListener('mousemove', update));
  onUnmounted(() => window.removeEventListener('mousemove', update)); // cleanup

  return { x, y }; // reactive refs the caller can use
}
```

Because it registers `onMounted`/`onUnmounted`, the composable manages its own lifecycle — the caller doesn't worry about cleanup.

### Using it

```vue
<script setup lang="ts">
import { useMouse } from '@/composables/useMouse';

const { x, y } = useMouse();
</script>

<template>
  <p>Cursor at {{ x }}, {{ y }}</p>
</template>
```

### Composables can use other composables

They compose (hence the name):

```typescript
export function useFetch<T>(url: MaybeRef<string>) {
  const data = ref<T | null>(null);
  const error = ref<Error | null>(null);
  const loading = ref(false);

  watchEffect(async () => {
    loading.value = true;
    try {
      data.value = await (await fetch(unref(url))).json();
    } catch (e) {
      error.value = e as Error;
    } finally {
      loading.value = false;
    }
  });

  return { data, error, loading };
}
```

Accepting a `ref` as input (via `MaybeRef` + `watchEffect`) makes the composable re-run when the argument changes — a powerful pattern for reactive inputs.

### Conventions

- Name starts with `use`.
- Call composables **synchronously at the top of `<script setup>`** (like React hooks) so lifecycle hooks register correctly.
- Return refs (not plain values) so reactivity is preserved across the function boundary.

---

## Examples

A `useLocalStorage` composable that syncs a ref to `localStorage`:

```typescript
import { ref, watch } from 'vue';

export function useLocalStorage<T>(key: string, initial: T) {
  const stored = localStorage.getItem(key);
  const value = ref<T>(stored ? JSON.parse(stored) : initial);

  watch(value, (v) => localStorage.setItem(key, JSON.stringify(v)), {
    deep: true,
  });

  return value;
}
```

```vue
<script setup lang="ts">
import { useLocalStorage } from '@/composables/useLocalStorage';
const theme = useLocalStorage('theme', 'light'); // persists across reloads
</script>
```

---

## When to use

- To share stateful, reactive logic across multiple components (fetching, timers, event listeners, form state).
- To extract a component's non-UI logic into a testable, named unit even when it's used only once.
- To wrap browser APIs (geolocation, media queries, storage) behind a reactive interface.

## When NOT to use

- For stateless helpers — a plain utility function is simpler; composables are for *reactive* logic.
- For genuinely global, shared app state — prefer a [Pinia store](state-management.md); a composable creates fresh state per caller unless you deliberately share it.
- Don't call composables conditionally or inside callbacks — call them synchronously at setup top level.

## References

- Vue Team. [Composables](https://vuejs.org/guide/reusability/composables.html). vuejs.org.
- VueUse. [VueUse — Collection of Vue Composition Utilities](https://vueuse.org/). vueuse.org.
- Vue Team. [Composition API FAQ](https://vuejs.org/guide/extras/composition-api-faq.html). vuejs.org.
