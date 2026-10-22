---
type: concept
tags:
  - language
  - nodejs
  - backend
  - orm
related:
  - languages/nodejs/orms/overview
  - languages/nodejs/orms/choosing
  - languages/nodejs/orms/kysely
  - languages/nodejs/orms/prisma
  - languages/nodejs/orms/migrations
  - languages/nextjs/orms/serverless-and-edge
language: "nodejs"
---
# Drizzle ORM

> Drizzle is a TypeScript ORM with a SQL-shaped query builder, a schema written in TypeScript, and zero runtime dependencies. It runs well on serverless and edge platforms, but 1.0 is still a release candidate, and the 0.x → 1.0 move breaks relations, migrations, and driver behavior.

---

## What is it?

Drizzle lets you describe your database tables in TypeScript files and then write queries that look almost exactly like the SQL they produce, with the result types worked out automatically. It is a thin layer: no query engine, no separate generated client, no runtime dependencies (`drizzle-orm` declares none; database drivers are optional peer dependencies).

It ships two query APIs on the same schema:

- **SQL-like query builder** — `db.select().from(users).where(...)`, joins, CTEs, `insert ... on conflict`. What you write is what runs.
- **Relational Query Builder (RQB)** — `db.query.users.findMany({ with: { posts: true } })`, a Prisma-style API for loading nested data in one SQL statement.

Plus **drizzle-kit**, a separate CLI that diffs your TypeScript schema against previous snapshots (or the live database) to generate SQL migrations.

> Versions, maintenance status, and weekly npm downloads were checked in **October 2026** (downloads: week of 12–18 October 2026). Drizzle is mid-way through a long 1.0 release cycle, so re-check before choosing.

---

## Why does it matter?

Drizzle became the main alternative to [Prisma](prisma.md) for TypeScript teams that want type safety **without** a code-generation step or a query engine between them and the database:

- **Adoption** — about **18.3 million** weekly downloads for `drizzle-orm` and **15.3 million** for `drizzle-kit`, ahead of every other TypeScript ORM except Prisma.
- **Backing** — on **3 March 2026** PlanetScale hired the whole Drizzle core team. Drizzle stays an independent, Apache-2.0 open-source project with its own roadmap, and is no longer dependent on sponsorships to fund full-time work.
- **Serverless fit** — no binary, no engine, small cold-start cost, and first-class drivers for HTTP and WebSocket database proxies (Neon, PlanetScale, Turso, Cloudflare D1, Vercel, Supabase, Netlify DB). See [Serverless and Edge](../../nextjs/orms/serverless-and-edge.md).

The catch is maturity. Drizzle is still on a **0.x** stable line, and the 1.0 rewrite has been in pre-release since February 2025. Teams choosing Drizzle in late 2026 have to decide whether to start on 0.45 (stable, with a migration ahead) or on the 1.0 RC (new APIs, still shipping breaking changes).

---

## How it works

### Release status (October 2026)

| Line | Version | Date | Notes |
|---|---|---|---|
| Stable (`latest`) | `drizzle-orm@0.45.4`, `drizzle-kit@0.31.11` | 8 Oct 2026 / 21 Sep 2026 | Bug-fix releases; RQB v1 only |
| Pre-release (`rc`) | `1.0.0-rc.5` | 21 Oct 2026 | RQB v2, new migration layout, codecs, MSSQL and CockroachDB |

History: the docs announced the public `v1.0.0-beta.2` pre-release on **12 February 2025**; betas ran up to `beta.24` (April 2026), and `rc.1` landed on **30 April 2026** — about 20 months of pre-release so far. RC releases are still **breaking**: `rc.1` changed the `casing` API and removed RQB v1 from Postgres; `rc.5` changed how `postgres-js` serializes JSON and timestamps and made `undefined` in relational `where` filters throw. No stable 1.0 date has been announced.

The tracker is busy: roughly **1,340 open issues and 700 open pull requests** (October 2026). Many are driver-specific edge cases, but expect to find your bug already reported and still open.

### Schema in TypeScript

Tables are declared with dialect-specific builders: `pgTable` (`drizzle-orm/pg-core`), `mysqlTable`, `sqliteTable`, `singlestoreTable`, and in 1.0 also MSSQL and CockroachDB. The schema file is the source of truth for both types and migrations.

```
schema.ts ──► TypeScript types ($inferSelect / $inferInsert)
    │
    └──► drizzle-kit generate ──► migrations/*.sql ──► drizzle-kit migrate ──► database
                    ▲
       previous snapshot (diff)
```

Types come from the schema directly: `typeof users.$inferSelect` is the row you read, `typeof users.$inferInsert` the object you insert (defaults and generated columns optional).

### Two query APIs

| | SQL-like builder | Relational queries (RQB) |
|---|---|---|
| Shape | `select / from / join / where` | `findMany / findFirst` with `with` |
| Output | flat rows (you shape nested data) | nested objects |
| SQL control | full | Drizzle decides the SQL |
| Statements | one per call | one per call (no N+1) |
| Best for | reports, joins, writes, anything tricky | reading an aggregate with its children |

**RQB v1 vs v2.** In 0.x, relations are declared with `relations()` per table and filters are callbacks. In 1.0, `defineRelations()` declares them all at once, `where`/`orderBy` become plain objects, many-to-many goes `.through()` a junction table, and you can filter on related rows. v1 is being removed dialect by dialect in the RCs (Postgres in `rc.1`, MySQL in `rc.3`, SQLite in `rc.4`). Relations are application-level only — they do not create foreign keys.

### Raw SQL: the `sql` template

The ``sql`...` `` tagged template is the escape hatch, usable inside builder calls or with `db.execute()`. Interpolated values become bound parameters; columns and tables interpolate as escaped identifiers. `sql.raw()` inserts text **unescaped** — the main injection footgun.

### Transactions

`db.transaction(async (tx) => { ... })` commits when the callback resolves and rolls back when it throws (`tx.rollback()` throws on purpose). Nested `tx.transaction()` uses savepoints. Driver limits apply: HTTP drivers such as `neon-http` and Cloudflare D1 do not support interactive transactions — use `db.batch([...])` or a WebSocket/TCP driver.

### drizzle-kit

| Command | What it does | Use in |
|---|---|---|
| `generate` | Diff schema vs last snapshot → SQL migration file | dev, commit the output |
| `migrate` | Apply pending migrations | CI/CD, deploy |
| `push` | Apply schema diff directly, no migration file | prototyping, local DBs only |
| `pull` | Introspect a DB into a TypeScript schema | adopting an existing DB |
| `check` | Detect migration collisions across branches | CI |
| `up` | Upgrade old snapshots to the current format | after upgrading drizzle-kit |
| `export` | Print the schema as SQL DDL | review, external tools |
| `studio` | Local database browser | dev |

1.0 changes the migration layout: no `journal.json`, one folder per migration (SQL + snapshot), "DDL snapshots", and commutativity checks so that two branches generating migrations in parallel are detected at `generate` time. Run `drizzle-kit up` when upgrading.

Generated SQL is plain and reviewable — **review it**. Renames are ambiguous in any diff tool; drizzle-kit asks interactively whether a change is a rename or drop-and-add. Answer wrong and you lose a column. Migrations can also be applied at runtime with the driver's `migrate()` helper.

**Drizzle Studio** is free for local use but **not open source**; it runs a local server and opens a UI hosted at `local.drizzle.studio`.

### Drivers

All driver adapters ship in `drizzle-orm` as subpath imports (`drizzle-orm/node-postgres`, etc.):

| Database | Drivers (0.45) |
|---|---|
| PostgreSQL | `node-postgres`, `postgres-js`, `neon-http`, `neon-serverless` (WebSocket), `vercel-postgres`, `supabase`, `pglite`, `xata-http`, `aws-data-api`, `bun-sql`, `netlify-db`, `pg-proxy` |
| MySQL | `mysql2`, `planetscale-serverless`, `tidb-serverless`, `mysql-proxy` |
| SQLite | `better-sqlite3`, `libsql` (Turso), `d1`, `durable-sqlite`, `bun-sqlite`, `expo-sqlite`, `op-sqlite`, `sql-js`, `sqlite-proxy` |
| Others | SingleStore, Gel; 1.0 adds MSSQL, CockroachDB, and Effect integrations |

### What 1.0 brings

- **Codecs and opt-in JIT row mappers** (`drizzle({ ..., jit: true })`): the team reports 25–30% lower latency in its own benchmarks.
- **RQB v2** and the new migration folder format described above.
- **Effect v4** support (`drizzle-orm/effect-postgres`).
- Validator integrations (zod, valibot, typebox, arktype) reorganized — check the upgrade guide.

---

## Examples

Schema (stable 0.45 API, PostgreSQL):

```ts
// src/db/schema.ts
import { pgTable, integer, text, timestamp, boolean, index } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: text().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const posts = pgTable('posts', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  authorId: integer('author_id').notNull().references(() => users.id),
  title: text().notNull(),
  published: boolean().notNull().default(false),
}, (t) => [index('posts_author_idx').on(t.authorId)]);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
```

SQL-like builder, transaction, and raw SQL:

```ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { and, eq, desc, sql, count } from 'drizzle-orm';
import { users, posts } from './schema';

const db = drizzle(process.env.DATABASE_URL!);

// Reads like the SQL it generates
const authors = await db
  .select({ id: users.id, name: users.name, postCount: count(posts.id) })
  .from(users)
  .leftJoin(posts, and(eq(posts.authorId, users.id), eq(posts.published, true)))
  .groupBy(users.id)
  .orderBy(desc(count(posts.id)))
  .limit(10);

// Commits on resolve, rolls back on throw
const created = await db.transaction(async (tx) => {
  const [user] = await tx.insert(users).values({ name: 'Ada' }).returning();
  await tx.insert(posts).values({ authorId: user.id, title: 'Hello' });
  return user;
});

// Escape hatch: values are bound parameters, not string concatenation
const minId = 100;
const rows = await db.execute(sql`select ${users.name} from ${users} where ${users.id} > ${minId}`);
```

Relational queries with v1.0 `defineRelations` (RQB v2):

```ts
import { defineRelations } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

export const relations = defineRelations(schema, (r) => ({
  users: { posts: r.many.posts() },
  posts: { author: r.one.users({ from: r.posts.authorId, to: r.users.id }) },
}));

const db = drizzle({ connection: process.env.DATABASE_URL!, relations });

// One SQL statement; result is { id, name, posts: [...] }[]
const withPosts = await db.query.users.findMany({
  where: { name: { ilike: 'A%' } },
  with: { posts: { where: { published: true }, limit: 5 } },
});
```

`drizzle.config.ts` and the usual workflow:

```ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: { url: process.env.DATABASE_URL! },
});

// npx drizzle-kit generate   -> writes SQL; review and commit it
// npx drizzle-kit migrate    -> applies it (run in CI/CD, not on app boot in serverless)
```

---

## When to use

- You know SQL and want the TypeScript to look like it — joins, CTEs, upserts, and window functions stay readable.
- Serverless and edge deployments (Cloudflare Workers, Vercel, Netlify, Deno, Bun) using HTTP/WebSocket drivers — no engine, no binary, low cold-start cost.
- You want the schema, types, and migration generation in one TypeScript-native toolchain, without a code-generation step in the build.
- SQLite-family targets (D1, Turso/libSQL, Expo, Durable Objects), where Drizzle's driver coverage is the broadest in the ecosystem.
- Greenfield projects that can absorb the 0.x → 1.0 upgrade, or that start on the 1.0 RC knowingly.

## When NOT to use

- You need a stable, semver-1.0 API with a long support window — Drizzle has not shipped 1.0 yet, and RC releases still carry `[BREAKING]` entries.
- Your team does not know SQL. Drizzle hides less than [Prisma](prisma.md); the SQL-like API assumes you know what a left join with a `group by` does.
- You need a Unit of Work, identity map, or lifecycle hooks (classic Data Mapper ORM behavior) — look at [TypeORM / MikroORM](typeorm-and-mikro-orm.md). Drizzle is closer to a typed query builder with relation loading.
- You only want a query builder over an existing, DBA-owned schema and do not need schema-as-code — [Kysely](kysely.md) is smaller in scope and has a more stable API.
- Large, long-lived codebases on 0.x that cannot afford the RQB v1 → v2 and migration-layout upgrade right now — pin the version and plan the move, do not upgrade casually.
- You rely on `drizzle-kit push` in production. It applies diffs with no reviewable artifact; use `generate` + `migrate`.

---

## References

- [Drizzle ORM documentation](https://orm.drizzle.team/docs/overview)
- [Drizzle — Latest releases](https://orm.drizzle.team/docs/latest-releases)
- [Drizzle — Upgrade to v1](https://orm.drizzle.team/docs/upgrade-v1)
- [Drizzle — Relations v2 (`defineRelations`)](https://orm.drizzle.team/docs/relations-v2)
- [Drizzle Kit overview](https://orm.drizzle.team/docs/kit-overview)
- [Drizzle — Database connection overview](https://orm.drizzle.team/docs/connect-overview)
- [Drizzle Studio — open-source status](https://orm.drizzle.team/docs/drizzle-kit-studio)
- [drizzle-orm releases on GitHub](https://github.com/drizzle-team/drizzle-orm/releases)
- [PlanetScale — Drizzle joins PlanetScale (March 2026)](https://planetscale.com/blog/drizzle-joins-planetscale)
- [drizzle-orm on npm](https://www.npmjs.com/package/drizzle-orm)
