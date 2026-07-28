---
type: concept
tags:
  - language
  - javascript
  - async
  - concept
related:
  - languages/javascript/functions
  - languages/javascript/error-handling
language: "javascript"
---
# Asynchronous JavaScript and the Event Loop

> JavaScript is single-threaded but non-blocking: the event loop schedules callbacks, promises, and `async`/`await` so I/O never freezes the program.

---

## What is it?

JavaScript runs your code on **one thread**. To stay responsive while waiting on slow operations (network, timers, file I/O), it uses an **event loop**: long operations are handed to the host environment, and their results are queued as callbacks to run when the thread is free. **Promises** and `async`/`await` are the modern syntax for coordinating this.

---

## Why does it matter?

Almost every real program waits on I/O. Blocking the single thread freezes the entire UI (browser) or halts all request handling (server). Understanding the event loop — and the difference between microtasks and macrotasks — explains execution order, why `await` doesn't block the thread, and how to avoid subtle ordering bugs.

---

## How it works

### The model

```
┌───────────────────────────┐
│  Call stack (runs code)   │
└─────────────┬─────────────┘
              │ empty?
      ┌───────▼────────┐   drains fully first
      │ Microtask queue│◄── promises, queueMicrotask
      └───────┬────────┘
      ┌───────▼────────┐
      │ Macrotask queue│◄── setTimeout, I/O, events
      └────────────────┘
```

Each tick: run one macrotask → drain **all** microtasks → render (browser) → repeat. Microtasks (promise callbacks) always run before the next macrotask (`setTimeout`).

```javascript
console.log("1");
setTimeout(() => console.log("4"), 0);   // macrotask
Promise.resolve().then(() => console.log("3")); // microtask
console.log("2");
// Order: 1, 2, 3, 4
```

### Promises

A `Promise` represents a value that will exist later; it is `pending`, then `fulfilled` or `rejected`.

```javascript
const p = new Promise((resolve, reject) => {
  setTimeout(() => resolve(42), 100);
});
p.then((v) => v + 1).catch((err) => handle(err)).finally(cleanup);
```

### async / await

`async` functions return promises; `await` pauses the function (not the thread) until a promise settles, then resumes.

```javascript
async function loadUser(id) {
  try {
    const res = await fetch(`/users/${id}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    throw new Error(`Failed to load user: ${err.message}`, { cause: err });
  }
}
```

### Concurrency helpers

```javascript
await Promise.all([a(), b()]);        // all succeed, or reject on first failure
await Promise.allSettled([a(), b()]); // never rejects; array of outcomes
await Promise.race([work(), timeout()]); // first to settle wins
await Promise.any([a(), b()]);        // first to fulfill; rejects only if all reject
```

---

## Examples

```javascript
// Run independent requests concurrently instead of sequentially
const [user, posts] = await Promise.all([
  fetch(`/users/${id}`).then((r) => r.json()),
  fetch(`/users/${id}/posts`).then((r) => r.json()),
]);

// Sequential when order matters (each depends on the previous)
for (const step of pipeline) {
  await step(context);
}

// Cancellation with AbortController
const ctrl = new AbortController();
setTimeout(() => ctrl.abort(), 5000);
await fetch(url, { signal: ctrl.signal });
```

---

## When to use

- Use `async`/`await` for readable sequential-looking async flows and try/catch error handling.
- Use `Promise.all` to run independent async work concurrently.
- Use `Promise.allSettled` when you need every result regardless of individual failures.
- Use `AbortController` to cancel fetches, timeouts, and long operations.

## When NOT to use

- Do not `await` in a loop for independent tasks — it serializes them; use `Promise.all` instead.
- Do not block the thread with synchronous CPU-heavy work — offload to Web Workers / worker threads.
- Do not forget to handle rejections — an unhandled promise rejection can crash Node.js.
- Do not mix `.then()` chains and `await` in the same function without reason — pick one for clarity.
- Do not assume `setTimeout(fn, 0)` runs immediately — pending microtasks run first.

---

## References

- [MDN — Asynchronous JavaScript](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Asynchronous)
- [MDN — Using promises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises)
- [MDN — The event loop](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Event_loop)
- [MDN — async function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function)
