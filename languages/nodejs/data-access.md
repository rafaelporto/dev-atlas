---
type: concept
tags:
  - language
  - nodejs
  - backend
  - database
  - decision-support
related:
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

**1. Raw driver** — you write SQL; the driver runs it. Maximum control, minimum magic.

```javascript
import { Pool } from "pg";
const pool = new Pool({ connectionString: config.databaseUrl });

const { rows } = await pool.query(
  "SELECT id, name FROM users WHERE id = $1", // parameterized — prevents SQL injection
  [id],
);
```

**2. Query builder** — programmatic, type-safe SQL without hand-concatenation (e.g., **Knex**, **Drizzle**, **Kysely**).

```javascript
const users = await db
  .selectFrom("users")
  .select(["id", "name"])
  .where("id", "=", id)
  .execute();
```

**3. ORM** — maps rows to objects/entities, handles migrations and relations (e.g., **Prisma**, **TypeORM**, **Sequelize**).

```javascript
const user = await prisma.user.findUnique({ where: { id }, include: { orders: true } });
```

**Trade-offs**

| Axis | Raw driver | Query builder | ORM |
|---|---|---|---|
| Control over SQL | full | high | lower |
| Type safety (TS) | manual | strong (Drizzle/Kysely) | strong (Prisma) |
| Boilerplate | high | medium | low |
| Complex/perf queries | best | good | can fight you |
| Learning/lock-in | low | low–medium | higher |

> **Default recommendation:** for a TypeScript service, a **type-safe query builder (Drizzle or Kysely)** hits the best balance — strong types, transparent SQL, minimal magic. Choose a full **ORM (Prisma)** when you want managed migrations and relation loading and your queries are mostly CRUD. Drop to the **raw driver** for performance-critical or highly dynamic queries.

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
- Use a **type-safe query builder** (Drizzle/Kysely) as the default abstraction in TypeScript; an **ORM** (Prisma) for CRUD-heavy apps wanting managed migrations.
- Always use **connection pooling**, **parameterized queries**, **versioned migrations**, and **transactions** for multi-step invariants.
- Choose a document/key-value/specialized store only when the access pattern genuinely fits it.

## When NOT to use

- Do not pick a database for novelty — a mature relational engine covers most needs; specialized stores add operational burden.
- Do not build SQL by string concatenation — it invites injection; parameterize.
- Do not open a new connection per request or run migrations at app startup.
- Do not adopt a heavy ORM for a service whose queries are complex or performance-critical — you'll fight the abstraction.
- Do not store cache/session state only in Redis and treat it as durable — it is ephemeral by design.

---

## References

- [PostgreSQL — Documentation](https://www.postgresql.org/docs/)
- [node-postgres (`pg`) — Documentation](https://node-postgres.com/)
- [Redis — Documentation](https://redis.io/docs/latest/)
- [MongoDB — Node.js Driver](https://www.mongodb.com/docs/drivers/node/current/)
- [Node.js — `node:sqlite`](https://nodejs.org/api/sqlite.html)
- [Prisma — Documentation](https://www.prisma.io/docs)
