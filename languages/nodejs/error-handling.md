---
type: concept
tags:
  - language
  - nodejs
  - backend
  - error-handling
  - concept
related:
  - languages/javascript/error-handling
  - languages/nodejs/async-patterns
  - languages/nodejs/best-practices
language: "nodejs"
---
# Error Handling in Node.js

> Distinguish operational errors (expected failures you handle) from programmer errors (bugs you let crash), handle async rejections, and treat `uncaughtException` as a last resort before a clean exit.

---

## What is it?

Error handling in Node combines JavaScript's `throw`/`try`/`catch` with process-level events (`uncaughtException`, `unhandledRejection`) and a crucial conceptual split: **operational errors** (a failed DB query, a 404, invalid input — expected, recoverable) versus **programmer errors** (a `TypeError`, a null dereference — bugs). The two demand opposite responses.

---

## Why does it matter?

Mishandling this split is how Node services become unreliable: swallowing programmer errors hides bugs and leaves the process in a corrupt state, while crashing on every operational error makes the service fragile. In a long-running server, an unhandled rejection or a leaked error can bring down all in-flight requests.

---

## How it works

### Operational vs programmer errors

| | Operational | Programmer |
|---|---|---|
| Examples | DB timeout, 404, bad input, ENOENT | `undefined is not a function`, wrong argument |
| Cause | The world (network, users, disk) | A bug in your code |
| Response | Handle, retry, return an error response | Let it crash; fix the code |

### Handle operational errors at a boundary

```javascript
app.get("/orders/:id", async (req, res, next) => {
  try {
    const order = await orders.find(req.params.id);
    if (!order) return res.status(404).json({ error: "not found" }); // operational
    res.json(order);
  } catch (err) {
    next(err); // forward to centralized handler
  }
});
```

### Async rejections

`await` turns rejections into throws — so `try`/`catch` covers them. But a promise that is never awaited and rejects becomes an `unhandledRejection`.

```javascript
process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "unhandled rejection");
  // Treat as a programmer error: log, then exit and let the orchestrator restart
  process.exit(1);
});
```

### uncaughtException — last resort

By the time this fires, the process may be in an inconsistent state. Log, attempt minimal cleanup, and exit — do **not** resume normal operation.

```javascript
process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "uncaught exception");
  process.exit(1); // let the process manager restart a clean instance
});
```

### Custom error types with context

```javascript
class AppError extends Error {
  constructor(message, { status = 500, code, cause } = {}) {
    super(message, { cause });
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.isOperational = true; // mark expected errors
  }
}
```

The centralized handler can then branch on `isOperational` and `status`.

---

## Examples

```javascript
// Centralized Express error handler distinguishing operational from unknown
app.use((err, req, res, next) => {
  if (err.isOperational) {
    return res.status(err.status).json({ error: err.message, code: err.code });
  }
  logger.error({ err }, "unexpected error"); // programmer error — investigate
  res.status(500).json({ error: "internal server error" }); // no stack leak
});
```

---

## When to use

- Classify errors: handle **operational** ones gracefully; let **programmer** errors crash and restart.
- Wrap request handlers so async errors reach a **centralized** handler.
- Attach `unhandledRejection`/`uncaughtException` listeners that log and exit cleanly, relying on a process manager to restart.
- Add `{ cause }` and context (status, code) to errors as they propagate.

## When NOT to use

- Do not swallow errors in empty `catch` blocks or resume after an `uncaughtException`.
- Do not leak stack traces or internal messages to clients — return generic messages, log the detail.
- Do not treat every error as fatal — operational errors should be handled, not crash the service.
- Do not leave floating promises unhandled — await them or attach `.catch`.

---

## References

- [Node.js — Error handling (Learn)](https://nodejs.org/en/learn/asynchronous-work/asynchronous-flow-control)
- [Node.js — process events (`uncaughtException`, `unhandledRejection`)](https://nodejs.org/api/process.html#event-uncaughtexception)
- [Node.js — Errors](https://nodejs.org/api/errors.html)
- [Node.js — `--unhandled-rejections` mode](https://nodejs.org/api/cli.html#--unhandled-rejectionsmode)
