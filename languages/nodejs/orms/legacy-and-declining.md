---
type: concept
tags:
  - language
  - nodejs
  - backend
  - orm
  - migration
related:
  - languages/nodejs/orms/overview
  - languages/nodejs/orms/choosing
  - languages/nodejs/orms/kysely
  - languages/nodejs/orms/drizzle
  - languages/nodejs/orms/prisma
  - languages/nodejs/orms/migrations
language: "nodejs"
---
# Legacy and Declining Node.js ORMs

> Sequelize, Knex, Objection.js, Bookshelf, and Waterline still power a large share of production Node.js — this is where each one stands in 2026, what staying costs, and how to move off them one module at a time.

---

## What is it?

These are the data-access libraries that defined Node.js before TypeScript became the default: **Sequelize** (the classic Active Record ORM), **Knex** (the query builder and migration runner underneath much of the ecosystem), **Objection.js** and **Bookshelf** (ORMs built on Knex), and **Waterline** (the adapter-based ORM of the Sails framework). None of them is dead in the "archived repository" sense, but all of them were designed for JavaScript first, and newer tools — [Prisma](prisma.md), [Drizzle](drizzle.md), [Kysely](kysely.md) — now cover their use cases with far better type safety.

"Legacy" here means *a tool you are more likely to inherit than to choose*. Some are still maintained and fine to keep; some are frozen and a liability.

> Versions, maintenance status, and weekly npm downloads were checked in **October 2026** (downloads: week of 12–18 October 2026). Re-check before choosing.

---

## Why does it matter?

- **Download numbers hide the decline.** Knex (~3.0M/week) and Sequelize (~1.5M/week) still out-download most modern tools, because installed bases do not migrate. Popularity is not a signal of health here.
- **Type safety is the structural gap.** All five predate TypeScript-first design. Their typings are hand-written on top of dynamic APIs; results are loosely typed, and refactors that rename a column compile cleanly and fail at runtime.
- **Maintenance risk is uneven.** Bookshelf and Waterline have had no release since 2020 and 2022. Sequelize v7 has been in alpha since December 2021. Knex went 27 months without a release before a 2026 burst. Objection.js changed hands in 2026. A security fix in a frozen ORM depends on whether someone forks it.
- **A rewrite is rarely the answer.** The data-access layer touches every feature; a big-bang swap stalls product work for months. The incremental path — new code on the new tool, sharing the database and, where possible, the connection pool — is what actually ships.

---

## How it works

### Status at a glance

| Tool | Latest (Oct 2026) | Last release | Weekly downloads | Open issues / PRs | Status |
|---|---|---|---|---|---|
| **Sequelize** v6 | 6.37.8 | 7 Mar 2026 | ~1.53M | ~936 / ~174 | Maintenance: a few v6 patches per year |
| **Sequelize** v7 (`@sequelize/core`) | 7.0.0-alpha.48 | 4 Feb 2026 | ~61k | (same repo) | **Still alpha** — never reached beta or stable |
| **Knex** | 3.3.0 | 26 Jun 2026 | ~2.98M | ~582 / ~179 | Active again in 2026 after a 2023–2026 gap |
| **Objection.js** | 4.2.0 | 18 Oct 2026 | ~131k | — | Continued at `ditojs/objection` (same npm name); 4.x is a breaking rewrite of graph writes |
| **Bookshelf** | 1.2.0 | 7 Jun 2020 | ~31k | ~224 / ~13 | **Unmaintained** — no release in six years |
| **Waterline** | 0.15.2 | 11 Dec 2022 | ~17k | — | Frozen; lives on only inside Sails 1.x (Sails 1.5.18, May 2026) |

### Sequelize

- **What it is** — Active Record ORM (`User.findAll({ include: [Post] })`, `user.save()`), many dialects (Postgres, MySQL, MariaDB, SQLite, SQL Server, Oracle, Db2, Snowflake), its own CLI for migrations and seeders.
- **Why it declined** — the v7 rewrite (`@sequelize/core`, dialects split into separate packages, TypeScript-first models) published its first alpha in December 2021 and has shipped only alphas since; the latest is alpha.48 (February 2026). The team publicly recruited new maintainers in February 2025. Meanwhile v6 gets occasional patches (6.37.6 and 6.37.7 in March 2025, 6.37.8 in March 2026). TypeScript on v6 needs either verbose `Model<InferAttributes<…>>` declarations or the community `sequelize-typescript` decorators package.
- **Risks of staying** — the issue backlog is the largest in this group; v6 typing is weak (`include` results are not typed); a v6 → v7 upgrade is effectively a migration in itself, to a target that is not stable.
- **Migration targets** — Prisma (closest "model + relations + migrations" experience; `prisma db pull` introspects the existing schema), or Drizzle (`drizzle-kit pull` introspects too).

### Knex

- **What it is** — a query builder (`knex("users").where({ id }).first()`), a schema builder, a migration runner, and a connection pool (tarn). Objection, Bookshelf, and older MikroORM versions are built on it.
- **Status** — after 3.1.0 (December 2023) there was no release until **3.2.0 in March 2026**, followed by a burst of patches and **3.3.0 in June 2026** (MariaDB driver, `RETURNING` on MariaDB, migration hooks, and a `connectionPool` option to share an external pool). It is maintained again, but with a large backlog and a history of long gaps.
- **Why it declined** — it is a JavaScript-era design: types are an overlay (`Tables` interface augmentation), results are loosely typed, and [Kysely](kysely.md) was created explicitly as "Knex, but type-safe". MikroORM v7 replaced Knex with Kysely internally.
- **Risks of staying** — low in the short term; Knex works and is patched. The cost is type safety, not stability.
- **Migration target** — Kysely, with the official `kysely-knex` toolkit (a Kysely dialect that runs on your existing Knex instance, a `KyselifyTables` type converter, and a migration source so existing Knex migrations keep running).

### Objection.js

- **What it is** — "a relational query builder": models with relation mappings, eager loading (`withGraphFetched`), graph inserts/upserts, JSON Schema validation, all on top of Knex.
- **Status** — in November 2022 its creator announced he would stop working on it (issue #2335), citing that the TypeScript typings needed a full rewrite. A long-time contributor (Jürg Lehni) maintained it from 2023; in 2026, after losing access to the original `Vincit/objection.js` repository, development moved to **`ditojs/objection`**, still publishing the `objection` npm package. Versions 3.2 through 4.2 shipped in October 2026; 4.0 is ESM-only, requires Node 20.19+, Knex 3.3+, TypeScript 5.8+, and rewrote `insertGraph`/`upsertGraph` with breaking behaviour changes. A `3.x` branch gets fixes under a `legacy` dist-tag.
- **Risks of staying** — the continuation is active but effectively a single maintainer, and the 4.x graph rewrite changes semantics you may rely on. Read the migration guide before bumping.
- **Migration target** — Kysely (keep the SQL-shaped mindset, share the Knex pool) or Drizzle (relational queries replace `withGraphFetched`).

### Bookshelf

- **What it is** — a Backbone-inspired ORM on Knex (models, collections, eager loading, polymorphic relations).
- **Status** — 1.2.0 (June 2020) is the last release; the repository has had no meaningful activity since 2024 and still references Travis CI. Treat it as abandoned.
- **Risks of staying** — no security fixes; pins you to an old Knex range; no TypeScript story.
- **Migration target** — Knex directly as a stepping stone (Bookshelf already exposes it), then Kysely; or straight to Drizzle/Prisma.

### Waterline

- **What it is** — the adapter-based ORM bundled with **Sails**, designed to give one API over SQL and NoSQL stores.
- **Status** — 0.15.2 (December 2022) is the last release. Sails itself still receives 1.5.x patch releases (1.5.18, May 2026), so Waterline is kept alive only as a Sails dependency.
- **Why it declined** — the lowest-common-denominator API hides database capabilities (joins and transactions vary by adapter); Sails' MVC style lost ground to Express/Fastify/NestJS.
- **Migration target** — only realistic together with moving off Sails, or by bypassing Waterline inside Sails with a separate data-access module (Kysely/Drizzle) for new features.

### Incremental migration: the strangler approach

```
          ┌──────────────── one database ────────────────┐
          │                                               │
 old modules ──► Sequelize / Objection / Knex ──┐         │
                                                ├──► shared pg.Pool (when supported)
 new modules ──► Kysely / Drizzle / Prisma ─────┘         │
          │                                               │
          └── one migration tool owns the schema ─────────┘
```

1. **Pick one owner for schema changes.** Keep the existing migration tool (Knex migrations, Sequelize CLI) until the end, or switch once and import history as a baseline. Two tools writing DDL to one database is how drift starts (see [Migrations](migrations.md)).
2. **Generate types from the live schema** — `prisma db pull`, `drizzle-kit pull`, or `kysely-codegen` — so the new tool describes the database as it is, not as the old models claim it is.
3. **Share the connection pool where you can.** Knex 3.3+ accepts an external `pg.Pool` via `connectionPool`; Kysely (`PostgresDialect({ pool })`) and Drizzle (`drizzle({ client: pool })`) accept the same pool. Sequelize and Prisma manage their own pools — then budget `max` connections across both so the sum stays under the database limit.
4. **Keep each transaction inside one tool.** A unit of work that must be atomic should run entirely on the new tool or entirely on the old one. Cross-tool transactions are only practical when both run on the same connection (e.g. `kysely-knex` over a Knex instance).
5. **Move by module, not by layer.** New features go on the new tool; touch an old module → migrate its repository functions behind the same interface. Delete the old ORM when its last import disappears.

---

## Examples

### Knex and Kysely sharing one pool (Knex 3.3+)

```ts
import { Pool } from "pg";
import knexFactory from "knex";
import { Kysely, PostgresDialect } from "kysely";
import type { DB } from "./db-types"; // generated by kysely-codegen

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 20 });

export const knex = knexFactory({ client: "pg", connectionPool: pool }); // legacy modules
export const db = new Kysely<DB>({ dialect: new PostgresDialect({ pool }) }); // new modules
```

### Kysely on top of an existing Knex instance (`kysely-knex`)

```ts
import { Kysely } from "kysely";
import { KyselyKnexDialect, PGColdDialect, type KyselifyTables } from "kysely-knex";
import type { Tables } from "knex/types/tables";
import { knex } from "./knex";

type Database = KyselifyTables<Tables>; // reuse the Knex table typings you already have

export const kysely = new Kysely<Database>({
  dialect: new KyselyKnexDialect({ knex, kyselySubDialect: new PGColdDialect() }),
});
```

### Replacing a Sequelize repository function behind the same interface

```ts
// Before — Sequelize v6, loosely typed result
export async function findActiveUsers(): Promise<UserDTO[]> {
  const rows = await User.findAll({ where: { active: true }, include: [Team] });
  return rows.map((r) => r.toJSON() as UserDTO);
}

// After — Drizzle on the same database; callers do not change
import { eq } from "drizzle-orm";
export async function findActiveUsers(): Promise<UserDTO[]> {
  return db.query.users.findMany({ where: eq(users.active, true), with: { team: true } });
}
```

---

## When to use

- **Keep Knex** when it is used as a plain query builder and migration runner and the team accepts weak result types — it is maintained again; add Kysely beside it for new code.
- **Keep Sequelize v6** when the app is stable, low-churn, and the cost of migrating exceeds the cost of its weak typing — but stop writing new modules on it.
- **Keep Objection** only after deciding whether to follow the `ditojs/objection` 4.x line or pin `3.x` — and plan an exit either way.
- **Use the strangler approach** whenever a codebase is too large to migrate in one release.

## When NOT to use

- **Do not start a new project** on any of these five. Every use case they cover has a better-typed, better-maintained option today (see [Choosing](choosing.md)).
- **Do not wait for Sequelize v7** to modernise — after nearly five years of alphas, plan as if it will not stabilise.
- **Do not keep Bookshelf or Waterline** in a system that handles sensitive data or must pass security audits: no fixes are coming.
- **Do not do a big-bang rewrite** of the data layer alongside feature work; it doubles risk and rarely finishes.
- **Do not run two migration tools** against the same schema during the transition.

---

## References

- [Sequelize — Documentation (v6)](https://sequelize.org/docs/v6/)
- [Sequelize — v7 (alpha) documentation and upgrade guide](https://sequelize.org/docs/v7/other-topics/upgrade/)
- [Sequelize — Open Collective updates (releases, maintainer recruitment)](https://opencollective.com/sequelize/updates)
- [Knex — Documentation](https://knexjs.org/)
- [Knex — CHANGELOG](https://github.com/knex/knex/blob/master/CHANGELOG.md)
- [Knex — PR #6414: `connectionPool` option for an external pool](https://github.com/knex/knex/pull/6414)
- [Objection.js — "The future of Objection.js" (issue #2335)](https://github.com/Vincit/objection.js/issues/2335)
- [Objection.js — continued repository (`ditojs/objection`)](https://github.com/ditojs/objection)
- [Objection.js — changelog and 4.x migration guide](https://ditojs.github.io/objection/release-notes/changelog.html)
- [Bookshelf — GitHub repository](https://github.com/bookshelf/bookshelf)
- [Waterline — GitHub repository](https://github.com/balderdashy/waterline)
- [Kysely — `kysely-knex` migration toolkit](https://github.com/kysely-org/kysely-knex)
- [Kysely — Getting started (dialects and pools)](https://kysely.dev/docs/getting-started)
- [Drizzle — PostgreSQL connection with node-postgres](https://orm.drizzle.team/docs/get-started-postgresql)
- [Prisma — Introspection (`db pull`)](https://www.prisma.io/docs/orm/prisma-schema/introspection)
- [Martin Fowler — Strangler Fig Application](https://martinfowler.com/bliki/StranglerFigApplication.html)
