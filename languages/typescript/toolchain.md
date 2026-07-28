---
type: how-to
tags:
  - language
  - typescript
  - tool
related:
  - languages/typescript/installation-and-setup
  - languages/typescript/modules-and-declarations
  - languages/typescript/best-practices
language: "typescript"
---
# TypeScript Toolchain

> How to compile, type-check, bundle, lint, and scale a TypeScript project — including the split between type-checking and transpilation.

---

## Prerequisites

- TypeScript installed and a `tsconfig.json` in place (see installation-and-setup).
- A project using ES Modules.

---

## Steps

### 1. Understand type-checking vs transpilation

A key modern insight: **type-checking** and **emitting JavaScript** are separate jobs.

- `tsc` does both, but is relatively slow.
- Tools like **esbuild**, **SWC**, and **tsx** *transpile* TypeScript to JavaScript extremely fast by simply stripping types — they do **not** type-check.

The common setup: use a fast transpiler for dev/build, and run `tsc --noEmit` as a separate type-checking gate in CI.

```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "typecheck": "tsc --noEmit"
  }
}
```

### 2. Type-check in watch mode

```bash
npx tsc --noEmit --watch
```

### 3. Bundle (for apps and libraries)

For browser apps, **Vite** handles TS out of the box. For libraries, use `tsc` (for `.d.ts` and correctness) or `tsup`/esbuild for fast bundling — and always emit declaration files:

```json
{ "compilerOptions": { "declaration": true, "declarationMap": true } }
```

### 4. Lint with type information

Use **typescript-eslint** to enable rules that use the type checker (e.g., detecting floating promises).

```bash
npm install --save-dev eslint typescript-eslint
```

### 5. Scale with incremental builds and project references

For large repos/monorepos, split into composite projects.

```json
{
  "compilerOptions": { "incremental": true, "composite": true },
  "references": [{ "path": "../shared" }]
}
```

Build the graph with `tsc --build` (`tsc -b`), which only recompiles what changed.

---

## Verification

```bash
npm run typecheck    # tsc --noEmit; exits 0 if types are sound
npm run build        # produces JS (+ .d.ts for libraries)
npx eslint .         # lints, including type-aware rules
```

---

## Common issues

| Symptom | Likely cause | Fix |
|---|---|---|
| Fast build passes but types are wrong | esbuild/tsx don't type-check | Add `tsc --noEmit` to CI |
| `tsc -b` skips changes | Stale `.tsbuildinfo` | Delete build info or `tsc -b --force` |
| Consumers get no types from your lib | `declaration` disabled | Enable `declaration: true` and ship `.d.ts` |
| typescript-eslint slow | Type-aware linting on huge project | Scope `parserOptions.project`; lint incrementally |
| Monorepo package edits not picked up | Missing project references | Add `references` and use `tsc -b` |

---

## References

- [TypeScript — Compiler Options](https://www.typescriptlang.org/docs/handbook/compiler-options.html)
- [TypeScript — Project References](https://www.typescriptlang.org/docs/handbook/project-references.html)
- [TypeScript — Publishing / Declaration files](https://www.typescriptlang.org/docs/handbook/declaration-files/publishing.html)
- [typescript-eslint — Getting Started](https://typescript-eslint.io/getting-started/)
