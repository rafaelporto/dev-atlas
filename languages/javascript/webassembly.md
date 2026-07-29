---
type: concept
tags:
  - language
  - javascript
  - typescript
  - webassembly
  - frontend
related:
  - languages/javascript/overview
  - software-engineering/architecture/frontend/webassembly
  - languages/go/webassembly
  - languages/csharp/webassembly
language: "javascript"
---

# JavaScript, TypeScript, and WebAssembly

> How JavaScript hosts and drives WebAssembly modules through the `WebAssembly` API, and how TypeScript-flavored code reaches Wasm via AssemblyScript.

---

## What is it?

JavaScript is the **host** for WebAssembly in the browser: it loads, instantiates, and calls Wasm modules through the built-in **`WebAssembly` JavaScript API**, and it owns everything the module can't touch (the DOM, network, timers). Unlike Go or C#, JavaScript does not compile *to* Wasm — it's the glue on the other side of the boundary. TypeScript is the same story at runtime, with one addition: **AssemblyScript**, a language that looks like TypeScript and *does* compile to Wasm. For Wasm fundamentals, see the [WebAssembly architecture article](../../software-engineering/architecture/frontend/webassembly.md).

---

## Why does it matter?

Every Wasm module in a web app — whether compiled from Rust, Go, C#, or C++ — is loaded and orchestrated by JavaScript. Understanding the host side is therefore essential regardless of which language produced the module: how to instantiate it, how to move data across the boundary efficiently, and how to expose host functions the module needs. AssemblyScript matters for a narrower case: teams who want to write Wasm using familiar TypeScript-like syntax without adopting a systems language, accepting that it's a **subset** of TypeScript with its own type system, not TypeScript itself.

---

## How it works

### JavaScript as the host

The `WebAssembly` API loads and instantiates a module; `instantiateStreaming` compiles it while it downloads:

```js
// The module's exports become callable JS functions.
const { instance } = await WebAssembly.instantiateStreaming(
  fetch("add.wasm"),
  importObject, // host functions/memory the module declares as imports
);

const sum = instance.exports.add(2, 3); // call into Wasm
```

### The import object

A module declares **imports** — host functions and memory it needs. JavaScript supplies them:

```js
const importObject = {
  env: {
    // a host function the module can call (e.g. to log)
    log: (ptr, len) => console.log(readString(memory, ptr, len)),
    memory: new WebAssembly.Memory({ initial: 1 }),
  },
};
```

This is how a Wasm module reaches the outside world: it can only do what the host hands it — the basis of Wasm's sandbox.

### Crossing the boundary

Wasm operates on its own **linear memory** of typed numbers. Numbers pass directly; strings, arrays, and objects must be **copied/serialized** across:

```js
// Read a UTF-8 string out of the module's linear memory
function readString(memory, ptr, len) {
  const bytes = new Uint8Array(memory.buffer, ptr, len);
  return new TextDecoder("utf-8").decode(bytes);
}
```

Because each crossing has a cost, the rule is **coarse-grained** calls: hand off a whole task and read back one result, rather than many tiny calls.

### Higher-level glue

You rarely hand-write the marshaling. Toolchains generate JS/TS bindings so you call Wasm as if it were a normal module:

- **`wasm-bindgen`** (Rust), **Emscripten** (C/C++), and Go's/C#'s shims (see the [Go](../go/webassembly.md) and [C#](../csharp/webassembly.md) articles) generate the boundary code.
- Bundlers (Vite, webpack) can import `.wasm` files directly, and browsers support Wasm as ES modules in modern setups.

### TypeScript and AssemblyScript

TypeScript itself compiles to JavaScript, so at runtime TS is a host just like JS — you get typed wrappers around a module's exports:

```ts
interface HashExports {
  memory: WebAssembly.Memory;
  hash(ptr: number, len: number): number;
}

const { instance } = await WebAssembly.instantiateStreaming(fetch("hash.wasm"));
const exports = instance.exports as unknown as HashExports;
```

**AssemblyScript** is the way to *author* Wasm with TypeScript-like syntax. It uses TypeScript's syntax but a stricter, static type system (with Wasm types like `i32`, `f64`) and compiles to a `.wasm` module:

```ts
// assembly/index.ts — AssemblyScript (a TypeScript-like language, not TS)
export function fib(n: i32): i32 {
  let a = 0, b = 1;
  for (let i = 0; i < n; i++) {
    const t = a + b;
    a = b;
    b = t;
  }
  return a;
}
```

```bash
# Compile AssemblyScript to Wasm
npx asc assembly/index.ts --outFile build/fib.wasm --optimize
```

The output is loaded and called from JavaScript exactly like any other Wasm module.

---

## Examples

A complete host-side flow: load a module, do a coarse-grained call, keep the DOM in JavaScript:

```js
const { instance } = await WebAssembly.instantiateStreaming(fetch("filter.wasm"));
const { memory, alloc, grayscale } = instance.exports;

function applyFilter(pixels /* Uint8Array */) {
  const ptr = alloc(pixels.length);                        // reserve Wasm memory
  new Uint8Array(memory.buffer, ptr, pixels.length).set(pixels); // copy in
  grayscale(ptr, pixels.length);                           // heavy work in Wasm
  return new Uint8Array(memory.buffer, ptr, pixels.length).slice(); // copy out
}

// JavaScript still owns the DOM: it decides when to call applyFilter and
// paints the result to a <canvas>. Wasm never touches the page.
```

---

## When to use

- **JS/TS as host**: whenever your app uses any Wasm module — this is the required, unavoidable side of the boundary.
- **AssemblyScript**: to write compute-heavy Wasm using TypeScript-like syntax without learning Rust/C++, when its subset limitations are acceptable.
- Typed export wrappers in TypeScript to make a module's interface safe to call.

## When NOT to use

- Don't move ordinary app/UI logic into Wasm — JavaScript owns the DOM and is fast enough; the interop tax outweighs any gain.
- Don't assume AssemblyScript is "TypeScript to Wasm" — it's a distinct language with a stricter type system and no access to the TS/JS standard library or `any`.
- Don't make fine-grained, chatty JS↔Wasm calls — batch work into coarse-grained calls.

## References

- MDN. [WebAssembly — JavaScript API](https://developer.mozilla.org/en-US/docs/WebAssembly/JavaScript_interface). MDN Web Docs.
- MDN. [Using the WebAssembly JavaScript API](https://developer.mozilla.org/en-US/docs/WebAssembly/Using_the_JavaScript_API). MDN Web Docs.
- AssemblyScript. [The AssemblyScript Book](https://www.assemblyscript.org/introduction.html). assemblyscript.org.
