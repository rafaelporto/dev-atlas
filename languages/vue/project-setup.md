---
type: concept
tags:
  - language
  - vue
  - typescript
  - frontend
  - tool
related:
  - languages/vue/overview
  - languages/vue/template-syntax-and-components
  - languages/vue/testing
language: "vue"
---

# Project Setup

> How a Vue project is scaffolded and structured with Vite and the official `create-vue` tool.

---

## What is it?

A modern Vue project is scaffolded with **`create-vue`**, the official tool that generates a **Vite**-based project and lets you opt into TypeScript, Vue Router, Pinia, testing, and linting. Vite is the build tool and dev server; it powers Vue's near-instant startup and hot module replacement.

---

## Why does it matter?

Starting from the official scaffold means you get the blessed, well-supported configuration: correct SFC compilation, TypeScript wiring, and sensible defaults. It also lets you choose up front exactly which official pieces (router, store, testing) you want, so the project has a coherent structure from day one rather than being assembled ad hoc.

---

## How it works

### Scaffolding

```bash
# Interactive: choose TypeScript, Router, Pinia, Vitest, etc.
npm create vue@latest

cd my-app
npm install
npm run dev      # start the Vite dev server (HMR)
npm run build    # production build
```

### Project layout

```
my-app/
├── index.html          # the host page; entry <script> points to src/main.ts
├── vite.config.ts      # Vite + Vue plugin config
├── tsconfig.json
└── src/
    ├── main.ts         # app bootstrap
    ├── App.vue         # root component
    ├── router/         # Vue Router config (if selected)
    ├── stores/         # Pinia stores (if selected)
    ├── components/      # reusable components
    └── views/          # route-level components
```

### The bootstrap

`main.ts` creates the app instance and installs plugins (router, Pinia) before mounting:

```typescript
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.mount('#app');
```

Plugins are installed with `app.use()`; this is how official and third-party integrations hook into the app.

### TypeScript in SFCs

`<script setup lang="ts">` enables full type-checking inside components. Because `.vue` files aren't native TypeScript, type-checking the templates is done by **`vue-tsc`** (used in the `build` script) and the **Vue - Official** (Volar) editor extension.

---

## Examples

Adding Vue Router to a fresh project manually (if not selected during scaffolding):

```bash
npm install vue-router
```

```typescript
// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router';
import Home from '../views/Home.vue';

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Home },
    { path: '/about', component: () => import('../views/About.vue') },
  ],
});
```

---

## When to use

- Any new Vue project — start from `create-vue` for the official Vite setup.
- Select TypeScript, Router, and Pinia at scaffold time if you know you'll need them; it wires everything correctly.
- Use `vite build` (which runs `vue-tsc`) so template type errors fail the build.

## When NOT to use

- Embedding a tiny Vue widget in an existing non-Vue page — a CDN `<script>` build is simpler than a full Vite project.
- Overriding the Vite config heavily without cause — the defaults are well-tuned for Vue.

## References

- Vue Team. [Quick Start](https://vuejs.org/guide/quick-start.html). vuejs.org.
- Vue Team. [Tooling](https://vuejs.org/guide/scaling-up/tooling.html). vuejs.org.
- Vite Team. [Vite — Getting Started](https://vitejs.dev/guide/). vitejs.dev.
