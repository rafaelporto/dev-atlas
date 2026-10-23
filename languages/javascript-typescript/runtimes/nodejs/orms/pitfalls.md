---
type: concept
tags:
  - language
  - nodejs
  - backend
  - orm
  - antipattern
related:
  - languages/javascript-typescript/runtimes/nodejs/orms/overview
  - languages/javascript-typescript/runtimes/nodejs/orms/choosing
  - languages/javascript-typescript/runtimes/nodejs/orms/migrations
  - languages/javascript-typescript/runtimes/nodejs/orms/raw-sql
  - software-engineering/databases/concepts/n-plus-one-problem
  - software-engineering/databases/concepts/orm-and-data-mapping
  - languages/javascript-typescript/runtimes/nodejs/testing
  - languages/javascript-typescript/frameworks/nextjs/orms/serverless-and-edge
language: "nodejs"
---
# ORM Pitfalls in Node.js

> The recurring ways ORM and query-builder code goes wrong in Node.js and TypeScript services: N+1 queries, over-fetching, client and pool misuse, transaction mistakes, unsafe migrations, leaking entities across layers, and mocking the database away. Each one comes with how to spot it and how to fix it.

---

## What is it?

This is a catalogue of mistakes that show up again and again in Node services that use an ORM or query builder. Prisma, Drizzle, Kysely, TypeORM, MikroORM and Sequelize differ in API, but they fail in the same places. That is because the failures come from the database and the runtime, not from the library.

Each entry has the **symptom** you notice, the **cause**, and the **fix**.

---

## Why does it matter?

ORMs make the common case look trivial, and that hides the cost of the uncommon one. A line like `order.customer.name` or `await db.user.findMany()` can mean one query or a thousand, one row or a million. In Node the damage is amplified:

- One process serves many concurrent requests over a **small connection pool**. A slow or leaked connection blocks everyone, not just one thread.
- **Serverless and container scale-out** multiply pools. A footgun that is harmless on one instance exhausts the database at fifty.
- **TypeScript types make code look safe.** Types prove the shape of the result. They do not prove that the query is efficient, that it runs inside the transaction, or that the column exists in production yet.

Most production incidents caused by ORMs are among the items below.

---

## How it works

### 1. N+1 queries

- **Symptom** — a list endpoint gets slower as data grows; traces show dozens of identical short queries.
- **Cause** — relations loaded per row inside a loop, a serializer, or a GraphQL resolver.
- **Fix** — load the relation with the parent (`include`/`with`/`populate`), batch with an `IN`/`= ANY($1)` query, or use a per-request DataLoader for GraphQL. Add query-count assertions to tests. See [The N+1 Query Problem](../../../../../software-engineering/databases/concepts/n-plus-one-problem.md).

### 2. Over-fetching

- **Symptom** — high memory, large payloads, slow serialization. Sensitive columns (password hashes, internal flags) show up in API responses.
- **Cause** — `findMany()` without `select`, or `SELECT *` mapped into entities. Eager-loading every relation to "fix" N+1. Missing `LIMIT`/pagination.
- **Fix** — select only the columns the use case needs. Paginate every list (keyset pagination for large tables). Map to response DTOs explicitly; never return ORM entities straight from a handler.

### 3. A client or pool per request

- **Symptom** — `too many connections` / `remaining connection slots are reserved` errors, rising latency under load, memory growth.
- **Cause** — `new PrismaClient()`, `new Pool()`, `drizzle(new Pool())` or `new DataSource().initialize()` inside a handler or function body. In development, hot reload re-runs the module and creates a new client on every edit.
- **Fix** — create one client per process at module scope (the composition root) and inject it. Size the pool to `database max_connections / number of instances`, minus headroom. In serverless, use small pools plus an external pooler. Next.js dev hot reload needs a `globalThis` singleton; see [Next.js ORMs](../../../frameworks/nextjs/orms/overview.md).

### 4. Leaked connections and forgotten transactions

- **Symptom** — the app stops responding after some time; the pool reports all connections checked out; the database shows sessions `idle in transaction`.
- **Cause** — `pool.connect()` without `release()` in `finally`. A manual `BEGIN` with an early `return` or a thrown error that skips `ROLLBACK`.
- **Fix** — prefer callback-style transaction APIs that commit on resolve and roll back on throw (`db.transaction(async (tx) => …)`, `prisma.$transaction(async (tx) => …)`, `em.transactional(...)`). Set `idle_in_transaction_session_timeout` and `statement_timeout` on the database role.

### 5. Code that escapes the transaction

- **Symptom** — partial writes after an error, even though "it's in a transaction".
- **Cause** — inside the callback, some calls use the **global** client (`db`, `prisma`) instead of the transaction handle (`tx`). Those statements run on another connection, outside the transaction.
- **Fix** — pass `tx` explicitly to every repository function used inside the unit of work, or use the ORM's context mechanism (MikroORM's forked `EntityManager`, `AsyncLocalStorage`-based helpers). Make repository functions take the executor as a parameter so a wrong client is visible in review.

### 6. Long transactions and external calls inside them

- **Symptom** — lock waits, deadlocks, pool starvation, and transaction timeouts (interactive transactions in some ORMs have a default timeout of a few seconds).
- **Cause** — HTTP calls, queue publishes, emails, or heavy CPU work between `BEGIN` and `COMMIT`.
- **Fix** — keep transactions short and database-only. Do external work before (read and validate) or after (outbox pattern: write an event row in the same transaction, publish it asynchronously).

### 7. Read-modify-write races

- **Symptom** — lost updates (two requests both read `stock = 1` and both sell it), duplicate rows under concurrency.
- **Cause** — the "load entity, change field, save" style turns an atomic operation into two round trips with a gap between them.
- **Fix** — atomic updates (`UPDATE … SET stock = stock - 1 WHERE id = $1 AND stock > 0`), unique constraints with upsert (`ON CONFLICT`), `SELECT … FOR UPDATE` in a transaction, or optimistic locking with a version column. Constraints in the database are the last line of defense, so declare them.

### 8. Schema sync and migrations at boot

- **Symptom** — dropped columns or data in production, deploys that hang, several instances racing to migrate.
- **Cause** — `synchronize: true` (TypeORM), `prisma db push` or `drizzle-kit push` against production, or migrations run from the app's startup code on every instance.
- **Fix** — versioned migrations, reviewed as SQL, run once per deploy as a separate step. Use expand/contract for zero-downtime changes. See [Migrations](migrations.md).

### 9. Leaking entities and ORM types across layers

- **Symptom** — every schema change ripples through controllers, views, and API contracts. Swapping or upgrading the ORM becomes a rewrite.
- **Cause** — handlers and domain logic import generated ORM types or entity classes directly. Lazy relations get resolved during JSON serialization.
- **Fix** — keep ORM calls in a data-access module (repository or query functions) that returns domain types or DTOs. The rest of the app depends on those, not on `@prisma/client` or entity classes. See [Backend Architecture](../architecture.md).

### 10. Trusting types over the database

- **Symptom** — runtime `null`s in fields typed as non-null, wrong dates or numbers, `bigint` and decimal surprises.
- **Cause** — hand-written types that drifted from the real schema. `numeric`/`bigint` columns returned as strings by the driver. Timezone-less timestamps. Raw queries cast with `as User`.
- **Fix** — generate types from the schema (or the schema from code) and check for drift in CI. Validate raw query results with a schema (e.g. Zod) at the boundary. Know your driver's type parsers.

### 11. Mocking the database in tests

- **Symptom** — tests pass, production fails on constraints, SQL syntax, transaction behavior, or query plans.
- **Cause** — the ORM client is mocked, or tests run against SQLite while production runs PostgreSQL.
- **Fix** — run integration tests against the same engine and version (Testcontainers or a Docker service in CI). Isolate tests with a transaction per test or a schema per worker. Keep mocks for the domain layer only.

### 12. Ignoring the generated SQL

- **Symptom** — "the ORM is slow"; nobody knows which query.
- **Cause** — query logging is off and no one runs `EXPLAIN`.
- **Fix** — enable query logging in development. Export DB spans with OpenTelemetry in production. Check `pg_stat_statements` for the top queries by total time. Read `EXPLAIN (ANALYZE, BUFFERS)` for the slow ones. When the ORM cannot produce the query you need, use a typed raw query; see [Raw SQL](raw-sql.md).

### Quick reference

| Pitfall | First signal | Default fix |
|---|---|---|
| N+1 | Many identical queries per request | Eager/batched loading, DataLoader |
| Over-fetching | Big payloads, leaked columns | `select` + DTOs + pagination |
| Client per request | Connection errors under load | One client per process |
| Leaked connection | Pool exhausted, `idle in transaction` | Callback transactions, timeouts |
| Escaping the transaction | Partial writes | Pass `tx` everywhere |
| Long transactions | Lock waits, timeouts | DB-only transactions, outbox |
| Read-modify-write | Lost updates | Atomic SQL, constraints, locking |
| Sync/migrate at boot | Data loss, racing deploys | Versioned migrations in a deploy step |
| Leaking entities | Schema changes ripple everywhere | Repository boundary, DTOs |
| Types over reality | Runtime type mismatches | Generated types, boundary validation |
| Mocked DB | Prod-only failures | Real engine in tests |
| Invisible SQL | "ORM is slow" | Query logs, tracing, `EXPLAIN` |

---

## Examples

**Escaping the transaction** (Drizzle-style API; the same mistake exists in every ORM):

```ts
// Wrong: createInvoice uses the global db, so it commits even if the order insert fails
await db.transaction(async (tx) => {
  const [order] = await tx.insert(orders).values(input).returning();
  await createInvoice(order.id); // uses `db` internally — outside the transaction
});

// Right: the executor is a parameter, so the call site decides
type Executor = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

async function createInvoice(exec: Executor, orderId: number) {
  await exec.insert(invoices).values({ orderId });
}

await db.transaction(async (tx) => {
  const [order] = await tx.insert(orders).values(input).returning();
  await createInvoice(tx, order.id);
});
```

**Read-modify-write vs atomic update:**

```ts
// Race: two concurrent requests can both see stock = 1
const product = await prisma.product.findUniqueOrThrow({ where: { id } });
if (product.stock < 1) throw new OutOfStock();
await prisma.product.update({ where: { id }, data: { stock: product.stock - 1 } });

// Atomic: the database checks and decrements in one statement
const { count } = await prisma.product.updateMany({
  where: { id, stock: { gte: 1 } },
  data: { stock: { decrement: 1 } },
});
if (count === 0) throw new OutOfStock();
```

**One client per process, injected:**

```ts
// db.ts — created once at module load, reused by every request
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";

export const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 10 });
export const db = drizzle(pool);

// shutdown.ts — close the pool on SIGTERM so in-flight queries finish
process.on("SIGTERM", async () => {
  await pool.end();
});
```

**Mapping to a DTO instead of returning the entity:**

```ts
export async function getUserProfile(id: string): Promise<UserProfileDto> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id },
    select: { id: true, name: true, createdAt: true }, // never passwordHash
  });
  return { id: user.id, name: user.name, memberSince: user.createdAt.toISOString() };
}
```

---

## When to use

Use this list as a checklist:

- When reviewing pull requests that touch data access — items 1, 2, 5, 7 and 9 are visible in code review.
- When adopting or upgrading an ORM — set up query logging, query-count tests, and a real database in CI from day one.
- When moving a service to serverless or scaling out instances — re-check items 3, 4 and 6.
- When diagnosing a database incident — start from items 3, 4, 6 and 12.

## When NOT to use

- Do not treat these as reasons to ban ORMs. Every item also exists with raw SQL (leaked connections, races, N+1 in loops). The ORM only makes some of them easier to write.
- Do not over-correct item 2 by hand-writing `select` for trivial admin screens or internal tools where payload size does not matter.
- Do not add a repository layer (item 9) to a small script or prototype — the indirection costs more than it saves.
- Do not apply pessimistic locking (item 7) by default; prefer atomic statements and constraints, and lock only where contention is real.

---

## References

- [PostgreSQL — Client connection defaults (`statement_timeout`, `idle_in_transaction_session_timeout`)](https://www.postgresql.org/docs/current/runtime-config-client.html)
- [PostgreSQL — Explicit locking](https://www.postgresql.org/docs/current/explicit-locking.html)
- [PostgreSQL — `INSERT … ON CONFLICT`](https://www.postgresql.org/docs/current/sql-insert.html#SQL-ON-CONFLICT)
- [node-postgres — Pooling](https://node-postgres.com/features/pooling)
- [Prisma — Transactions and batch queries](https://www.prisma.io/docs/orm/prisma-client/queries/transactions)
- [Drizzle — Transactions](https://orm.drizzle.team/docs/transactions)
- [Testcontainers for Node.js](https://node.testcontainers.org/)
- [Chris Richardson — Transactional outbox pattern](https://microservices.io/patterns/data/transactional-outbox.html)
