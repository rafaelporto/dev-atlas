---
type: concept
tags:
  - language
  - javascript
  - error-handling
  - concept
related:
  - languages/javascript/async-and-event-loop
  - languages/javascript/best-practices
language: "javascript"
---
# Error Handling

> JavaScript signals failures by throwing `Error` objects and rejecting promises; handling them well means catching at the right boundary, preserving context, and never swallowing errors silently.

---

## What is it?

Error handling is how a program detects, propagates, and recovers from failures. JavaScript uses **exceptions** (`throw` / `try`/`catch`) for synchronous code and **promise rejections** (caught with `.catch` or `try`/`catch` around `await`) for asynchronous code. Errors are ordinary objects, conventionally instances of `Error`.

---

## Why does it matter?

Poor error handling — empty `catch` blocks, throwing strings, losing stack traces — turns a clear failure into a silent, undebuggable one. Good handling surfaces actionable messages, preserves the original cause, and recovers only where recovery is meaningful, letting everything else propagate to a single boundary.

---

## How it works

### Throwing and catching

Always throw `Error` (or a subclass) — never strings, so you keep a stack trace.

```javascript
try {
  const data = JSON.parse(input);
} catch (err) {
  // err is the thrown value; log context, then rethrow or handle
  console.error("Invalid JSON:", err.message);
  throw err;
} finally {
  releaseResource();   // always runs
}
```

### Custom error types

Subclass `Error` to represent domain failures you can branch on.

```javascript
class ValidationError extends Error {
  constructor(field, message) {
    super(message);
    this.name = "ValidationError";
    this.field = field;
  }
}

try { validate(form); }
catch (err) {
  if (err instanceof ValidationError) showFieldError(err.field);
  else throw err;    // not ours — let it propagate
}
```

### Preserving the cause

Wrap low-level errors without discarding the original using the `cause` option (ES2022).

```javascript
try { await db.query(sql); }
catch (err) {
  throw new Error("Failed to load orders", { cause: err }); // err chained
}
```

### Async errors

`await` turns rejections into throws, so `try`/`catch` works uniformly.

```javascript
async function safeLoad(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    logger.error({ url, err });
    return null;   // deliberate recovery at this boundary
  }
}
```

An uncaught rejection triggers `unhandledrejection` (browser) or can crash the process (Node).

---

## Examples

```javascript
// Centralized boundary — handle once, at the edge (Express-style)
app.use((err, req, res, next) => {
  const status = err instanceof ValidationError ? 400 : 500;
  res.status(status).json({ error: err.message });
});

// Result-style return for expected, non-exceptional failures
function parsePort(raw) {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0
    ? { ok: true, value: n }
    : { ok: false, error: "invalid port" };
}
```

---

## When to use

- Use `throw new Error(...)` for exceptional, unexpected conditions.
- Use custom `Error` subclasses to distinguish recoverable domain errors from bugs.
- Use `{ cause }` to wrap lower-level errors while preserving the original.
- Handle errors at a **boundary** (request handler, top-level task) rather than everywhere.
- Consider a `Result`-style return value for *expected* failures (validation, parsing) that are part of normal flow.

## When NOT to use

- Do not throw non-`Error` values (strings, objects) — you lose the stack trace.
- Do not write empty `catch {}` blocks — at minimum log; ideally rethrow.
- Do not use exceptions for ordinary control flow — it is slow and obscures intent.
- Do not catch an error only to rethrow it unchanged with no added context.
- Do not leave promise rejections unhandled — they can crash Node processes.

---

## References

- [MDN — Control flow and error handling](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Control_flow_and_error_handling)
- [MDN — Error](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error)
- [MDN — Error.prototype.cause](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/cause)
- [MDN — try...catch](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/try...catch)
