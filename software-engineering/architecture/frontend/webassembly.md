---
type: concept
tags:
  - architecture
  - frontend
  - concept
  - webassembly
related:
  - software-engineering/architecture/frontend/rendering-patterns
  - software-engineering/architecture/frontend/frontend-stacks-and-tooling
  - languages/javascript/webassembly
  - languages/go/webassembly
  - languages/csharp/webassembly
language: null
---
# WebAssembly

> A portable, near-native compiled format that runs alongside JavaScript in the browser (and beyond) — for the compute-heavy work JavaScript is too slow or too awkward to do.

---

## What is it?

WebAssembly (Wasm) is a low-level binary instruction format that browsers can execute at close to native speed. It is a **compilation target**, not a language you write by hand: you write in Rust, C, C++, Go, C#, or others, and compile to a `.wasm` module that the browser loads and runs inside the same secure sandbox as JavaScript.

Crucially, Wasm does not replace JavaScript — it **complements** it. JavaScript remains the language of the DOM and the glue of the page; Wasm is where you drop in a fast, portable module for a specific job. The two run side by side, calling into each other.

Although it was born in the browser, Wasm is not limited to it. The same module can run on servers, at the edge (CDN workers), and in plugin systems, thanks to standardized host interfaces (WASI). This article focuses on its role in frontend architecture.

---

## Why does it matter?

JavaScript is fast enough for the overwhelming majority of UI work, but it hits walls:

- **Compute-bound tasks** — image/video processing, 3D and physics, audio synthesis, cryptography, compression, large-scale data crunching. JavaScript's dynamic typing and garbage collection make consistent high performance hard.
- **Reusing existing native code** — mature C/C++/Rust libraries (codecs, CAD kernels, game engines, SQLite) can be brought to the browser without a rewrite.
- **Predictable performance** — Wasm's ahead-of-time-compiled, statically typed nature avoids the JIT warm-up and de-optimization cliffs that make JS performance spiky.

The architectural significance is that Wasm **expands what the frontend can own**. Work that previously *had* to run on a server (because it was too heavy for the browser) can now run client-side — improving latency, privacy (data never leaves the device), and offline capability. It reframes the client/server boundary discussed in [rendering patterns](rendering-patterns.md) and [data fetching](data-fetching-and-bff.md).

---

## How it works

### The pipeline

```
   source language              build step            browser runtime
   ───────────────              ──────────            ───────────────
   Rust / C / C++ / Go / C#  ──►  compiler  ──►  module.wasm  ──►  ┌───────────────┐
                                                                    │  Wasm sandbox │
                                                                    │  (near-native)│
                                                                    └───────┬───────┘
                                                              imports ▲      │ exports
                                                                      │      ▼
                                                              ┌───────────────────┐
                                                              │    JavaScript     │  owns DOM,
                                                              │  (glue + the page)│  network, events
                                                              └───────────────────┘
```

1. You compile source code to a `.wasm` binary at build time.
2. JavaScript loads and instantiates the module (`WebAssembly.instantiateStreaming`).
3. The module exposes **exports** (functions JS can call) and declares **imports** (JS functions or memory it needs).
4. JS calls into Wasm for the heavy work; Wasm calls back out for anything requiring the host (DOM, network).

### The JS ↔ Wasm boundary

The most important architectural constraint is the boundary itself:

- **Wasm cannot touch the DOM directly.** It has no access to the page, network, or Web APIs — only JavaScript does. Every DOM update or fetch goes through a JS call. Frameworks that render UI in Wasm (Blazor, Yew, Leptos) still ultimately drive the DOM through a JS interop layer.
- **Data crossing the boundary has a cost.** Wasm operates on its own linear memory (typed numbers). Passing strings, objects, or arrays means copying/serializing across the JS↔Wasm line. Chatty, fine-grained calls erase the speed advantage; the pattern is **coarse-grained** calls that hand off a big chunk of work at once.

### Where it fits in the architecture

```
   ┌──────────────────────────────────────────────┐
   │                  The page                      │
   │  ┌────────────┐         ┌───────────────────┐ │
   │  │ UI (JS/TS  │  calls  │  Wasm module       │ │
   │  │ framework) │ ──────► │  · codec / crypto  │ │
   │  │  owns DOM  │ ◄────── │  · sim / parser    │ │
   │  └────────────┘ results └───────────────────┘ │
   └──────────────────────────────────────────────┘
```

The dominant pattern is a JS/TS frontend that offloads *one well-defined, compute-heavy concern* to a Wasm module, rather than rewriting the whole app in Wasm.

### Per-language deep dives

This article is framework- and language-agnostic. For how specific languages target or host Wasm, see:

- [JavaScript, TypeScript, and WebAssembly](../../../languages/javascript/webassembly.md) — the host side: the `WebAssembly` JS API, the interop boundary, and AssemblyScript for TypeScript.
- [Go and WebAssembly](../../../languages/go/webassembly.md) — `GOOS=js GOARCH=wasm`, `syscall/js`, and TinyGo/WASI.
- [C# and WebAssembly](../../../languages/csharp/webassembly.md) — Blazor WebAssembly, the .NET Wasm runtime, and JS interop.

---

## Examples

The illustrative snippet (one framework's syntax) shows JavaScript loading a Wasm module and making a coarse-grained call across the boundary.

```ts
// Load and instantiate a compiled module (e.g. a Rust image filter → image_filter.wasm).
const { instance } = await WebAssembly.instantiateStreaming(
  fetch("/image_filter.wasm"),
);

// Coarse-grained call: hand the whole pixel buffer to Wasm, get the result back once.
// Wasm works in its own linear memory; JS copies the bytes in and reads them out.
function applyFilter(pixels: Uint8Array): Uint8Array {
  const { memory, alloc, grayscale } = instance.exports as WasmImageExports;

  const ptr = alloc(pixels.length);                          // reserve Wasm memory
  new Uint8Array(memory.buffer, ptr, pixels.length).set(pixels); // copy in
  grayscale(ptr, pixels.length);                             // heavy work in Wasm
  return new Uint8Array(memory.buffer, ptr, pixels.length).slice(); // copy out
}

// The JS/TS framework still owns the DOM: it decides when to call applyFilter
// and how to paint the result to a <canvas>. Wasm never touches the page.
```

Higher-level toolchains (`wasm-bindgen` for Rust, Emscripten for C/C++) generate the JS glue so you call `grayscale(pixels)` directly, but the underlying boundary — copy in, compute, copy out — is what the snippet makes explicit.

---

## When to use

- Compute-heavy, CPU-bound work in the browser: media processing, 3D/gaming, physics, audio, cryptography, compression, heavy parsing.
- Porting an existing, battle-tested native library (a codec, SQLite, a CAD kernel) to the web without a rewrite.
- Moving server-side compute to the client for latency, privacy, or offline reasons.
- Performance-critical hot paths where JavaScript's variability is a measured problem.

## When NOT to use

- Ordinary UI work — forms, layout, navigation, typical app logic. JavaScript is simpler, smaller, and fast enough; Wasm adds build complexity for no gain.
- DOM-heavy code — Wasm can't touch the DOM, so a UI that mostly manipulates the page gains nothing and pays the interop tax.
- Small or infrequent computations — the cost of crossing the JS↔Wasm boundary and shipping the module outweighs the speedup.
- Reaching for a full Wasm UI framework when a mainstream JS/TS framework would do — only justified when you have a strong reason (sharing a Rust/C# codebase across client and server, for instance).

---

## References

- WebAssembly Community Group. [WebAssembly — Official Site](https://webassembly.org/). webassembly.org.
- MDN. [WebAssembly Concepts](https://developer.mozilla.org/en-US/docs/WebAssembly/Concepts). MDN Web Docs.
- Rust and WebAssembly Working Group. [The `wasm-bindgen` Guide](https://rustwasm.github.io/docs/wasm-bindgen/). rustwasm.github.io.
- Clark, Lin. [WebAssembly and the future of the web (Bytecode Alliance / WASI)](https://bytecodealliance.org/articles/announcing-the-bytecode-alliance). Bytecode Alliance.
