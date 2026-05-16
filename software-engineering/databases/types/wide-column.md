# Wide-Column Stores

> Tables where each row can have millions of columns grouped into families. Built for massive write throughput across a cluster, not for ad-hoc queries.

---

## What is it?

A wide-column store — also called a **column-family** store — organizes data into tables that look superficially like relational tables but behave very differently. A row is identified by a **row key**, and within that row, data is grouped into **column families**. Inside each family, columns are flexible: different rows can have entirely different columns, and there is no upper bound on how many a single row can have.

The model was defined by Google's **Bigtable** paper (2006) and copied (with variations) by HBase, Cassandra, ScyllaDB, and others. Cassandra and Scylla diverged further by introducing **CQL**, a SQL-like query language that hides much of the raw column-family machinery behind familiar `CREATE TABLE` syntax — but the underlying storage is still column-family.

The key insight: data is **partitioned by row key across many machines**, and within a partition, columns are stored together on disk. This makes writes cheap, distributes them evenly, and is friendly to large sequential scans inside a partition.

## Why does it matter?

Wide-column stores solve three problems specific to **write-heavy, internet-scale** workloads:

- **Linear write scalability** — adding nodes adds capacity proportionally. Cassandra is famous for handling hundreds of thousands of writes per second per cluster.
- **Tunable consistency** — you decide per-query how many replicas must acknowledge a read or write. Strong consistency, eventual consistency, or anything in between is configuration, not a different database.
- **No single point of failure** — most wide-column stores are **leaderless**. Any node can accept any operation. Losing a node degrades capacity, not availability.

The cost is that the data model only works if you design queries **before** you design tables. You cannot ask new questions of a wide-column store cheaply; you re-model.

## How it works

```
┌──────────────────────────────────────────────────────────────────┐
│  Table "sensor_readings"                                          │
│                                                                   │
│  Partition key: sensor_id  │  Clustering key: timestamp           │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ sensor_id = "S-100"                                          │ │
│  │   ├─ ts=10:00:00 → { temp: 22.1, humidity: 45 }              │ │
│  │   ├─ ts=10:00:01 → { temp: 22.2, humidity: 45 }              │ │
│  │   └─ ts=10:00:02 → { temp: 22.0, humidity: 46 }              │ │
│  └─────────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ sensor_id = "S-101"                                          │ │
│  │   ├─ ts=10:00:00 → { temp: 19.5 }    ← different columns!    │ │
│  │   └─ ts=10:00:01 → { temp: 19.6, battery: 87 }               │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  Each partition lives on one node (plus replicas).                │
│  Within a partition, rows are sorted by clustering key on disk.   │
└──────────────────────────────────────────────────────────────────┘
```

Concretely:

- **Partition key** decides which node stores the row. Hash of the partition key → node.
- **Clustering key** decides the order of rows within a partition. Range queries within a partition are cheap; range queries across partitions are not.
- **LSM-trees** ([indexing](../concepts/README.md)) underlie storage: writes are appended to an in-memory memtable, flushed to immutable SSTables, then compacted in the background. This is what makes writes so cheap.
- **Tunable consistency**: you specify how many replicas must respond. `QUORUM` reads with `QUORUM` writes give strong consistency at the cost of latency; `ONE`/`ONE` is fast and eventually consistent.

You **must** design the table around the queries you intend to run. The same logical data is often stored in multiple tables, each shaped for a different access pattern. Denormalization is the norm, not the exception.

## Examples

A CQL table designed for "give me the readings of sensor X in time range Y":

```sql
CREATE TABLE sensor_readings (
  sensor_id  TEXT,
  ts         TIMESTAMP,
  temp       DOUBLE,
  humidity   INT,
  PRIMARY KEY (sensor_id, ts)
) WITH CLUSTERING ORDER BY (ts DESC);
```

`PRIMARY KEY (sensor_id, ts)` means `sensor_id` is the partition key and `ts` is the clustering key. All readings for one sensor are co-located on one node, sorted by time.

The natural query — cheap, hits one partition:

```sql
SELECT ts, temp, humidity
FROM   sensor_readings
WHERE  sensor_id = 'S-100'
  AND  ts >= '2026-05-15 10:00:00'
  AND  ts <  '2026-05-15 11:00:00';
```

The query a wide-column store does *not* want — "all sensors with temperature above 30":

```sql
SELECT sensor_id, ts, temp
FROM   sensor_readings
WHERE  temp > 30;   -- requires ALLOW FILTERING, scans the whole cluster
```

This is a full-cluster scan. In Cassandra it requires explicitly opting in with `ALLOW FILTERING`, and it will be slow. The right answer is a second table partitioned differently, or a different database entirely.

## When to use

- **Write-heavy workloads at scale**: time-series ingest, event logs, IoT telemetry, audit trails.
- **Predictable, query-driven schemas**: you know up front what questions you will ask, and you can model partition/clustering keys for them.
- **Geographically distributed deployments**: most wide-column stores have first-class multi-region support.
- **High availability is non-negotiable**: leaderless designs survive node failures without manual intervention.
- **Linear horizontal scaling**: you need to scale by adding commodity boxes, not by buying bigger ones.

## When NOT to use

- **Ad-hoc analytical queries** are the norm: use a [columnar OLAP](olap-columnar.md) engine instead.
- **Joins** are routine: there are no real joins. You denormalize or you move on.
- **Strong transactional integrity** across multiple partitions: most wide-column stores do not offer it. Lightweight transactions exist but are expensive.
- **You only have one server's worth of data**: the operational complexity of a distributed cluster is not worth it. Use [relational](relational.md) or [document](document.md).
- **The schema is unknown or changing constantly**: re-modelling tables for new queries is painful.

## References

- [*Bigtable: A Distributed Storage System for Structured Data* (2006)](https://research.google/pubs/pub27898/)
- [Apache Cassandra Documentation](https://cassandra.apache.org/doc/)
- [ScyllaDB Documentation](https://docs.scylladb.com/)
- [*Designing Data-Intensive Applications*, Martin Kleppmann](https://dataintensive.net/) — Chapter 6: Partitioning
