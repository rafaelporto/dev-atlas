# Node.js

> A study guide covering the Node.js runtime: its event-driven model, core modules, asynchronous patterns, data access, backend architecture, security, testing, and deployment.

---

## Overview & Getting Started

| Article | Description |
|---|---|
| [Overview](overview.md) | What Node.js is, V8/libuv, non-blocking I/O, the LTS model, where it fits |
| [Installation](installation.md) | Installing Node, version managers, pinning versions per project |
| [Project Setup](project-setup.md) | Initializing an ESM project, directory layout, TypeScript, scripts |
| [Toolchain](toolchain.md) | npm/pnpm, built-in `--watch`/`--env-file`/`node:test`, key `package.json` fields |

---

## Core Runtime

| Article | Description |
|---|---|
| [Modules: CommonJS and ES Modules](modules-cjs-esm.md) | How Node picks a module system and how CJS/ESM interoperate |
| [The Event Loop and Timers](event-loop-and-timers.md) | libuv phases, micro/macrotasks, timers, why not to block the loop |
| [Asynchronous Patterns](async-patterns.md) | Promises, `EventEmitter`, `AbortController`, structured concurrency |
| [Streams](streams.md) | Readable/Writable/Transform, `pipeline`, backpressure, Web Streams |
| [File System and Buffers](file-system-and-buffers.md) | `node:fs` promise API, paths, `Buffer` and encodings |

---

## Building Services

| Article | Description |
|---|---|
| [HTTP and Web Servers](http-and-web-servers.md) | `node:http`, Express, Fastify, middleware, graceful shutdown |
| [Worker Threads and Scaling](worker-threads-and-scaling.md) | Processes vs threads, cluster, `worker_threads`, worker pools |
| [Configuration and Environment](configuration-and-environment.md) | Env vars, validation at boot, secrets, twelve-factor config |
| [Data Access and Databases](data-access.md) | Mature databases, drivers vs query builders vs ORMs, pooling, transactions |
| [Backend Architecture](architecture.md) | Layered/hexagonal structure, dependency inversion, composition root |

---

## Security, Quality, and Deploy

| Article | Description |
|---|---|
| [Security](security.md) | Input validation, injection prevention, dependencies, secrets, crypto |
| [Testing](testing.md) | `node:test`, unit vs integration, testing repositories and handlers |
| [Deploy](deploy.md) | Reproducible install, multi-stage Docker, signals, health checks |
| [Best Practices](best-practices.md) | Consolidated runtime, error, and observability guidelines |
