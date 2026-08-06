---
type: concept
tags:
  - database
  - backend
related:
  - software-engineering/databases/types/in-memory
  - software-engineering/databases/types/key-value
  - software-engineering/databases/engines/memcached
  - software-engineering/databases/engines/database-popularity
language: null
---
# Redis

> An in-memory data-structure store used as a cache, message broker, and lightweight database — the default answer when you need something in front of a slower store.

---

## What is it?

Redis (REmote DIctionary Server) is an in-memory key-value store where the value is not opaque: alongside plain strings it natively understands **hashes, lists, sets, sorted sets, streams, bitmaps, and HyperLogLogs**, each with its own set of atomic commands. That is the feature that separates it from a plain cache — you manipulate the data structure on the server, not just store and retrieve blobs.

Everything lives in RAM. Disk is used only for durability (snapshots and/or an append-only log), never on the read path. A single Redis process is famously **single-threaded** for command execution, which makes every individual operation atomic without locks.

Redis is open-source, but its licensing has churned: it moved from BSD to the source-available RSALv2/SSPLv1 (2024) and then back to permissive AGPLv3 (2025). That turbulence spawned drop-in forks worth knowing:

- **Valkey** — the Linux Foundation fork created after the 2024 license change; the community successor, BSD-licensed.
- **KeyDB** — a multi-threaded fork.
- **Dragonfly** — a from-scratch, multi-threaded, Redis-compatible reimplementation aimed at higher throughput per node.

## Why does it matter?

Redis is one of the most widely deployed databases in the world and has spent years at the top of the key-value category in the [DB-Engines ranking](database-popularity.md). It is the reflexive choice for a cache, and its rich data structures let it also serve as a rate limiter, session store, leaderboard, job queue, and pub/sub bus — replacing several purpose-built pieces of infrastructure with one.

The value is **latency and simplicity**: single-digit-microsecond operations, a tiny mental model (commands map directly to data structures), and client libraries for every language. When a relational query is too slow for a hot path, dropping a Redis cache in front of it is the lowest-effort fix that works.

## How it works

```
┌──────────────────────────────────────────────────────────┐
│                       Clients                             │
└──────────────────────────────────────────────────────────┘
             │ RESP protocol (TCP)
             ▼
┌──────────────────────────────────────────────────────────┐
│  Redis primary (single-threaded command loop)            │
│                                                          │
│   Keyspace ──▶ strings · hashes · lists · sets ·         │
│                sorted sets · streams  (all in RAM)       │
│                                                          │
│   Persistence (off the read path):                       │
│     • RDB  — periodic point-in-time snapshot             │
│     • AOF  — append-only log of write commands           │
└──────────────────────────────────────────────────────────┘
             │ async replication
      ┌──────┴───────┐
      ▼              ▼
 ┌─────────┐    ┌─────────┐
 │ replica │    │ replica │   (read scaling + failover)
 └─────────┘    └─────────┘
```

- **Single-threaded execution**: commands run one at a time on a single core, so each command is atomic. Lock-free in-RAM operations are fast enough that threading would add contention, not throughput. (I/O is partly threaded in modern versions; the forks above thread execution too.)
- **Persistence** is optional and off the serving path: **RDB** takes periodic snapshots; **AOF** logs every write for finer-grained recovery. You can run both, one, or neither.
- **Replication** is single-leader (primary → replicas), asynchronous by default. **Sentinel** provides automatic failover; **Redis Cluster** shards the keyspace across primaries using hash slots for horizontal scale.
- **Consistency** is therefore eventual across replicas, and a failover can lose the last few writes — a trade-off you accept for the speed.

## Examples

Cache-aside with a TTL — the most common production pattern:

```
GET  cache:user:42                 # try cache first
# on miss: read source of truth, then populate:
SET  cache:user:42 "<payload>" EX 300   # 5-minute TTL
```

Atomic rate-limit counter:

```
INCR   rate_limit:user:42:2026-08-05     # → 1, 2, 3 ...
EXPIRE rate_limit:user:42:2026-08-05 86400
```

Sorted-set leaderboard, ranked reads in log time:

```
ZADD     leaderboard 1500 "alice"
ZADD     leaderboard 1820 "bob"
ZREVRANGE leaderboard 0 9 WITHSCORES     # top 10 with scores
```

Pub/sub fan-out:

```
SUBSCRIBE notifications          # consumer blocks, waiting for messages
PUBLISH   notifications "hello"  # producer, in another connection
```

## When to use

- **Caching** — the dominant use case; sits in front of a relational or document store.
- **Session storage, feature flags, rate limits, counters** — small, hot, ephemeral state.
- **Leaderboards and ranking** — sorted sets are practically purpose-built for this.
- **Lightweight queues and streams** — lists (`LPUSH`/`BRPOP`) and Streams (`XADD`/consumer groups) for job processing.
- **Pub/sub and real-time messaging** — fan-out to many subscribers with low latency.
- **Distributed locks and coordination** — with care (see Redlock caveats).

## When NOT to use

- **The dataset is much larger than your RAM budget** — RAM is expensive; a disk-based store costs far less per gigabyte.
- **You cannot tolerate losing the last few writes** — async replication and default persistence can drop recent writes on failover. Hardening durability erodes the speed advantage; use a store built for it.
- **You need rich queries** — Redis retrieves by key, not by arbitrary predicate. Use a [relational](../types/relational.md) or [document](../types/document.md) database for that.
- **You need it as the single source of truth for critical data** — treat Redis as a derived, rebuildable layer unless you have deliberately engineered durability.
- **A traditional database's own cache already suffices** — don't bolt Redis onto a system whose warm queries already serve from `shared_buffers` without a measured reason.

## References

- [Redis Documentation](https://redis.io/docs/)
- [Redis data types](https://redis.io/docs/latest/develop/data-types/)
- [Valkey — the open-source fork](https://valkey.io/)
- [*Designing Data-Intensive Applications*, Martin Kleppmann](https://dataintensive.net/) — Chapter 3 on in-memory storage
