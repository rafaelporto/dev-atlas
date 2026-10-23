---
type: concept
tags:
  - language
  - nodejs
  - backend
  - orm
  - overview
related:
  - languages/javascript-typescript/runtimes/nodejs/orms/choosing
  - languages/javascript-typescript/runtimes/nodejs/orms/prisma
  - languages/javascript-typescript/runtimes/nodejs/orms/drizzle
  - languages/javascript-typescript/runtimes/nodejs/orms/kysely
  - languages/javascript-typescript/runtimes/nodejs/orms/typeorm-and-mikro-orm
  - languages/javascript-typescript/runtimes/nodejs/orms/legacy-and-declining
  - languages/javascript-typescript/runtimes/nodejs/orms/raw-sql
  - languages/javascript-typescript/runtimes/nodejs/orms/pitfalls
  - software-engineering/databases/concepts/orm-and-data-mapping
  - languages/javascript-typescript/runtimes/nodejs/data-access
  - languages/javascript-typescript/frameworks/nextjs/orms/overview
language: "nodejs"
---
# ORMs and Data Access in Node.js — Overview

> The Node.js and TypeScript data-access landscape in 2026: raw drivers, typed SQL, query builders, and ORMs. It covers which tools are mature, which are in flux, which are declining, and the default this wiki recommends with its reasons.

---

## What is it?

In Node.js, "using an ORM" can mean very different things. It covers at least four kinds of tool, each built on the one before:

```
 ┌──────────────────────────────────────────────────────────────────┐
 │ ORM (entities, relations, migrations, sometimes Unit of Work)    │  Prisma · TypeORM · MikroORM · Sequelize
 ├──────────────────────────────────────────────────────────────────┤
 │ SQL-like ORM / typed query builder (SQL as typed code)           │  Drizzle · Kysely · Knex (untyped)
 ├──────────────────────────────────────────────────────────────────┤
 │ Typed SQL (you write .sql, types are generated)                  │  PgTyped · sqlc · Prisma TypedSQL
 ├──────────────────────────────────────────────────────────────────┤
 │ Driver (connection, pool, parameters, rows)                      │  pg · postgres.js · mysql2 · better-sqlite3 · node:sqlite
 └──────────────────────────────────────────────────────────────────┘
                                   Database
```

Every tool on this stack ends up sending SQL through a driver. What changes is how much SQL you write, how much the tool infers, and how much it decides for you. The general theory (impedance mismatch, Active Record vs Data Mapper, Unit of Work) is in [ORMs and Data Mapping](../../../../../software-engineering/databases/concepts/orm-and-data-mapping.md). This subsection applies it to the Node/TypeScript ecosystem.

> Versions, maintenance status, and weekly npm downloads across this subsection were checked in **October 2026** (downloads: week of 12–18 October 2026). This ecosystem changes fast; re-check before choosing.

---

## Why does it matter?

The Node ecosystem has no equivalent of Hibernate or Entity Framework, no single default that everyone agrees on. Several things changed in 2025–2026 that make older advice wrong:

- **Prisma** dropped its Rust engine (Rust-free client GA in 6.16, the default in 7.0) and made driver adapters mandatory in 7.0. A full TypeScript rewrite, Prisma 8, is in release candidate. The most popular ORM is in its second major migration in a year.
- **Drizzle** overtook Prisma in weekly downloads (≈18.3M vs ≈11.1M for `@prisma/client`). Its core team joined PlanetScale in March 2026. But it is **still 0.x**: 1.0 has been in beta/RC since early 2025, and the RCs still contain breaking changes.
- **Kysely** became infrastructure. It is ≈12.8M downloads a week, the base for MikroORM 7's SQL layer and Better Auth, and the official migration target for Knex users.
- **TypeORM** came back from years of stagnation. A new maintainer team shipped 1.0 in May 2026, but its type-safety gaps are architectural.
- **MikroORM 7** replaced Knex with Kysely and went zero-dependency. It is the most complete Data Mapper / Unit of Work ORM in TypeScript, and it effectively has one maintainer.
- **Sequelize** v7 has been in alpha since 2021, and **Bookshelf** and **Waterline** are effectively abandoned. Knex is maintained again after a two-year gap, but it has been overtaken.

Picking a tool now means picking a maintenance trajectory as much as an API. A wrong choice costs either a rewrite later or a long fight with the abstraction.

---

## How it works

### The landscape at a glance

| Tool | Kind | Version (Oct 2026) | Weekly downloads | Trajectory |
|---|---|---|---|---|
| [Drizzle](drizzle.md) | SQL-like ORM, schema in TS | 0.45.4 stable, 1.0.0-rc.5 | ≈18.3M | Growing fast; 1.0 still pending |
| [Kysely](kysely.md) | Typed query builder | 0.29.7 | ≈12.8M | Stable, conservative, 2 core maintainers |
| [Prisma](prisma.md) | Schema-first ORM, generated client | 7.10.1 (8.0 RC) | ≈11.1M (`@prisma/client`) | Mature, high churn (6→7→8) |
| [TypeORM](typeorm-and-mikro-orm.md) | Decorator ORM, Active Record + Data Mapper | 1.1.2 | ≈2.8M | Revived; legacy design |
| [MikroORM](typeorm-and-mikro-orm.md) | Data Mapper + Unit of Work | 7.2.5 | ≈0.54M | Excellent quality; bus factor ≈1 |
| [Knex](legacy-and-declining.md) | Untyped query builder | 3.3.0 | ≈3.0M | Maintained again; superseded by Kysely |
| [Sequelize](legacy-and-declining.md) | Active Record ORM | 6.37.8 (v7 alpha) | ≈1.5M | Declining; v7 never stabilized |
| [Raw drivers](raw-sql.md) | `pg`, `postgres`, `mysql2`, `better-sqlite3` | — | `pg` ≈40M | The foundation under everything |

Download counts include transitive installs (frameworks and auth libraries depend on these tools). Treat them as an ecosystem signal, not a quality ranking.

### The critical stance of this subsection

1. **SQL literacy is not optional.** Every tool here generates SQL that runs in production. If the team cannot read the generated SQL and an `EXPLAIN` plan, no ORM will save it. See [ORM Pitfalls](pitfalls.md).
2. **Types are the main benefit of modern TS tools, not object mapping.** The big win of Drizzle, Kysely, and Prisma over older ORMs is that a misspelled column or a wrong result shape fails at compile time. Choose tools whose types follow your actual queries.
3. **Prefer transparent abstractions.** A tool where one call maps to one predictable SQL statement (Kysely, Drizzle's SQL API) is easier to operate than one that decides joins, batching, and loading for you, unless you need what that machinery buys (Unit of Work, nested writes).
4. **Every project needs an escape hatch.** Reporting, bulk operations, CTEs, window functions, and database-specific features will need SQL. Pick a tool with a parameterized, typed raw-SQL path. See [Raw SQL](raw-sql.md).
5. **Maturity means a stable API and a healthy maintainer base, not popularity.** Popularity says little about either. Drizzle (still 0.x), Prisma (a major rewrite every year), and MikroORM (one maintainer) are all excellent and each carries a different risk.
6. **Keep the tool behind a boundary.** Data access lives in repository or query modules. Domain code and HTTP handlers never import the ORM. This keeps the next migration, and there will be one, contained.

### Default recommendations

| Situation | Default | Why |
|---|---|---|
| New TypeScript service, team comfortable with SQL | **Drizzle** or **Kysely** | Typed, transparent SQL; no engine; small runtime; edge-capable |
| Schema owned elsewhere (legacy DB, another team, DB-first) | **Kysely** + type codegen | No schema DSL to keep in sync; types generated from the real DB |
| CRUD-heavy app, mixed SQL experience, wants an all-in-one workflow | **Prisma 7** | Readable schema, integrated migrations, the largest ecosystem |
| Rich domain model (DDD aggregates, many invariants per transaction) | **MikroORM** | Real Unit of Work and Identity Map; typed loaded relations |
| Existing NestJS + TypeORM codebase | **Upgrade TypeORM to 1.x** | A rewrite rarely pays off; add Kysely or raw SQL for complex queries |
| Reporting, analytics, bulk jobs, hot paths | **Raw SQL** (typed) | Set-based SQL beats any mapping layer |
| Existing Sequelize / Knex / Objection codebase | **Migrate incrementally** | See [Legacy and Declining Tools](legacy-and-declining.md) |

The reasoning and a full decision flow are in [Choosing a Data Access Tool](choosing.md). Next.js-specific constraints (serverless connection limits, non-Node runtimes) are in [Databases and ORMs in Next.js](../../../frameworks/nextjs/orms/overview.md).

### The hybrid is normal

Most mature codebases end up with two levels:

```
 CRUD and aggregates ──► ORM or SQL-like builder (Prisma / Drizzle / MikroORM)
 Complex reads, reports ─► typed raw SQL or Kysely (same pool, same transaction where possible)
```

Plan for this from the start: pick tools that can share a connection pool and a transaction, and keep both behind the same repository interface.

---

## Examples

**The same query at each level** — "the 20 most recent paid orders with the customer name":

```ts
// Driver (pg): full control, manual typing
const { rows } = await pool.query<{ id: number; total: string; customer: string }>(
  `SELECT o.id, o.total, c.name AS customer
     FROM orders o JOIN customers c ON c.id = o.customer_id
    WHERE o.status = $1 ORDER BY o.created_at DESC LIMIT 20`,
  ["paid"],
);

// Kysely: the same SQL as typed code; result type inferred
const rows2 = await db
  .selectFrom("orders as o")
  .innerJoin("customers as c", "c.id", "o.customer_id")
  .select(["o.id", "o.total", "c.name as customer"])
  .where("o.status", "=", "paid")
  .orderBy("o.created_at", "desc")
  .limit(20)
  .execute();

// Drizzle (SQL-like API)
const rows3 = await db
  .select({ id: orders.id, total: orders.total, customer: customers.name })
  .from(orders)
  .innerJoin(customers, eq(customers.id, orders.customerId))
  .where(eq(orders.status, "paid"))
  .orderBy(desc(orders.createdAt))
  .limit(20);

// Prisma: relation-oriented API; the client decides how to fetch the relation
const rows4 = await prisma.order.findMany({
  where: { status: "paid" },
  orderBy: { createdAt: "desc" },
  take: 20,
  select: { id: true, total: true, customer: { select: { name: true } } },
});
```

The first three produce essentially the SQL you see. Prisma produces either a join or one query per relation, depending on the relation load strategy; see [Prisma](prisma.md).

**A repository boundary that keeps the tool replaceable:**

```ts
// orders/repository.ts — the only module that knows which data-access tool is used
export interface RecentOrder { id: number; total: string; customer: string }

export async function findRecentPaidOrders(limit = 20): Promise<RecentOrder[]> {
  return db
    .selectFrom("orders as o")
    .innerJoin("customers as c", "c.id", "o.customer_id")
    .select(["o.id", "o.total", "c.name as customer"])
    .where("o.status", "=", "paid")
    .orderBy("o.created_at", "desc")
    .limit(limit)
    .execute();
}
```

---

## When to use

- Read this subsection **before** starting a new Node/TS service or a Next.js app with a database. The choice is hard to reverse.
- Use the defaults table above as the starting point and deviate with a written reason (team skills, existing schema, deployment target).
- Revisit the choice when a tool's trajectory changes: a major rewrite (Prisma 8), a 1.0 release (Drizzle), or a maintainer change.
- Use the per-tool articles when evaluating or onboarding onto a specific tool. Each covers model, migrations, transactions, escape hatches, and limitations.

## When NOT to use

- Do not pick by download count or GitHub stars alone. Both are inflated by transitive dependencies and hype cycles.
- Do not adopt a full ORM to avoid SQL. You will need to read SQL to operate it.
- Do not start new projects on Sequelize, Bookshelf, Waterline, or plain Knex.
- Do not rewrite a working data layer only because a newer tool is fashionable. Migrate incrementally, and only when there is a concrete pain (types, maintenance, performance).
- Do not mix several ORMs without a boundary. Two levels (ORM + raw SQL) is normal; three tools for the same tables is a smell.

---

## References

- [Prisma ORM — Documentation](https://www.prisma.io/docs/orm)
- [Prisma ORM — Release status](https://www.prisma.io/docs/orm/release-status)
- [Drizzle ORM — Documentation](https://orm.drizzle.team/docs/overview)
- [Drizzle — Latest releases](https://orm.drizzle.team/docs/latest-releases)
- [Kysely — Documentation](https://kysely.dev/docs/intro)
- [TypeORM — TypeORM 1.0 announcement](https://typeorm.io/blog/typeorm-1-0)
- [MikroORM — MikroORM 7 released](https://mikro-orm.io/blog/mikro-orm-7-released)
- [npm — download counts API](https://github.com/npm/registry/blob/main/docs/download-counts.md)
