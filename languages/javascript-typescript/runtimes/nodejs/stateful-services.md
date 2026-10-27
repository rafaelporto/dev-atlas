---
type: concept
tags:
  - language
  - nodejs
  - typescript
  - backend
related:
  - software-engineering/architecture/stateful-and-stateless/overview
  - software-engineering/architecture/stateful-and-stateless/actor-model
  - software-engineering/architecture/stateful-and-stateless/stateful-patterns
  - languages/javascript-typescript/runtimes/nodejs/worker-threads-and-scaling
  - languages/javascript-typescript/runtimes/nodejs/http-and-web-servers
  - software-engineering/communication-protocols/http/websocket
language: "nodejs"
---
# Stateless and Stateful Services in Node.js

> Node scales out by running more processes, so in-memory state silently breaks the moment you add a second one — keep it stateless by default and opt into state deliberately.

---

## What is it?

This article applies the [stateless vs stateful distinction](../../../../software-engineering/architecture/stateful-and-stateless/overview.md) to Node.js services. A Node process runs JavaScript on a single thread, so a service uses more than one CPU core by running more processes — the `cluster` module, PM2, or more container replicas (see [Worker Threads and Scaling](worker-threads-and-scaling.md)). Each process has its own memory. Anything kept in a module-level variable exists once per process, not once per service.

That makes stateless the de facto default in Node, and stateful a deliberate choice. The practical options:

1. **Stateless** — sessions, caches, and rate limits in Redis or a database.
2. **Stateful connections** — Socket.IO or raw WebSocket servers, with sticky sessions and a pub/sub adapter between processes.
3. **Actors** — Dapr Actors through its JavaScript SDK, or Cloudflare Durable Objects at the edge.
4. **Durable execution** — Temporal's TypeScript SDK for long-running processes.

---

## Why does it matter?

The classic Node failures are all the same bug — state in one process's memory, traffic spread over many:

- **`express-session` with the default `MemoryStore`** in production. The package itself warns that it leaks memory and is not meant for production; with two processes, users are logged out at random.
- **A module-level cache** (`const cache = new Map()`) that diverges between replicas, so two identical requests return different answers.
- **Socket.IO without sticky sessions.** Its HTTP long-polling transport sends several requests per session; if they reach different processes the handshake fails with `Session ID unknown`.
- **Socket.IO without an adapter.** `io.emit()` reaches only the clients connected to the current process.

---

## How it works

### 1. Stateless: external session and cache

Move every piece of cross-request data to a shared store. For sessions, `express-session` with `connect-redis`; for caches and rate limits, Redis directly (`redis` or `ioredis`). Any process can then serve any request, `cluster`/PM2/Kubernetes can add or kill processes freely, and a deploy loses nothing.

### 2. Stateful connections with Socket.IO

A WebSocket is state that lives in exactly one process. Running Socket.IO on several processes needs two things:

```
            sticky (cookie / IP hash, or @socket.io/sticky with cluster)
 clients ──────────────▶ process 1 ─┐
 clients ──────────────▶ process 2 ─┼──── Redis pub/sub (@socket.io/redis-adapter)
 clients ──────────────▶ process 3 ─┘     io.emit / io.to(room).emit reach every process
```

- **Sticky sessions**, so all requests of one Socket.IO session reach the same process: load balancer affinity (cookie or IP hash), or `@socket.io/sticky` when using the `cluster` module. Forcing `transports: ["websocket"]` on the client removes the need, at the cost of losing the long-polling fallback.
- **An adapter** (`@socket.io/redis-adapter`, or the Redis Streams / Postgres adapters) that relays broadcasts and room messages between processes.

### 3. Actors

There is no widely adopted in-process actor library for Node today (older ones such as `nact` are no longer actively released). Node services get actors from runtimes outside the process:

- **Dapr Actors** (`@dapr/dapr`): a Dapr sidecar hosts the virtual-actor runtime; your Node app registers actor classes that extend `AbstractActor`. Dapr guarantees one call at a time per actor ID, activates actors on demand, and persists state through the actor state manager. JavaScript actors are hosted over HTTP.
- **Cloudflare Durable Objects**: not Node — they run on the Cloudflare Workers runtime — but they are the most-used actor-like platform in the TypeScript ecosystem. Each object has a unique ID, exactly one live instance worldwide, single-threaded execution, and transactional storage attached to it.

See [Actor Model](../../../../software-engineering/architecture/stateful-and-stateless/actor-model.md) for the model itself.

### 4. Durable execution with Temporal

For multi-step processes — checkout, provisioning, onboarding — the state is "which steps are done". Temporal's TypeScript SDK lets you write the process as an ordinary `async` function; the Temporal service records each completed step and replays the function after a crash. Workflow code runs in a deterministic sandbox, so I/O goes in activities. See [Stateful Patterns](../../../../software-engineering/architecture/stateful-and-stateless/stateful-patterns.md).

---

## Examples

### Stateless sessions in Redis

```typescript
import express from "express";
import session from "express-session";
import { RedisStore } from "connect-redis";
import { createClient } from "redis";

const redis = createClient({ url: process.env.REDIS_URL });
await redis.connect();

const app = express();
app.use(
  session({
    store: new RedisStore({ client: redis, prefix: "sess:" }),
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: true, httpOnly: true, maxAge: 2 * 60 * 60 * 1000 },
  }),
);

app.post("/cart/items", express.json(), (req, res) => {
  req.session.cart = [...(req.session.cart ?? []), req.body];
  res.json(req.session.cart); // saved to Redis; any process can serve the next request
});
```

### Socket.IO across processes

```typescript
import { createServer } from "node:http";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";

const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();
await Promise.all([pubClient.connect(), subClient.connect()]);

const httpServer = createServer();
const io = new Server(httpServer, { adapter: createAdapter(pubClient, subClient) });

io.on("connection", (socket) => {
  socket.on("join", (room: string) => socket.join(room));
  socket.on("message", ({ room, text }: { room: string; text: string }) => {
    io.to(room).emit("message", text); // reaches members connected to any process
  });
});

httpServer.listen(3000);
```

The load balancer in front must keep each client on one process (cookie or IP-hash affinity), or the client must connect with `transports: ["websocket"]` only.

### A cart actor with Dapr

```typescript
import { AbstractActor, ActorId, ActorProxyBuilder, DaprClient, DaprServer } from "@dapr/dapr";

type Item = { sku: string; quantity: number };

interface ICartActor {
  addItem(item: Item): Promise<Item[]>;
  getItems(): Promise<Item[]>;
}

export class CartActor extends AbstractActor implements ICartActor {
  async addItem(item: Item): Promise<Item[]> {
    const state = this.getStateManager<Item[]>();
    const items = [...((await state.getState("items")) ?? []), item];
    await state.setState("items", items);
    await state.saveState();
    return items;
  }

  async getItems(): Promise<Item[]> {
    return (await this.getStateManager<Item[]>().getState("items")) ?? [];
  }
}

// Host: register the actor type with the sidecar.
const server = new DaprServer({ serverPort: "3000" });
await server.actor.init();
server.actor.registerActor(CartActor);
await server.start();

// Caller (any service): a typed proxy to one actor instance.
const client = new DaprClient();
const carts = new ActorProxyBuilder<ICartActor>(CartActor, client);
const cart = carts.build(new ActorId("user-42"));
await cart.addItem({ sku: "BOOK-1", quantity: 1 });
```

Two concurrent `addItem` calls for `user-42` are processed one after the other by the Dapr runtime, so neither overwrites the other.

### A cart as a Cloudflare Durable Object

```typescript
import { DurableObject } from "cloudflare:workers";

type Item = { sku: string; quantity: number };

export class Cart extends DurableObject {
  async addItem(item: Item): Promise<Item[]> {
    const items = (await this.ctx.storage.get<Item[]>("items")) ?? [];
    items.push(item);
    await this.ctx.storage.put("items", items);
    return items;
  }
}

export default {
  async fetch(request: Request, env: { CART: DurableObjectNamespace<Cart> }): Promise<Response> {
    const userId = new URL(request.url).searchParams.get("user")!;
    const cart = env.CART.get(env.CART.idFromName(userId)); // same ID → same single instance
    const items = await cart.addItem(await request.json());
    return Response.json(items);
  },
};
```

### A durable workflow with Temporal

```typescript
// workflows.ts — deterministic; runs in Temporal's sandbox
import { proxyActivities, sleep } from "@temporalio/workflow";
import type * as activities from "./activities";

const { createAccount, sendWelcome, hasLoggedIn, sendReminder } = proxyActivities<typeof activities>({
  startToCloseTimeout: "1 minute",
  retry: { maximumAttempts: 5 },
});

export async function provisionAccount(customerId: string): Promise<void> {
  const accountId = await createAccount(customerId);
  await sendWelcome(customerId);
  await sleep("7 days"); // durable timer: survives worker restarts and deploys
  if (!(await hasLoggedIn(accountId))) {
    await sendReminder(customerId);
  }
}
```

```typescript
// start.ts — start one run; the workflow ID makes it idempotent per customer
import { Client } from "@temporalio/client";
import { provisionAccount } from "./workflows";

const client = new Client();

export async function startProvisioning(customerId: string): Promise<void> {
  await client.workflow.start(provisionAccount, {
    taskQueue: "accounts",
    workflowId: `provision-${customerId}`,
    args: [customerId],
  });
}
```

---

## When to use

- **Stateless with Redis** — the default for HTTP APIs run under `cluster`, PM2, containers, or serverless.
- **Socket.IO with sticky sessions and an adapter** — real-time features (chat, notifications, live dashboards) across more than one process.
- **Dapr Actors** — many entities with per-entity state and concurrency (carts, devices, game rooms) when the platform already runs Dapr or the system is polyglot.
- **Durable Objects** — per-entity coordination at the edge: collaborative documents, rate limiters, chat rooms, multiplayer sessions on Cloudflare.
- **Temporal** — business processes that span services and minutes to months, and must resume after crashes.

---

## When NOT to use

- **Process memory as the source of truth** for anything that must survive a restart or be seen by another process — sessions, carts, counters. A module-level `Map` is a per-process cache at best.
- **`MemoryStore` for sessions** outside local development.
- **Sticky sessions as persistence** — when the process dies the session is gone; use them only for connection routing and warm caches.
- **Dapr Actors for one or two hot objects** — a Redis key with an atomic operation is simpler than a sidecar runtime.
- **Temporal for short request/response work** — the event history and worker add latency and infrastructure for nothing.
- **Durable Objects as a general database** — cross-object queries are not supported; keep a database for reporting and search.

---

## References

- [Socket.IO — Using multiple nodes](https://socket.io/docs/v4/using-multiple-nodes/)
- [Socket.IO — Redis adapter](https://socket.io/docs/v4/redis-adapter/)
- [express-session — Compatible session stores](https://github.com/expressjs/session#compatible-session-stores)
- [Dapr — JavaScript SDK actors](https://docs.dapr.io/developing-applications/sdks/js/js-actors/)
- [Cloudflare — Durable Objects](https://developers.cloudflare.com/durable-objects/)
- [Temporal — TypeScript SDK](https://docs.temporal.io/develop/typescript)
