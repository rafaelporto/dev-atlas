---
type: concept
tags:
  - language
  - svelte
  - typescript
  - frontend
  - tool
related:
  - languages/svelte/overview
  - languages/svelte/routing
  - languages/svelte/testing
language: "svelte"
---

# Project Setup

> How a Svelte project is scaffolded — with SvelteKit for full applications or Vite for standalone Svelte.

---

## What is it?

New Svelte projects are created with **`sv create`**, the official CLI, which scaffolds a **SvelteKit** application (the recommended default) on top of **Vite**. For a component library or a Svelte app without SvelteKit's routing/SSR, you can scaffold a plain Vite + Svelte project instead. Vite is the build tool and dev server in both cases.

---

## Why does it matter?

Starting from the official scaffold gives you the correct compiler setup, TypeScript wiring, and — with SvelteKit — routing, SSR, and data loading already in place. Choosing between "SvelteKit app" and "plain Svelte + Vite" up front matters: SvelteKit is the answer for most applications, while plain Svelte fits libraries or embedding a widget where you don't want a full app framework.

---

## How it works

### Scaffolding

```bash
# Recommended: a SvelteKit app (interactive prompts: TS, ESLint, Vitest, Playwright)
npx sv create my-app
cd my-app
npm install
npm run dev      # Vite dev server with HMR
npm run build    # production build
```

```bash
# Alternative: plain Svelte + Vite (no SvelteKit routing/SSR)
npm create vite@latest my-lib -- --template svelte-ts
```

### SvelteKit project layout

```
my-app/
├── svelte.config.js     # Svelte + adapter config
├── vite.config.ts
└── src/
    ├── app.html         # HTML shell
    ├── lib/             # shared code, importable via $lib
    ├── routes/          # filesystem routing lives here
    │   ├── +layout.svelte
    │   ├── +page.svelte        # the "/" page
    │   └── about/+page.svelte  # the "/about" page
    └── app.d.ts
```

The `src/routes/` directory defines the app's URLs; `$lib` is an alias to `src/lib` for clean imports. See [routing](routing.md) for the `+page`/`+layout` conventions.

### Adapters

SvelteKit is deploy-target agnostic through **adapters**. You pick one for where you deploy — `adapter-node`, `adapter-static` (for a fully static site), `adapter-vercel`, `adapter-cloudflare`, etc.:

```javascript
// svelte.config.js
import adapter from '@sveltejs/adapter-node';
export default { kit: { adapter: adapter() } };
```

### TypeScript

`sv create` sets up TypeScript across `.svelte` files and generates route-specific types (`./$types`) that give `load` functions and pages fully typed data. The **Svelte for VS Code** extension provides editor tooling and type-checking in templates.

---

## Examples

Configuring a fully static site (no server runtime):

```javascript
// svelte.config.js
import adapter from '@sveltejs/adapter-static';

export default {
  kit: {
    adapter: adapter({ fallback: '200.html' }), // SPA fallback
  },
};
```

```bash
npm install -D @sveltejs/adapter-static
npm run build     # emits a static site to build/
```

---

## When to use

- Use **SvelteKit** (`sv create`) for any application — it's the recommended default and provides routing, SSR/SSG, and data loading.
- Use **plain Svelte + Vite** for a component library or embedding Svelte into a non-Svelte page.
- Choose an **adapter** matching your deployment target; use `adapter-static` for fully static output.

## When NOT to use

- Don't hand-configure a Svelte compiler pipeline from scratch — the official scaffolds handle it correctly.
- Don't reach for SvelteKit's server features if you only need a static SPA — `adapter-static` keeps it purely client-side.

## References

- Svelte Team. [Creating a project](https://svelte.dev/docs/kit/creating-a-project). svelte.dev.
- Svelte Team. [Project structure](https://svelte.dev/docs/kit/project-structure). svelte.dev.
- Svelte Team. [Adapters](https://svelte.dev/docs/kit/adapters). svelte.dev.
