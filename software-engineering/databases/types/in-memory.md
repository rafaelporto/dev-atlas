# In-Memory Databases

> The data lives in RAM, not on disk. Reads and writes happen in microseconds. Disk, when used at all, is for durability — not for serving queries.

---

## What is it?

An in-memory database (IMDB) keeps its entire working set in main memory. Reads and writes hit RAM, not a B-tree on a spinning or solid-state disk. Some in-memory engines do persist to disk asynchronously — through snapshots, append-only logs, or both — but disk is a recovery mechanism, not the path that serves queries.

The category spans several different shapes:

- **In-memory key-value stores**: Redis, Memcached, KeyDB. Used overwhelmingly as caches and ephemeral state.
- **In-memory data grids**: Hazelcast, Apache Ignite, Oracle Coherence. Distributed RAM with richer query and compute primitives.
- **In-memory relational engines**: VoltDB, MemSQL/SingleStore (rowstore mode), SAP HANA. Full SQL and ACID, executed in RAM.
- **In-memory analytical engines**: kdb+, columnar in-memory data stores used in finance and high-frequency analytics.

The shared trait is latency measured in **microseconds**, not milliseconds.

## Why does it matter?

Disk access is roughly 100,000× slower than RAM. The moment your hot working set fits in memory, removing the disk from the read path delivers latency reductions that no other optimization can match.

In-memory databases solve three problems:

- **Sub-millisecond latency at scale** — cache hits, session lookups, leaderboards, rate-limit counters. Anything that has to answer "yes/no/value" in single-digit microseconds.
- **Microsecond response under high concurrency** — single-threaded, in-RAM engines like Redis happily serve hundreds of thousands of operations per second from one core.
- **Real-time analytics on live data** — in-memory analytics engines aggregate over millions of rows per second, useful in financial trading, fraud detection, and real-time dashboards.

The trade-off is brutal: RAM costs orders of magnitude more per gigabyte than disk, and a process restart on a non-persistent IMDB loses everything. Durability and capacity become deliberate design choices, not free defaults.

## How it works

```
┌─────────────────────────────────────────────────────────────┐
│                       Application                            │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  In-Memory Database (Redis-like)                             │
│                                                              │
│   ┌────────────────────────────────────────────────────┐    │
│   │  Hash table  /  Skip list  /  Sorted set  ...      │    │
│   │  (all in RAM, native CPU pointers)                  │    │
│   └────────────────────────────────────────────────────┘    │
│              │                              │                │
│      reads/writes                           ▼                │
│              │                  ┌────────────────────┐       │
│              │                  │ Optional disk      │       │
│              ▼                  │ persistence:       │       │
│        microseconds             │  - RDB snapshots   │       │
│                                 │  - AOF append log  │       │
│                                 └────────────────────┘       │
│                                          │                   │
│                                          ▼                   │
│                                  Recovery on restart         │
└─────────────────────────────────────────────────────────────┘
```

Key mechanisms:

- **Data structures are CPU-native**. The hash table you'd build with malloc in C, but exposed over a network protocol.
- **Persistence is a side concern**. Redis offers RDB (point-in-time snapshots), AOF (append-only command log), or both. The serving path never reads them.
- **Single-threaded execution** is common (Redis, KeyDB partially) because lock-free in-RAM operations are so fast that adding threads adds more contention than throughput. Modern variants (KeyDB, Dragonfly) revisit this and use multi-threading.
- **Replication for capacity, not just durability**: in-memory data grids partition the keyspace across many nodes, holding much more than fits on one box.

## Examples

Atomic increment as a rate-limit counter — the kind of operation in-memory databases excel at:

```
INCR rate_limit:user:42:2026-05-15      # → 1
INCR rate_limit:user:42:2026-05-15      # → 2
EXPIRE rate_limit:user:42:2026-05-15 86400
```

Cache-aside in pseudo-SQL plus Redis commands — the most common production pattern for IMDBs:

```
1. GET  cache:user:42                    # try the cache first
2. on miss:
      SELECT * FROM users WHERE id = 42; # hit the source of truth
      SET cache:user:42 <payload> EX 300 # populate cache, 5 min TTL
3. return result
```

A simple sorted-set leaderboard, sub-millisecond globally:

```
ZADD leaderboard 1500 "alice"
ZADD leaderboard 1820 "bob"
ZADD leaderboard 1640 "carol"

ZREVRANGE leaderboard 0 9 WITHSCORES   # top 10 with scores
```

In-memory relational engines look like regular SQL to the user; the difference is invisible in the query — and very visible in the latency.

## When to use

- **Caching** — the single most common reason. Application-side caches sit in front of slower stores.
- **Session storage, feature flags, rate limits, counters** — small, hot, ephemeral state.
- **Real-time leaderboards and ranking** — Redis sorted sets are practically purpose-built for this.
- **Pub/sub, queues, streaming buffers** — many IMDBs include these as native data structures.
- **Latency-sensitive transactional workloads** that fit in RAM and can tolerate the cost: financial order-matching engines, ad-bidding, real-time recommendations.
- **Real-time analytics** when the dataset is hot enough that disk-based [OLAP](olap-columnar.md) cannot keep up.

## When NOT to use

- **The dataset is much larger than your RAM budget**: RAM is expensive. Disk-based stores cost orders of magnitude less per gigabyte.
- **Durability is critical and you cannot tolerate a few seconds of data loss**: most in-memory engines lose recent writes on failure if you use only the fast persistence options. Hardening durability removes most of the speed advantage.
- **You need rich querying**: most in-memory KV stores have minimal query capabilities. Use a [relational](relational.md) or [document](document.md) database.
- **The access pattern is not actually hot**: putting cold data in an in-memory cache wastes money. Profile first.
- **A traditional database with enough cache works fine**: PostgreSQL with a generous `shared_buffers` already serves most warm queries from RAM. Don't add a Redis next to it unless you have a measured reason.

## References

- [Redis Documentation — *Memory optimization* and *Persistence*](https://redis.io/docs/management/)
- [*The Case for Determinism in Database Systems* (VoltDB origins)](http://cs-www.cs.yale.edu/homes/dna/papers/abadipodc08.pdf)
- [Memcached Wiki](https://github.com/memcached/memcached/wiki)
- [*Designing Data-Intensive Applications*, Martin Kleppmann](https://dataintensive.net/) — Chapter 3 on in-memory storage
