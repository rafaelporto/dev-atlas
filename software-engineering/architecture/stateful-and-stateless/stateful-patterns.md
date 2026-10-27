---
type: concept
tags:
  - architecture
  - concept
  - backend
  - comparison
related:
  - software-engineering/architecture/stateful-and-stateless/overview
  - software-engineering/architecture/stateful-and-stateless/actor-model
  - software-engineering/architecture/event-sourcing
  - software-engineering/messaging/brokers/kafka
  - software-engineering/communication-protocols/http/websocket
language: null
---
# Stateful Architecture Patterns

> Beyond actors, a handful of patterns decide where state lives and who owns it — from pushing it out to a store to pinning it to one owner per key.

---

## What is it?

A catalogue of the recurring ways services handle state that outlives a request. Some keep the service stateless by moving the state out; others make the service stateful on purpose and add the machinery that keeps that safe. The [Actor Model](actor-model.md) is one of them; this article covers the rest and how they compare.

---

## Why does it matter?

Most state-related incidents come from an unspoken pattern choice rather than a bad one:

- Sessions kept in process memory vanish on every deploy — an accidental "stateful, no persistence" design.
- Two replicas update the same entity and one write silently wins — an accidental "many writers, no coordination" design.
- A multi-step process (payment, provisioning) is half done when a pod restarts, and nothing knows how to resume it.

Naming the pattern makes its failure mode explicit and tells you which tool already solves it.

---

## How it works

### 1. Externalized state

```
 replica ─┐
 replica ─┼──▶ Redis / database   (single source of truth)
 replica ─┘
```

Processes hold nothing between requests; every read and write goes to a shared store. It is the default for web APIs and the precondition for serverless.

- **Trade-off:** a network round trip per access, and concurrent writers need the store's concurrency control (transactions, compare-and-set, optimistic versioning).

### 2. Session affinity (sticky sessions)

```
 client X ──▶ load balancer ──(cookie / IP hash)──▶ replica 2 (has X's session in memory)
```

The load balancer routes each client to the same replica, so per-client data can stay in that replica's memory.

- **Trade-off:** affinity is best effort. When the replica dies, scales in, or is redeployed, the client lands elsewhere with no state. Affinity is safe for caches and for connection protocols that need it (Socket.IO's long-polling handshake), not as the only copy of anything important. It also skews load when some clients are much heavier than others.

### 3. Partitioned single-writer ownership

```
 key ──▶ hash(key) ──▶ owner node        consistent hashing ring / partition table
 cart:42 → B, cart:77 → A, cart:91 → B   exactly one writer per key at a time
```

Each key is owned by exactly one node, which keeps it in memory and is its only writer. Ownership is assigned by consistent hashing, by a partition table in a coordinator, or by a broker — Kafka assigns each partition to one consumer in a group, so all events for a key are processed by one consumer, in order.

- **Trade-off:** you need membership (who is alive), rebalancing (what moves when a node joins or leaves), and handoff (flush state before the new owner starts). Cluster sharding in Akka/Pekko and Akka.NET, and virtual actor runtimes, package exactly this.

### 4. Durable execution (workflows)

```
 workflow run #123:  step1 ✓ ──▶ step2 ✓ ──▶ step3 (crash) ··· restart ··· step3 ✓ ──▶ step4
                     each completed step recorded in an event history; replay skips them
```

The state of a long-running process — which steps are done, their results, timers — is persisted by the runtime after every step. After a crash, the run is replayed from its history and continues where it stopped. Code looks sequential (`await charge(); await ship();`) but survives restarts and can sleep for days.

- **Tools:** Temporal, Restate, Azure Durable Functions / Durable Task, Dapr Workflow.
- **Trade-off:** workflow code must be deterministic (no direct clock, random, or I/O — those go in activities), and changing a running workflow's code needs versioning.

### 5. Stateful stream processing

```
 events ──▶ [ operator with local state (RocksDB / memory) ] ──▶ results
                         │ periodic checkpoint
                         ▼
                  durable storage / changelog topic
```

Aggregations, joins, and windows over event streams keep their state next to the computation, partitioned by key, and checkpoint it so a failed task restores and resumes with exactly-once semantics on the output.

- **Tools:** Apache Flink (keyed state, checkpoints), Kafka Streams (state stores backed by changelog topics).
- **Trade-off:** state size drives recovery time; changing the partitioning or state schema of a running job needs a migration plan.

### 6. Event sourcing

State is not stored as a current value but derived by replaying an append-only log of events. It pairs naturally with stateful owners: an actor or partition owner replays its events on activation and appends new ones as it handles commands. See [Event Sourcing](../event-sourcing.md).

### 7. Stateful connection gateway

```
 clients ══ WebSocket ══▶ gateway replica 1 ─┐
 clients ══ WebSocket ══▶ gateway replica 2 ─┼── pub/sub (Redis, NATS) ── backend services
 clients ══ WebSocket ══▶ gateway replica 3 ─┘
```

A long-lived connection is state that cannot move: it lives on the replica that accepted it. Gateways keep a registry of which connections they hold and use a pub/sub backbone so a message for user X reaches whichever replica holds X's socket. See [WebSocket](../../communication-protocols/http/websocket.md).

- **Trade-off:** deploys disconnect clients (they must reconnect and resync), and load is uneven because connections do not rebalance on their own.

### Comparison

| Pattern | Where the state lives | Consistency per entity | Operational cost | Typical tools |
|---|---|---|---|---|
| Externalized state | Shared store | Store's guarantees | Low | Redis, PostgreSQL, DynamoDB |
| Sticky sessions | Replica memory (best effort) | None after failover | Low | Load balancer affinity |
| Partitioned ownership | Owner's memory + storage | Single writer | High | Consistent hashing, Kafka partitions, cluster sharding |
| Actors | Actor's memory + storage | Single writer | Medium–high (runtime does the work) | Orleans, Akka, Dapr Actors |
| Durable execution | Runtime's event history | Exactly-once step completion | Medium (run the engine or buy it) | Temporal, Restate, Durable Functions |
| Stateful streams | Operator-local, checkpointed | Exactly-once on output | High | Flink, Kafka Streams |
| Connection gateway | Replica holding the socket | Per connection | Medium | WebSocket servers + Redis/NATS pub/sub |

---

## Examples

**Routing by key with consistent hashing** (pseudo-code):

```
ring = ConsistentHashRing(virtualNodesPerNode = 100)
ring.add("node-a"); ring.add("node-b"); ring.add("node-c")

handle request(key, command):
    owner = ring.ownerOf(key)
    if owner == self:
        return localOwners.getOrActivate(key).handle(command)
    else:
        return forward(owner, key, command)

on membership change(nodes):
    ring.rebuild(nodes)
    for key in localOwners.keys() where ring.ownerOf(key) != self:
        localOwners[key].persist(); localOwners.remove(key)   // hand off
```

Adding a fourth node moves roughly a quarter of the keys, not all of them — the reason for a ring instead of `hash(key) % N`.

**Durable workflow with retries** (pseudo-code):

```
workflow ProvisionAccount(customerId):
    accountId = activity CreateAccount(customerId)          // result recorded in history
    activity SendWelcomeMessage(customerId)  retry(max = 5, backoff = exponential)
    sleep(7 days)                                            // durable timer: survives restarts
    if not activity HasLoggedIn(accountId):
        activity SendReminder(customerId)
```

If the worker restarts during the seven-day sleep, the runtime replays the history — `CreateAccount` and the welcome message are not executed again — and resumes the timer.

---

## When to use

- **Externalized state** — the default for request/response services and anything that must autoscale or run serverless.
- **Sticky sessions** — to keep a cache warm, or when a protocol requires it (long-polling handshakes); never as the only copy of important data.
- **Partitioned ownership** — high write rates per key, ordered processing per key, or hot state too expensive to fetch on every request.
- **Actors** — many entities with independent lifecycles, when you want the ownership machinery provided by a runtime.
- **Durable execution** — multi-step processes spanning services, minutes to months, that must survive crashes: orders, provisioning, onboarding, sagas.
- **Stateful streams** — continuous aggregations, windows, and joins over event streams.
- **Connection gateway** — real-time push to many clients over persistent connections.

---

## When NOT to use

- **Externalized state** when the store becomes the bottleneck for one hot key, or round-trip latency dominates — move that entity to an owner.
- **Sticky sessions** as a substitute for persistence; or with very uneven per-client load.
- **Partitioned ownership** built by hand when an actor runtime, cluster sharding, or the broker's partitioning already gives it to you.
- **Durable execution** for short request/response work, or for high-frequency per-entity state (it records every step; it is not an in-memory store).
- **Stateful streams** for request-driven lookups — use a database or a materialised view fed by the stream.
- **Connection gateway** when polling or [Server-Sent Events](../../communication-protocols/http/sse.md) through a stateless API would do.

---

## References

- Martin Kleppmann, *Designing Data-Intensive Applications* (O'Reilly, 2017) — chapter 6 (Partitioning) and chapter 11 (Stream Processing).
- [Temporal documentation — Workflows and event history](https://docs.temporal.io/workflows)
- [Apache Flink — Stateful Stream Processing](https://nightlies.apache.org/flink/flink-docs-stable/docs/concepts/stateful-stream-processing/)
- [Apache Kafka — Kafka Streams architecture: state](https://kafka.apache.org/documentation/streams/architecture)
- [Akka — Cluster Sharding](https://doc.akka.io/libraries/akka-core/current/typed/cluster-sharding.html)
