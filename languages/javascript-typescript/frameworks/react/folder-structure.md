---
type: concept
tags:
  - language
  - react
  - typescript
  - frontend
related: []
language: "react"
---
# Folder Structure

> Two viable starting points: **layer-based** (separate folders for components, hooks, services) and **feature-based** (each folder owns everything for one feature). Feature-based scales better.

---

## What is it?

The way you organise files in a React project. Folder structure influences how easy code is to find, refactor, and delete. There is no single right answer, but there is a clear winner *as the app grows*: organise by feature, not by file type.

---

## Why does it matter?

A misorganised codebase makes every change painful: simple features touch six folders, related code is far apart, and deletes are dangerous because you can't tell what uses what. A good structure makes "find the code for X" trivial.

---

## How it works

### Layer-based (by file type)

```
src/
├─ components/
│  ├─ Button.tsx
│  ├─ Modal.tsx
│  └─ ProductCard.tsx
├─ hooks/
│  ├─ useAuth.ts
│  └─ useCart.ts
├─ services/
│  ├─ api.ts
│  └─ analytics.ts
├─ pages/
│  ├─ Home.tsx
│  └─ Checkout.tsx
└─ types/
   └─ index.ts
```

Pros: familiar, fine for small apps. Cons: at scale, a single feature is scattered across `components/`, `hooks/`, `services/`, `types/`. Deletes are risky because cross-feature imports are common.

### Feature-based

```
src/
├─ features/
│  ├─ cart/
│  │  ├─ components/
│  │  │  ├─ CartIcon.tsx
│  │  │  └─ CartDrawer.tsx
│  │  ├─ hooks/
│  │  │  └─ useCart.ts
│  │  ├─ api.ts
│  │  ├─ types.ts
│  │  └─ index.ts        ← public API of the feature
│  └─ checkout/
│     ├─ components/
│     ├─ hooks/
│     └─ index.ts
├─ shared/               ← cross-feature, truly generic
│  ├─ components/        ← Button, Input, Modal
│  ├─ hooks/
│  └─ utils/
└─ app/                  ← composition root (router, providers)
   ├─ routes.tsx
   └─ providers.tsx
```

Pros: a feature lives in one folder; you can delete the folder to remove the feature. Cons: requires discipline about what's "shared" vs "feature-specific".

### Colocation

Keep related files next to each other. If a `<UserCard>` has a test, a story, and a small CSS module, they live in the same folder:

```
features/profile/
└─ UserCard/
   ├─ UserCard.tsx
   ├─ UserCard.test.tsx
   ├─ UserCard.stories.tsx
   └─ UserCard.module.css
```

Finding everything related is one folder away. So is deleting it cleanly.

### The `shared/` (or `common/`) folder

`shared/` is for things that are genuinely cross-feature: `Button`, `Input`, `Modal`, generic utility functions, design tokens. The temptation to dump everything there leads to a god folder. A rule of thumb: only move something to `shared/` when *two* features need it. Until then, keep it inside the one feature.

### Public API per feature

Each feature can expose a single `index.ts` that re-exports the public surface:

```ts
// features/cart/index.ts
export { CartIcon } from "./components/CartIcon";
export { useCart }  from "./hooks/useCart";
export type { Cart } from "./types";
```

Importers use `import { useCart } from "@/features/cart"` and never reach into internals. This makes future refactors safe — internals can move freely.

Use ESLint's `import/no-restricted-paths` (or [`eslint-plugin-boundaries`](https://github.com/javierbrea/eslint-plugin-boundaries)) to enforce the boundary.

### Routes mirror features

If you use Next.js App Router, route folders (`app/cart/page.tsx`) compose pieces from `features/cart/`. If you use React Router or TanStack Router, your route files import from the feature folders.

### Barrel files: optional, careful

`index.ts` barrels (re-exporting from one entry point) are fine for **feature boundaries**. Deep barrels (one per subfolder) can hurt tree shaking and slow tooling on large codebases. Don't over-use them.

---

## Examples

### A typical mid-size app

```
src/
├─ app/
│  ├─ routes.tsx
│  ├─ providers.tsx
│  └─ root.tsx
├─ features/
│  ├─ auth/
│  ├─ cart/
│  ├─ checkout/
│  ├─ products/
│  └─ profile/
├─ shared/
│  ├─ components/      ← Button, Input, Modal, Form primitives
│  ├─ hooks/
│  ├─ lib/             ← fetch wrapper, query client, analytics
│  └─ utils/
└─ tests/
   └─ setup.ts
```

### Path aliases

Configure `tsconfig.json` and your bundler to support absolute-ish imports:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

Use `import { useCart } from "@/features/cart"` instead of `../../../features/cart`.

---

## When to use

- **Layer-based** — single-screen apps, prototypes, very small projects.
- **Feature-based** — anything that will grow past a handful of screens.
- **Colocation** — always; tests, stories, styles next to the component.
- **Public API via `index.ts`** — for feature folders, to enforce boundaries.

---

## When NOT to use

- Don't fight the framework's conventions. Next.js App Router expects `app/`. React Router projects benefit from a `routes/` folder. Use the framework's idiom and put feature code under `features/`.
- Don't put server-only code in client folders without separation — make the boundary explicit.
- Don't move everything to `shared/` "in case it's reused" — leave it inside the feature until a second consumer appears.
- Don't deep-nest barrels — they slow tooling and obscure imports.

---

## References

- [Feature-Sliced Design](https://feature-sliced.design)
- [Kent C. Dodds — Colocation](https://kentcdodds.com/blog/colocation)
- [Next.js — Project Organization](https://nextjs.org/docs/app/building-your-application/routing/colocation)
- [`eslint-plugin-boundaries`](https://github.com/javierbrea/eslint-plugin-boundaries)
