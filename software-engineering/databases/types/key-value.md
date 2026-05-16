# Key-Value Stores

> A hash map at internet scale: one value per key, retrieved in constant time. Anything beyond "lookup by key" is out of scope.

---

## What is it?

A key-value store is the simplest possible database. There is exactly one operation: given a **key**, get, set, or delete a **value**. The value is usually opaque to the database — it can be a string, a number, a JSON blob, or a binary chunk; the engine does not care what is inside.

Think of it as a `Map<K, V>` (or `dict`, or `HashMap`) that survives process restarts and is reachable over a network. There are no joins, no secondary queries (typically), no schema, no relationships. The simplicity is the point.

This category includes both **in-memory** stores (Redis, Memcached) and **on-disk** stores (DynamoDB, etcd, FoundationDB, RocksDB). Many of them support richer value types — Redis has lists, sets, sorted sets, streams, hashes — but the access path is still "you give me a key, I give you a value".

## Why does it matter?

Key-value stores solve three problems that anything more complex makes worse:

- **Constant-time access** — O(1) reads and writes, with no query planner overhead. A well-tuned key-value store delivers sub-millisecond latency.
- **Trivial horizontal scaling** — because the only access path is by key, the engine can partition the keyspace across any number of nodes by hashing the key. There is no cross-partition coordination to think about.
- **A minimum-surface contract** — there is almost nothing to misuse. No N+1 queries, no accidental table scans, no slow joins.

The price is that they only solve "lookup by key". Any other query pattern means either denormalizing into multiple keys or putting a different database next to it.

## How it works

A key-value store is built around two things:

```
            ┌─────────────────────────────────────────┐
            │              Client                      │
            └─────────────────────────────────────────┘
                            │
                  hash(key) % N
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
   ┌─────────┐         ┌─────────┐         ┌─────────┐
   │ Node 1  │         │ Node 2  │         │ Node 3  │
   │ (shard) │         │ (shard) │         │ (shard) │
   └─────────┘         └─────────┘         └─────────┘

   Each node holds its slice of the keyspace as a hash table
   (in memory or on disk via an LSM-tree).
```

- **Hash partitioning**: each key is mapped to a partition by hashing. Adding nodes triggers rebalancing (consistent hashing minimizes how much moves).
- **Storage**: in-memory stores use hash tables (and sometimes skip lists for sorted variants). Disk-backed stores typically use an **LSM-tree** ([indexing](../concepts/README.md)) so writes are fast and sequential.
- **No secondary index**: there is normally no way to ask "give me all keys whose value contains X". If you need that, you maintain the inverted mapping yourself by writing a second key.

Replication varies. Redis uses leader-follower; DynamoDB uses leaderless quorum writes; etcd uses Raft for strict consensus.

## Examples

Set, get, delete (Redis CLI syntax):

```
SET user:42:session "abc-123-xyz" EX 3600   # value expires in 1 hour
GET user:42:session                          # → "abc-123-xyz"
DEL user:42:session
```

A naming convention is how you simulate "tables" in a key-value world. Common patterns:

```
user:42                  → JSON blob of user 42
user:42:settings         → JSON blob of user 42's settings
session:abc-123          → user ID 42
rate_limit:42:2026-05-15 → integer counter, expires at end of day
```

Modeling a one-to-many relationship without joins — you maintain both sides:

```
SADD user:42:orders "order:1001"
SADD user:42:orders "order:1002"
SMEMBERS user:42:orders                      # → {"order:1001", "order:1002"}

SET   order:1001 '{"total": 4200, "items":[...]}'
SET   order:1002 '{"total":  900, "items":[...]}'
```

The application is now responsible for keeping `user:42:orders` and the individual `order:*` keys in sync.

## When to use

- **Caching** — the single most common use case. Cache the result of an expensive computation or query, keyed by its input.
- **Session storage** — short-lived state keyed by session ID.
- **Rate limiting and counters** — atomic increment operations are typically supported.
- **Service discovery and configuration** — etcd and Consul use the key-value model for distributed coordination.
- **Lookup-by-ID workloads at extreme scale**: DynamoDB and similar engines are built for hundreds of thousands of QPS with a single-digit-millisecond P99 latency.
- **Feature flags, leaderboards, ephemeral state** — small, fast, scoped reads.

## When NOT to use

- **You need to query by anything other than the key**: a [document](document.md) or [relational](relational.md) database supports secondary indexes natively; emulating them on top of a key-value store is brittle.
- **Multi-key transactions are critical**: most key-value stores offer only single-key atomicity. Some (FoundationDB, DynamoDB transactions) support multi-key, but at higher cost.
- **Complex relationships** between entities: you will end up maintaining your own join logic in the application, and it will be wrong.
- **Analytical queries** over the data — there is no way to scan and aggregate efficiently.
- **The value itself is large and frequently mutated in part**: most key-value stores require rewriting the whole value to change a piece of it.

## References

- [*Dynamo: Amazon's Highly Available Key-value Store* (2007)](https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf)
- [Redis Documentation](https://redis.io/docs/)
- [Amazon DynamoDB Developer Guide](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/)
- [*Designing Data-Intensive Applications*, Martin Kleppmann](https://dataintensive.net/) — Chapter 3 on storage engines (LSM-trees)
