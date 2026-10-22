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
  - languages/nodejs/orms/drizzle
  - languages/nodejs/orms/raw-sql
  - languages/nodejs/orms/migrations
  - languages/nodejs/orms/legacy-and-declining
language: "nodejs"
---
# Kysely

> Kysely is a type-safe SQL query builder for TypeScript, not an ORM. You describe your database as a TypeScript interface and every query is checked against it at compile time. In exchange, relations, schema-as-code, and migration generation are left to you.

---

## What is it?

Kysely lets you build SQL queries with chained TypeScript calls and gives an error in your editor when you reference a table or column that does not exist, or treat a column as the wrong type. It does not map rows to objects, track changes, or know what a "relation" is. Its own docs put it bluntly: *Kysely is not an ORM, it is a query builder.*

Three things define it:

- **A `Database` interface** — a plain TypeScript type describing your tables and columns. You write it or generate it from the database.
- **A fluent builder** — `selectFrom`, `innerJoin`, `where`, `insertInto`, `onConflict`, CTEs, `merge`, window functions — whose result types are computed from the selected columns.
- **Dialects** — small adapters that turn the query tree into the right SQL dialect and run it through an existing driver (`pg`, `mysql2`, `better-sqlite3`, `tedious`, …).

Kysely is the spiritual successor to [Knex](legacy-and-declining.md): same query-builder idea, rebuilt around TypeScript. Its creator, Sami Koskimäki, also wrote Objection.js.

> Versions, maintenance status, and weekly npm downloads were checked in **October 2026** (downloads: week of 12–18 October 2026). Re-check before choosing.

---

## Why does it matter?

Kysely occupies the middle ground between [raw SQL](raw-sql.md) and an ORM. It is the right default for teams that want to keep writing SQL but stop shipping typos and type mismatches to production.

- **Adoption** — about **12.8 million** weekly downloads (vs about 3 million for Knex). Part of that is indirect: other tools build on Kysely, including **MikroORM 7** (`@mikro-orm/sql` depends on `kysely`, replacing Knex) and Better Auth's database layer.
- **Stability of design** — still `0.x` after five years, but the API has been conservative: breaking changes are mostly removals after long deprecations, listed in each release.
- **Maintenance** — active. `0.29.7` and the `0.28.18` backport both shipped on **17 October 2026**; `0.30.0-beta.2` is on the `next` tag. The project is community-run with no company behind it. Two maintainers do most of the work (Sami Koskimäki and Igal Klebanov), which is its main bus-factor risk. The issue tracker is small: about **150 open issues and 40 open PRs**.

---

## How it works

### The `Database` interface

Each table is an interface; `ColumnType<Select, Insert, Update>` and `Generated<T>` describe columns whose types differ per operation. `Selectable<T>`, `Insertable<T>`, and `Updateable<T>` derive the row shapes.

```
DB introspection ──► kysely-codegen / kanel ──► db.d.ts (interface Database)
                                                    │
app code ──► new Kysely<Database>({ dialect }) ──► compile-time checks ──► SQL ──► driver
```

You have to keep that interface in sync with the real schema. Options:

| Tool | Source of truth | Notes |
|---|---|---|
| `kysely-codegen` (0.20.0, Feb 2026) | live database | most common; Postgres, MySQL, SQLite, MSSQL, libSQL, Bun |
| `kanel` (4.0.4) + `kanel-kysely` | live Postgres database | Postgres-only, richer type mapping, also generates Zod |
| `prisma-kysely` (3.2.1) | `schema.prisma` | use Prisma for schema/migrations, Kysely for queries |
| hand-written | your head | fine for small schemas; drifts silently |

Kysely does **not** validate the interface against the database at runtime. A stale interface compiles fine and fails at query time.

### Dialects

Built in: **PostgreSQL** (`pg`), **MySQL** (`mysql2`), **MSSQL** (`tedious` + `tarn`), **SQLite** (`better-sqlite3`), and **PGlite** (added in 0.29). The kysely-org also maintains a **postgres.js** dialect and a SingleStore Data API dialect. Serverless and edge platforms are covered by community dialects: Neon, PlanetScale serverless, Cloudflare D1 and Durable Objects, libSQL/Turso, AWS RDS Data API, Bun SQLite, Node `node:sqlite`, and others. Edge support is as good as the dialect you pick. Community dialects vary in quality and release cadence.

### Relations without an ORM

There are no relations to declare. To return nested data in one query, you build it with SQL JSON functions using the dialect helpers `jsonArrayFrom` and `jsonObjectFrom` (`kysely/helpers/postgres`, `/mysql`, `/sqlite`). The result is typed, and it is one statement, so no [N+1](../../../software-engineering/databases/concepts/n-plus-one-problem.md). Caveats:

- JSON loses native types: dates and bigints come back as strings inside the nested objects.
- SQLite returns JSON as text. Add `ParseJSONResultsPlugin`.
- MySQL needs 8.0.14 or later, and MariaDB is not supported by these helpers.

### Transactions

- `db.transaction().execute(async (trx) => { ... })` commits on resolve and rolls back on throw.
- `db.startTransaction().execute()` returns a **controlled transaction** with explicit `commit()`, `rollback()`, and savepoints. It is useful when the transaction spans code you do not control. `0.29.7` fixed several connection leaks and races in this API, so upgrade if you use it.
- Isolation level and access mode are set on the builder (`.setIsolationLevel('serializable')`).

### Migrations — and their limits

Kysely ships a `Migrator` (imported from `kysely/migration` since 0.29) and an optional CLI, `kysely-ctl` (0.22.0). Each migration exports `up(db)` and `down(db)`, written with the schema builder (`db.schema.createTable(...)`) or raw `sql`. Migrations run in name order, take a database lock so concurrent instances do not run them twice, and run inside a transaction where the dialect supports transactional DDL.

What it does **not** do:

- **No schema diffing and no migration generation.** You write every migration by hand, and then regenerate the `Database` interface. That makes two sources of truth (migrations and types) which you keep in sync yourself.
- **Use `Kysely<any>` inside migrations**, as the docs recommend: a migration must not depend on today's app types.
- PgBouncer in transaction-pooling mode breaks the session-level migration lock (since 0.28.18/0.29). Run migrations over a direct connection.

`0.30` (beta) adds `transactionMode: 'per-run' | 'per-migration' | 'none'` and a `defineMigration` helper. Many teams pair Kysely with an external migration tool (Atlas, dbmate, Flyway, or Prisma/Drizzle Kit for schema only). See [Migrations](migrations.md).

### Plugins

Plugins rewrite the query tree or the results: `CamelCasePlugin` (snake_case in the DB, camelCase in TS), `ParseJSONResultsPlugin`, `DeduplicateJoinsPlugin`, `WithSchemaPlugin`, `HandleEmptyInListsPlugin`, and `SafeNullComparisonPlugin` (0.29, turns `= null` into `is null`). `CamelCasePlugin` has edge cases with raw `sql` fragments and JSON keys. Test it before adopting it on a large codebase.

### Type-level cost

All of Kysely's safety is computed by the TypeScript compiler. With very large schemas (hundreds of tables) or long builder chains, type checking and editor response slow down, and you occasionally hit "type instantiation is excessively deep". Mitigations:

- `$pickTables<'a' | 'b'>()` / `$omitTables` (0.29) narrow the schema a query sees.
- Split the codebase into smaller compilation units.
- The 0.29.5 notes say TypeScript 7's deeper type computations increased instantiation counts, and the maintainers are optimizing for it.

### 0.29 breaking changes (May 2026)

- ESM only, with no CommonJS build.
- Requires **Node.js ≥ 22** and **TypeScript ≥ 5.4**.
- Migration exports moved to `kysely/migration`.
- Removed long-deprecated APIs (`sql.value`/`sql.literal` → `sql.val`/`sql.lit`).

New in 0.29: query cancellation with `AbortSignal`, the PGlite dialect, and the `ReadonlyKysely<DB>` type. `0.28.x` still receives backports.

---

## Examples

Database interface (normally generated by `kysely-codegen`) and setup:

```ts
// src/db/types.ts
import type { ColumnType, Generated, Insertable, Selectable } from 'kysely';

export interface Database {
  users: {
    id: Generated<number>;
    name: string;
    created_at: ColumnType<Date, string | undefined, never>; // read Date, optional on insert, immutable
  };
  posts: {
    id: Generated<number>;
    author_id: number;
    title: string;
    published: Generated<boolean>;
  };
}

export type User = Selectable<Database['users']>;
export type NewUser = Insertable<Database['users']>;
```

```ts
// src/db/client.ts
import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import type { Database } from './types';

export const db = new Kysely<Database>({
  dialect: new PostgresDialect({ pool: new Pool({ connectionString: process.env.DATABASE_URL }) }),
});
```

Queries, nested relations, and a transaction:

```ts
import { sql } from 'kysely';
import { jsonArrayFrom } from 'kysely/helpers/postgres';
import { db } from './client';

// Typed result: { id: number; name: string; post_count: string | number | bigint }[]
const authors = await db
  .selectFrom('users')
  .leftJoin('posts', (join) =>
    join.onRef('posts.author_id', '=', 'users.id').on('posts.published', '=', true))
  .select(['users.id', 'users.name', (eb) => eb.fn.count('posts.id').as('post_count')])
  .groupBy('users.id')
  .orderBy('post_count', 'desc')
  .limit(10)
  .execute();

// "Relations": one query, nested via JSON aggregation
const withPosts = await db
  .selectFrom('users')
  .select((eb) => [
    'users.id',
    'users.name',
    jsonArrayFrom(
      eb.selectFrom('posts')
        .select(['posts.id', 'posts.title'])
        .whereRef('posts.author_id', '=', 'users.id')
        .where('posts.published', '=', true),
    ).as('posts'),
  ])
  .execute();

// Commits on resolve, rolls back on throw
await db.transaction().execute(async (trx) => {
  const user = await trx.insertInto('users').values({ name: 'Ada' })
    .returning('id').executeTakeFirstOrThrow();
  await trx.insertInto('posts').values({ author_id: user.id, title: 'Hello' }).execute();
});

// Raw SQL with bound parameters; sql.raw / sql.lit inline values unescaped — avoid with user input
const minId = 100;
const rows = await sql<{ name: string }>`select name from users where id > ${minId}`.execute(db);

// db.selectFrom('user') // compile error: table does not exist
```

Hand-written migration:

```ts
// migrations/2026-10-01T00-00_create_users.ts
import { type Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('users')
    .addColumn('id', 'integer', (col) => col.primaryKey().generatedAlwaysAsIdentity())
    .addColumn('name', 'text', (col) => col.notNull())
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('users').execute();
}
```

---

## When to use

- You think in SQL and want compile-time checks on table names, column names, and result types, with no ORM behavior in between.
- The schema is owned elsewhere: a DBA, another service, a separate migration tool, or Prisma (`prisma-kysely`). Kysely just queries it.
- Complex, performance-sensitive queries such as reports, CTEs, window functions, upserts, and `merge`, where an ORM's abstraction gets in the way.
- Replacing Knex in a TypeScript codebase. The concepts carry over almost one-to-one.
- Serverless and edge, provided a maintained dialect exists for your driver. The core has no runtime dependencies and no engine.
- As a typed escape hatch next to an ORM, or as the foundation for your own repository layer (see [Hexagonal Architecture](../../../software-engineering/architecture/hexagonal.md)).

## When NOT to use

- You want schema-as-code with generated migrations. Kysely has no diffing, so look at [Drizzle](drizzle.md) or [Prisma](prisma.md), or pair Kysely with an external migration tool.
- The team is not comfortable with SQL. Kysely is SQL with types; it will not design joins for you.
- Most of your code loads object graphs (an aggregate and its children). JSON-helper nesting works, but an ORM's relation API is shorter, and you lose native dates inside nested JSON.
- You need Unit of Work, identity map, change tracking, or lifecycle hooks. Use [TypeORM / MikroORM](typeorm-and-mikro-orm.md).
- Very large schemas on a slow CI type-check budget, unless you are willing to use `$pickTables` and split compilation units.
- You need CommonJS or Node.js older than 22 on the current line. Stay on `0.28.x`, which still gets backports, or upgrade the runtime.

---

## References

- [Kysely documentation](https://kysely.dev/docs/intro)
- [Kysely — Relations recipe](https://kysely.dev/docs/recipes/relations)
- [Kysely — Migrations](https://kysely.dev/docs/migrations)
- [Kysely — Dialects](https://kysely.dev/docs/dialects)
- [Kysely releases on GitHub](https://github.com/kysely-org/kysely/releases) (0.29.0 breaking changes, 0.30 beta)
- [kysely-codegen](https://github.com/RobinBlomberg/kysely-codegen)
- [kysely-ctl](https://github.com/kysely-org/kysely-ctl)
- [Kanel](https://github.com/kristiandupont/kanel)
- [prisma-kysely](https://github.com/valtyr/prisma-kysely)
- [kysely on npm](https://www.npmjs.com/package/kysely)
