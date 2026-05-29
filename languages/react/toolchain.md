---
type: concept
tags: []
related: []
language: "react"
---
# Toolchain

> The non-negotiable parts of a React toolchain: TypeScript, ESLint (with the React hooks and a11y plugins), Prettier or Biome, and a typed test runner. Storybook for component-level work; the React DevTools and Profiler always.

---

## What is it?

The set of tools you run alongside React during development and CI: type checker, linter, formatter, test runner, dev tools, optional component workshop (Storybook), CI checks. Each fills a specific gap that React itself doesn't.

---

## Why does it matter?

A correctly configured toolchain catches bugs before they reach a browser, formats consistently across the team, surfaces accessibility regressions, and gives you fast iteration. The cost is one-time setup; the benefit compounds for the project's life.

---

## How it works

### TypeScript

Always. Project-wide TS gives you compile-time checks on every prop, hook, and event. A minimal `tsconfig.json` for a Vite project:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noFallthroughCasesInSwitch": true,
    "skipLibCheck": true,
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  },
  "include": ["src"]
}
```

`strict` is non-negotiable. `noUncheckedIndexedAccess` is highly recommended — `array[i]` becomes `T | undefined`, surfacing many real bugs.

### ESLint

Use the modern flat config (`eslint.config.js`) plus the essential plugins:

- `eslint-plugin-react` — basic React rules.
- `eslint-plugin-react-hooks` — enforces the [rules of hooks](rules-of-hooks-and-custom-hooks.md) and dependencies. **Do not disable warnings.**
- `eslint-plugin-jsx-a11y` — accessibility rules.
- `typescript-eslint` — TypeScript-aware rules.

```js
// eslint.config.js
import js from "@eslint/js";
import react from "eslint-plugin-react";
import hooks from "eslint-plugin-react-hooks";
import a11y from "eslint-plugin-jsx-a11y";
import tseslint from "typescript-eslint";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: { react, "react-hooks": hooks, "jsx-a11y": a11y },
    settings: { react: { version: "detect" } },
    rules: {
      ...react.configs.recommended.rules,
      ...hooks.configs.recommended.rules,
      ...a11y.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
    },
  },
);
```

### Prettier or Biome

Pick one — don't fight over formatting.

- **Prettier** — opinionated, mature, plays well with most ecosystems.
- **Biome** — combines formatter + linter, very fast, less mature ecosystem.

Either way, configure your editor to format on save, and run the formatter in CI.

### Test runner

**Vitest** is the modern default; **Jest** still works fine. See [Testing](testing.md) for the full setup.

### Dev tools

- **React DevTools browser extension** — inspect the component tree, props, state, and run the Profiler.
- **React DevTools Profiler** — find slow renders. Always use this before reaching for memoisation.
- **TanStack Query Devtools** — inspect the query cache.

### Storybook

A workshop for components in isolation. Especially useful for:

- Designing components without booting the full app.
- Demonstrating component states and variants to designers/PMs.
- Visual regression with Chromatic.
- Accessibility audits per component (a11y addon).

```bash
npx storybook@latest init
```

Optional but high value once a component library starts to grow.

### CI checks

A reasonable CI pipeline runs, in this order, on every PR:

1. `tsc --noEmit` — type check.
2. `eslint` — lint.
3. `prettier --check` (or `biome check`) — formatting.
4. `vitest run` — unit + component tests.
5. `playwright test` — E2E (parallelised, sharded).
6. Build (`vite build` / `next build` / `react-router build`).

Optional but valuable: `axe-core` checks, bundle-size budgets, Lighthouse CI.

### Bundle analysis

When the app grows, monitor what's in the bundle:

- **`vite-bundle-visualizer`** / **`source-map-explorer`**
- **Next.js**: `ANALYZE=true next build` with `@next/bundle-analyzer`

Look for: large dependencies that could be replaced, code that should be code-split, accidental imports of server-only or dev-only code.

### Package manager

Any of npm, pnpm, Yarn works. **pnpm** is the modern recommendation: faster, disk-efficient, strict about transitive dependencies.

---

## Examples

### `package.json` scripts (Vite + TS)

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "lint": "eslint .",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "test": "vitest",
    "test:run": "vitest run",
    "e2e": "playwright test",
    "typecheck": "tsc --noEmit"
  }
}
```

### Pre-commit hook with `lint-staged` and Husky

```json
// package.json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md,css}": ["prettier --write"]
  }
}
```

```bash
npx husky init
echo "npx lint-staged" > .husky/pre-commit
```

Catches lint/format issues before they reach CI.

---

## When to use

- **TypeScript + ESLint + a formatter** — always, from day one.
- **`eslint-plugin-react-hooks` + `eslint-plugin-jsx-a11y`** — non-negotiable.
- **Vitest / Jest + RTL** — for any project beyond a prototype.
- **Storybook** — when you start to develop and review components in isolation.
- **Bundle analyser** — every few months, or when builds slow down.
- **Pre-commit hook** — to enforce linting and formatting locally.

---

## When NOT to use

- Don't disable `react-hooks/exhaustive-deps` to silence warnings; fix the dependency.
- Don't run formatters and linters from CI but skip them locally — fix the configuration so it's the same everywhere.
- Don't add tools without a purpose — every dependency is a long-term commitment.
- Don't keep Jest if you're starting fresh on Vite — Vitest is the natural fit.

---

## References

- [TypeScript](https://www.typescriptlang.org)
- [ESLint](https://eslint.org)
- [Prettier](https://prettier.io)
- [Biome](https://biomejs.dev)
- [Vitest](https://vitest.dev)
- [Storybook](https://storybook.js.org)
- [Husky](https://typicode.github.io/husky)
- [pnpm](https://pnpm.io)
