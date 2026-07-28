---
type: how-to
tags:
  - language
  - javascript
  - tool
related:
  - languages/javascript/modules
  - languages/javascript/testing
language: "javascript"
---
# JavaScript Toolchain Setup

> How to set up a modern JavaScript project: package manager, module type, bundler/dev server, linter, and formatter.

---

## Prerequisites

- Node.js installed (`node --version` prints a result) — even browser-only projects use Node-based tooling.
- A terminal and a code editor.
- Familiarity with `package.json` basics.

---

## Steps

### 1. Initialize the project

```bash
mkdir myapp && cd myapp
npm init -y
```

Set the module type to ESM in `package.json` so `import`/`export` work:

```json
{
  "name": "myapp",
  "type": "module",
  "scripts": {}
}
```

> `npm` ships with Node. Alternatives — `pnpm` (fast, disk-efficient, strict) and `yarn` — use the same `package.json`. `pnpm` is a common choice for monorepos.

### 2. Choose a bundler / dev server

For browser apps, use **Vite** — fast dev server (native ESM) and optimized production builds via Rollup.

```bash
npm create vite@latest myapp
```

For libraries, **esbuild** or **Rollup** produce ESM + CJS outputs. For plain scripts or servers, no bundler is needed — run with Node directly.

### 3. Add a linter (ESLint)

```bash
npm install --save-dev eslint
npx eslint --init
```

ESLint catches bugs and enforces consistency. Modern ESLint uses a flat config (`eslint.config.js`).

### 4. Add a formatter

Use **Prettier** (formatting only) or **Biome** (formatter + linter in one fast tool).

```bash
npm install --save-dev prettier
echo '{}' > .prettierrc
```

Keep formatting (Prettier) and code-quality rules (ESLint) separate to avoid conflicts, or adopt Biome to unify both.

### 5. Wire up npm scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint .",
    "format": "prettier --write .",
    "test": "vitest"
  }
}
```

---

## Verification

```bash
npm run lint      # exits 0 with no errors
npm run format    # rewrites files consistently
npm run build     # produces a dist/ bundle without errors
node --version    # confirms the runtime
```

---

## Common issues

| Symptom | Likely cause | Fix |
|---|---|---|
| `Cannot use import statement outside a module` | Missing `"type": "module"` or wrong extension | Add `"type": "module"` or use `.mjs` |
| ESLint and Prettier fight over formatting | Overlapping rules | Disable ESLint stylistic rules or use Biome |
| `command not found` for a dev dependency | Running the binary globally | Use `npx <tool>` or an npm script |
| Huge production bundle | No tree-shaking / default imports | Use named ESM imports; analyze with the bundler's report |
| Different results across machines | Uncommitted lockfile | Commit `package-lock.json` / `pnpm-lock.yaml` |

---

## References

- [npm Docs — package.json](https://docs.npmjs.com/cli/v10/configuring-npm/package-json)
- [Vite — Getting Started](https://vite.dev/guide/)
- [ESLint — Getting Started](https://eslint.org/docs/latest/use/getting-started)
- [Prettier — Install](https://prettier.io/docs/install)
