---
type: concept
tags:
  - language
  - vue
  - typescript
  - frontend
  - component-driven
related:
  - languages/vue/overview
  - languages/vue/reactivity-and-composition-api
  - languages/vue/forms
  - software-engineering/architecture/frontend/component-driven-architecture
language: "vue"
---

# Template Syntax and Components

> How Vue UIs are built from single-file components and template directives — interpolation, bindings, conditionals, lists, props, and events.

---

## What is it?

A Vue **component** is a self-contained, reusable piece of UI, usually written as a single-file component (`.vue`). Its **template** is HTML enhanced with Vue's directives and interpolation: `{{ }}` for text, `v-bind` (`:`) for attributes, `v-on` (`@`) for events, and structural directives like `v-if` and `v-for`. Components communicate through **props** (down) and **events** (up).

---

## Why does it matter?

The template is where you express *what* the UI looks like for a given state; Vue's compiler turns it into efficient render code. The directive syntax stays close to HTML, which is much of Vue's approachability. Getting the component contract right — typed props in, typed events out — is what makes a component tree composable and predictable.

---

## How it works

### Interpolation and bindings

```vue
<template>
  <!-- text interpolation -->
  <h1>{{ title }}</h1>

  <!-- attribute binding: v-bind, shorthand ":" -->
  <img :src="imageUrl" :alt="title" />
  <button :disabled="isBusy">Save</button>

  <!-- event binding: v-on, shorthand "@" -->
  <button @click="save">Save</button>
  <input @input="onInput" />
</template>
```

### Conditionals and lists

```vue
<template>
  <p v-if="status === 'loading'">Loading…</p>
  <p v-else-if="status === 'error'">Something went wrong</p>
  <p v-else>Ready</p>

  <ul>
    <li v-for="item in items" :key="item.id">{{ item.label }}</li>
  </ul>
</template>
```

`:key` in a `v-for` gives each item a stable identity so Vue reuses DOM nodes efficiently — always provide it. `v-show` is an alternative to `v-if` that toggles CSS `display` instead of adding/removing the element (cheaper to toggle, but always rendered).

### Props (parent → child)

Props are declared with `defineProps`, typed via TypeScript:

```vue
<!-- UserCard.vue -->
<script setup lang="ts">
const props = defineProps<{ name: string; role?: string }>();
</script>

<template>
  <article>{{ props.name }} <small>{{ role ?? 'member' }}</small></article>
</template>
```

Props are **read-only** in the child; to change data, emit an event and let the owner update it.

### Events (child → parent)

```vue
<!-- child -->
<script setup lang="ts">
const emit = defineEmits<{ select: [id: string]; delete: [id: string] }>();
</script>
<template>
  <button @click="emit('select', 'u1')">Select</button>
</template>
```

```vue
<!-- parent -->
<UserCard name="Ada" @select="onSelect" @delete="onDelete" />
```

### Slots (content projection)

Slots let a parent pass template content into a child — the composition primitive for wrappers and layouts:

```vue
<!-- Card.vue -->
<template>
  <div class="card">
    <header><slot name="header" /></header>
    <slot />               <!-- default slot -->
  </div>
</template>
```

```vue
<Card>
  <template #header><h3>Title</h3></template>
  <p>Body content projected into the default slot.</p>
</Card>
```

---

## Examples

A reusable, typed list component using props, events, and a slot:

```vue
<!-- SelectableList.vue -->
<script setup lang="ts" generic="T extends { id: string }">
defineProps<{ items: T[] }>();
const emit = defineEmits<{ pick: [item: T] }>();
</script>

<template>
  <ul>
    <li v-for="item in items" :key="item.id" @click="emit('pick', item)">
      <slot :item="item">{{ item.id }}</slot>  <!-- scoped slot -->
    </li>
  </ul>
</template>
```

```vue
<SelectableList :items="users" @pick="onPick">
  <template #default="{ item }">{{ item.name }}</template>
</SelectableList>
```

---

## When to use

- Always — components and templates are the primary way to build Vue UIs.
- Use typed `defineProps`/`defineEmits` for every component contract.
- Reach for slots to build flexible wrappers (cards, modals, layouts) instead of passing markup as strings.

## When NOT to use

- Don't mutate props inside a child — emit an event; mutating props breaks one-way data flow and warns in dev.
- Don't omit `:key` in `v-for` — missing keys cause subtle list-update bugs.
- Don't put heavy computation directly in template expressions — use a `computed` (see [reactivity](reactivity-and-composition-api.md)).

## References

- Vue Team. [Template Syntax](https://vuejs.org/guide/essentials/template-syntax.html). vuejs.org.
- Vue Team. [Components Basics](https://vuejs.org/guide/essentials/component-basics.html). vuejs.org.
- Vue Team. [Slots](https://vuejs.org/guide/components/slots.html). vuejs.org.
