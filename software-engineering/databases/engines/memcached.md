---
type: concept
tags:
  - database
  - backend
related:
  - software-engineering/databases/types/in-memory
  - software-engineering/databases/engines/redis
language: null
---
# Memcached

> The minimal, multi-threaded memory cache: opaque blobs keyed by string, no data structures, no persistence — and that narrowness is the whole design.

---

## What is it?

Memcached is an in-memory key-value cache. You `set` a value under a key, you `get` it back, it expires when you say so. The value is an **opaque blob** — Memcached never looks inside it. There are no lists, no sets, no sorted sets, no pub/sub, and no persistence: restart the process and the cache is empty.

Where [Redis](redis.md) is a Swiss-army knife, Memcached is a single very sharp blade. It is **multi-threaded**, so it scales across CPU cores on one box, and it uses a **slab allocator** with LRU eviction to manage memory predictably. It has no native clustering — sharding across nodes is done **client-side** via consistent hashing. Memcached is open-source under a BSD license and is mature and stable to the point of being boring, which for a cache is a virtue.

## Why does it matter?

Memcached predates Redis and powered the early scale-out era of the web (famously at Facebook, LiveJournal, Wikipedia). It still runs at enormous scale precisely because it does one thing and gets out of the way: caching small, hot values with almost no operational surface.

Its niche is **pure caching under high concurrency**. Because execution is multi-threaded and the feature set is tiny, a single node saturates many cores serving simple `get`/`set` traffic. When you genuinely only need a volatile look-aside cache — and not queues, structures, or durability — Memcached's simplicity is an asset, not a limitation.

## How it works

```
        ┌─────────────────────────────────────────────┐
        │                 Clients                      │
        │   (consistent hashing picks the node)        │
        └─────────────────────────────────────────────┘
            │                │                │
            ▼                ▼                ▼
      ┌──────────┐     ┌──────────┐     ┌──────────┐
      │ node 1   │     │ node 2   │     │ node 3   │
      │ (multi-  │     │          │     │          │
      │  thread) │     │          │     │          │
      │ slab LRU │     │ slab LRU │     │ slab LRU │
      └──────────┘     └──────────┘     └──────────┘
       nodes share nothing; each is an independent RAM cache
```

- **Multi-threaded**: worker threads serve requests in parallel, scaling with cores — the opposite of Redis's single-threaded model.
- **Slab allocator**: memory is carved into fixed-size chunks grouped into "slab classes". This avoids fragmentation but can waste space when item sizes don't fit a class neatly.
- **LRU eviction**: when memory is full, the least-recently-used items are discarded. There is no persistence — eviction and restart both simply lose data.
- **No native cluster**: each node is independent and unaware of the others. The **client library** hashes the key to choose a node (consistent hashing minimizes reshuffling when nodes are added or removed).

## Examples

Classic look-aside cache with the text protocol:

```
set   user:42 0 300 12      # key, flags, TTL(s)=300, byte-length=12
Ada Lovelace                # the 12-byte value
STORED

get   user:42
VALUE user:42 0 12
Ada Lovelace
END
```

Atomic counter and delete:

```
set  visits:home 0 0 1
1
incr visits:home 1          # → 2
delete visits:home
```

Cache-aside flow (pseudocode):

```
value = memcached.get("user:42")
if value is null:
    value = db.query("... user 42 ...")   # source of truth
    memcached.set("user:42", value, ttl=300)
return value
```

## When to use

- **Simple, volatile look-aside caching** — the canonical use case: cache query results or rendered fragments keyed by input.
- **High-concurrency workloads on multi-core hosts** — the multi-threaded model saturates cores serving `get`/`set`.
- **When you want minimal operational surface** — nothing to snapshot, replicate, or fail over; a node that dies just rewarms.
- **Large fleets of independent cache nodes** — client-side sharding scales horizontally without cluster coordination.

## When NOT to use

- **You need data structures** (lists, sets, sorted sets, counters as first-class, pub/sub) — use [Redis](redis.md).
- **You need persistence or replication** — Memcached has neither; a restart or node loss empties that shard.
- **The value is large or partially mutated** — you must rewrite the entire blob to change any part of it.
- **You need querying beyond key lookup** — like any [key-value store](../types/key-value.md), there are no secondary indexes.
- **You want server-side atomic operations across keys** — Memcached offers only per-key atomicity on a narrow command set.

## References

- [Memcached Wiki](https://github.com/memcached/memcached/wiki)
- [Memcached — official site](https://memcached.org/)
- [AWS — *Redis vs Memcached*](https://aws.amazon.com/elasticache/redis-vs-memcached/)
