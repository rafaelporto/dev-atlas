---
type: concept
tags:
  - language
  - nodejs
  - backend
  - orm
  - best-practice
related:
  - languages/nodejs/orms/overview
  - languages/nodejs/orms/prisma
  - languages/nodejs/orms/drizzle
  - languages/nodejs/orms/kysely
  - languages/nodejs/orms/typeorm-and-mikro-orm
  - languages/nodejs/orms/pitfalls
  - languages/nodejs/deploy
language: "nodejs"
---
# Schema Migrations in Node.js and TypeScript

> How to evolve a database schema safely from Node.js — declarative (diff-based) vs imperative migration tools, why `push`/`synchronize` stay out of production, running migrations as a deploy step with locking, roll-forward over rollback, expand/contract for zero downtime, Postgres lock hazards, and CI drift checks.

---

## What is it?

A schema migration is a small, versioned script that changes the structure of a database — add a table, rename a column, create an index — so that every environment can be brought to the same shape in the same order. The migration tool records which scripts already ran (usually in a table such as `_prisma_migrations`, `knex_migrations`, or `kysely_migration`) and applies only the new ones.

In Node.js the tool usually comes with your data-access library (Prisma Migrate, drizzle-kit, the Kysely migrator, TypeORM and MikroORM migrations), but it does not have to: standalone tools (node-pg-migrate, umzug, dbmate, graphile-migrate, Atlas) work with any ORM or with [raw SQL](raw-sql.md).

> Versions, maintenance status, and weekly npm downloads were checked in **October 2026** (downloads: week of 12–18 October 2026). Re-check before choosing.

---

## Why does it matter?

Code deploys are reversible in seconds; schema changes are not. A dropped column is gone, a table rewrite blocks writes for minutes, and during a rolling deploy **old and new application versions run against the same schema at the same time**. Most migration incidents come from the process, not the tool:

- `synchronize: true` or `db push` against production silently dropping a column the ORM no longer sees.
- Ten replicas running migrations at boot, racing each other or crash-looping on a failed migration.
- A `NOT NULL` column added in one step, breaking the still-running old version.
- `CREATE INDEX` (non-concurrent) on a large table blocking all writes.
- A hand-edited migration that ran in staging but differs from what production gets.

---

## How it works

### Declarative vs imperative

| | **Declarative / diff-based** | **Imperative** |
|---|---|---|
| You write | The desired schema (Prisma schema, Drizzle TS schema, Atlas HCL/SQL) | Each change as code or SQL (`up`, sometimes `down`) |
| Tool does | Diffs desired vs current, **generates** SQL migration files | Runs your scripts in order |
| Strengths | Less boilerplate; schema is the single source of truth; good for greenfield | Full control: data backfills, `CONCURRENTLY`, custom DDL, Postgres features ORMs do not model |
| Weaknesses | Renames look like drop + add; generated SQL must be reviewed; DB features outside the DSL need hand-written SQL | Schema truth is spread across files; types must be generated or kept in sync separately |
| Tools | Prisma Migrate, drizzle-kit `generate`, Atlas, MikroORM/TypeORM `migration:generate` | Kysely `Migrator`, Knex, node-pg-migrate, umzug, dbmate, graphile-migrate |

The best diff-based workflows still produce **versioned SQL files committed to the repo**, which you read and edit before merging. Generation is a starting point, not a review.

### Tools at a glance (October 2026)

| Tool | Version | Weekly downloads | Style | Down migrations | Locking |
|---|---|---|---|---|---|
| Prisma Migrate (Prisma 7) | `@prisma/client` 7.10.1 | ~11M (client) | Diff from `schema.prisma` → SQL files; `migrate dev` / `migrate deploy` | No (roll forward; `migrate diff` can script a reverse) | Postgres/MySQL advisory lock, 10 s timeout |
| Prisma 8 (RC) | 8.0.0-rc.x; GA expected Oct 2026 | — | Reworked CLI: `contract emit`, `migration plan`, `migration check`, `db migrate` | — | Check docs at GA |
| drizzle-kit | 0.31.11 (1.0 in RC) | ~15M | `generate` (SQL files), `migrate`, `push`, `check`, `pull` | No | Not documented — run from one job |
| Atlas | v1.3.0 (Aug 2026), Go binary | — | Declarative `schema apply` or versioned `migrate diff`; loads Prisma/Drizzle/SQL schemas | Yes (computed) | Yes; `migrate lint` is **Atlas Pro only** since v0.38 |
| Kysely `Migrator` | `kysely` 0.29.7; `kysely-ctl` 0.22.0 | ~12.8M | TS files with `up`/`down` using the Kysely builder | Yes | DB-level lock; parallel calls run serially. On Postgres the pending batch runs in one transaction (`disableTransactions` opts out) |
| Knex | 3.3.0 (Jun 2026) | ~3M | JS/TS files with `up`/`down` | Yes | `knex_migrations_lock` table |
| node-pg-migrate | 9.0.0 (Jul 2026) | ~585k | Postgres-only JS/TS or SQL files, rich DDL helpers | Yes | Advisory lock by default |
| umzug | 3.8.3 (May 2026) | ~1.1M | Generic runner; you supply storage and migration functions | Yes | None built in (example file locker only) |
| dbmate | 2.37.0 (Oct 2026), Go binary on npm | ~174k | Plain `.sql` with `-- migrate:up` / `-- migrate:down` | Yes | — |
| graphile-migrate | 1.4.1 stable (Dec 2022); 2.0 in RC | ~32k | Postgres-only plain SQL; idempotent `current.sql` while developing, then `commit` | No (forward-only by design) | — |
| TypeORM / MikroORM | `typeorm` 1.1.2; `@mikro-orm/migrations` 7.2.5 | ~2.8M / ~325k | Entity diff → generated migration classes | Yes | MikroORM runs on umzug |

### `push` / `synchronize` vs versioned migrations

`prisma db push`, `drizzle-kit push`, TypeORM `synchronize: true`, and MikroORM `schema:update` make the database match the model **right now**, with no file, no history, and no review. They are excellent for prototyping and throwaway local or test databases. In production they are a liability:

- No artifact to review — you discover a destructive change after it ran.
- Renames become drop + add, i.e. data loss (tools may prompt; CI does not answer prompts thoughtfully).
- Different environments drift because nothing records what was applied.
- TypeORM's own docs warn that `synchronize` should not be used in production.

Rule: **push for local and ephemeral databases; versioned migrations for anything with data you care about.** Switch before the first real user, not after.

### Run migrations in the deploy, not at app boot

```
CI build ──▶ migrate job (once, one runner) ──▶ rolling deploy of app replicas
                 │ fails → stop the deploy                ▲
                 └──── schema is backward compatible ─────┘
```

- Run `prisma migrate deploy`, `drizzle-kit migrate`, or your migrator's script as a **separate step**: a CI/CD job, a Kubernetes `Job` or Helm pre-upgrade hook, a release-phase command on a PaaS. See [Deploy](../deploy.md).
- Running at boot couples app availability to migration success, multiplies the run by the replica count, needs DDL privileges in the app's credentials, and on serverless platforms runs on cold start.
- Locks (advisory locks, lock tables) protect against concurrent runs, but a lock only serializes; it does not make a long migration safe to run while 20 pods wait in startup probes.
- Give the migration job its own database role with DDL rights; the app's runtime role should not be able to `DROP TABLE`.

### Rollbacks vs roll-forward

`down` migrations look like a safety net and rarely are: they are seldom tested, cannot restore dropped data, and roll back schema while the app version may not roll back with it. Prisma, drizzle-kit, and graphile-migrate do not offer them at all.

The production default is **roll forward**: fix with a new migration. Make that cheap by keeping each migration small and backward compatible (expand/contract below), so the previous app version keeps working and an app rollback never needs a schema rollback. Keep `down` for local development, and back up before anything destructive.

### Expand / contract for zero downtime

Each step is a separate migration and usually a separate deploy:

```
1. Expand    add column  email_normalized  NULL      (old app ignores it)
2. Dual-write new app writes both columns
3. Backfill  batched UPDATE ... WHERE id BETWEEN ...   (data migration, not schema)
4. Switch    reads move to the new column; add NOT NULL / constraints safely
5. Contract  stop writing the old column; later, drop it
```

Renames follow the same shape (add new, dual-write, backfill, switch, drop old) — never `RENAME COLUMN` under a running app that still uses the old name.

### Postgres lock hazards

DDL takes locks; an `ACCESS EXCLUSIVE` lock queued behind one long transaction blocks **every** later query on that table.

| Operation | Hazard | Safer form |
|---|---|---|
| `CREATE INDEX` | Blocks writes for the whole build | `CREATE INDEX CONCURRENTLY` — cannot run inside a transaction, so mark the migration non-transactional (or put it in its own file); check for an `INVALID` index after a failure |
| `ADD COLUMN ... DEFAULT x` | Rewrite on Postgres < 11; volatile defaults (`random()`) still rewrite | Non-volatile default on PG ≥ 11 is metadata-only |
| `SET NOT NULL` | Full scan under exclusive lock | Add `CHECK (col IS NOT NULL) NOT VALID`, then `VALIDATE CONSTRAINT`; PG 18 also allows `NOT NULL ... NOT VALID` |
| `ADD FOREIGN KEY` | Validates all rows under lock | `NOT VALID`, then `VALIDATE CONSTRAINT` separately |
| `ALTER COLUMN TYPE` | Usually a table rewrite | New column + expand/contract |
| Any DDL | Waits forever behind long transactions, blocking others | `SET lock_timeout = '5s'` (and `statement_timeout`) at the top of the migration; retry on timeout |

Generated migrations from Prisma or drizzle-kit do **not** add `CONCURRENTLY` or `lock_timeout` for you — edit the SQL file.

### Data migrations vs schema migrations

Schema migrations should be fast and deterministic. Large backfills are not: they hold transactions open, bloat WAL, and can time out a deploy. Run them as **separate, batched, resumable jobs** (by primary-key range, with commits per batch), idempotent so they can be re-run. Small reference-data inserts can live in a migration; a 50M-row `UPDATE` cannot.

### CI checks

- **Drift** — Prisma: `prisma migrate diff --from-migrations ./prisma/migrations --to-schema ./prisma/schema.prisma --exit-code` (non-zero when a schema change has no migration). Drizzle: `drizzle-kit generate` in CI and fail if it produces a new file; `drizzle-kit check` for migration collisions.
- **Apply from scratch** — spin up a throwaway database (container) and run all migrations, then the integration tests.
- **Lint** — reject non-concurrent `CREATE INDEX`, drops, and renames without an explicit override (Atlas `migrate lint` if you pay for Pro, `squawk` for Postgres SQL, or a simple grep rule).
- **Immutability** — fail when an already-merged migration file changes (Prisma checksums and warns; for others compare against `main`).

---

## Examples

### Kysely migrator run as a deploy step

```ts
// scripts/migrate.ts — executed by the CI/CD job, never imported by the app
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { Kysely, Migrator, FileMigrationProvider, PostgresDialect } from 'kysely';
import pg from 'pg';

const db = new Kysely<unknown>({
  dialect: new PostgresDialect({ pool: new pg.Pool({ connectionString: process.env.MIGRATION_DATABASE_URL }) }),
});

const migrator = new Migrator({
  db,
  provider: new FileMigrationProvider({ fs, path, migrationFolder: path.join(import.meta.dirname, '../migrations') }),
});

const { error, results } = await migrator.migrateToLatest();
for (const r of results ?? []) console.log(`${r.status}: ${r.migrationName}`);
await db.destroy();
if (error) {
  console.error(error);
  process.exit(1); // fail the pipeline, stop the rollout
}
```

### An expand step with Postgres-safe DDL

```ts
// migrations/2026_10_22_001_add_email_normalized.ts
import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<unknown>) {
  await sql`set lock_timeout = '5s'`.execute(db);
  await db.schema.alterTable('users').addColumn('email_normalized', 'text').execute(); // nullable: expand
}

export async function down(db: Kysely<unknown>) {
  await db.schema.alterTable('users').dropColumn('email_normalized').execute();
}
```

```ts
// migrations/2026_10_23_001_index_email_normalized.ts
// CONCURRENTLY cannot run in a transaction. On Postgres the Kysely Migrator runs the
// whole pending batch inside ONE transaction, so apply this file in a separate run:
//   await migrator.migrateUp({ disableTransactions: true })
import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<unknown>) {
  await sql`create index concurrently if not exists users_email_normalized_idx
            on users (email_normalized)`.execute(db);
}

export async function down(db: Kysely<unknown>) {
  await sql`drop index concurrently if exists users_email_normalized_idx`.execute(db);
}
```

### Batched backfill as a separate job

```ts
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.MIGRATION_DATABASE_URL });
const BATCH = 5_000;

let lastId = 0;
for (;;) {
  const { rows } = await pool.query<{ id: number }>(
    `with batch as (
       select id from users where id > $1 and email_normalized is null order by id limit $2
     )
     update users u set email_normalized = lower(trim(u.email))
     from batch where u.id = batch.id
     returning u.id`,
    [lastId, BATCH],
  );
  if (rows.length === 0) break;
  lastId = Math.max(...rows.map((r) => r.id)); // resumable: re-running skips rows already filled
}
await pool.end();
```

### Prisma 7 in CI/CD

```ts
// package.json scripts (shown as a TS object for clarity)
const scripts = {
  'db:check': 'prisma migrate diff --from-migrations ./prisma/migrations --to-schema ./prisma/schema.prisma --exit-code',
  'db:deploy': 'prisma migrate deploy', // CI/CD job only — `migrate dev` and `db push` never touch production
};
```

---

## When to use

These practices apply to every project with a database that holds data you would not want to recreate:

- Versioned, committed migration files from the first deploy that has real users.
- Diff-based generation (Prisma, drizzle-kit, Atlas) when the ORM schema is your source of truth — with every generated file reviewed.
- Imperative tools (Kysely, node-pg-migrate, dbmate, graphile-migrate) when you use raw SQL or a query builder, or need Postgres features the ORM DSL cannot express.
- Expand/contract whenever the deploy is rolling or the app cannot take downtime.
- A dedicated migration job with its own credentials, plus CI drift and lint checks.

## When NOT to use

- `push` / `synchronize` / `schema:update` against staging or production — use them only for local and ephemeral databases.
- Migrations at app boot in multi-replica or serverless deployments.
- `down` migrations as the production recovery plan — roll forward instead.
- Expand/contract ceremony for a prototype or a single-instance internal tool that can tolerate a minute of downtime — a single migration is fine there.
- Large data backfills inside schema migrations.
- Editing migrations that have already run anywhere shared — add a new one.
- Two migration tools owning the same schema (e.g. drizzle-kit and Atlas both generating) — pick one owner.

---

## References

- [Prisma Migrate: development and production (v7)](https://www.prisma.io/docs/orm/v7/prisma-migrate/workflows/development-and-production) — `migrate dev` vs `migrate deploy`, advisory locking
- [Prisma release status](https://www.prisma.io/docs/orm/release-status) — Prisma 7 stable, Prisma 8 RC
- [Drizzle Kit overview](https://orm.drizzle.team/docs/kit-overview) and [Drizzle migrations](https://orm.drizzle.team/docs/migrations)
- [Kysely migrations](https://kysely.dev/docs/migrations) — locking, `allowUnorderedMigrations`, `kysely-ctl`
- [Atlas](https://atlasgo.io/) and [Atlas migrate lint](https://atlasgo.io/versioned/lint) — Pro-only since v0.38
- [node-pg-migrate](https://salsita.github.io/node-pg-migrate/), [umzug](https://github.com/sequelize/umzug), [dbmate](https://github.com/amacneil/dbmate), [graphile-migrate](https://github.com/graphile/migrate), [Knex migrations](https://knexjs.org/guide/migrations.html)
- [TypeORM migrations](https://typeorm.io/docs/migrations/why) and [MikroORM migrations](https://mikro-orm.io/docs/migrations)
- [PostgreSQL: `CREATE INDEX CONCURRENTLY`](https://www.postgresql.org/docs/current/sql-createindex.html#SQL-CREATEINDEX-CONCURRENTLY), [`ALTER TABLE`](https://www.postgresql.org/docs/current/sql-altertable.html), [`lock_timeout`](https://www.postgresql.org/docs/current/runtime-config-client.html#GUC-LOCK-TIMEOUT), [PostgreSQL 18 release notes](https://www.postgresql.org/docs/release/18.0/)
- [Martin Fowler — Parallel Change (expand/contract)](https://martinfowler.com/bliki/ParallelChange.html)
- [Squawk — Postgres migration linter](https://squawkhq.com/)
- npm registry and [npm download counts API](https://api.npmjs.org/downloads/point/last-week/drizzle-kit) — versions and downloads, week of 12–18 October 2026
