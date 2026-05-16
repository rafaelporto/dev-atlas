# NewSQL

> Relational databases that scale horizontally without giving up SQL or ACID. The promise: Postgres ergonomics, Cassandra scale.

---

## What is it?

NewSQL is a generation of distributed relational databases — Google **Spanner**, **CockroachDB**, **TiDB**, **YugabyteDB**, and a few others — that deliver the traditional relational contract (SQL, schemas, secondary indexes, transactions, foreign keys, full ACID guarantees) on a cluster of machines that can be expanded horizontally.

The term was coined around 2011 to distinguish these systems from two earlier camps:

- **Traditional RDBMS** (PostgreSQL, MySQL, Oracle) — full SQL and ACID, but scale by getting a bigger machine or sharding manually.
- **NoSQL** ([wide-column](wide-column.md), [document](document.md), [key-value](key-value.md)) — scale horizontally trivially, but typically at the cost of weaker consistency, weaker transactions, or weaker query languages.

NewSQL is what you reach for when the answer "just use Postgres" stops fitting and the answer "use Cassandra" gives up too much.

## Why does it matter?

NewSQL solves a specific problem that, for many years, had no good answer: **a single relational dataset that does not fit on one machine, but that you still want to query with SQL and transact against with full ACID**.

Concretely:

- **Global, multi-region deployments** — Spanner serves data across continents with externally consistent transactions. CockroachDB and YugabyteDB do the same on commodity hardware and cloud VMs.
- **Horizontal write scaling under ACID** — traditional Postgres tops out at one primary. NewSQL clusters distribute writes across many nodes while preserving serializable transactions.
- **No application-level sharding** — manual sharding is one of the most error-prone things a backend team can do. NewSQL hides the sharding behind a SQL surface.
- **High availability through consensus** — losing a node does not require manual failover. The cluster heals itself; clients see a brief hiccup, not an outage.

The catch: NewSQL is operationally heavier than a single PostgreSQL instance, and most applications do not actually need it. Reach for it when you have proof that you do.

## How it works

The technical pattern is roughly:

```
┌────────────────────────────────────────────────────────────────┐
│  Client SQL                                                     │
│       │                                                         │
│       ▼                                                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Distributed SQL planner                     │   │
│  │  (parses SQL, knows which node owns which key range)     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                          │                                      │
│      ┌───────────────────┼───────────────────┐                  │
│      ▼                   ▼                   ▼                  │
│  ┌────────┐         ┌────────┐         ┌────────┐               │
│  │ Range  │         │ Range  │         │ Range  │               │
│  │  [a-h] │         │  [i-q] │         │  [r-z] │               │
│  │  Raft  │         │  Raft  │         │  Raft  │               │
│  │ group  │         │ group  │         │ group  │               │
│  └────────┘         └────────┘         └────────┘               │
│                                                                  │
│  Each range is replicated (usually 3-5×) via Raft or Paxos.     │
│  Writes go to the Raft leader for the range; reads can be       │
│  served by any replica that is sufficiently up to date.         │
│                                                                  │
│  Distributed transactions use either 2PC + locks, or            │
│  timestamp ordering (Spanner's TrueTime, Cockroach's HLC).      │
└────────────────────────────────────────────────────────────────┘
```

Key mechanisms:

- **Data is partitioned into ranges or tablets** keyed by primary-key value. Each range lives on multiple nodes for fault tolerance.
- **Consensus per range** — Paxos (Spanner) or Raft (Cockroach, Yugabyte, TiDB) ensures committed writes survive any single-node failure.
- **Distributed SQL planner** decomposes a query into the operations each range needs to perform, pushes computation close to the data, and stitches results back together.
- **Timestamp-ordered transactions** — Spanner uses synchronized atomic clocks (TrueTime); Cockroach uses Hybrid Logical Clocks. Either way, the goal is **external consistency / serializability** without a central transaction coordinator becoming the bottleneck.

The pricing model deserves attention too: many NewSQL systems run on three or more nodes minimum and bill accordingly. Cost grows with replication factor.

## Examples

NewSQL looks like SQL — that's the whole point. From the application's perspective there is nothing remarkable about the queries:

```sql
BEGIN;
  UPDATE account SET balance = balance - 100 WHERE id = 1;
  UPDATE account SET balance = balance + 100 WHERE id = 2;
COMMIT;
```

The difference shows up when account `1` and account `2` happen to live on different shards in different data centers. A single-node Postgres cannot execute that transaction without first locating both rows; a NewSQL engine routes the writes to the right Raft groups, runs a distributed commit protocol, and returns success.

CockroachDB-specific syntax for placing data in particular regions:

```sql
CREATE TABLE users (
  id      UUID PRIMARY KEY,
  email   TEXT NOT NULL,
  region  STRING NOT NULL
) LOCALITY REGIONAL BY ROW AS region;
```

`LOCALITY REGIONAL BY ROW` tells the cluster to keep each row physically close to the region named in its `region` column — so European users are served from European replicas without crossing the Atlantic for every read.

## When to use

- **Your data does not fit on one machine** *and* you cannot give up SQL or ACID.
- **Global applications** that need strong consistency across regions — Spanner's original target.
- **Tenant-heavy SaaS** with strict per-tenant isolation and the need to scale by adding capacity rather than re-architecting.
- **You are about to write a custom sharding layer** on top of PostgreSQL — that is exactly the problem NewSQL exists to remove.
- **High availability is a hard requirement**: NewSQL clusters routinely tolerate node and zone failures without losing committed writes.

## When NOT to use

- **A single Postgres or MySQL is enough**. For most applications it is, and a NewSQL cluster brings significant operational and cost overhead.
- **You can live with eventual consistency** and want maximum write throughput: [wide-column](wide-column.md) stores are simpler and cheaper at extreme scale.
- **The workload is analytical**: NewSQL is built for OLTP. Heavy aggregations belong in a [columnar OLAP](olap-columnar.md) engine.
- **The dataset is small enough that the cluster machinery is pure overhead**. Three nodes minimum, paid 24/7, is not the right shape for a side project.
- **Your team cannot operate distributed systems**. NewSQL hides much of the complexity but not all of it: split-brain debugging, consensus tuning, and clock skew remain real.

## References

- [*Spanner: Google's Globally-Distributed Database* (2012)](https://research.google/pubs/pub39966/)
- [*CockroachDB: The Resilient Geo-Distributed SQL Database* (SIGMOD 2020)](https://www.cockroachlabs.com/guides/cockroachdb-the-resilient-geo-distributed-sql-database/)
- [TiDB Documentation](https://docs.pingcap.com/tidb/stable/overview)
- [YugabyteDB Documentation](https://docs.yugabyte.com/preview/)
