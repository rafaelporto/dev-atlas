---
type: concept
tags:
  - language
  - vue
  - typescript
  - frontend
  - overview
related:
  - languages/vue/project-setup
  - languages/vue/template-syntax-and-components
  - languages/vue/reactivity-and-composition-api
  - software-engineering/architecture/frontend/frontend-stacks-and-tooling
language: "vue"
---

# Vue

> Vue is an approachable, progressive JavaScript framework for building user interfaces, centered on single-file components and a fine-grained reactivity system.

---

## What is it?

**Vue** (Vue.js) is a framework for building web user interfaces. You compose an app from **components**, and Vue keeps the DOM in sync with your data through a **reactivity system** that tracks exactly which data each piece of UI depends on. Its signature format is the **single-file component (SFC)** — a `.vue` file bundling template, script, and styles for one component.

Vue is called *progressive* because you can adopt it incrementally: drop it into one page via a `<script>` tag, or build a full single-page application with the official router and state library. The current major version is **Vue 3**, built around the **Composition API**.

---

## Why does it matter?

Vue occupies a deliberate middle ground. It's more batteries-included and opinionated than a minimal library, but lighter and more approachable than a full framework — its official router (Vue Router) and store (Pinia) are first-party but optional. The SFC format keeps a component's markup, logic, and styles together in one readable file, and the template syntax stays close to plain HTML.

The result is a famously gentle learning curve with a ceiling high enough for large apps. Vue is independently governed (not owned by a single big tech company), has a strong ecosystem, and — via **Nuxt** — a mature meta-framework for SSR/SSG.

---

## How it works

### Single-file components

An SFC has up to three blocks:

```vue
<script setup lang="ts">
import { ref, computed } from 'vue';

const count = ref(0);
const doubled = computed(() => count.value * 2);
</script>

<template>
  <button @click="count++">Clicked {{ count }} times</button>
  <p v-if="count > 5">That's {{ doubled }} doubled.</p>
</template>

<style scoped>
button { font: inherit; }
</style>
```

- **`<script setup>`** — the modern Composition API syntax; top-level bindings are automatically exposed to the template.
- **`<template>`** — HTML augmented with directives (`v-if`, `v-for`, `@click`, `:prop`) and `{{ }}` interpolation.
- **`<style scoped>`** — styles automatically scoped to this component.

### Reactivity

Vue's reactivity is fine-grained: `ref()` and `reactive()` create tracked state, `computed()` derives cached values, and the framework updates only the parts of the DOM that actually depend on changed data. You mutate state directly (`count.value++`) — no immutable-update ceremony. See [reactivity and the Composition API](reactivity-and-composition-api.md).

### The two APIs

Vue 3 supports two styles:

- **Composition API** (`<script setup>`) — logic organized by feature into composable functions; the recommended default, especially with TypeScript.
- **Options API** — a component is an object with `data`, `methods`, `computed`, etc.; still fully supported and common in Vue 2 codebases.

### The ecosystem

```
   Vue (core)      reactivity + components
       │
   Vue Router      official client-side routing
       │
   Pinia           official state management
       │
   Nuxt            meta-framework: SSR/SSG, routing, data loading
```

---

## Examples

A component with props, events, and a list — the everyday shape of Vue code:

```vue
<script setup lang="ts">
import { ref } from 'vue';

defineProps<{ title: string }>();
const emit = defineEmits<{ select: [name: string] }>();

const names = ref(['Ada', 'Grace', 'Linus']);
</script>

<template>
  <section>
    <h2>{{ title }}</h2>
    <ul>
      <li v-for="name in names" :key="name" @click="emit('select', name)">
        {{ name }}
      </li>
    </ul>
  </section>
</template>
```

---

## When to use

- Apps that want a gentle learning curve without sacrificing scalability — Vue is friendly to newcomers and capable for large teams.
- Projects that value the SFC model (template + logic + scoped styles together) and a template syntax close to HTML.
- Teams wanting first-party-but-optional routing and state (Vue Router, Pinia) rather than assembling everything.
- Full-stack Vue via Nuxt when you need SSR/SSG.

## When NOT to use

- When your organization is standardized on another framework's ecosystem and hiring/tooling favor it.
- For the absolute smallest bundles on a simple site, a compiler-first framework like [Svelte](../svelte/overview.md) may ship less.
- When you need a specific library that only exists in another ecosystem.

## References

- Vue Team. [Vue.js — Official Documentation](https://vuejs.org/guide/introduction.html). vuejs.org.
- Vue Team. [Single-File Components](https://vuejs.org/guide/scaling-up/sfc.html). vuejs.org.
- Vue Team. [Reactivity Fundamentals](https://vuejs.org/guide/essentials/reactivity-fundamentals.html). vuejs.org.
