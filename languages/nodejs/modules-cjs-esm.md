---
type: concept
tags:
  - language
  - nodejs
  - backend
  - concept
related:
  - languages/javascript/modules
  - languages/nodejs/project-setup
  - languages/nodejs/overview
language: "nodejs"
---
# Modules: CommonJS and ES Modules

> Node.js supports two module systems — its original CommonJS (`require`) and the standard ES Modules (`import`) — and knowing how they interoperate avoids the ecosystem's most common friction.

---

## What is it?

Node has two module systems. **CommonJS (CJS)** — `require`/`module.exports` — is Node's original, synchronous system. **ES Modules (ESM)** — `import`/`export` — is the JavaScript language standard. Node determines which system a file uses from its extension and the nearest `package.json` `"type"` field.

---

## Why does it matter?

The CJS↔ESM boundary is the source of countless "require is not defined", "Cannot use import statement outside a module", and "ERR_REQUIRE_ESM" errors. Knowing the resolution rules and interop limits lets you configure packages correctly and consume any dependency regardless of which system it uses.

---

## How it works

### How Node picks the system

- `"type": "module"` in `package.json` → `.js` files are **ESM**.
- `"type": "commonjs"` (or absent) → `.js` files are **CJS**.
- `.mjs` is **always ESM**; `.cjs` is **always CJS** (regardless of `"type"`).

### CommonJS

```javascript
// logger.cjs
function log(msg) { console.log(msg); }
module.exports = { log };

// app.cjs
const { log } = require("./logger.cjs");
```

Synchronous, dynamic (`require` anywhere), with `__dirname`/`__filename`/`require` globals available.

### ES Modules

```javascript
// logger.js  (with "type": "module")
export function log(msg) { console.log(msg); }

// app.js
import { log } from "./logger.js";  // explicit extension required
```

Asynchronous, static, strict mode always on, top-level `await` allowed. Instead of `__dirname`:

```javascript
import { fileURLToPath } from "node:url";
const __dirname = fileURLToPath(new URL(".", import.meta.url));
```

### Interop rules

- **ESM can import CJS**: `import fs from "node:fs"` works; named imports from CJS are supported via Node's static analysis, with a default import always available.
- **CJS cannot `require` ESM** synchronously → use dynamic `import()`:

```javascript
// inside CommonJS
const { log } = await import("./logger.mjs");
```

### Dual packages

A library can ship both formats via `exports` conditions:

```json
{
  "exports": {
    ".": { "import": "./dist/index.mjs", "require": "./dist/index.cjs" }
  }
}
```

Beware the "dual package hazard": loading both copies can create duplicate state. Prefer shipping ESM-only for new libraries when your consumers support it.

---

## Examples

```javascript
// Reading a file relative to the current ESM module
import { readFile } from "node:fs/promises";
const url = new URL("./data.json", import.meta.url);
const data = JSON.parse(await readFile(url, "utf8"));

// Loading an ESM-only dependency from a CJS codebase
async function main() {
  const { default: chalk } = await import("chalk"); // chalk is ESM-only
  console.log(chalk.green("ok"));
}
```

---

## When to use

- Use **ESM** for all new Node projects — it is the standard and aligns with browser code.
- Use `.mjs`/`.cjs` extensions to be explicit when a package must mix systems.
- Use dynamic `import()` to consume ESM-only packages from remaining CJS code.
- Use `exports` conditions if you publish a library that must support both.

## When NOT to use

- Do not try to `require()` an ESM module — it throws `ERR_REQUIRE_ESM`; use dynamic `import()`.
- Do not use `__dirname`/`require` in ESM — derive paths from `import.meta.url`.
- Do not ship dual CJS+ESM builds without care — the dual-package hazard can duplicate singletons/state.
- Do not forget file extensions in ESM relative imports — Node requires them.

---

## References

- [Node.js — Modules: ECMAScript modules](https://nodejs.org/api/esm.html)
- [Node.js — Modules: CommonJS modules](https://nodejs.org/api/modules.html)
- [Node.js — Determining module system](https://nodejs.org/api/packages.html#determining-module-system)
- [Node.js — Dual CommonJS/ES module packages](https://nodejs.org/api/packages.html#dual-commonjses-module-packages)
