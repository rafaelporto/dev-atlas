# OLAP / Columnar Databases

> Stores data by column instead of by row. The opposite shape from OLTP. Queries that scan billions of rows but touch only a few columns run an order of magnitude faster.

---

## What is it?

An **OLAP** (On-Line Analytical Processing) database — almost always implemented as a **columnar** (also: *column-oriented* or *column-store*) database — flips the standard storage layout. Instead of storing each row contiguously on disk, it stores each column contiguously.

Concretely: a row store keeps `(id, name, country, age, signup_date)` of one user together, then the next user's tuple, and so on. A column store keeps every `id` together, every `name` together, every `country` together. The difference is invisible at the SQL level — a `SELECT` is still a `SELECT` — but at the disk and CPU level it changes everything.

The category is large and varied:

- **Cloud data warehouses**: BigQuery, Snowflake, Redshift, Databricks SQL, Azure Synapse.
- **Open-source analytical engines**: ClickHouse, Apache Pinot, Apache Druid, StarRocks, Apache Doris.
- **Embedded analytical engines**: DuckDB, MonetDB.
- **Lakehouse query engines** over columnar files (Parquet/ORC): Trino, Presto, Spark SQL, Apache Drill.

What they share is the columnar layout and a workload they're built for: **OLAP** — scanning huge fact tables and aggregating them.

## Why does it matter?

OLAP columnar engines solve three problems that row-oriented databases handle badly:

- **Wide-table scans, narrow projections** — analytical queries typically touch 3–5 columns out of 100. A row store reads the entire row from disk; a column store reads only the columns it needs. 10–30× less I/O.
- **Aggregations over billions of rows** — `SUM`, `AVG`, `COUNT`, `GROUP BY` over years of facts. Columnar layout enables **vectorized execution** (process thousands of values per CPU instruction) and **massive compression** (a column of countries has hundreds of distinct values among billions of rows — dictionary-encoded to a fraction of the size).
- **Cheap, queryable history** — column compression routinely yields 5–20× smaller storage. A year of event data that would be a terabyte in a row store fits in 50–100 GB columnar.

The mirror-image cost: columnar engines are bad at the OLTP workload — single-row updates, frequent random writes, transactional integrity, hundreds of small queries per second. Use them for what they're built for.

## How it works

```
Row-oriented (Postgres, MySQL):

   ┌── Row 1 ─────────────────────────────────────────────────┐
   │ id=1 │ name=Alice │ country=BR │ age=30 │ signup=2025-01 │
   └─────────────────────────────────────────────────────────┘
   ┌── Row 2 ─────────────────────────────────────────────────┐
   │ id=2 │ name=Bob   │ country=PT │ age=25 │ signup=2025-03 │
   └─────────────────────────────────────────────────────────┘
   "SELECT AVG(age)" must read the entire table from disk.

Column-oriented (ClickHouse, BigQuery):

   id:       [ 1,        2,       3,       ... ]
   name:     [ Alice,    Bob,     Carol,   ... ]
   country:  [ BR,       PT,      BR,      ... ]   ← dict-encoded → tiny
   age:      [ 30,       25,      34,      ... ]
   signup:   [ 2025-01,  2025-03, 2025-02, ... ]

   "SELECT AVG(age)" reads only the `age` column.
   The column is encoded, vectorized, aggregated in CPU SIMD blocks.
```

Key mechanisms:

- **Column compression** — dictionary encoding, run-length encoding, delta encoding, bit-packing. Columns of repeating values shrink dramatically.
- **Vectorized execution** — process columns in batches of 1024 or 4096 values per loop iteration; modern CPUs love this and SIMD.
- **Late materialization** — apply filters on individual columns before reconstructing rows, so most rows are never materialized.
- **MPP (Massively Parallel Processing)** — the largest engines distribute storage and computation across many nodes. Cloud warehouses go further and separate compute from storage entirely.
- **Append-friendly storage** — files like Parquet are immutable and append-friendly. Updates and deletes are heavier, often expressed as `MERGE` operations or deferred compactions.

## Examples

A textbook OLAP query — billions of rows, two columns scanned, grouped by a third:

```sql
SELECT country,
       date_trunc('month', signup_at) AS month,
       count(*)                       AS new_users
FROM   users
WHERE  signup_at >= '2025-01-01'
GROUP  BY country, month
ORDER  BY month, country;
```

On a row store with hundreds of millions of users, this query reads the entire table. On a columnar engine, it reads only `country` and `signup_at`, decompressed in vectorized blocks. The difference is routinely 10–50×.

Loading data — the typical pattern is **bulk, append-only**:

```sql
-- ClickHouse: ingest a Parquet file directly
INSERT INTO events
SELECT * FROM s3('s3://bucket/events/2026/05/15/*.parquet', 'Parquet');
```

Single-row update — possible, but the wrong shape:

```sql
-- This works in ClickHouse but is a heavy, deferred operation.
-- If you find yourself doing this often, you're using the wrong tool.
ALTER TABLE events UPDATE country = 'BR' WHERE user_id = 42;
```

## When to use

- **Business intelligence and analytics dashboards** — group, filter, aggregate, slice and dice over years of history.
- **Data warehouses and lakehouses** — the canonical home of OLAP.
- **Event analytics, product analytics, log analytics** — Mixpanel-style, Amplitude-style workloads.
- **Ad-hoc analysis** over very large datasets — SQL plus a columnar engine is the modern equivalent of "give me a notebook and a few hundred GB of memory".
- **Reporting and OLAP cubes** — pre-aggregations are easier to build and refresh on columnar storage.

## When NOT to use

- **Transactional, single-row reads and writes** — your application's primary database should not be a data warehouse. Use [relational](relational.md), [document](document.md), or [key-value](key-value.md).
- **Heavy update or delete workloads** — columnar engines defer them; performance degrades and storage bloats.
- **Sub-millisecond latency requirements** for individual queries — analytical engines aim for seconds-to-tens-of-seconds on huge data, not microseconds on small queries.
- **Strict transactional integrity across multiple rows** — OLAP engines have varying transactional stories; most are weaker than a real RDBMS.
- **The dataset is small enough to fit in PostgreSQL with an index**. Many "analytics" workloads at startup scale do.

## References

- [*C-Store: A Column-Oriented DBMS*, Stonebraker et al. (2005)](https://www.vldb.org/archives/website/2005/program/paper/thu/p553-stonebraker.pdf)
- [*The Snowflake Elastic Data Warehouse* (SIGMOD 2016)](https://event.cwi.nl/lsde/papers/p215-dageville-snowflake.pdf)
- [ClickHouse Documentation](https://clickhouse.com/docs)
- [DuckDB Documentation](https://duckdb.org/docs/) — columnar OLAP that runs in-process
