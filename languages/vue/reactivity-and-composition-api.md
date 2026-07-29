---
type: concept
tags:
  - language
  - vue
  - typescript
  - reactive
  - state-management
related:
  - languages/vue/overview
  - languages/vue/composables
  - languages/vue/template-syntax-and-components
  - languages/angular/signals-and-change-detection
language: "vue"
---

# Reactivity and the Composition API

> Vue's reactivity primitives — `ref`, `reactive`, `computed`, `watch` — and the `<script setup>` Composition API that organizes logic by feature.

---

## What is it?

Vue's **reactivity system** automatically tracks which data your UI (and derived values) depend on, and re-runs the minimum needed when that data changes. The **Composition API** is the modern way to use it inside components: you declare reactive state and logic in `<script setup>` using functions like `ref`, `computed`, and `watch`, organizing code by *feature* rather than by option type.

---

## Why does it matter?

Reactivity is the core idea that makes Vue declarative — you mutate plain-looking values and the DOM follows, with no manual update calls. The Composition API matters because it lets related logic (a piece of state plus the functions and effects that operate on it) live together and be **extracted into reusable [composables](composables.md)**. This scales far better than the older Options API, where a single feature's code was scattered across `data`, `methods`, `computed`, and `watch` sections.

---

## How it works

### `ref` vs `reactive`

Two ways to create reactive state:

```typescript
import { ref, reactive } from 'vue';

const count = ref(0);            // wraps a value; access via .value in JS
count.value++;                    // (in templates, no .value needed)

const state = reactive({          // makes an object deeply reactive
  user: { name: 'Ada' },
  todos: [] as string[],
});
state.user.name = 'Grace';        // tracked directly, no .value
```

- **`ref`** works for any value (primitives, objects) and is the common default. In JavaScript you read/write `.value`; templates unwrap it automatically.
- **`reactive`** makes an object deeply reactive but only works on objects and can't be reassigned wholesale. `ref` is generally recommended for its consistency.

### `computed` — derived, cached values

```typescript
import { ref, computed } from 'vue';

const price = ref(100);
const qty = ref(2);
const total = computed(() => price.value * qty.value); // cached; recomputes on change
```

A `computed` re-evaluates only when a dependency changes and caches its result — use it instead of putting expressions in the template or duplicating derivation logic.

### `watch` and `watchEffect` — reacting to change

```typescript
import { ref, watch, watchEffect } from 'vue';

const query = ref('');

// watch: explicit source(s), gives old + new value; good for async side effects
watch(query, async (newQ, oldQ) => {
  results.value = await api.search(newQ);
});

// watchEffect: runs immediately, auto-tracks whatever it reads
watchEffect(() => console.log(`query is ${query.value}`));
```

Prefer `computed` for deriving values; use `watch`/`watchEffect` for **side effects** (fetching, logging, imperative work) in response to change.

### The Composition API shape

`<script setup>` runs once per component instance; top-level bindings are exposed to the template automatically:

```vue
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';

const items = ref<string[]>([]);
const count = computed(() => items.value.length);

onMounted(async () => {
  items.value = await fetchItems();     // lifecycle hook
});
</script>

<template>
  <p>{{ count }} items</p>
</template>
```

Lifecycle hooks (`onMounted`, `onUnmounted`, `onUpdated`, …) are imported functions rather than object methods.

---

## Examples

Feature-grouped logic in one component — a search box with derived and fetched state:

```vue
<script setup lang="ts">
import { ref, computed, watch } from 'vue';

const query = ref('');
const results = ref<Result[]>([]);
const hasResults = computed(() => results.value.length > 0);

watch(query, async (q) => {
  results.value = q ? await api.search(q) : [];
});
</script>

<template>
  <input v-model="query" placeholder="Search" />
  <p v-if="!hasResults">No results</p>
  <ul v-else>
    <li v-for="r in results" :key="r.id">{{ r.title }}</li>
  </ul>
</template>
```

---

## When to use

- Use `ref` as the default for reactive state; `reactive` for grouped object state when it reads better.
- Use `computed` for any value derived from reactive state.
- Use `watch`/`watchEffect` for side effects triggered by state change (fetching, syncing, logging).
- Prefer the Composition API for new components, especially with TypeScript.

## When NOT to use

- Don't use `watch` to compute derived state — that's `computed`'s job; watchers for derivation are error-prone and run extra times.
- Don't forget `.value` in plain JavaScript (a very common bug) — it's only auto-unwrapped in templates.
- Don't destructure a `reactive` object — you lose reactivity; use `toRefs` if you must.

## References

- Vue Team. [Reactivity Fundamentals](https://vuejs.org/guide/essentials/reactivity-fundamentals.html). vuejs.org.
- Vue Team. [Computed Properties](https://vuejs.org/guide/essentials/computed.html). vuejs.org.
- Vue Team. [Watchers](https://vuejs.org/guide/essentials/watchers.html). vuejs.org.
