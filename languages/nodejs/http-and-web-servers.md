---
type: concept
tags:
  - language
  - nodejs
  - backend
  - concept
related:
  - languages/nodejs/streams
  - languages/nodejs/architecture
  - languages/nodejs/security
language: "nodejs"
---
# HTTP and Web Servers

> Node has a built-in `node:http` server, but production services typically use a framework like Express or Fastify for routing, middleware, and ergonomics.

---

## What is it?

Node's `node:http` module implements HTTP servers and clients directly. On top of it, the ecosystem provides **web frameworks** — **Express** (minimal, ubiquitous), **Fastify** (fast, schema-based, modern), and others — that add routing, middleware, body parsing, and structured error handling.

---

## Why does it matter?

Serving HTTP is Node's most common job. Knowing the raw API demystifies what frameworks do and helps with debugging, streaming, and performance. Choosing a framework — and using middleware correctly — determines how maintainable and fast the service is.

---

## How it works

### Raw node:http

```javascript
import { createServer } from "node:http";

const server = createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
    return;
  }
  res.writeHead(404).end("Not Found");
});

server.listen(3000);
```

`req` is a Readable stream; `res` is a Writable stream — which is why streaming responses works naturally.

### Express (minimal, huge ecosystem)

```javascript
import express from "express";
const app = express();

app.use(express.json());                       // body parsing middleware
app.get("/users/:id", async (req, res, next) => {
  try {
    const user = await getUser(req.params.id);
    if (!user) return res.status(404).json({ error: "not found" });
    res.json(user);
  } catch (err) { next(err); }                 // forward to error middleware
});

app.use((err, req, res, next) => {             // centralized error handler
  res.status(500).json({ error: "internal" });
});

app.listen(3000);
```

### Fastify (performance + schema validation)

```javascript
import Fastify from "fastify";
const app = Fastify({ logger: true });

app.get("/users/:id", {
  schema: { params: { type: "object", properties: { id: { type: "string" } } } },
}, async (req) => getUser(req.params.id));      // validation + fast JSON serialization

await app.listen({ port: 3000 });
```

### Middleware model

A request passes through a chain of functions that can read/modify it, short-circuit, or pass control onward — used for auth, logging, parsing, CORS, rate limiting.

### Graceful shutdown

Handle `SIGTERM` to stop accepting connections and finish in-flight requests before exiting (important in containers/Kubernetes).

```javascript
process.on("SIGTERM", () => server.close(() => process.exit(0)));
```

---

## Examples

```javascript
// Making outbound HTTP requests — use the built-in fetch (global since Node 18)
const res = await fetch("https://api.example.com/data", {
  signal: AbortSignal.timeout(5000),
});
if (!res.ok) throw new Error(`HTTP ${res.status}`);
const data = await res.json();
```

---

## When to use

- Use **`node:http`** directly for tiny services, proxies, or when you need full control over streaming.
- Use **Express** for its enormous middleware ecosystem and familiarity.
- Use **Fastify** when throughput and built-in schema validation/serialization matter.
- Always implement graceful shutdown for containerized services.

## When NOT to use

- Do not hand-roll routing/parsing for a non-trivial API — a framework is more maintainable and safer.
- Do not block the event loop inside a handler — offload CPU work (see worker threads).
- Do not skip request validation — validate input at the HTTP boundary (schemas, Zod).
- Do not forget error-handling middleware — unhandled errors leak stack traces or crash the process.

---

## References

- [Node.js — HTTP](https://nodejs.org/api/http.html)
- [Node.js — Anatomy of an HTTP transaction](https://nodejs.org/en/learn/modules/anatomy-of-an-http-transaction)
- [Express — Guide](https://expressjs.com/en/guide/routing.html)
- [Fastify — Getting Started](https://fastify.dev/docs/latest/Guides/Getting-Started/)
