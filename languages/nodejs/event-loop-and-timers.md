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
  - languages/nodejs/async-patterns
  - languages/nodejs/worker-threads-and-scaling
language: "nodejs"
---
# The Event Loop and Timers

> Node's event loop, provided by libuv, runs in ordered phases; understanding those phases explains timer accuracy, `process.nextTick` vs promises, and why blocking the loop is catastrophic.

---

## What is it?

The **event loop** is the mechanism that lets single-threaded Node handle asynchronous operations. libuv runs it in a fixed sequence of **phases**, each draining a queue of callbacks (timers, I/O, `setImmediate`, close callbacks). Between and within phases, the **microtask queues** (`process.nextTick` and promises) are drained.

---

## Why does it matter?

The phase order determines callback execution order — a frequent source of confusing bugs. More importantly, because everything shares one thread, a single synchronous CPU-heavy operation blocks the *entire* event loop, stalling all requests. Knowing this shapes how you write and offload work.

---

## How it works

### The phases (per loop iteration)

```
   ┌───────────────────────────┐
┌─▶│           timers          │  setTimeout / setInterval callbacks
│  ├───────────────────────────┤
│  │     pending callbacks     │  some system operations
│  ├───────────────────────────┤
│  │       poll (I/O)          │  retrieve new I/O events; run I/O callbacks
│  ├───────────────────────────┤
│  │          check            │  setImmediate callbacks
│  ├───────────────────────────┤
│  │      close callbacks      │  e.g. socket 'close'
└──┴───────────────────────────┘
```

After each callback, Node drains **`process.nextTick`** queue, then the **promise microtask** queue, before continuing.

### Ordering example

```javascript
setTimeout(() => console.log("timeout"), 0);
setImmediate(() => console.log("immediate"));
Promise.resolve().then(() => console.log("promise"));
process.nextTick(() => console.log("nextTick"));
console.log("sync");

// sync → nextTick → promise → timeout → immediate
```

Microtasks (`nextTick`, then promises) run before the loop moves to the next phase. `process.nextTick` runs before promise callbacks.

### Timers are a minimum, not a guarantee

`setTimeout(fn, 100)` runs `fn` *after at least* 100ms — the actual delay depends on when the loop reaches the timers phase and whether it was blocked.

### Blocking the loop

```javascript
// ❌ blocks EVERY connection for the duration
app.get("/hash", (req, res) => {
  const result = expensiveSyncHash(req.body); // CPU-bound, synchronous
  res.json({ result });
});
```

While `expensiveSyncHash` runs, no other request, timer, or I/O callback can execute. Offload CPU-bound work (see worker threads).

---

## Examples

```javascript
// Break a long CPU task into chunks so I/O can proceed between them
async function processLarge(items) {
  for (let i = 0; i < items.length; i++) {
    doWork(items[i]);
    if (i % 1000 === 0) await new Promise((r) => setImmediate(r)); // yield
  }
}

// Prefer setImmediate over setTimeout(fn, 0) to run "after current I/O"
setImmediate(() => runAfterPollPhase());
```

---

## When to use

- Use `setImmediate` to defer work until after the current I/O phase; use `setTimeout` for time-based delays.
- Use `process.nextTick` sparingly, for deferring within the current operation (e.g., emitting an event after the caller attaches listeners).
- Yield with `await setImmediate` (or break into tasks) inside long loops so I/O isn't starved.

## When NOT to use

- Do not run CPU-bound synchronous work on the main thread — it blocks all connections; use worker threads or a queue.
- Do not recurse with `process.nextTick` unconditionally — it can starve the event loop entirely (I/O never runs).
- Do not rely on `setTimeout` for precise timing — delays are a floor, not exact.
- Do not use synchronous `fs`/`crypto` APIs in a request path — use their async variants.

---

## References

- [Node.js — The Node.js Event Loop, Timers, and process.nextTick()](https://nodejs.org/en/learn/asynchronous-work/event-loop-timers-and-nexttick)
- [Node.js — Don't Block the Event Loop](https://nodejs.org/en/learn/asynchronous-work/dont-block-the-event-loop)
- [Node.js — Timers](https://nodejs.org/api/timers.html)
- [libuv — Design overview](https://docs.libuv.org/en/v1.x/design.html)
