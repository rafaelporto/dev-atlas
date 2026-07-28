---
type: concept
tags:
  - language
  - nodejs
  - backend
  - async
  - concept
related:
  - languages/javascript/async-and-event-loop
  - languages/nodejs/event-loop-and-timers
  - languages/nodejs/streams
language: "nodejs"
---
# Asynchronous Patterns

> Node code coordinates async work with promises and `async`/`await`, the `EventEmitter` for recurring events, and `AbortController` for cancellation — with the older callback style still present in legacy APIs.

---

## What is it?

Node exposes asynchrony through several complementary APIs: **promises** and `async`/`await` (the default today), **`EventEmitter`** for one-to-many recurring events (streams, servers), the historic **error-first callback** convention, and **`AbortController`/`AbortSignal`** for cancelling in-flight operations.

---

## Why does it matter?

Server code is almost entirely asynchronous. Choosing the right pattern — and converting between them — keeps code readable and correct. Cancellation (timeouts, request abort) and structured concurrency (`Promise.all`) are what make services resilient under load.

---

## How it works

### Promises and async/await

Modern Node APIs offer promise variants (`node:fs/promises`, `node:timers/promises`).

```javascript
import { readFile } from "node:fs/promises";
const config = JSON.parse(await readFile("config.json", "utf8"));
```

### Error-first callbacks (legacy)

The historic convention: `(err, result) => {}`. Wrap these with `promisify`.

```javascript
import { promisify } from "node:util";
import { execFile } from "node:child_process";
const run = promisify(execFile);
const { stdout } = await run("git", ["status"]);
```

### EventEmitter

For recurring events (not a single result), extend or use `EventEmitter`.

```javascript
import { EventEmitter } from "node:events";

class Job extends EventEmitter {
  async run() {
    this.emit("start");
    // ...
    this.emit("progress", 50);
    this.emit("done");
  }
}

const job = new Job();
job.on("progress", (pct) => console.log(`${pct}%`));
job.once("done", () => console.log("finished"));
```

### Cancellation with AbortController

```javascript
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 5000);

try {
  const res = await fetch(url, { signal: controller.signal });
  return await res.json();
} finally {
  clearTimeout(timeout);
}
```

`AbortSignal.timeout(ms)` is a shorthand for time-limited operations.

### Structured concurrency

```javascript
// Run independent work concurrently; fail fast
const [user, orders] = await Promise.all([getUser(id), getOrders(id)]);

// Collect all outcomes, successes and failures
const results = await Promise.allSettled(tasks);
```

---

## Examples

```javascript
// Timeout wrapper reusable across any promise
function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

// Concurrency limit — process N at a time (avoid exhausting connections)
async function mapLimit(items, limit, fn) {
  const results = [];
  const executing = new Set();
  for (const item of items) {
    const p = Promise.resolve(fn(item)).then((r) => { executing.delete(p); return r; });
    results.push(p); executing.add(p);
    if (executing.size >= limit) await Promise.race(executing);
  }
  return Promise.all(results);
}
```

---

## When to use

- Use `async`/`await` with promise-based APIs as the default.
- Use `EventEmitter` for recurring events and streaming progress, not for single results.
- Use `AbortController`/`AbortSignal` to implement timeouts and cancel fetches, reads, and child processes.
- Use `Promise.all`/`allSettled` and a concurrency limiter for parallel work.

## When NOT to use

- Do not mix raw callbacks and promises ad hoc — `promisify` legacy APIs and stay in promise land.
- Do not fire unbounded `Promise.all` over thousands of tasks — cap concurrency to avoid exhausting sockets/DB connections.
- Do not forget to handle rejected promises — unhandled rejections can crash the process.
- Do not use `EventEmitter` where a single awaited promise is the natural shape.

---

## References

- [Node.js — Asynchronous flow control (Learn)](https://nodejs.org/en/learn/asynchronous-work/javascript-asynchronous-programming-and-callbacks)
- [Node.js — Events (EventEmitter)](https://nodejs.org/api/events.html)
- [Node.js — util.promisify](https://nodejs.org/api/util.html#utilpromisifyoriginal)
- [Node.js — AbortController / AbortSignal](https://nodejs.org/api/globals.html#class-abortcontroller)
