# Time-Series Databases

> Optimized for an append-only flood of timestamped events. Every row knows when it happened, queries are almost always over time ranges, and old data is compressed or thrown away.

---

## What is it?

A time-series database (TSDB) is built around a single, dominant access pattern: **insert a lot of (timestamp, value) data points, then query them over time ranges**. Each data point typically has a timestamp, one or more numeric values (a *measurement*), and a set of labels or *tags* (the *series*) that identify what the value is about (`host=server-7, region=eu-west`).

Examples of what it stores: server CPU usage every second, IoT sensor readings, stock-market ticks, application latency metrics, energy meter readings.

The category divides cleanly into two architectures:

- **Purpose-built TSDBs** (InfluxDB, Prometheus, VictoriaMetrics, M3, OpenTSDB) — designed from scratch around the time-series workload. Custom storage formats, custom query languages.
- **Time-series extensions on top of another database** (TimescaleDB on PostgreSQL, Promscale, ClickHouse used as TSDB) — keep the SQL ergonomics, add time-series superpowers like automatic partitioning, retention, and continuous aggregates.

## Why does it matter?

Time-series workloads are unusual in three ways that general-purpose databases handle badly:

- **Write rate is dominated by inserts**: updates and deletes are rare. The engine can optimize aggressively for sequential, append-only writes.
- **Data has natural locality in time**: queries almost always ask for "a range of timestamps", so storing data sorted by time and partitioning by time make everything cheap.
- **Data ages**: old data is queried less often, can be compressed harder (or downsampled), and is eventually deleted. **Retention policies** are a first-class feature.

A time-series database is, essentially, a relational database that has given up generality in exchange for being excellent at one shape of workload — and for orders-of-magnitude better compression and query speed on that shape.

## How it works

```
┌──────────────────────────────────────────────────────────────┐
│  Series identified by tag set:                                │
│      cpu_usage{host=A, region=eu}                             │
│      cpu_usage{host=B, region=eu}                             │
│      cpu_usage{host=A, region=us}                             │
│                                                               │
│  Each series is a sequence of (timestamp, value) points:      │
│                                                               │
│      cpu_usage{host=A,region=eu}                              │
│       ├ 10:00:00 → 0.12                                       │
│       ├ 10:00:01 → 0.14                                       │
│       ├ 10:00:02 → 0.18                                       │
│       └ ...                                                   │
│                                                               │
│  Storage is partitioned by time window (a "chunk"):           │
│                                                               │
│      ┌───── 2026-05-15 10:00 ─────┬─── 2026-05-15 11:00 ────┐ │
│      │  cpu, mem, disk            │  cpu, mem, disk          │ │
│      └────────────────────────────┴──────────────────────────┘ │
│                                                               │
│  Old chunks → compressed → eventually dropped (retention).    │
└──────────────────────────────────────────────────────────────┘
```

Key mechanisms:

- **Time-based partitioning ("chunking")**: data is split into chunks by time window (hour, day, week). Queries skip irrelevant chunks entirely.
- **Specialized compression** — algorithms like **Gorilla** (delta-of-delta for timestamps, XOR for values) routinely achieve 10–20× compression on real metric data.
- **Downsampling and continuous aggregates**: precompute rollups ("5-minute averages of CPU usage") and query those instead of raw points.
- **Retention policies**: automatically drop or downsample chunks older than X.

Queries are usually expressed as functions over time: `rate()`, `avg_over_time()`, `max()`, grouped by tag set and bucketed into time windows.

## Examples

A query in **TimescaleDB** (PostgreSQL-flavoured SQL) — 5-minute average CPU per host over the last hour:

```sql
SELECT time_bucket('5 minutes', ts) AS bucket,
       host,
       avg(usage) AS avg_cpu
FROM   cpu_metrics
WHERE  ts >= NOW() - INTERVAL '1 hour'
GROUP  BY bucket, host
ORDER  BY bucket;
```

The same idea in **PromQL** (Prometheus query language):

```
avg_over_time(node_cpu_seconds_total{mode="user"}[5m])
```

Setting up a retention policy in TimescaleDB — drop data older than 30 days, automatically:

```sql
SELECT add_retention_policy('cpu_metrics', INTERVAL '30 days');
```

A continuous aggregate — precompute the 5-minute rollup so dashboards do not re-aggregate raw data on every refresh:

```sql
CREATE MATERIALIZED VIEW cpu_5min
WITH (timescaledb.continuous) AS
SELECT time_bucket('5 minutes', ts) AS bucket,
       host,
       avg(usage)  AS avg_cpu,
       max(usage)  AS max_cpu
FROM   cpu_metrics
GROUP  BY bucket, host;
```

## When to use

- **Observability metrics**: CPU, memory, latency, request counts.
- **IoT and sensor data**: high-frequency telemetry from devices, equipment, environments.
- **Financial market data**: ticks, OHLC bars, order-book snapshots.
- **Application analytics over time**: signups per minute, conversion funnels by hour.
- **Anything where the natural question is "show me X over time period Y, bucketed by Z"**.
- **You need cheap, fast retention** of very large amounts of timestamped data.

## When NOT to use

- **Data does not have a strong time dimension**: a user-profile table is not time-series; do not force it into one.
- **You need to update or delete individual records frequently**: TSDBs are append-optimized, not mutation-optimized.
- **Joining across many entities**: time-series engines have weak or no join support. Combining metrics with metadata is usually done in the application.
- **Strong transactional guarantees** across multiple series: typically not supported.
- **You only have low ingest volume**: a regular [relational](relational.md) table with a `timestamp` column and the right indexes is often enough.

## References

- [*Time-Series Database (TSDB) explained*, InfluxData](https://www.influxdata.com/time-series-database/)
- [*Gorilla: A Fast, Scalable, In-Memory Time Series Database* (Facebook)](https://www.vldb.org/pvldb/vol8/p1816-teller.pdf)
- [TimescaleDB Documentation](https://docs.timescale.com/)
- [Prometheus Documentation — Storage](https://prometheus.io/docs/prometheus/latest/storage/)
