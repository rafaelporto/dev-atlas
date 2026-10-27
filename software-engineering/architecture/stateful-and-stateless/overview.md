---
type: concept
tags:
  - architecture
  - concept
  - overview
  - comparison
  - decision-support
  - backend
related:
  - software-engineering/architecture/stateful-and-stateless/actor-model
  - software-engineering/architecture/stateful-and-stateless/stateful-patterns
  - software-engineering/architecture/microservices
  - software-engineering/communication-protocols/http/websocket
  - devops/concepts/deployment-strategies
language: null
---
# Stateless vs Stateful Architectures

> A stateless service forgets everything between requests; a stateful one remembers — and that single choice decides how it scales, fails, and deploys.

---

## What is it?

A **stateless** service treats every request as if it were the first one it has ever seen: everything it needs arrives with the request or is fetched from somewhere else, and nothing it learned is kept in its own memory afterwards. A **stateful** service keeps information in its own memory (or local disk) between requests and uses it to answer the next one.

"State" here means data that outlives a single request. It comes in four kinds, and a service can be stateless for one and stateful for another:

| Kind | Example | Lifetime |
|---|---|---|
| **Request** | Parsed body, current user | One request — every service has it; it does not count |
| **Session** | Login session, shopping cart, wizard step | Minutes to hours, per client |
| **Connection** | An open WebSocket, a game client's socket | As long as the connection lives |
| **Domain / entity** | Account balance, device twin, game room | Indefinite, per entity |

The question is never "does the system have state?" — every useful system does. The question is **where the state lives**: in the service process that handles the request, or in a separate store the process talks to.

> **Not the same as stateless/stateful components.** In UI frameworks the same words describe *components*, not services: Flutter's [`StatelessWidget` and `StatefulWidget`](../../../languages/dart/frameworks/flutter/stateless-vs-stateful.md), React's [state and events](../../../languages/javascript-typescript/frameworks/react/state-and-events.md), and the [presentational vs container](../frontend/component-driven-architecture.md) split. A client application is always stateful at the architectural level; this section is about server-side services.

---

## Why does it matter?

Where state lives decides most of a service's operational behaviour:

- **Horizontal scaling.** Identical stateless replicas behind a load balancer scale by adding replicas. A stateful replica cannot simply be cloned — the new one does not have the state.
- **Failover.** When a stateless replica dies, another one serves the retry. When a stateful replica dies, its in-memory state dies with it unless it was persisted or replicated.
- **Latency.** Stateful wins here: state in local memory is read in nanoseconds; state in Redis or a database costs a network round trip on every request.
- **Deploys.** Rolling updates assume any replica can be stopped at any time. A stateful replica must hand off or persist its state first, or its clients lose sessions mid-deploy.
- **Contention.** Many stateless replicas writing the same database row need locks or optimistic concurrency. A single stateful owner of that entity serialises writes for free.

The industry default — "stateless compute, external state", codified as factor VI of the [Twelve-Factor App](https://12factor.net/processes) — exists because it makes the first, second, and fourth points easy, at the price of the third and fifth.

---

## How it works

### The two shapes

```
Stateless: any replica, state is fetched           Stateful: routed to the owner, state is local

            ┌──────────────┐                                  ┌──────────────┐
 client ──▶ │ load balancer│                       client ──▶ │ router (key) │
            └──────┬───────┘                                  └──────┬───────┘
         ┌─────────┼─────────┐                        cart:42 ──────┘│└────── cart:77
         ▼         ▼         ▼                                ▼      │      ▼
     ┌──────┐  ┌──────┐  ┌──────┐                         ┌──────┐   │  ┌──────┐
     │ app  │  │ app  │  │ app  │                         │node A│   │  │node B│
     └──┬───┘  └──┬───┘  └──┬───┘                         │cart42│   │  │cart77│
        └─────────┼─────────┘                             │(mem) │   │  │(mem) │
                  ▼                                        └──┬───┘   │  └──┬───┘
           ┌─────────────┐                                    └─── persist ──┘
           │ Redis / DB  │  ◀── every request                       ▼ (async / on change)
           └─────────────┘                                   ┌─────────────┐
                                                             │   storage   │
                                                             └─────────────┘
```

On the left, every replica can serve every request, and the store is the single source of truth. On the right, each piece of state has exactly one owner at a time, requests are routed to that owner, and storage is a durability backstop rather than the hot path.

### The spectrum

Real systems sit somewhere between the two extremes:

```
 stateless ────────────────────────────────────────────────────────────▶ stateful

 externalized    sticky sessions    partitioned single-    actors /
 state           (affinity, best    writer ownership       virtual actors
 (Redis, DB)     effort)            (hash → owner)         (runtime-managed owners)
```

1. **Externalized state** — the process is stateless; state lives in a shared store.
2. **Sticky sessions** — the load balancer prefers the same replica per client, so a local cache is usually warm. The state is still lost if the replica dies, so it must be reconstructible.
3. **Partitioned ownership** — each key has exactly one owner, chosen by hashing or by partition assignment; the owner keeps the state hot and is the only writer.
4. **Actors** — the same idea, with a runtime that creates, places, supervises, moves, and persists the owners for you. See [Actor Model](actor-model.md).

[Stateful Patterns](stateful-patterns.md) covers each rung in detail, plus durable execution and stateful stream processing.

### Trade-offs

| Concern | Stateless | Stateful |
|---|---|---|
| Scaling out | Add replicas; trivial | Rebalance ownership; needs routing and handoff |
| Replica failure | Retry elsewhere; no loss | Lost unless persisted or replicated; recovery time |
| Read latency | Network round trip per access | Local memory |
| Write contention | Locks or optimistic concurrency in the store | Single writer per entity; no locks |
| Consistency | Whatever the store guarantees | Strong per entity (one owner); cross-entity is hard |
| Deploys | Rolling update, any order | Drain, persist, hand off; slower |
| Operational complexity | Low (the store carries it) | High: membership, placement, rebalancing |
| Cost driver | Store throughput and round trips | Memory per node, cluster coordination |

---

## Examples

A shopping cart, built both ways (pseudo-code).

**Stateless** — every request loads and saves the cart:

```
handle POST /cart/{userId}/items (item):
    cart = store.get("cart:" + userId) or emptyCart()
    cart.add(item)
    store.set("cart:" + userId, cart, ttl = 2h)
    return cart
```

Any replica can run this. Two concurrent requests for the same user race on `get`/`set` — a lost update unless the store offers compare-and-set or a transaction.

**Stateful** — the request is routed to the cart's owner, which keeps it in memory:

```
router.handle POST /cart/{userId}/items (item):
    owner = ownerOf("cart:" + userId)        // hash ring, partition map, or actor runtime
    return owner.send(AddItem(item))

CartOwner(userId):                            // one instance per userId, one message at a time
    cart = storage.load(userId) or emptyCart()   // on activation
    on AddItem(item):
        cart.add(item)                        // no race: messages are processed one by one
        storage.saveAsync(userId, cart)       // durability, off the hot path
        reply cart
    on idle(30m):
        storage.save(userId, cart); deactivate
```

The stateful version reads from memory and needs no locks, but it needs something to compute `ownerOf`, to recreate the owner on another node when this one dies, and to decide what happens to a write that was in flight at that moment.

---

## When to use

**Stateless (the default):**

- Request/response APIs where each request is independent or the state fits naturally in a database.
- Workloads with bursty traffic that need fast autoscaling, including serverless functions.
- Teams that want the simplest operations: rolling deploys, any-replica retries, no cluster membership.
- When the store's latency is acceptable for every access the service makes.

**Stateful:**

- Many independent entities with frequent reads and writes per entity — game rooms, IoT device twins, carts, chat sessions, collaborative documents.
- Hot state where a store round trip per access is too slow or too expensive at the required throughput.
- Long-lived connections (WebSocket, MQTT, game sockets) — the connection itself is state.
- Write-heavy entities that suffer from lock contention in a shared database.
- Long-running processes whose progress must survive crashes — then reach for durable execution rather than hand-rolled state.

---

## When NOT to use

**Stateless is a poor fit when:**

- Every request re-reads the same large state from the store, and that round trip dominates latency or cost.
- Concurrent writers to the same entity fight over locks, and the "fix" is ever more elaborate retry logic.
- The service holds connections that cannot be moved — pretending it is stateless leads to broken broadcasts and dropped clients.

**Stateful is a poor fit when:**

- The data is plain CRUD that a database already handles well — stateful owners add a cluster to operate for no gain.
- Queries span many entities ("all carts with item X") — owners are optimised for per-entity access, not for scans; keep a database or read model for that.
- The team has no experience with routing, rebalancing, and failure handling — the first node loss will lose data.
- State is kept in process memory "temporarily" as a cache that silently becomes the source of truth. This is the most common accidental stateful service: it works with one replica and breaks the day a second one is added.

---

## References

- [The Twelve-Factor App — VI. Processes](https://12factor.net/processes)
- Martin Kleppmann, *Designing Data-Intensive Applications* (O'Reilly, 2017) — chapters on replication, partitioning, and stream processing.
- [Microsoft Azure Architecture Center — Stateful vs stateless services (Service Fabric)](https://learn.microsoft.com/en-us/azure/service-fabric/service-fabric-reliable-services-introduction)
