---
type: concept
tags:
  - language
  - nodejs
  - backend
  - best-practice
  - observability
related:
  - languages/nodejs/error-handling
  - languages/nodejs/architecture
  - languages/nodejs/security
language: "nodejs"
---
# Node.js Best Practices

> Use current LTS and ESM, never block the event loop, validate config at boot, log structured JSON, and handle errors and shutdown deliberately — including observability from day one.

---

## What is it?

A consolidated checklist of production-grade Node.js conventions spanning runtime choices, the event loop, architecture, error handling, and observability (logging, metrics, tracing). These are the defaults that keep a service reliable and debuggable in production.

---

## Why does it matter?

Node's flexibility means each service can be structured well or badly. Consistent practices — especially around the single-threaded event loop and observability — are what separate a service that degrades gracefully and is easy to debug at 3 a.m. from one that mysteriously stalls with no signal of why.

---

## How it works

### Runtime and modules

- Run an **active LTS** version; pin it (`.nvmrc`, `engines`) and match it in CI and containers.
- Use **ES Modules** and modern built-ins (`fetch`, `node:test`, `--watch`, `--env-file`) to shed dependencies.

### Never block the event loop

- Use async APIs (`node:fs/promises`), not `*Sync`, in request paths.
- Offload CPU-bound work to worker threads or a queue (see worker-threads-and-scaling).
- Cap concurrency for fan-out work to avoid exhausting connections.

### Configuration and startup

- Validate all config at boot and **fail fast** with clear messages.
- Centralize `process.env` access in one validated module.

### Errors and shutdown

- Distinguish operational from programmer errors; handle the former, crash-and-restart on the latter.
- Handle `unhandledRejection`/`uncaughtException` by logging and exiting cleanly.
- Implement graceful shutdown on `SIGTERM`.

### Observability

The three pillars — **logs, metrics, traces** — should be built in, not bolted on:

- **Structured logging** — emit JSON logs (e.g., `pino`) with levels and context (request id, user id). Never `console.log` unstructured strings in production; never log secrets.
- **Metrics** — expose counters/latencies (e.g., Prometheus format) for request rate, errors, and latency.
- **Tracing** — adopt **OpenTelemetry** for distributed traces across services.
- **Correlation** — propagate a request/correlation id through logs and downstream calls.

```javascript
import pino from "pino";
const log = pino({ level: config.logLevel });
log.info({ requestId, userId }, "order created"); // structured, queryable
```

### Health and readiness

Expose liveness/readiness endpoints; report dependency health (DB, cache) in readiness.

### Dependencies and security

- Commit the lockfile; run `npm audit` in CI; minimize the dependency tree.
- Validate untrusted input; use parameterized queries and vetted crypto (see security).

---

## Examples

```javascript
// Request-scoped logging with a correlation id (Express)
import { randomUUID } from "node:crypto";
app.use((req, res, next) => {
  req.id = req.headers["x-request-id"] ?? randomUUID();
  req.log = log.child({ requestId: req.id });
  res.setHeader("x-request-id", req.id);
  next();
});
```

---

## When to use

- Apply these defaults to every production service and enforce them in CI (lint, audit, typecheck, tests).
- Build observability (structured logs, metrics, tracing, correlation ids) in from the start.
- Validate config and input, handle errors by class, and shut down gracefully.
- Keep the runtime on supported LTS and dependencies patched.

## When NOT to use

- Do not use synchronous or CPU-blocking operations in request handlers.
- Do not log unstructured strings or secrets; do not skip correlation ids in distributed systems.
- Do not ignore unhandled rejections or resume after `uncaughtException`.
- Do not over-apply heavy structure/observability to a throwaway script — match the rigor to the service's importance.

---

## References

- [Node.js — Security Best Practices](https://nodejs.org/en/learn/getting-started/security-best-practices)
- [Node.js — Diagnostics (Learn)](https://nodejs.org/en/learn/getting-started/diagnostics)
- [OpenTelemetry — JavaScript](https://opentelemetry.io/docs/languages/js/)
- [The Twelve-Factor App — Logs](https://12factor.net/logs)
