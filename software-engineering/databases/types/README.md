# Database Types

Categories of databases by data model and workload. Each article follows the same structure: what the type *is*, what it *solves*, what it *does not solve*, and *when* to reach for it (or not).

These categories overlap. A modern PostgreSQL is primarily relational but also stores JSON documents, vectors, and time-series. Treat the categories as the dominant shape of the data model, not as exclusive labels.

---

## Articles

| Article | Description |
|---|---|
| [Relational](relational.md) | Tables, rows, columns, foreign keys, SQL — the default for structured data |
| [Document](document.md) | Self-contained JSON/BSON documents with flexible schema |
| [Key-Value](key-value.md) | Hash map at internet scale — O(1) access by key, nothing more |
| [Wide-Column](wide-column.md) | Bigtable-style: rows × column-families × columns × versions |
| [Graph](graph.md) | Nodes and edges with properties; queries are traversals |
| [Time-Series](time-series.md) | Append-only sequences indexed by time |
| [Search Engine](search-engine.md) | Inverted indexes for full-text search and ranking |
| [Vector](vector.md) | High-dimensional embeddings and approximate nearest-neighbor search |
| [In-Memory](in-memory.md) | RAM-resident storage for microsecond latencies |
| [NewSQL](newsql.md) | Distributed SQL with full ACID at horizontal scale |
| [OLAP / Columnar](olap-columnar.md) | Column-oriented storage for analytical aggregates |
| [Embedded](embedded.md) | The database runs inside your application process |
| [Object](object.md) | Persists object graphs directly, without an ORM |

---

> Picking a database is picking a set of trade-offs. Every type below was designed to be excellent at one workload — and is usually mediocre or worse at the others. The skill is matching the shape of your problem to the shape of the database.
