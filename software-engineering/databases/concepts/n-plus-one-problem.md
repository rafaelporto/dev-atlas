---
type: concept
tags:
  - database
  - concept
  - orm
  - antipattern
related:
  - software-engineering/databases/concepts/orm-and-data-mapping
  - software-engineering/communication-protocols/api-styles/graphql
  - languages/nodejs/orms/pitfalls
  - languages/java/databases-and-orms
language: null
---
# The N+1 Query Problem

> Loading a list with one query and then each item's related data with one more query apiece — the most common performance bug in ORM-backed code, and how to detect and fix it with joins, batching, and projections.

---

## What is it?

The N+1 problem is when code fetches a list of things with one database query and then, while looping over that list, sends another query for each item — so showing 100 orders costs 101 queries instead of one or two.

```sql
SELECT id, customer_id, total FROM orders ORDER BY created_at DESC LIMIT 100;  -- 1 query

SELECT id, name FROM customers WHERE id = 17;   -- +1
SELECT id, name FROM customers WHERE id = 42;   -- +1
SELECT id, name FROM customers WHERE id = 17;   -- +1 (same customer, again)
-- ... 100 times
```

The "1" is the parent query; the "N" is one query per row. Each query is fast on its own, which is why the problem hides in development and appears in production.

---

## Why does it matter?

The cost is dominated by **round trips**, not by the work inside the database:

| | Queries | Network round trips at 1 ms | At 5 ms (cross-zone, serverless) |
|---|---|---|---|
| N+1, 100 rows | 101 | ~101 ms | ~505 ms |
| N+1, 1,000 rows | 1,001 | ~1 s | ~5 s |
| Join or batched (`IN`) | 1–2 | ~1–2 ms | ~5–10 ms |

It also multiplies load: each query takes a pooled connection, parses, plans, and logs. A page that issues 1,000 queries for a single user turns a modest traffic spike into connection-pool exhaustion.

N+1 is not specific to ORMs. It appears wherever code navigates relationships one item at a time: ORM lazy loading, GraphQL resolvers (one resolver call per field per parent), REST clients calling `/customers/:id` in a loop, and microservices fetching details per item.

---

## How it works

### How it happens

```
for order in orders:                 -- orders came from 1 query
    print(order.customer.name)       -- lazy load: 1 query per order
```

The trigger is **implicit loading inside a loop**. ORMs make it easy because `order.customer` looks like a field access, not a database call. GraphQL makes it easy because each resolver sees one parent at a time.

Variants:

- **Nested N+1** — orders → lines → product: 1 + N + N×M queries.
- **N+1 in writes** — inserting or updating rows one at a time in a loop instead of one multi-row statement.
- **Serialization N+1** — a JSON serializer touches lazy relations while building the response, after the code you were looking at has finished.

### How to detect it

| Technique | What you look for |
|---|---|
| SQL logging in development | The same statement repeated with different parameters |
| Query count assertions in tests | `expect(queryCount).toBeLessThanOrEqual(3)` for an endpoint or use case |
| APM / tracing (OpenTelemetry DB spans) | A request trace with dozens or hundreds of short, identical DB spans |
| Database statistics (`pg_stat_statements`) | A cheap query with an enormous call count |
| Strict-loading modes | Some ORMs can raise an error when a relation is lazy-loaded |

Query-count assertions are the most reliable guard: they fail in CI, before production traffic finds the problem.

### How to fix it

**1. Eager loading with a join** — fetch parents and the related row in one query. Best for *to-one* relations (order → customer).

```sql
SELECT o.id, o.total, c.id AS customer_id, c.name AS customer_name
FROM orders o
JOIN customers c ON c.id = o.customer_id
ORDER BY o.created_at DESC
LIMIT 100;
```

**2. Batched loading with `IN`** — one query for parents, one query for all children, stitched together in memory. Best for *to-many* relations, where a join would repeat parent columns for every child row (a cartesian blow-up).

```sql
SELECT id, total FROM orders ORDER BY created_at DESC LIMIT 100;
SELECT order_id, product_id, qty FROM order_lines WHERE order_id IN (1, 2, 3, ...);  -- or = ANY($1)
```

**3. Aggregation in the database** — when you need a JSON tree, let the database build it in one round trip (PostgreSQL `json_agg`, MySQL `JSON_ARRAYAGG`). Many query builders expose this as a helper.

```sql
SELECT o.id, o.total,
       COALESCE(json_agg(json_build_object('product_id', l.product_id, 'qty', l.qty))
                FILTER (WHERE l.id IS NOT NULL), '[]') AS lines
FROM orders o
LEFT JOIN order_lines l ON l.order_id = o.id
GROUP BY o.id;
```

**4. Request-scoped batching (DataLoader pattern)** — collect all keys requested during one tick of the event loop or one resolver level, issue a single `IN` query, and cache by key for the rest of the request. This is the standard fix for GraphQL, where you cannot know the shape of the query in advance.

```
loader = DataLoader(keys -> SELECT * FROM customers WHERE id IN (keys))

for order in orders:
    loader.load(order.customer_id)   -- queued, not executed
-- end of tick: ONE query with all distinct ids; duplicates served from cache
```

**5. Projections** — select only the fields the screen needs (a read model or a view) instead of loading entity graphs and navigating them.

Choosing between them:

| Relation / situation | Preferred fix |
|---|---|
| To-one (order → customer) | Join |
| To-many (order → lines), moderate size | Batched `IN` query, or JSON aggregation |
| To-many, large or paginated children | Separate paginated query per screen, not per row |
| GraphQL or other unknown query shapes | DataLoader per request |
| Read-heavy listing screens | Dedicated projection / view |
| Writes in a loop | Multi-row `INSERT`, `UPDATE ... FROM`, or bulk API |

### The opposite failure: over-eager loading

Fixing N+1 by eager-loading everything creates the inverse problem: huge joins, duplicated parent rows, and megabytes of data for a screen that shows ten fields. Load what the use case needs, per query, and measure both query count and rows returned.

---

## Examples

**Lazy loading in an ORM (pseudo-code) and its fix:**

```
-- N+1: 1 query for orders + 1 per order for the customer
orders = orderRepository.findRecent(limit: 100)
for order in orders:
    render(order.id, order.customer.name)

-- Fixed: relation loaded with the parent, 1 query (join) or 2 (batched)
orders = orderRepository.findRecent(limit: 100, include: ["customer"])
for order in orders:
    render(order.id, order.customer.name)
```

**Bulk write instead of a loop:**

```sql
-- N statements
UPDATE products SET price = $1 WHERE id = $2;  -- repeated N times

-- 1 statement
UPDATE products AS p
SET price = v.price
FROM (VALUES (1, 9.90), (2, 19.90), (3, 4.50)) AS v(id, price)
WHERE p.id = v.id;
```

**A query-count guard in a TypeScript integration test** (the counting hook depends on the driver or ORM; most expose a query event or logger):

```ts
test("recent orders page runs a bounded number of queries", async () => {
  const counter = countQueries(db);          // wraps the driver's query event
  await listRecentOrders({ limit: 100 });
  expect(counter.total).toBeLessThanOrEqual(2);
});
```

---

## When to use

These fixes apply whenever:

- A list endpoint, page, or job touches a relation of each item.
- A GraphQL schema exposes relations between types — use per-request DataLoaders by default.
- Traces or `pg_stat_statements` show a cheap query with a call count proportional to result size.
- A loop issues writes one row at a time.
- You introduce or upgrade an ORM — add query-count assertions for the critical endpoints at the same time.

## When NOT to use

- Do not eager-load every relation "just in case" — that trades N+1 for over-fetching and cartesian joins.
- Do not join a to-many relation into a paginated parent query (`LIMIT` applies to the joined rows, not the parents); paginate parents first, then batch-load children.
- Do not add an application cache to hide N+1 — fix the access pattern; the cache only moves the problem.
- Do not worry about it when N is small and bounded by design (e.g. at most three related rows) and the code is clearer for it — measure first.
- Do not use `IN` lists with tens of thousands of literals; use `= ANY($1)` with an array parameter, a temporary table, or a join against the source query.

---

## References

- [Martin Fowler — Lazy Load](https://martinfowler.com/eaaCatalog/lazyLoad.html)
- [GraphQL — DataLoader (GitHub)](https://github.com/graphql/dataloader)
- [PostgreSQL — `pg_stat_statements`](https://www.postgresql.org/docs/current/pgstatstatements.html)
- [PostgreSQL — Aggregate functions (`json_agg`)](https://www.postgresql.org/docs/current/functions-aggregate.html)
- [Rails Guides — Eager loading associations (N+1)](https://guides.rubyonrails.org/active_record_querying.html#eager-loading-associations)
