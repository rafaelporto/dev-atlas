# JavaScript

> A study guide covering the JavaScript (ECMAScript) language: its type system, scope and closures, prototypes, asynchronous model, modules, and everyday best practices.

---

## Overview & Paradigms

| Article | Description |
|---|---|
| [Overview](overview.md) | What JavaScript/ECMAScript is, engines, the runtime model, and where it runs |
| [Paradigms](paradigms.md) | Imperative, prototype-based OOP, and functional styles — and when to use each |

---

## Core Language

| Article | Description |
|---|---|
| [Types and Coercion](types-and-coercion.md) | Primitive vs object types, truthiness, `===` vs `==`, and coercion rules |
| [Variables, Scope, and Closures](variables-scope-and-closures.md) | `var`/`let`/`const`, hoisting, the TDZ, lexical scope, and closures |
| [Functions](functions.md) | First-class functions, arrow vs regular, `this` binding, parameters, higher-order functions |
| [Objects and Prototypes](objects-and-prototypes.md) | Prototype chain, classes as sugar, private fields, property descriptors, composition |
| [Collections and Iteration](collections-and-iteration.md) | Array, `Map`, `Set`, `WeakMap`, the iteration protocol, and generators |
| [Immutability and Data](immutability-and-data.md) | Value vs reference, non-mutating updates, `Object.freeze`, `structuredClone` |

---

## Asynchrony, Modules, and Errors

| Article | Description |
|---|---|
| [Asynchronous JavaScript and the Event Loop](async-and-event-loop.md) | Event loop, micro/macrotasks, promises, `async`/`await`, concurrency helpers |
| [Modules](modules.md) | ES Modules vs CommonJS, dynamic import, named vs default exports |
| [Error Handling](error-handling.md) | Throwing `Error`, custom types, `{ cause }`, async errors, error boundaries |

---

## Toolchain, Testing, and Best Practices

| Article | Description |
|---|---|
| [Toolchain Setup](toolchain.md) | npm/pnpm, module type, Vite, ESLint, Prettier/Biome, npm scripts |
| [Testing](testing.md) | The test pyramid, Vitest/Jest/`node:test`, async tests, test doubles, E2E |
| [Best Practices](best-practices.md) | Consolidated everyday guidelines and idioms |

---

## WebAssembly

| Article | Description |
|---|---|
| [JavaScript, TypeScript, and WebAssembly](webassembly.md) | JS as the Wasm host, the interop boundary, and AssemblyScript for TS |
