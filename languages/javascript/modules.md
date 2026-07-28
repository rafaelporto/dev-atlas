---
type: concept
tags:
  - language
  - javascript
  - concept
related:
  - languages/javascript/toolchain
  - languages/javascript/best-practices
language: "javascript"
---
# Modules

> ES Modules (ESM) are the standard way to split JavaScript into files with explicit `import`/`export`, superseding the older CommonJS system still common in Node.js.

---

## What is it?

A **module** is a file with its own scope whose bindings are shared only through explicit `export`/`import`. JavaScript has two module systems: **ES Modules (ESM)** — the language standard, `import`/`export` — and **CommonJS (CJS)** — Node's original system, `require`/`module.exports`. ESM is the present and future; CJS remains widespread in the Node ecosystem.

---

## Why does it matter?

Modules give encapsulation (no accidental globals), explicit dependencies, and enable **tree-shaking** (dead-code elimination) in bundlers. The ESM/CJS split is a frequent source of interop pain — "Cannot use import statement outside a module", dual-package hazards — so knowing which system you are in and how they interoperate is practical, everyday knowledge.

---

## How it works

### ES Modules

```javascript
// math.js
export const PI = 3.14159;
export function area(r) { return PI * r * r; }
export default class Circle {}          // one default per module

// app.js
import Circle, { PI, area } from "./math.js";
import * as math from "./math.js";       // namespace import
import { area as circleArea } from "./math.js"; // rename
```

Characteristics:
- **Static** — imports/exports are resolved before execution, enabling tree-shaking and tooling analysis.
- **Live bindings** — importers see the current value of an exported variable, not a copy.
- **Strict mode** always on; top-level `await` allowed.
- **Deferred + asynchronous** loading.

### Dynamic import

Load a module on demand (returns a promise) — used for code-splitting and conditional loading.

```javascript
const { heavy } = await import("./heavy.js");
button.onclick = async () => (await import("./chart.js")).render();
```

### CommonJS (Node)

```javascript
// math.cjs
const PI = 3.14159;
function area(r) { return PI * r * r; }
module.exports = { PI, area };

// app.cjs
const { area } = require("./math.cjs");
```

Characteristics: **synchronous**, **dynamic** (`require` can be called anywhere), value copies at import time, `__dirname`/`__filename` available.

### Choosing ESM vs CJS in Node

- `"type": "module"` in `package.json` → `.js` files are ESM.
- `.mjs` is always ESM; `.cjs` is always CJS.
- ESM can `import` CJS; CJS cannot `require` ESM (use dynamic `import()`).

See [nodejs/modules-cjs-esm](../nodejs/modules-cjs-esm.md) for Node-specific interop details.

---

## Examples

```javascript
// Barrel file — re-export a public API from an internal folder
// index.js
export { Button } from "./Button.js";
export { Input } from "./Input.js";

// Lazy-load a route to reduce initial bundle size
const routes = {
  "/dashboard": () => import("./pages/Dashboard.js"),
};

// Named exports enable tree-shaking; unused ones are dropped by bundlers
import { debounce } from "./utils.js"; // only `debounce` ends up in the bundle
```

---

## When to use

- Use **ESM** for all new code — it is the standard, enables tree-shaking, and works in browsers and modern Node.
- Use **dynamic `import()`** for code-splitting, lazy loading, and conditional/optional dependencies.
- Prefer **named exports** over default exports for better refactoring and tree-shaking.
- Use `.mjs`/`.cjs` extensions to be explicit when a package mixes systems.

## When NOT to use

- Do not mix `require` and `import` in the same file — pick the module system for that file.
- Do not rely on default exports for libraries — they hinder tree-shaking and rename detection.
- Do not use deep relative paths (`../../../`) everywhere — configure path aliases in the bundler/tsconfig.
- Do not assume CJS can `require` an ESM package — use dynamic `import()` instead.

---

## References

- [MDN — JavaScript modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)
- [MDN — import](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import)
- [MDN — export](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/export)
- [Node.js — Modules: ECMAScript modules](https://nodejs.org/api/esm.html)
