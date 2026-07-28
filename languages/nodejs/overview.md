---
type: concept
tags:
  - language
  - nodejs
  - backend
  - overview
related:
  - languages/javascript/overview
  - languages/nodejs/event-loop-and-timers
  - languages/nodejs/architecture
language: "nodejs"
---
# Node.js Overview

> Node.js is a JavaScript runtime built on the V8 engine that runs JavaScript outside the browser, using an event-driven, non-blocking I/O model well suited to networked servers.

---

## What is it?

Node.js is a **runtime** — not a language or a framework — that lets JavaScript run on servers, CLIs, and tooling. It pairs Google's **V8** engine (which executes JavaScript) with **libuv** (which provides the event loop and asynchronous I/O) and a standard library of modules (`fs`, `http`, `crypto`, `stream`, …). Its model is **single-threaded, event-driven, non-blocking I/O**.

---

## Why does it matter?

Node.js made full-stack JavaScript possible and remains one of the most widely deployed server runtimes. Its non-blocking model handles many concurrent connections cheaply, making it excellent for I/O-bound services (APIs, gateways, real-time apps). Understanding what Node is — and what its single-threaded model is *not* good at — guides sound architecture decisions.

---

## How it works

### The pieces

```
┌──────────────────────────────────────────┐
│ Your JavaScript                            │
├──────────────────────────────────────────┤
│ Node.js API (fs, http, stream, crypto...)  │
├───────────────┬────────────────────────────┤
│ V8 (execute)  │ libuv (event loop + I/O)    │
└───────────────┴────────────────────────────┘
```

- **V8** compiles and runs JavaScript.
- **libuv** provides the event loop, a thread pool for certain operations (file I/O, DNS, crypto), and OS-level async networking.
- The **standard library** exposes these via JavaScript APIs, mostly under the `node:` prefix (`node:fs`).

### Non-blocking I/O

Instead of blocking a thread while waiting on the network or disk, Node registers a callback/promise and continues. When the OS signals completion, the event loop runs the callback. One thread thus serves thousands of concurrent connections.

### Release and LTS model

Node ships a new major version every 6 months. Even-numbered releases become **LTS** (Long-Term Support) with ~30 months of support. **Use an active LTS version in production.**

### The ecosystem

**npm** is the package registry (the largest in existence); `pnpm` and `yarn` are alternative clients. Modern Node supports ES Modules natively, a built-in test runner (`node:test`), `fetch`, and a `--watch` mode.

---

## Examples

```javascript
// A minimal HTTP server — no framework needed
import { createServer } from "node:http";

const server = createServer((req, res) => {
  res.writeHead(200, { "content-type": "application/json" });
  res.end(JSON.stringify({ ok: true }));
});

server.listen(3000, () => console.log("listening on :3000"));
```

```bash
node --version        # check runtime version
node server.js        # run
node --watch server.js # restart on file changes (built-in)
```

---

## When to use

- I/O-bound services: REST/GraphQL APIs, gateways, BFFs, proxies.
- Real-time applications: chat, collaboration, streaming (WebSockets, SSE).
- Tooling, CLIs, and build systems.
- Full-stack apps sharing types/logic between client and server.

## When NOT to use

- CPU-bound workloads (heavy computation, image/video processing) — they block the single thread; use worker threads, a queue, or another runtime.
- Hard-real-time systems where garbage-collection pauses are unacceptable.
- Simple static sites that need no server logic — a static host or edge function is simpler.

---

## References

- [Node.js — About Node.js](https://nodejs.org/en/about)
- [Node.js — Introduction (Learn)](https://nodejs.org/en/learn/getting-started/introduction-to-nodejs)
- [Node.js — Release schedule / LTS](https://nodejs.org/en/about/previous-releases)
- [libuv — Documentation](https://docs.libuv.org/en/v1.x/)
