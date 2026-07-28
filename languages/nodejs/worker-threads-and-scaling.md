---
type: concept
tags:
  - language
  - nodejs
  - backend
  - concurrency
  - concept
related:
  - languages/nodejs/event-loop-and-timers
  - languages/nodejs/architecture
  - languages/nodejs/deploy
language: "nodejs"
---
# Worker Threads and Scaling

> Node scales across CPU cores with the cluster module or a process manager for I/O-bound work, and with worker threads for CPU-bound work that would otherwise block the event loop.

---

## What is it?

A single Node process uses one main thread. To use multiple CPU cores you either run **multiple processes** (the `cluster` module, or a manager like PM2, or multiple containers behind a load balancer) or spawn **worker threads** (`node:worker_threads`) within one process for CPU-bound tasks. `child_process` runs separate programs entirely.

---

## Why does it matter?

Because CPU-bound work blocks the event loop and stalls all requests, and because one process can't saturate a multi-core machine, scaling is a core operational concern. Picking the right mechanism — processes for I/O concurrency, threads for CPU offload — is the difference between a responsive service and one that times out under load.

---

## How it works

### The decision

```
Is the bottleneck CPU or I/O?
├── I/O-bound (most web APIs)      → more processes / instances (cluster, PM2, containers)
└── CPU-bound (hashing, parsing,   → worker_threads to offload; keep the main loop free
    image/video, compression)
```

### Cluster (multiple processes, shared port)

```javascript
import cluster from "node:cluster";
import { availableParallelism } from "node:os";

if (cluster.isPrimary) {
  for (let i = 0; i < availableParallelism(); i++) cluster.fork();
  cluster.on("exit", () => cluster.fork()); // restart crashed workers
} else {
  startServer(); // each worker runs the app; OS load-balances connections
}
```

In containerized deployments, running **one process per container** and scaling containers is often simpler than in-process clustering — let the orchestrator handle it.

### Worker threads (CPU offload)

```javascript
import { Worker } from "node:worker_threads";

function runHeavy(data) {
  return new Promise((resolve, reject) => {
    const worker = new Worker("./heavy-worker.js", { workerData: data });
    worker.once("message", resolve);
    worker.once("error", reject);
  });
}
```

```javascript
// heavy-worker.js
import { parentPort, workerData } from "node:worker_threads";
parentPort.postMessage(expensiveComputation(workerData)); // runs off the main thread
```

Threads communicate by message passing (data is copied) or via `SharedArrayBuffer` (shared memory). For repeated tasks, use a **worker pool** rather than spawning per request (spawning has overhead).

### child_process

Run external commands or separate scripts, with output as streams.

```javascript
import { execFile } from "node:child_process";
```

---

## Examples

```javascript
// A tiny worker pool sketch: reuse workers instead of spawning per task
class Pool {
  #idle = [];
  constructor(size, file) {
    for (let i = 0; i < size; i++) this.#idle.push(new Worker(file));
  }
  run(data) {
    const worker = this.#idle.pop() ?? new Worker(this.file);
    return new Promise((res) => {
      worker.once("message", (r) => { this.#idle.push(worker); res(r); });
      worker.postMessage(data);
    });
  }
}
```

---

## When to use

- Use **more processes / instances** (cluster, PM2, or container replicas) to scale I/O-bound services across cores.
- Use **worker threads** to offload CPU-bound work and keep the event loop responsive; pool them for repeated tasks.
- Use **`child_process`** to run external programs or isolate untrusted/heavy scripts.
- In Kubernetes/containers, prefer scaling replicas over in-process clustering for simplicity.

## When NOT to use

- Do not use worker threads for I/O-bound work — the async event loop already handles concurrency; threads add overhead.
- Do not spawn a new worker/process per request — the startup cost dominates; use a pool.
- Do not share mutable state across workers except via message passing or `SharedArrayBuffer` — memory is not shared by default.
- Do not assume clustering gives fault isolation for CPU spikes — a blocked worker still can't serve its connections.

---

## References

- [Node.js — Worker threads](https://nodejs.org/api/worker_threads.html)
- [Node.js — Cluster](https://nodejs.org/api/cluster.html)
- [Node.js — Child process](https://nodejs.org/api/child_process.html)
- [Node.js — Don't Block the Event Loop](https://nodejs.org/en/learn/asynchronous-work/dont-block-the-event-loop)
