---
type: concept
tags:
  - language
  - vue
  - typescript
  - frontend
related:
  - languages/vue/overview
  - languages/vue/project-setup
  - languages/vue/data-fetching
  - languages/react/routing
language: "vue"
---

# Routing

> Vue Router — the official client-side router that maps URLs to components, with dynamic routes, nested layouts, lazy loading, and navigation guards.

---

## What is it?

**Vue Router** is Vue's official routing library. It maps URL paths to components, renders the matched component into a `<router-outlet>` (`<RouterView>`), and provides navigation via `<RouterLink>` and a programmatic API. It supports dynamic segments, nested routes, lazy loading, and guards. It's a first-party but separate package (`vue-router`), installed as a plugin.

---

## Why does it matter?

Routing defines a single-page application's structure and enables deep-linking, the browser back/forward buttons, and code-splitting. Because Vue Router is the official solution, it integrates smoothly with Vue's reactivity (route params are reactive) and the rest of the ecosystem, and it's what Nuxt builds on for file-based routing. Knowing it is essential for any multi-view Vue app.

---

## How it works

### Defining routes

Routes are an array; lazy routes use a dynamic `import()` to become separate bundles:

```typescript
// router/index.ts
import { createRouter, createWebHistory } from 'vue-router';

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: () => import('@/views/Home.vue') },
    { path: '/users/:id', name: 'user', component: () => import('@/views/User.vue') },
    { path: '/:pathMatch(.*)*', component: () => import('@/views/NotFound.vue') },
  ],
});
```

### Rendering and linking

```vue
<template>
  <nav>
    <RouterLink to="/">Home</RouterLink>
    <RouterLink :to="{ name: 'user', params: { id: '42' } }">Profile</RouterLink>
  </nav>
  <RouterView />   <!-- matched component renders here -->
</template>
```

`<RouterLink>` renders an `<a>` but intercepts clicks to navigate client-side and adds active classes automatically.

### Reading params and navigating in code

The composables `useRoute` (current route, reactive) and `useRouter` (navigation) are the Composition API entry points:

```vue
<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router';
import { watch, ref } from 'vue';

const route = useRoute();
const router = useRouter();

const user = ref<User | null>(null);
watch(() => route.params.id, async (id) => {
  user.value = await api.getUser(id as string); // refetch when :id changes
}, { immediate: true });

function goHome() { router.push('/'); }
</script>
```

Because `route.params` is reactive, watching it is how you refetch when only the parameter changes (the component instance is reused).

### Nested routes and guards

```typescript
{
  path: '/settings',
  component: () => import('@/views/SettingsLayout.vue'), // renders its own <RouterView>
  children: [
    { path: 'profile', component: () => import('@/views/Profile.vue') },
    { path: 'billing', component: () => import('@/views/Billing.vue') },
  ],
}
```

Guards run before navigation — global, per-route, or in-component:

```typescript
router.beforeEach((to) => {
  if (to.meta.requiresAuth && !auth.isLoggedIn) return '/login';
});
```

---

## Examples

A route with an auth guard via route meta:

```typescript
const routes = [
  {
    path: '/admin',
    component: () => import('@/views/Admin.vue'),
    meta: { requiresAuth: true },
  },
];

router.beforeEach((to) => {
  if (to.meta.requiresAuth && !useAuth().isLoggedIn) {
    return { path: '/login', query: { redirect: to.fullPath } };
  }
});
```

---

## When to use

- Any Vue single-page app with more than one view.
- Use lazy `import()` per route to code-split and keep the initial bundle small.
- Use route `meta` + a global `beforeEach` guard for auth and access control.
- Watch `route.params` (not just mount) to refetch data when a param changes.

## When NOT to use

- A single-view widget doesn't need a router.
- If you're building a full app with SSR/SSG and file-based routing, consider **Nuxt**, which layers those conventions on top of Vue Router.

## References

- Vue Router Team. [Vue Router — Getting Started](https://router.vuejs.org/guide/). router.vuejs.org.
- Vue Router Team. [Dynamic Route Matching](https://router.vuejs.org/guide/essentials/dynamic-matching.html). router.vuejs.org.
- Vue Router Team. [Navigation Guards](https://router.vuejs.org/guide/advanced/navigation-guards.html). router.vuejs.org.
