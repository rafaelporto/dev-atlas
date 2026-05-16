# Embedded Databases

> The database runs inside your application process. No server, no network — just a library that reads and writes a local file.

---

## What is it?

An embedded database is one that **lives in the same OS process as the application**. There is no separate server to start, no socket to connect to, no port to expose, no second deployment artifact. The database is a library you link against; the data is a file (or a directory of files) on local disk.

The category includes:

- **Embedded relational engines**: SQLite, H2, HSQLDB.
- **Embedded analytical engines**: DuckDB, MonetDB Lite.
- **Embedded key-value engines**: RocksDB, LevelDB, LMDB, BadgerDB, BoltDB.
- **Embedded document/full-stack**: Realm, ObjectBox, Couchbase Lite, PouchDB.

The defining property is the deployment model, not the data model. SQLite and DuckDB are both embedded; one is OLTP relational, the other is OLAP columnar.

## Why does it matter?

Embedded databases solve a different problem from server databases — the problem of **not having a database server in the first place**.

- **Zero operational overhead** — no separate process, no networking, no auth, no backup tooling other than copying a file.
- **Single-file deploys** — the application binary plus a data file. Trivial to ship to laptops, mobile devices, containers, CI runners, edge nodes.
- **Sub-microsecond function-call latency** — there is no network and no IPC. A query is a function call on data already in this process.
- **Local-first by default** — the database works offline; sync to a server (if any) is layered on top, not built in.

SQLite alone is, by some counts, the most-deployed database in the world: every smartphone, every browser, every operating system, every desktop application that needs persistent state. The deployment model is the feature.

## How it works

```
┌────────────────────────────────────────────────────┐
│              Application Process                    │
│  ┌──────────────────────────────────────────────┐ │
│  │              Your code                        │ │
│  │  result = db.execute("SELECT * FROM ...");   │ │
│  └──────────────────────────────────────────────┘ │
│                       │                            │
│                       ▼  (function call)           │
│  ┌──────────────────────────────────────────────┐ │
│  │   Embedded DB library (SQLite, DuckDB, ...)   │ │
│  │   - parser, planner, executor                 │ │
│  │   - in-process buffer pool                    │ │
│  └──────────────────────────────────────────────┘ │
│                       │                            │
└───────────────────────┼────────────────────────────┘
                        │  (file I/O)
                        ▼
              ┌────────────────────┐
              │   Local data file  │
              │   (e.g., app.db)   │
              └────────────────────┘
```

Mechanisms vary by engine, but a few patterns are common:

- **Single-file storage** — SQLite stores an entire database in one file. DuckDB does the same. The portability follows directly.
- **Memory-mapped files** — LMDB and others mmap the data file; reads become pointer dereferences.
- **One writer at a time** — most embedded engines serialize writes through a single mutex or a write-ahead log. Concurrent readers are fine; concurrent writers are usually not.
- **In-process means in-process** — there is no shared cache across processes. Two applications opening the same SQLite file each maintain their own page cache, and writes from one are visible to the other only through the file.

The trade-off cuts both ways: extreme simplicity for the single-process case, awkwardness when you need multi-process or multi-machine access.

## Examples

SQLite — the canonical embedded relational engine:

```sql
-- SQLite database is a file. Create or open it:
-- $ sqlite3 app.db

CREATE TABLE note (
  id      INTEGER PRIMARY KEY,
  title   TEXT    NOT NULL,
  body    TEXT,
  updated TEXT    NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO note (title, body) VALUES ('first', 'hello world');

SELECT * FROM note WHERE title LIKE 'first%';
```

The whole database is `app.db`. To back it up, copy the file.

DuckDB — embedded *analytical* engine, ideal for ad-hoc data work in a notebook or CLI:

```sql
-- Query a remote Parquet file directly, no ingest step
SELECT country,
       count(*) AS users
FROM   'https://example.com/users.parquet'
GROUP  BY country
ORDER  BY users DESC
LIMIT  10;
```

A key-value embedded engine (RocksDB) is usually accessed via its API rather than SQL — you put it inside another database, a queue, or an indexing layer rather than expose it directly to the application.

## When to use

- **Mobile and desktop applications** — every iOS and Android app that persists data is a candidate for SQLite or a higher-level library on top of it.
- **CLI tools and developer utilities** — a database that ships with your binary, no install dance.
- **Edge and embedded devices** — IoT gateways, set-top boxes, routers. RAM and disk budgets matter; a server database is overkill.
- **Tests and CI** — disposable databases that spin up in milliseconds with no setup.
- **Local-first applications** — the application owns its data and works offline.
- **Single-node analytics** — DuckDB makes a laptop a credible analytical engine for many-gigabyte datasets.
- **Embedded storage layers inside larger systems** — RocksDB and LMDB are the engines behind countless higher-level databases.

## When NOT to use

- **Multiple application instances need to write to the same data** — embedded engines do not coordinate writers across processes or machines. Use a [relational](relational.md) or [document](document.md) server instead.
- **Network access from many clients** — by definition, an embedded engine does not listen on a port. Putting a service in front of it just to expose it is rebuilding what a server database already gives you.
- **High write concurrency from a single process is fine, from multiple processes is not** — file-lock contention will eat your throughput.
- **You need horizontal scaling**: embedded engines are single-node by design. For horizontal scale, look at [NewSQL](newsql.md) or [wide-column](wide-column.md).
- **Built-in replication or HA** is a requirement — most embedded engines have none. Tools like Litestream (for SQLite) add this as a separate layer.

## References

- [SQLite — *Most Widely Deployed and Used Database Engine*](https://www.sqlite.org/mostdeployed.html)
- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [DuckDB Documentation](https://duckdb.org/docs/)
- [LMDB Documentation](http://www.lmdb.tech/doc/)
- [RocksDB Wiki](https://github.com/facebook/rocksdb/wiki)
