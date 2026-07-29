---
type: concept
tags:
  - architecture
  - frontend
  - tool
  - decision-support
related:
  - languages/react/toolchain
  - languages/react/project-setup
  - languages/nextjs/overview
  - languages/javascript/toolchain
  - languages/typescript/toolchain
  - languages/flutter/toolchain
language: null
---
# Frontend Stacks & Tooling

> A map of the modern frontend landscape — the languages, UI frameworks, meta-frameworks, and build tools you'll actually choose between — with one-line positioning and pointers to deeper articles.

---

## What is it?

The frontend ecosystem is large and fast-moving, and a "stack" is really a set of layered choices: a language, a UI framework, often a meta-framework on top, and the build/tooling underneath. This article is a **directory** of the main options at each layer — what each one is and when you'd reach for it — not a tutorial for any of them. For depth on the ones this wiki covers in full, follow the links.

The layers, from the code you write down to what ships:

```
   Language        JavaScript · TypeScript
       │
   UI framework    React · Vue · Angular · Svelte · SolidJS · (Flutter web)
       │
   Meta-framework  Next.js · Nuxt · SvelteKit · Astro · Remix
       │
   Build tooling   Vite · webpack · esbuild · Turbopack · Rspack
       │
   Package manager npm · pnpm · yarn
```

---

## Why does it matter?

Stack choices are sticky. The framework you pick shapes hiring, the libraries available to you, and how the app is rendered and deployed for years. Knowing the landscape — what each option optimizes for and what it trades away — is what lets you choose deliberately instead of by default or hype. This page exists to give that overview in one place, and to connect it to the architectural choices in the [comparison](comparison.md) (rendering strategy, structure, state).

---

## How it works

### Languages

| Language | Positioning | Read more |
|---|---|---|
| **JavaScript** | The native language of the browser; the baseline every framework compiles to. | [JavaScript](../../../languages/javascript/overview.md) |
| **TypeScript** | JavaScript with static types; the de-facto default for non-trivial frontends. Catches errors at compile time and powers editor tooling. | [TypeScript](../../../languages/typescript/overview.md) |

For anything past a small script, TypeScript is the mainstream choice; plain JavaScript remains fine for tiny projects and learning.

### UI frameworks

| Framework | Positioning | Read more |
|---|---|---|
| **React** | The most widely adopted library; huge ecosystem, component + hooks model, backed by Meta. Pairs with a meta-framework for full apps. | [React](../../../languages/react/overview.md) |
| **Vue** | Approachable, batteries-included; single-file components and a gentle learning curve. Strong in Asia and among progressive-enhancement teams. | [Vue](../../../languages/vue/overview.md) |
| **Angular** | Full, opinionated framework (DI, router, forms, RxJS) maintained by Google; suits large enterprise apps that want batteries included and strong conventions. | [Angular](../../../languages/angular/overview.md) |
| **Svelte** | Compiler-first: components compile to minimal JS, no virtual DOM. Small bundles, terse syntax. | [Svelte](../../../languages/svelte/overview.md) |
| **SolidJS** | Fine-grained reactivity with a React-like API; very high performance, no virtual DOM. | — |
| **Flutter (web)** | Dart-based; renders its own UI to canvas. Best when sharing a codebase with Flutter mobile, less so as a standalone web choice. | [Flutter](../../../languages/flutter/overview.md) |

React dominates by adoption and ecosystem; Vue and Angular are the other two "mainstream complete" options; Svelte and SolidJS lead on performance and bundle size.

### Meta-frameworks

Meta-frameworks add routing, rendering strategies (SSR/SSG/ISR), data loading, and build config on top of a UI framework — they're how you build a full application rather than a widget. They implement the [rendering patterns](rendering-patterns.md) in practice.

| Meta-framework | Built on | Positioning | Read more |
|---|---|---|---|
| **Next.js** | React | The dominant React meta-framework; App Router, RSC, all rendering modes. | [Next.js](../../../languages/nextjs/overview.md) |
| **Nuxt** | Vue | Next's counterpart in the Vue world; same full-stack, multi-rendering feature set. | — |
| **SvelteKit** | Svelte | The official Svelte app framework; routing, SSR, and adapters for many hosts. | — |
| **Astro** | Any / none | Content-first; ships zero JS by default and uses the islands model, with any framework inside islands. | — |
| **Remix** | React | Web-standards-focused (built on the Fetch/Request model); nested routing and progressive enhancement. Now converging with React Router. | — |

Rule of thumb: pick the meta-framework that matches your UI framework (Next↔React, Nuxt↔Vue, SvelteKit↔Svelte); choose Astro when the site is content-first with sprinkles of interactivity.

### Build tools

| Tool | Positioning |
|---|---|
| **Vite** | The current default dev server + bundler; near-instant startup via native ES modules in dev, Rollup for production. |
| **webpack** | The long-time incumbent; extremely configurable and plugin-rich, but slower and heavier. Still common in older/large apps. |
| **esbuild** | Ultra-fast bundler/transpiler written in Go; used as a building block inside other tools. |
| **Turbopack** | webpack's successor from Vercel (Rust-based), aimed at large Next.js apps. |
| **Rspack** | Rust reimplementation of webpack with a compatible API, for teams wanting webpack semantics at higher speed. |

Most new projects start with Vite (or the bundler their meta-framework ships). The Rust-based tools (Turbopack, Rspack) target large codebases where build speed hurts. See [React toolchain](../../../languages/react/toolchain.md) and [project setup](../../../languages/react/project-setup.md) for concrete setups.

### Package managers

| Manager | Positioning |
|---|---|
| **npm** | Bundled with Node.js; the default, universally supported. |
| **pnpm** | Content-addressed store with hard links; fast and disk-efficient, strong monorepo support. |
| **yarn** | Popularized lockfiles and workspaces; modern versions (Berry) add Plug'n'Play. |

For monorepos and large dependency trees, pnpm is the common modern pick; npm is the safe default everywhere else.

---

## When to use

- As an orientation when starting a project and choosing a stack, or when evaluating whether to adopt a new tool.
- To place a specific framework or tool in context before diving into its dedicated article.
- To connect stack choices to the architectural axes in the [comparison](comparison.md) — rendering, structure, and state.

## When NOT to use

- As a substitute for the deep articles — this page is a map, not setup instructions; follow the links for real toolchains and project setup.
- As a live ranking — the ecosystem moves fast; treat the positioning as a starting orientation, not a verdict, and verify current status before committing.
- As a reason to chase novelty — a new tool topping benchmarks is not a reason to migrate a working stack; weigh switching cost against real pain.

---

## References

- Stack Overflow. [Developer Survey — Web Frameworks and Technologies](https://survey.stackoverflow.co/). Stack Overflow.
- State of JS. [The State of JS Survey](https://stateofjs.com/). stateofjs.com.
- MDN. [Front-end web developer learning pathway](https://developer.mozilla.org/en-US/docs/Learn). MDN Web Docs.
- Vite. [Why Vite](https://vitejs.dev/guide/why.html). Vite Documentation.
