---
type: concept
tags:
  - language
  - typescript
  - concept
related:
  - languages/javascript/modules
  - languages/typescript/toolchain
  - languages/typescript/best-practices
language: "typescript"
---
# Modules and Declarations

> TypeScript builds on ES Modules and adds declaration files (`.d.ts`) that describe the types of JavaScript code, plus module-resolution rules that determine how imports are found.

---

## What is it?

TypeScript uses the same `import`/`export` module system as JavaScript, but layers on **declaration files** (`.d.ts`) — type-only descriptions of a module's shape — and **module resolution** — the algorithm that maps an import specifier (`"./x"`, `"lodash"`) to a file and its types.

---

## Why does it matter?

Most "cannot find module" and "module has no exported member" errors are module-resolution or declaration issues. Understanding `.d.ts` files explains how untyped JavaScript libraries get types (via `@types/*`), how to type globals, and how to ship a well-typed library that consumers can rely on.

---

## How it works

### Declaration files

A `.d.ts` file contains only types — no runtime code. The compiler generates them for your code (`"declaration": true`) and reads them to type external code.

```typescript
// math.d.ts — describes math.js which has no types of its own
export function area(radius: number): number;
export const PI: number;
```

### DefinitelyTyped and `@types`

Libraries without bundled types often have community types on npm under `@types/`.

```bash
npm install --save-dev @types/node
```

Modern libraries usually ship their own `.d.ts` (check `"types"`/`"exports"` in their `package.json`).

### Ambient declarations and globals

```typescript
// globals.d.ts
declare global {
  interface Window { analytics: Analytics; }
}
declare const __VERSION__: string;   // injected by the bundler
export {};                            // makes the file a module
```

### Module resolution

The `moduleResolution` setting controls lookup. For modern Node projects use `"NodeNext"` (honors `package.json` `"exports"` and requires explicit file extensions); bundler-based apps often use `"Bundler"`.

```typescript
// With NodeNext, import specifiers use the .js extension even from .ts source
import { area } from "./math.js"; // resolves math.ts / math.d.ts
```

### Path aliases

Avoid deep relative paths.

```json
{ "compilerOptions": { "baseUrl": ".", "paths": { "@/*": ["src/*"] } } }
```

```typescript
import { db } from "@/lib/db";
```

Note: `tsc` does not rewrite these at emit time — the bundler/runtime must also understand them.

---

## Examples

```typescript
// Typing an untyped module locally when no @types exists
// legacy.d.ts
declare module "legacy-lib" {
  export function doThing(input: string): number;
}

// Type-only import (erased; avoids runtime import and cycles)
import type { User } from "./models.js";
export type { User };
```

---

## When to use

- Enable `"declaration": true` when publishing a library so consumers get types.
- Install `@types/*` for untyped dependencies; write a local `declare module` when none exists.
- Use `import type` / `export type` for type-only imports to avoid unnecessary runtime imports and cycles.
- Configure `paths` aliases (with matching bundler config) for clean imports.

## When NOT to use

- Do not hand-edit generated `.d.ts` files — regenerate from source.
- Do not overuse `declare global` — global augmentation is hard to trace; prefer explicit imports.
- Do not set `paths` in tsconfig without configuring the bundler/runtime to match — it will type-check but fail at runtime.
- Do not mix module resolution strategies inconsistently across a repo.

---

## References

- [TypeScript — Modules (Handbook)](https://www.typescriptlang.org/docs/handbook/2/modules.html)
- [TypeScript — Module Resolution](https://www.typescriptlang.org/docs/handbook/modules/theory.html)
- [TypeScript — Declaration Files (introduction)](https://www.typescriptlang.org/docs/handbook/declaration-files/introduction.html)
- [TypeScript — `import type`](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-8.html#type-only-imports-and-export)
