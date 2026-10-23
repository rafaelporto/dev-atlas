---
type: concept
tags:
  - language
  - nodejs
  - backend
  - orm
related:
  - languages/javascript-typescript/runtimes/nodejs/orms/overview
  - languages/javascript-typescript/runtimes/nodejs/orms/choosing
  - languages/javascript-typescript/runtimes/nodejs/orms/drizzle
  - languages/javascript-typescript/runtimes/nodejs/orms/migrations
  - languages/javascript-typescript/runtimes/nodejs/orms/pitfalls
  - software-engineering/databases/concepts/n-plus-one-problem
  - languages/javascript-typescript/frameworks/nextjs/orms/serverless-and-edge
language: "nodejs"
---
# Prisma

> Prisma is the most-downloaded TypeScript ORM: a schema-first model with a generated, fully typed client and an integrated migration tool — excellent DX for CRUD-heavy apps, paid for with a proprietary schema language, a codegen step, an abstraction that hides SQL, and a product roadmap that keeps rewriting its own foundations.

> Versions, maintenance status, and weekly npm downloads were checked in **October 2026** (downloads: week of 12–18 October 2026). Prisma is mid-transition from **Prisma 7** (stable, `@prisma/client` 7.10.1) to **Prisma 8** (release candidate, GA expected October 2026). Re-check before choosing.

---

## What is it?

Prisma is a tool that lets a Node.js application read and write a database through generated, type-safe functions instead of hand-written SQL. You describe your tables once in a `schema.prisma` file; Prisma generates a client whose methods (`prisma.user.findMany(...)`) and return types match that schema exactly, and its migration tool (Prisma Migrate) turns schema changes into SQL migration files.

It is not a classic ORM in the Active Record or Data Mapper sense (see [ORM and data mapping](../../../../../software-engineering/databases/concepts/orm-and-data-mapping.md)): there are no entity classes, no identity map, no lazy loading, and no change tracking. Results are plain objects; every database round trip is an explicit `await`.

---

## Why does it matter?

- **It is the default many teams reach for.** `prisma` (CLI) and `@prisma/client` each sit around **11–12 million weekly downloads**, ahead of every other Node.js ORM. Tutorials, starter kits, and auth libraries (Better Auth, Auth.js) ship Prisma adapters first.
- **The type safety is real.** `select` and `include` change the return type, so selecting two columns gives you an object type with exactly two fields. Renaming a column breaks compilation at every call site.
- **The ground has moved three times in two years.** The Rust query engine was replaced by a Wasm/TypeScript "query compiler" (GA in 6.16.0, September 2025; default in 7.0.0, November 2025). Prisma 7 then made driver adapters mandatory, moved the generated client out of `node_modules`, and dropped MongoDB. Prisma 8 is a ground-up TypeScript rewrite with a different API. Anything you read about Prisma from 2024 or earlier — "huge binary", "no edge support", "can't use your own driver" — is partly obsolete, and some new trade-offs replaced it.

---

## How it works

### Schema-first model and the generated client

```
schema.prisma ──prisma generate──► src/generated/prisma/   (typed client: models, inputs, results)
      │
      └──prisma migrate dev──────► prisma/migrations/<timestamp>_<name>/migration.sql
```

- **Prisma Schema Language (PSL)** — a proprietary DSL with `model`, `enum`, `@relation`, `@@index`, etc. Database-specific types use `@db.*` attributes.
- **`prisma.config.ts`** (required for Migrate and introspection since 7.0) — holds the datasource URL, shadow database URL, migrations path, and seed command. The CLI no longer loads `.env` automatically; you import `dotenv/config` yourself.
- **Generator** — the `prisma-client` generator (default since 7.0) emits plain TypeScript into a required `output` directory you commit to or regenerate in CI. Since 7.0 `prisma generate` no longer runs on `postinstall` or after `migrate dev`: forgetting it gives you stale types.
- **Driver adapters** — since 7.0 `new PrismaClient()` without arguments is gone. You pass an adapter that wraps a JavaScript driver: `@prisma/adapter-pg` (`pg`), `@prisma/adapter-mariadb`, `@prisma/adapter-better-sqlite3`, `@prisma/adapter-libsql`, `@prisma/adapter-mssql`, `@prisma/adapter-neon`, `@prisma/adapter-planetscale`, `@prisma/adapter-d1`, `@prisma/adapter-ppg`. Connection pooling is now the driver's job (configure the `pg` pool, not Prisma).

### The query API

| Operation | API | Notes |
|---|---|---|
| Read | `findUnique`, `findFirst`, `findMany`, `count`, `aggregate`, `groupBy` | Filters as nested objects (`where: { posts: { some: { published: true } } }`) |
| Shape the result | `select` (pick fields) or `include` (add relations) | Mutually exclusive at the same level; both narrow the TypeScript type |
| Write | `create`, `createMany`, `update`, `updateMany`, `upsert`, `delete`, `deleteMany` | `createManyAndReturn` / `updateManyAndReturn` on Postgres, CockroachDB, SQLite |
| Nested writes | `create: { posts: { create: [...] } }`, `connect`, `connectOrCreate`, `disconnect` | Run atomically in one transaction |
| Escape hatches | `$queryRaw`, `$executeRaw`, TypedSQL | See below |

The API is GraphQL-shaped, not SQL-shaped. That is its strength (easy, uniform, typed) and its ceiling: no arbitrary joins between unrelated models, no `CASE`, window functions, CTEs, or `UPDATE … FROM` without dropping to raw SQL. `findUnique` calls issued in the same tick are batched automatically (a built-in dataloader), which mitigates the most common [N+1](../../../../../software-engineering/databases/concepts/n-plus-one-problem.md) pattern in GraphQL resolvers — but a `for` loop with `await` inside still issues N queries.

### Relation loading: `join` vs `query`

Historically Prisma loaded `include` relations with **one query per table** and stitched results in memory. With the `relationJoins` preview feature (still Preview in Prisma 7), `relationLoadStrategy` chooses per query:

| Strategy | How | Good for | Bad for |
|---|---|---|---|
| `join` (default when the preview is on) | One SQL statement: `LATERAL JOIN` + JSON aggregation on Postgres, correlated subqueries on MySQL | Fewer round trips, high-latency links (serverless → remote DB) | Wide fan-out; JSON aggregation cost on the DB |
| `query` | One query per table, merged in the client | Large result sets, DB CPU is the bottleneck | Many round trips |

Available on PostgreSQL, CockroachDB, and MySQL. Without the preview flag you always get the `query` strategy.

### Transactions

- **Nested writes** — automatically transactional.
- **Sequential (batch) `$transaction([...])`** — an array of independent queries executed in order inside one transaction. You cannot use the result of query 1 as input to query 2.
- **Interactive `$transaction(async (tx) => { ... })`** — arbitrary logic with a `tx` client. Defaults: `maxWait` **2,000 ms** to acquire a connection and `timeout` **5,000 ms** total; `isolationLevel` is configurable. The timeout exists because the transaction holds a pooled connection: never call external APIs inside one.
- **Footgun** — using the outer `prisma` instead of `tx` inside the callback silently runs that query *outside* the transaction. There is no ambient (AsyncLocalStorage) transaction propagation; you pass `tx` explicitly through your call graph.

### Raw SQL

- **`$queryRaw` / `$executeRaw` as tagged templates** — interpolated values become bind parameters, so `` prisma.$queryRaw`... WHERE id = ${id}` `` is injection-safe. Compose with `Prisma.sql`, `Prisma.join`, `Prisma.raw` (the last is unsafe).
- **`$queryRawUnsafe`** — takes a plain string. The name is the warning; interpolating user input here is SQL injection.
- **TypedSQL** (Preview, `previewFeatures = ["typedSql"]`) — write `.sql` files in `prisma/sql/`, run `prisma generate --sql`, and import a typed function per file. Argument and result types are inferred from a live database for PostgreSQL and MySQL 8+; SQLite and older MySQL need manual type annotations. No dynamic columns, and generation needs a database connection (awkward in CI).

### Prisma Migrate

| Command | Where | What it does |
|---|---|---|
| `migrate dev` | Local only | Replays history in a **shadow database**, detects **drift**, generates a new SQL migration from the schema diff, applies it. On drift it offers to **reset** (drop all data) |
| `migrate deploy` | CI / production | Applies pending migrations in order; no shadow DB, no drift reset, no generation |
| `migrate diff` | Anywhere | Diffs schema ↔ migrations ↔ database and prints SQL — useful for review and for expand/contract changes |
| `migrate resolve` | Production repair | Marks a failed migration as applied or rolled back |
| `db push` | Prototyping | Syncs schema to DB without migration files (the only option on MongoDB) |

Migrations are plain SQL files you can edit — good. The shadow database requires `CREATEDB` (Postgres) or equivalent privileges, which managed or locked-down databases often deny; you then configure a dedicated `shadowDatabaseUrl`. There is no down-migration: rollback means writing a new forward migration. See [Migrations](migrations.md).

### Engine history

```
≤ 6.x        Rust query engine (Node-API library or binary, ~14 MB, per-platform binaryTargets)
6.7 (2025)   "queryCompiler" + "driverAdapters" preview: Rust compiled to Wasm plans queries,
             TypeScript executes them through a JS driver
6.16 (Sep 2025)  Rust-free client GA (opt-in, engineType = "client")
7.0 (Nov 2025)   Rust-free is the only client; adapters mandatory; MongoDB unsupported
7.4 (Feb 2026)   Query-plan LRU cache: Wasm compilation runs synchronously on the main thread
8.0 (RC, 2026)   Full TypeScript rewrite ("Prisma Next"): contracts, SQL builder, MongoDB back
```

Prisma's own numbers for the Rust-free client: bundle ~14 MB → ~1.6 MB and up to 3.4× faster queries by removing cross-language serialization. The 7.4 release notes admit the new trade-off: compiling each query takes 0.1–1 ms **blocking the event loop**, which hurt throughput under concurrency until plans were cached by query shape.

### Prisma 8: what is changing

Announced March 2026, first RC August 2026, GA expected October 2026. It keeps PSL and model-first queries but treats the schema as a versioned **contract** (also writable in TypeScript), adds a type-safe SQL builder (`db.sql.…`), and ships per-database packages (`@prisma/orm-postgres`, `@prisma/orm-mongo`). The CLI commands are new (`prisma contract emit`, `prisma db sign`, `prisma migration …`). As of the RC, several Prisma 7 features are missing — `$extends`, nested writes, atomic number operations, transaction `timeout`/`isolationLevel` options, and the array form of `$transaction`. Prisma 7 receives bug and security fixes for **18 months after Prisma 8 GA**, and is still the version Prisma recommends for production.

**Install footgun (October 2026):** the npm `latest` tag of the `prisma` CLI points to `8.0.0-rc.26` while `@prisma/client` `latest` is `7.10.1`. `npm i -D prisma` in a Prisma 7 project installs a v8 RC CLI. Pin `prisma@7` (Prisma's docs say `prisma@prev`) until you migrate. 7.10.0 added `@prisma/prisma7`, a `prisma7` binary that can run side by side with the v8 CLI.

### Databases, edge, and the commercial products

- **Supported (Prisma 7)** — PostgreSQL, MySQL/MariaDB, SQLite, SQL Server, CockroachDB, plus serverless flavours (Neon, PlanetScale, Turso/libSQL, Cloudflare D1, Supabase). Node.js 20.19+, 22.12+, or 24+; TypeScript 5.4+.
- **MongoDB** — supported in Prisma 6 only (6.19.x), with `db push` instead of Migrate and transactions requiring a replica set. Prisma 7 does not support it; it returns in Prisma 8 via `@prisma/orm-mongo`.
- **Edge** — with driver adapters, Prisma 7 runs on Cloudflare Workers/Pages and Vercel Edge (still labelled Preview) using HTTP/WebSocket drivers (Neon serverless, PlanetScale serverless, libSQL, D1, Prisma Postgres) or `pg` over TCP on Workers. See [Serverless and edge](../../../frameworks/nextjs/orms/serverless-and-edge.md).
- **The upsell** — Prisma the company sells **Prisma Postgres** (managed Postgres), **Accelerate** (connection pooling and query caching proxy), and, since 7.9, **Prisma Compute** (public beta). Docs, quickstarts, and `prisma init` lean toward these. Before 2025 Accelerate was the main way to run Prisma at the edge; that is no longer true. None of them is required — a self-hosted Postgres plus `@prisma/adapter-pg` is a fully supported path — but expect the funnel.

---

## Examples

Schema (Prisma 7):

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"   // URL lives in prisma.config.ts since 7.0
}

model User {
  id    Int    @id @default(autoincrement())
  name  String
  posts Post[]
}

model Post {
  id        Int     @id @default(autoincrement())
  title     String
  published Boolean @default(false)
  author    User    @relation(fields: [authorId], references: [id])
  authorId  Int

  @@index([authorId])
}
```

Client setup and CRUD with `select`:

```ts
import { PrismaClient } from "./generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
export const prisma = new PrismaClient({ adapter }); // one instance per process

// Nested write: user + two posts in one transaction
const user = await prisma.user.create({
  data: { name: "Ada", posts: { create: [{ title: "Notes" }, { title: "Engines" }] } },
});

// Type is { id: number; title: string; author: { name: string } }[]
const feed = await prisma.post.findMany({
  where: { published: true },
  select: { id: true, title: true, author: { select: { name: true } } },
  orderBy: { id: "desc" },
  take: 20,
});

await prisma.post.update({ where: { id: 1 }, data: { published: true } });
```

Interactive transaction — always use `tx`, never the outer client:

```ts
await prisma.$transaction(
  async (tx) => {
    const from = await tx.account.update({
      where: { id: fromId },
      data: { balance: { decrement: amount } },
    });
    if (from.balance < 0) throw new Error("Insufficient funds"); // rolls back
    await tx.account.update({
      where: { id: toId },
      data: { balance: { increment: amount } },
    });
  },
  { isolationLevel: "Serializable", timeout: 10_000 },
);
```

Raw SQL — the tagged template parameterizes values; TypedSQL adds types:

```ts
import { Prisma } from "./generated/prisma/client";

const minPosts = 5;
const rows = await prisma.$queryRaw<{ id: number; total: bigint }[]>`
  SELECT u.id, count(p.id) AS total
  FROM "User" u JOIN "Post" p ON p."authorId" = u.id
  GROUP BY u.id
  HAVING count(p.id) >= ${minPosts}
`;

// TypedSQL: prisma/sql/topAuthors.sql contains
//   -- @param {Int} $1:minPosts
//   SELECT u.id, count(p.id) AS total FROM "User" u JOIN "Post" p ON ... HAVING count(p.id) >= $1
import { topAuthors } from "./generated/prisma/sql";
const typed = await prisma.$queryRawTyped(topAuthors(minPosts)); // rows are typed

// Never: prisma.$queryRawUnsafe(`... WHERE name = '${input}'`)  — SQL injection
```

---

## When to use

- CRUD-heavy services and full-stack apps where most queries are "get this entity with these relations" and developer speed matters more than SQL control.
- Teams with mixed SQL skill: the typed API and readable schema lower the floor, and Migrate gives a sane default workflow.
- Projects that benefit from the ecosystem: auth libraries, admin tools (Prisma Studio), generators (Zod, docs, ERD) that read `schema.prisma`.
- Postgres/MySQL/SQLite apps on Node or serverless where you are happy to stay on Prisma 7 for the next 18+ months, or greenfield projects willing to adopt Prisma 8 after GA.

## When NOT to use

- SQL-heavy domains (reporting, analytics, complex joins, CTEs, window functions): you will live in `$queryRaw`. Prefer [Drizzle](drizzle.md), [Kysely](kysely.md), or [raw SQL](raw-sql.md).
- When you want the schema in TypeScript and no generate step: Drizzle defines tables in TS and infers types without codegen.
- Hot paths sensitive to per-query CPU overhead or event-loop blocking, unless you have benchmarked the query-compiler path with your workload.
- MongoDB projects starting now on Prisma 7 — not supported; Prisma 6 is a dead end and Prisma 8's Mongo support is RC-level.
- Teams that cannot absorb churn: 6 → 7 changed client construction, imports, config, and env loading; 7 → 8 changes the API itself. Budget migration work.
- When avoiding vendor lock-in matters: PSL, the generated client, and the migration history format are Prisma-specific; leaving means rewriting every query and re-baselining migrations. See [Choosing](choosing.md) and [Pitfalls](pitfalls.md).

---

## References

- [Prisma ORM 7 documentation](https://www.prisma.io/docs/orm/v7) — official docs for the stable line
- [Prisma release status (7 vs 8, support window)](https://www.prisma.io/docs/orm/release-status)
- [Prisma 7.0.0 release notes](https://github.com/prisma/prisma/releases/tag/7.0.0) — adapters mandatory, generated output, MongoDB unsupported
- [Prisma 6.16.0 release notes](https://github.com/prisma/prisma/releases/tag/6.16.0) — Rust-free client GA
- [Prisma 7.4.0 release notes](https://github.com/prisma/prisma/releases/tag/7.4.0) — query-plan cache and event-loop blocking
- [Prisma 7.10.0 release notes](https://github.com/prisma/prisma/releases/tag/7.10.0) — `@prisma/prisma7` side-by-side package
- [Relation queries and `relationLoadStrategy`](https://www.prisma.io/docs/orm/v7/prisma-client/queries/relation-queries)
- [Transactions and batch queries](https://www.prisma.io/docs/orm/v7/prisma-client/queries/transactions)
- [Raw queries](https://www.prisma.io/docs/orm/v7/prisma-client/using-raw-sql/raw-queries) and [TypedSQL](https://www.prisma.io/docs/orm/v7/prisma-client/using-raw-sql/typedsql)
- [About the shadow database](https://www.prisma.io/docs/orm/v7/prisma-migrate/understanding-prisma-migrate/shadow-database)
- [Database drivers and adapters](https://www.prisma.io/docs/orm/v7/core-concepts/supported-databases/database-drivers)
- [Deploying to edge functions](https://www.prisma.io/docs/orm/v7/prisma-client/deployment/edge/overview)
- [MongoDB with Prisma ORM](https://www.prisma.io/docs/orm/v7/core-concepts/supported-databases/mongodb)
- [Rust to TypeScript update: boosting Prisma ORM performance](https://www.prisma.io/blog/rust-to-typescript-update-boosting-prisma-orm-performance) — Prisma blog
- [The next evolution of Prisma ORM](https://www.prisma.io/blog/the-next-evolution-of-prisma-orm) — Prisma 8 announcement, March 2026
