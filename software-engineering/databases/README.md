# Databases

Databases are the layer where your application's state lives. The right one disappears into the background; the wrong one becomes the bottleneck everything else has to work around.

This section is organized in three layers:

- **Concepts** — fundamentals that apply to every database (ACID, CAP, isolation levels, indexing, replication, partitioning).
- **Types** — categories of databases by data model and workload (relational, document, key-value, graph, time-series, vector, and so on). Each article answers: *what does it solve, what does it not solve, when is it the right pick?*
- **Engines** — concrete database products (PostgreSQL, MongoDB, Redis, Cassandra, ClickHouse…) with their popularity context and operational quirks.

---

## Subsections

| Subsection | Description |
|---|---|
| [Concepts](concepts/README.md) | Fundamentals shared by all databases: ACID, CAP, isolation, indexing, replication, partitioning |
| [Types](types/README.md) | Database categories by data model and workload |
| [Engines](engines/README.md) | Specific database products and their trade-offs |

---

> A database is not a neutral container. Its data model, consistency guarantees, and scaling story shape what your application can do — and what it cannot.
