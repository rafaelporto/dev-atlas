---
type: concept
tags:
  - language
  - nodejs
  - backend
  - orm
  - decision-support
related:
  - languages/nodejs/orms/overview
  - languages/nodejs/orms/choosing
  - languages/nodejs/orms/kysely
  - languages/nodejs/orms/prisma
  - languages/nodejs/orms/pitfalls
  - languages/nodejs/data-access
  - languages/nodejs/security
language: "nodejs"
---
# Raw SQL: When to Skip the ORM

> When hand-written SQL beats an ORM in Node.js (reporting, CTEs and window functions, bulk writes, upserts, hot paths, `LISTEN/NOTIFY`, `COPY`), what it costs you, the drivers and typed-SQL tools that reduce that cost, and how to keep SQL contained behind a repository layer.

---

## What is it?

"Raw SQL" means your application sends SQL text you wrote yourself straight to the database driver, instead of letting a library build the query from method calls. In Node.js that usually means a driver such as `pg`, `postgres` (postgres.js), `mysql2`, or `better-sqlite3`, optionally with a tool that generates TypeScript types from the SQL.

It is not all-or-nothing. Most production codebases that use an ORM also contain raw SQL — every major ORM ships an escape hatch (`$queryRaw` in Prisma, `sql` in Drizzle and Kysely, `query()` in TypeORM). The real question is **which queries** deserve hand-written SQL and how to keep them safe and typed.

> Versions, maintenance status, and weekly npm downloads were checked in **October 2026** (downloads: week of 12–18 October 2026). Re-check before choosing.

---

## Why does it matter?

ORMs optimize for the common case — load an entity, change it, save it. They are worst exactly where database cost concentrates:

- **Analytics and reporting** — aggregates, `GROUP BY ROLLUP`, window functions (`row_number() over (...)`), recursive CTEs. Most ORMs either cannot express these or produce SQL you would never write.
- **Bulk operations** — inserting 100k rows one `create()` at a time is orders of magnitude slower than one multi-row `INSERT`, `INSERT ... SELECT`, or `COPY`.
- **Upserts and conditional writes** — `INSERT ... ON CONFLICT DO UPDATE ... WHERE`, `UPDATE ... RETURNING`, `SELECT ... FOR UPDATE SKIP LOCKED` for job queues.
- **Hot paths** — the one endpoint that runs 2,000 times per second. Hydration overhead, extra round trips, and over-fetching (`SELECT *`) matter there and nowhere else.
- **Database-specific features** — Postgres `LISTEN/NOTIFY`, `COPY`, advisory locks, full-text search, JSONB operators, PostGIS. ORMs target the lowest common denominator.

The cost is real too: you give up generated types, automatic mapping, schema-driven migrations, and — if you are careless — injection safety. The goal is to pay that cost only where it buys something.

---

## How it works

### What you give up

| Lost when you skip the ORM | Mitigation |
|---|---|
| Result types | Typed-SQL generators (PgTyped, sqlc, Prisma TypedSQL) or runtime validation (Zod) |
| Row → object mapping (snake_case → camelCase, `Date`, `bigint`, `numeric`) | Alias in SQL (`created_at as "createdAt"`), driver type parsers, a mapper per repository |
| Injection safety by default | Parameterized queries only; identifier allow-lists; lint for string-built SQL |
| Schema-driven migrations | A separate migration tool — see [Migrations](migrations.md) |
| Relations / eager loading | Explicit joins or `json_agg` — which is often what you wanted anyway |
| Portability across databases | Rarely a real requirement; accept the lock-in consciously |

### Drivers

| Driver | Version (Oct 2026) | Weekly downloads | Notes |
|---|---|---|---|
| `pg` (node-postgres) | 8.23.1 (Sep 2026) | ~40M | The reference Postgres driver; underpins most ORMs. `$1` placeholders, `Pool`, `pg-cursor` and `pg-copy-streams` for cursors and `COPY`. Plain API, no query builder. |
| `postgres` (postgres.js) | 3.4.9 (Apr 2026) | ~14M | Tagged templates (`` sql`...${x}` ``) that are parameterized automatically; `sql(identifier)` and `sql(rows, 'col', ...)` helpers; built-in `listen`, `COPY` streams, `sql.begin` transactions; runs on Node, Deno, Bun, Cloudflare Workers. Release cadence is slow (single maintainer). |
| `mysql2` | 3.24.6 (Oct 2026) | ~9.6M | `?` and named placeholders; use `execute()` (server-side prepared) over `query()` (client-side interpolation). Promise API via `mysql2/promise`. |
| `better-sqlite3` | 13.0.3 (Aug 2026) | ~7.2M | Synchronous API — fastest SQLite option for a single process; native addon (rebuild per Node ABI). |
| `node:sqlite` | built into Node | — | Stability **1.2 (release candidate)** since Node 25.7; no flag needed. Synchronous like `better-sqlite3`; removes the native-addon dependency. Not yet marked stable. |

Other Postgres options worth knowing: `pg-promise` (12.x, ~360k/week, rich formatting helpers) and Slonik (49.x, ~100k/week, strict tagged-template safety plus runtime validation). Both are smaller communities.

### Typed SQL: getting types back

| Approach | How it types results | Status (Oct 2026) | Trade-off |
|---|---|---|---|
| **PgTyped** (`@pgtyped/cli`) | Reads `.sql` files or `sql` tags, asks a live Postgres for parameter/result types, generates `.ts` | 2.4.x; last npm release March 2025, ~46k/week | Postgres only; needs a DB at codegen time; nullability inference is imperfect (annotate with `!`/`?`); slow release cadence |
| **sqlc** + `sqlc-gen-typescript` | Parses SQL against your schema files (no live DB), generates typed functions for `pg`, `postgres`, `mysql2`, `better-sqlite3` | sqlc 1.31.1 (Apr 2026, Go binary); TS plugin 0.1.3, last release Jan 2024, self-described "early access … expect breaking changes" | Excellent model, but the TypeScript plugin is the weak link; treat as experimental |
| **Prisma TypedSQL** | `.sql` files in `prisma/sql/`, `prisma generate --sql`, typed functions passed to `$queryRawTyped` | Still a **preview** feature (`previewFeatures = ["typedSql"]`); Postgres and recent MySQL; SQLite needs manual param types | Best option if you already use Prisma; needs a live DB at generate time; no dynamic columns |
| **Kysely** (middle ground) | You write a TypeScript query that compiles 1:1 to SQL; types come from a `Database` interface (often generated by `kysely-codegen`) | 0.29.7 (Oct 2026), ~12.8M/week | Not raw SQL, but close: CTEs, window functions, `ON CONFLICT` are expressible, plus a `sql` template tag for the rest. See [Kysely](kysely.md) |
| **Runtime validation** (Zod 4.x) | `const rows = RowSchema.array().parse(result.rows)` | Zod 4.6.x, ~207M/week | No codegen, catches schema drift at runtime; costs CPU per row — validate at boundaries, not on 100k-row exports |
| **Manual generics** (`sql<User[]>`, `pool.query<User>`) | You assert the type | — | A cast, not a check. Drifts silently when the schema changes |

### Parameterization and dynamic identifiers

Parameters (`$1`, `?`, `${value}` in a tagged template) cover **values only**. Table names, column names, sort direction, and `IN` lists of unknown length need separate handling:

- **Identifiers** — map user input through an **allow-list** (`{ name: 'u.name', created: 'u.created_at' }[sortKey]`), or use a driver helper that quotes identifiers (`sql(name)` in postgres.js, `sql.id`/`sql.ref` in Kysely, `escapeIdentifier` in `pg`). An allow-list is still better: quoting stops injection but not "sort by an unindexed column".
- **Sort direction** — a literal union type `'asc' | 'desc'`, never interpolated user text.
- **`IN` lists** — Postgres: `= ANY($1::int[])` with an array parameter. One placeholder, plan cache friendly.
- **Escape hatches** — `sql.unsafe()`, `$queryRawUnsafe`, `$executeRawUnsafe`, `mysql2` `query()` with string concatenation: grep for them in code review.

### Containment: a repository layer

Raw SQL is manageable when it lives in **one place per aggregate**, not scattered across handlers:

```
routes / services  ──▶  UserRepository (interface)
                              │
                              ▼
                     PgUserRepository
                     ├── SQL text (or generated query functions)
                     ├── row → domain mapping
                     └── row validation at the boundary
```

The rest of the code depends on the interface, so swapping a hot query from ORM to SQL (or back) is a local change and integration tests target one module. This is the ports-and-adapters idea from [Hexagonal Architecture](../../../software-engineering/architecture/hexagonal.md) applied to data access.

### The hybrid strategy

The pragmatic default for most teams: **ORM or query builder for the ~90% CRUD, hand-written SQL for the ~10% that is hot, analytical, bulk, or database-specific** — sharing one connection pool and one transaction mechanism. Measure before moving a query: slow-query logs and `EXPLAIN (ANALYZE, BUFFERS)` decide, not taste.

Watch the seam: if raw SQL and the ORM use **different pools**, a transaction opened in one is invisible to the other. Route raw SQL through the ORM's own escape hatch (or share the driver instance) when it must participate in a transaction.

---

## Examples

### postgres.js: tagged templates, dynamic identifiers, bulk insert

```ts
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!, { max: 10, transform: postgres.camel });

type OrderTotal = { customerId: number; month: Date; total: string; rank: number };

// Window function + CTE: painful in most ORMs, trivial here.
export async function topCustomersByMonth(since: Date) {
  return sql<OrderTotal[]>`
    with monthly as (
      select customer_id, date_trunc('month', created_at) as month, sum(amount) as total
      from orders
      where created_at >= ${since}
      group by 1, 2
    )
    select *, rank() over (partition by month order by total desc)::int as rank
    from monthly
  `;
}

const SORTABLE = { name: 'name', created: 'created_at' } as const;

export async function listUsers(sort: keyof typeof SORTABLE, dir: 'asc' | 'desc') {
  // Identifier from an allow-list, quoted by sql(); direction from a closed union.
  return sql`select id, name from users order by ${sql(SORTABLE[sort])} ${dir === 'asc' ? sql`asc` : sql`desc`}`;
}

export async function insertEvents(rows: { userId: number; kind: string }[]) {
  // One multi-row INSERT instead of N round trips.
  await sql`insert into events ${sql(rows.map((r) => ({ user_id: r.userId, kind: r.kind })), 'user_id', 'kind')}`;
}
```

### pg: upsert, job queue, and Zod at the boundary

```ts
import pg from 'pg';
import { z } from 'zod';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const Job = z.object({ id: z.number(), payload: z.unknown(), attempts: z.number() });

export async function upsertStock(sku: string, delta: number) {
  await pool.query(
    `insert into stock (sku, qty) values ($1, $2)
     on conflict (sku) do update set qty = stock.qty + excluded.qty`,
    [sku, delta],
  );
}

export async function claimJob() {
  const { rows } = await pool.query(
    `update jobs set locked_at = now(), attempts = attempts + 1
     where id = (
       select id from jobs where locked_at is null
       order by id for update skip locked limit 1
     )
     returning id, payload, attempts`,
  );
  return rows[0] ? Job.parse(rows[0]) : null; // runtime check instead of a blind cast
}

export async function usersByIds(ids: number[]) {
  return (await pool.query('select id, name from users where id = any($1::int[])', [ids])).rows;
}
```

### Repository mixing Prisma and raw SQL

```ts
import { PrismaClient, Prisma } from './generated/prisma/client'; // Prisma 7: generator output path

export interface ReportRepository {
  revenueByDay(from: Date, to: Date): Promise<{ day: Date; revenue: number }[]>;
}

export class PrismaReportRepository implements ReportRepository {
  constructor(private readonly db: PrismaClient) {}

  async revenueByDay(from: Date, to: Date) {
    // $queryRaw as a tagged template is parameterized; $queryRawUnsafe is not.
    const rows = await this.db.$queryRaw<{ day: Date; revenue: Prisma.Decimal }[]>`
      select date_trunc('day', paid_at) as day, sum(amount) as revenue
      from payments where paid_at between ${from} and ${to}
      group by 1 order by 1`;
    return rows.map((r) => ({ day: r.day, revenue: r.revenue.toNumber() }));
  }
}
```

### The injection anti-example

```ts
// NEVER: value and identifier concatenated into SQL text.
await pool.query(`select * from users where name = '${req.query.name}' order by ${req.query.sort}`);
```

---

## When to use

- Reporting, dashboards, and exports built on aggregates, window functions, or recursive CTEs.
- Bulk loads and backfills (`COPY`, multi-row `INSERT`, `INSERT ... SELECT`, `UPDATE ... FROM`).
- Upserts, `RETURNING`, `FOR UPDATE SKIP LOCKED` queues, advisory locks.
- A measured hot path where ORM overhead or the generated SQL shows up in profiles.
- Postgres-specific features: `LISTEN/NOTIFY`, full-text search, JSONB operators, PostGIS.
- Small services with a handful of queries, where an ORM's schema DSL, codegen, and runtime cost more than they save — pair with PgTyped/sqlc or Zod.
- Teams fluent in SQL who review query plans anyway.

## When NOT to use

- Standard CRUD with relations — an ORM or [Kysely](kysely.md) gives types and refactoring safety for free; raw SQL there is just more code to keep in sync.
- When you would type results with a bare generic (`query<User>`) and no validation — that is a type lie that breaks silently on the next migration.
- Teams without SQL review discipline — string-built queries and missing parameterization are the classic outcome. See [Security](../security.md).
- When you would build a dynamic query builder from string fragments — use Kysely instead of reinventing one.
- When the same query must run on several database engines — dialect differences will leak.
- Scattering SQL across route handlers — keep it behind a repository, or the "10% raw SQL" becomes 40% unowned SQL.

---

## References

- [node-postgres documentation](https://node-postgres.com/) — queries, pooling, transactions
- [postgres.js README](https://github.com/porsager/postgres) — tagged templates, `sql()` helpers, `listen`, `COPY`, `sql.unsafe` warning
- [mysql2 documentation](https://sidorares.github.io/node-mysql2/docs) — `execute` vs `query`, prepared statements
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) and [Node.js `node:sqlite`](https://nodejs.org/api/sqlite.html) — stability index 1.2
- [PgTyped](https://pgtyped.dev/) — typed SQL for Postgres
- [sqlc](https://docs.sqlc.dev/) and [sqlc-gen-typescript](https://github.com/sqlc-dev/sqlc-gen-typescript) — early-access plugin status
- [Prisma TypedSQL](https://www.prisma.io/docs/orm/prisma-client/using-raw-sql/typedsql) and [raw queries](https://www.prisma.io/docs/orm/prisma-client/using-raw-sql/raw-queries)
- [Kysely: raw SQL](https://kysely.dev/docs/recipes/raw-sql)
- [Zod](https://zod.dev/)
- [OWASP SQL Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)
- [PostgreSQL: `INSERT ... ON CONFLICT`](https://www.postgresql.org/docs/current/sql-insert.html) and [`SELECT ... FOR UPDATE SKIP LOCKED`](https://www.postgresql.org/docs/current/sql-select.html#SQL-FOR-UPDATE-SHARE)
- npm registry and [npm download counts API](https://api.npmjs.org/downloads/point/last-week/pg) — versions and downloads, week of 12–18 October 2026
