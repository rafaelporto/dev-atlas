# Relational Databases

> The default database for structured, transactional data: tables linked by foreign keys and queried with SQL.

---

## What is it?

A relational database stores data as a set of tables. Each row in a table represents one entity (a user, an order, a product); each column represents an attribute of that entity. Relationships between entities are expressed by foreign keys — a column in one table that points to the primary key of another.

The model was defined by Edgar F. Codd in his 1970 paper *A Relational Model of Data for Large Shared Data Banks*, and it has dominated commercial data storage ever since. Queries are written in **SQL** (Structured Query Language), which is declarative: you describe the result you want, not the steps to compute it. The engine's query planner figures out the steps.

Relational databases offer **ACID** transactions ([Atomicity, Consistency, Isolation, Durability](../concepts/README.md)) and a strict, enforced schema: every row in a table must conform to the column definitions.

## Why does it matter?

Relational databases solve four problems that, taken together, no other category solves as completely:

- **Structured queries across related entities** — joining `orders` to `customers` to `products` in a single query is what relational databases were built for.
- **Strong consistency** — transactions guarantee that either all changes commit or none do, even under concurrent writes.
- **Referential integrity** — the database itself enforces "an order cannot reference a customer that doesn't exist".
- **Mature ecosystem** — drivers, ORMs, monitoring tools, backup tooling, and decades of operator experience.

When in doubt about which database to pick, the answer is almost always a relational one. The interesting question is when *not* to.

## How it works

A relational engine is built around four ideas:

```
┌───────────────────────────────────────────────────────────┐
│  Client SQL                                                │
│       │                                                    │
│       ▼                                                    │
│  ┌──────────┐   ┌───────────┐   ┌──────────┐   ┌────────┐ │
│  │  Parser  │──▶│  Planner  │──▶│ Executor │──▶│ Result │ │
│  └──────────┘   └───────────┘   └──────────┘   └────────┘ │
│                       │              │                     │
│                       ▼              ▼                     │
│                  ┌──────────┐   ┌──────────┐               │
│                  │ Indexes  │   │ Storage  │               │
│                  │ (B-tree) │   │ (pages)  │               │
│                  └──────────┘   └──────────┘               │
│                                      │                     │
│                                      ▼                     │
│                                ┌──────────┐                │
│                                │   WAL    │ (durability)   │
│                                └──────────┘                │
└───────────────────────────────────────────────────────────┘
```

- **Schema-first storage**: tables and columns are declared up front; the engine refuses data that does not fit.
- **B-tree indexes**: the dominant index structure for relational engines. Lookups are O(log n) and ranges are efficient.
- **Query planner**: a cost-based optimizer picks the cheapest plan (which index to use, which join order, hash vs. nested-loop join).
- **Transactions and the Write-Ahead Log (WAL)**: every change is appended to a log *before* it touches data files, so a crash never loses committed work.
- **MVCC**: most modern engines (PostgreSQL, Oracle, MySQL/InnoDB) use Multi-Version Concurrency Control so readers never block writers and vice versa.

Most relational databases run as a single primary with optional read replicas. Horizontal write scaling exists (sharding, distributed SQL — see [NewSQL](newsql.md)) but is not the native shape of the model.

## Examples

Schema and a join across two tables:

```sql
CREATE TABLE customer (
  id          BIGSERIAL PRIMARY KEY,
  email       TEXT      NOT NULL UNIQUE,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE "order" (
  id           BIGSERIAL PRIMARY KEY,
  customer_id  BIGINT    NOT NULL REFERENCES customer(id),
  total_cents  BIGINT    NOT NULL CHECK (total_cents >= 0),
  placed_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX order_customer_idx ON "order"(customer_id);
```

A transactional update — all-or-nothing:

```sql
BEGIN;
  UPDATE account SET balance = balance - 100 WHERE id = 1;
  UPDATE account SET balance = balance + 100 WHERE id = 2;
COMMIT;
```

If the database crashes mid-transaction, neither account is debited or credited.

A typical analytical-ish query — relational shines at this:

```sql
SELECT c.email, COUNT(*) AS order_count, SUM(o.total_cents) AS revenue_cents
FROM   customer c
JOIN   "order"  o ON o.customer_id = c.id
WHERE  o.placed_at >= NOW() - INTERVAL '30 days'
GROUP  BY c.email
ORDER  BY revenue_cents DESC
LIMIT  10;
```

## When to use

- The data is **structured** and the structure is stable enough to be modeled as tables.
- You need **transactions** that span multiple rows or tables.
- Queries cross several entities (joins) and you cannot predict all access patterns up front.
- **Referential integrity** matters and you want the database — not the application — to enforce it.
- The dataset fits comfortably on a single machine (or a single primary with read replicas). For most applications, this is true forever.
- You want a battle-tested, well-understood operational story.

## When NOT to use

- **Schema changes every week**: rigid columns slow you down. A [document database](document.md) may fit better — though modern Postgres with `JSONB` blurs this line.
- **Write throughput beyond a single primary**: hundreds of thousands of writes per second across an unbounded dataset is the home of [wide-column](wide-column.md) or [NewSQL](newsql.md).
- **Deeply connected data with many-hop traversals**: "friends of friends of friends" is much faster on a [graph database](graph.md) than as recursive SQL joins.
- **Full-text search with ranking**: relational `LIKE '%foo%'` does not scale. Use a [search engine](search-engine.md).
- **High-dimensional similarity search**: embeddings and nearest-neighbor queries belong in [vector databases](vector.md) (or `pgvector` if you stay relational).
- **Heavy analytical scans over billions of rows**: [columnar OLAP engines](olap-columnar.md) are an order of magnitude faster.

## References

- [Codd, *A Relational Model of Data for Large Shared Data Banks* (1970)](https://www.seas.upenn.edu/~zives/03f/cis550/codd.pdf)
- [*Designing Data-Intensive Applications*, Martin Kleppmann](https://dataintensive.net/) — Chapter 2: Data Models and Query Languages
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Use the Index, Luke! — SQL Indexing and Tuning](https://use-the-index-luke.com/)
