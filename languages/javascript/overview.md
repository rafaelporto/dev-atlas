---
type: concept
tags:
  - language
  - javascript
  - frontend
  - backend
  - overview
related:
  - languages/javascript/paradigms
  - languages/javascript/async-and-event-loop
language: "javascript"
---
# JavaScript Overview

> JavaScript is a high-level, dynamically typed, multi-paradigm language standardized as ECMAScript that runs in browsers, on servers, and in embedded runtimes.

---

## What is it?

JavaScript is the programming language of the web. It is **dynamically typed** (types are associated with values, not variables), **garbage-collected**, and **multi-paradigm** — it supports imperative, object-oriented (via prototypes), and functional styles. The language itself is defined by the **ECMAScript** specification (ECMA-262), maintained by TC39; "JavaScript" is the popular name for implementations of that spec plus the host APIs a runtime exposes.

A key distinction: the *language* (syntax, types, `Array`, `Promise`, closures) is separate from the *host environment* (the DOM in browsers, the `fs`/`http` modules in Node.js). The same language runs everywhere; the available APIs differ per host.

---

## Why does it matter?

JavaScript is the only language that runs natively in every web browser, which made it unavoidable for front-end work. Since Node.js (2009) it also runs on servers, tooling, and desktop apps, enabling a single language across the full stack. Its ecosystem (npm) is the largest package registry in existence.

Understanding the language's core semantics — prototypes, closures, coercion, the event loop — is what separates code that merely works from code that behaves predictably under edge cases and concurrency.

---

## How it works

### The ECMAScript standard

ECMAScript is versioned yearly (ES2015/ES6 was the watershed release; each year since adds features via the TC39 proposal process: stages 0–4). Engines ship features as proposals reach Stage 4. "ES6" and "ES2015" are the same thing.

### Engines

JavaScript source is parsed and executed by an **engine**: V8 (Chrome, Node.js, Deno), SpiderMonkey (Firefox), JavaScriptCore (Safari). Modern engines are JIT compilers — they interpret first, then compile hot code paths to optimized machine code, deoptimizing when assumptions (like a value's shape) break.

### The runtime model

JavaScript executes on a **single thread** with an **event loop**. Long-running or blocking work is offloaded to host-provided async APIs (timers, I/O), whose completions are queued back onto the main thread. This is covered in depth in the async article.

```mermaid
graph LR
  A[Source] --> B[Engine: parse + JIT]
  B --> C[Single-threaded execution]
  C --> D[Event loop]
  D --> E[Host APIs: DOM / timers / I/O]
  E --> D
```

### Where it runs

- **Browser** — DOM, `fetch`, `localStorage`, Web APIs.
- **Node.js / Deno / Bun** — file system, network servers, processes.
- **Embedded** — React Native (mobile), Electron (desktop), edge runtimes.

---

## Examples

```javascript
// Dynamic typing and first-class functions
const add = (a, b) => a + b;
const ops = { add, sub: (a, b) => a - b };

// Prototypal objects
const user = { name: "Ada", greet() { return `Hi, ${this.name}`; } };

// Asynchronous, non-blocking I/O
async function load(url) {
  const res = await fetch(url);
  return res.json();
}

// Functional pipeline over collections
const total = [1, 2, 3, 4]
  .filter((n) => n % 2 === 0)
  .reduce((sum, n) => sum + n, 0); // 6
```

---

## When to use

- Any web front-end (it is the only option that runs in all browsers).
- Full-stack applications where sharing one language across client and server reduces context switching.
- Rapid prototyping and scripting, thanks to dynamic typing and a vast package ecosystem.
- Tooling, CLIs, and build systems (via Node.js).

## When NOT to use

- CPU-bound, heavily parallel workloads (numeric computing, video encoding) — the single-threaded model and dynamic typing make languages like Go, Rust, or C++ a better fit.
- Systems requiring strict compile-time guarantees on a large codebase — reach for TypeScript on top of JavaScript instead of raw JS.
- Hard-real-time or memory-constrained embedded systems where garbage-collection pauses are unacceptable.

---

## References

- [MDN — JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
- [MDN — A re-introduction to JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Language_overview)
- [ECMA-262 — ECMAScript Language Specification](https://tc39.es/ecma262/)
- [TC39 — Proposals process](https://tc39.es/process-document/)
