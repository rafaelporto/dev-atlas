---
type: concept
tags:
  - language
  - nodejs
  - backend
  - database
  - orm
  - decision-support
related:
  - languages/nodejs/orms/overview
  - languages/nodejs/orms/choosing
  - software-engineering/databases/types/relational
  - software-engineering/databases/types/key-value
  - languages/nodejs/architecture
language: "nodejs"
---
# Data Access and Databases

> How to connect Node.js to mature, production-proven databases, and how to choose between a raw driver, a query builder, and an ORM — with a sensible default for each axis.

---

## What is it?

Data access is how a Node service reads and writes persistent data. It has two decisions: **which database** to use (relational, key-value, document, …) and **which client abstraction** to talk to it with (a low-level driver, a query builder, or an ORM). This article surveys the mature choices and gives a defensible default for each, cross-referencing the [databases section](../../software-engineering/databases/README.md) for the deeper database-type theory.

---

## Why does it matter?

The database is the hardest part of a system to change later. Picking a mature engine with a well-maintained Node driver avoids a class of reliability and hiring problems. The client-abstraction choice trades control for convenience — and getting it wrong leads either to unsafe hand-built SQL or to an ORM fighting you on every non-trivial query.

---

## How it works

### Choosing a database (mature options)

| Need | Mature choice | Node client (official/standard) |
|---|---|---|
| Relational / transactional core data | **PostgreSQL** | `pg` (node-postgres), `postgres` |
| Simpler relational / embedded | **SQLite** | `node:sqlite` (built-in), `better-sqlite3` |
| Cache, sessions, rate limits, queues | **Redis** | `redis` (node-redis), `ioredis` |
| Flexible document model | **MongoDB** | `mongodb` (official driver) |
| Managed relational at scale | Postgres-compatible (managed) | same as Postgres |

> **Default recommendation:** unless you have a specific reason otherwise, start with **PostgreSQL**. It is battle-tested, supports relational integrity *and* JSON/JSONB, has excellent Node drivers, and scales far further than most projects ever need. Add **Redis** when you need caching or ephemeral state. Reach for a document or specialized store only when the data model genuinely demands it — see the [database types](../../software-engineering/databases/types/README.md) for when each fits.

### Choosing a client abstraction

Three levels, from most control to most convenience:

| Level | What you write | Examples | Use it for |
|---|---|---|---|
| **Raw driver** | SQL with parameters; you get rows | `pg`, `postgres`, `mysql2`, `better-sqlite3` | Reports, bulk operations, hot paths, DB-specific features |
| **Query builder / SQL-like ORM** | SQL as typed code; result types inferred | Kysely, Drizzle | The default for most TypeScript services |
| **ORM** | Models and relations; the tool writes SQL | Prisma, MikroORM, TypeORM | CRUD-heavy apps, rich domain models, mixed-SQL-skill teams |

> **Default recommendation:** for a TypeScript service, a **type-safe query builder or SQL-like ORM (Kysely or Drizzle)** hits the best balance — strong types, transparent SQL, minimal magic. Choose a full **ORM** (Prisma, or MikroORM for rich domains) when you want managed relations and migrations, and keep a typed **raw-SQL** escape hatch for the queries no abstraction expresses well.

The full comparison — maturity and maintenance status of each tool, a decision flow, migrations, and common pitfalls — is in [ORMs and Data Access](orms/README.md); start with the [overview](orms/overview.md) and [Choosing a Data Access Tool](orms/choosing.md).

### Cross-cutting essentials

- **Connection pooling** — never open a connection per request; use a pool (`pg.Pool`) sized to your DB limits. Serverless needs a pooler (e.g., PgBouncer) because functions multiply connections.
- **Parameterized queries** — always; never string-concatenate user input into SQL (injection).
- **Migrations** — version schema changes in code (built into Prisma/Drizzle/Knex); run them in deploy, not at app boot.
- **Transactions** — wrap multi-statement invariants in a transaction.
- **Timeouts & retries** — set statement/connection timeouts; retry only idempotent operations.

---

## Examples

```javascript
// Transaction with the raw driver — all-or-nothing
async function transfer(from, to, amount) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("UPDATE accounts SET balance = balance - $1 WHERE id = $2", [amount, from]);
    await client.query("UPDATE accounts SET balance = balance + $1 WHERE id = $2", [amount, to]);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release(); // return the connection to the pool
  }
}

// Redis as a cache-aside layer in front of the database
async function getUser(id) {
  const cached = await redis.get(`user:${id}`);
  if (cached) return JSON.parse(cached);
  const user = await loadUserFromDb(id);
  await redis.set(`user:${id}`, JSON.stringify(user), { EX: 300 }); // 5-min TTL
  return user;
}
```

---

## When to use

- Default to **PostgreSQL** for primary data; add **Redis** for caching/ephemeral state.
- Use a **type-safe query builder or SQL-like ORM** (Kysely/Drizzle) as the default abstraction in TypeScript; a full **ORM** where its model pays off — see [Choosing a Data Access Tool](orms/choosing.md).
- Always use **connection pooling**, **parameterized queries**, **versioned migrations**, and **transactions** for multi-step invariants.
- Choose a document/key-value/specialized store only when the access pattern genuinely fits it.

## When NOT to use

- Do not pick a database for novelty — a mature relational engine covers most needs; specialized stores add operational burden.
- Do not build SQL by string concatenation — it invites injection; parameterize.
- Do not open a new connection per request or run migrations at app startup.
- Do not adopt a heavy ORM for a service whose queries are complex or performance-critical — you'll fight the abstraction (see [ORM Pitfalls](orms/pitfalls.md)).
- Do not store cache/session state only in Redis and treat it as durable — it is ephemeral by design.

---

## References

- [PostgreSQL — Documentation](https://www.postgresql.org/docs/)
- [node-postgres (`pg`) — Documentation](https://node-postgres.com/)
- [Redis — Documentation](https://redis.io/docs/latest/)
- [MongoDB — Node.js Driver](https://www.mongodb.com/docs/drivers/node/current/)
- [Node.js — `node:sqlite`](https://nodejs.org/api/sqlite.html)
- [Prisma — Documentation](https://www.prisma.io/docs)
- [Kysely — Documentation](https://kysely.dev/docs/intro)
- [Drizzle ORM — Documentation](https://orm.drizzle.team/docs/overview)
