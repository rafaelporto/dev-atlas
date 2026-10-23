---
type: concept
tags:
  - language
  - nextjs
  - full-stack
  - orm
related:
  - languages/javascript-typescript/frameworks/nextjs/orms/overview
  - languages/javascript-typescript/runtimes/nodejs/orms/prisma
  - languages/javascript-typescript/runtimes/nodejs/orms/drizzle
  - languages/javascript-typescript/runtimes/nodejs/orms/kysely
  - languages/javascript-typescript/runtimes/nodejs/orms/choosing
  - languages/javascript-typescript/frameworks/nextjs/deploy
  - languages/javascript-typescript/frameworks/nextjs/middleware
language: "nextjs"
---
# Databases in Serverless and Edge Next.js Deployments

> Why serverless Next.js deployments exhaust database connections, how pool sizing, external poolers, and HTTP drivers fix it, which ORMs run outside Node.js, and why in Next.js 16 the default answer is "Node.js runtime, one region, next to the database".

---

## What is it?

When a Next.js app runs on a serverless platform, there is no single long-lived server holding a handful of database connections. Instead the platform starts and stops many short-lived **function instances** (and, historically, lightweight **edge isolates**), and each of them has to reach the database on its own. This article covers the problems that creates — connection exhaustion, cold-start latency, cross-region round trips, runtimes without TCP sockets — and the tools that address them: small pools with short idle timeouts, external **connection poolers**, and **HTTP/WebSocket database drivers**.

> Versions, maintenance status, and weekly npm downloads were checked in **October 2026** (downloads: week of 12–18 October 2026). Next.js is at **16.4.2**. This area moved fast in 2025–2026 — the Edge runtime was deprecated, Prisma dropped its Rust engine, Prisma Accelerate is being retired — so re-check before choosing.

---

## Why does it matter?

The failure mode is well known and painful: the app works in development, then a traffic spike in production produces `too many connections` / `remaining connection slots are reserved` errors and the database falls over — not because of query load, but because hundreds of instances each opened their own pool.

The landscape also shifted under existing advice:

- **Next.js 16** renamed `middleware.ts` to `proxy.ts`, and Proxy runs on the **Node.js runtime** by default (the `runtime` option is not allowed there). In **16.3** `export const runtime = 'edge'` in pages, layouts, and route handlers was **deprecated**; Vercel's docs state that routes now run on Node.js and recommend migrating from Edge to Node.js.
- **Vercel Fluid compute** (default for new projects since 23 April 2025) lets one instance serve many concurrent requests, which makes ordinary TCP pools viable again — if idle connections are released before the instance suspends.
- **Prisma 7** requires a driver adapter for every database and replaced the Rust query engine with a TypeScript one, so "Prisma on the edge" no longer means "Prisma plus a proxy".
- **Prisma Accelerate** stopped accepting new setups in October 2026 and is retired on **1 December 2026**.
- **`@vercel/postgres`** is deprecated; Vercel Postgres databases were migrated to Neon.

Much of the "edge database" content written in 2022–2024 is now wrong advice for a Next.js app.

---

## How it works

### Why serverless exhausts connections

```
Classic server                     Serverless (one request per instance)
┌──────────────┐                   ┌────┐┌────┐┌────┐┌────┐ ... ×200
│ 1 process    │                   │pool││pool││pool││pool│
│ pool max=10  │                   │ 10 ││ 10 ││ 10 ││ 10 │
└──────┬───────┘                   └─┬──┘└─┬──┘└─┬──┘└─┬──┘
       │ 10 conns                    └─────┴──┬──┴─────┘
   ┌───▼───┐                               2,000 conns
   │  DB   │ max_connections ≈ 100–400   ┌───▼───┐
   └───────┘                             │  DB   │  ✗ exhausted
                                         └───────┘
```

Three mechanisms compound:

1. **Every instance owns its pool.** Module-level state (`const pool = new Pool()`) is per instance, so total connections = instances × pool max. Scale-out multiplies it.
2. **Cold starts open new connections.** A TCP + TLS + auth handshake costs tens of milliseconds (Vercel cites 50–100 ms or more) on every new instance.
3. **Suspended instances leak idle connections.** A frozen function cannot run its pool's idle timer, so its connections stay open on the server until the instance is destroyed or the server-side timeout fires — minutes later. Vercel's own analysis argues this, not raw instance count, is the main problem.

### Mitigation 1 — size the pool for the execution model

| Execution model | Pool `max` | Idle timeout | Notes |
|---|---|---|---|
| One request per instance (AWS Lambda, classic serverless) | 1 | short | Concurrency comes from instances, not the pool |
| In-function concurrency (Vercel Fluid, Cloud Run, containers) | small, e.g. 5–10 | ~5 s | Vercel explicitly calls `max: 1` an anti-pattern under Fluid |
| Long-lived server (`next start`, standalone container) | sized to replicas × max ≤ DB budget | 10–30 s | The classic Node.js rule applies |

On Vercel, call **`attachDatabasePool(pool)`** from `@vercel/functions` (3.10.3) right after creating the pool. It uses `waitUntil` to keep the instance alive just long enough for idle clients to be closed before suspension. It supports `pg`, `mysql2`, MariaDB, MongoDB, `ioredis`, Cassandra, and compatible pools. It is Vercel-specific and does nothing for HTTP drivers (which have no pool).

Also cache the client on `globalThis` in development, so hot reload does not create a new pool on every edit.

### Mitigation 2 — put a pooler in front of the database

A pooler accepts thousands of cheap client connections and multiplexes them onto a small number of real database connections.

| Pooler | Where | Model | Caveats |
|---|---|---|---|
| **PgBouncer** (1.26.1, Oct 2026) | Self-hosted / built into many providers | Transaction mode for serverless | Session features break: `SET`, advisory locks, `LISTEN/NOTIFY`, SQL-level `PREPARE`, session temp tables. Protocol-level prepared statements work since 1.21 (2023) via `max_prepared_statements`, on by default (200) since 1.24 |
| **Supavisor** (Supabase) | Managed, shared | Session (port 5432) or transaction (port 6543) | Supabase states transaction mode does **not** support prepared statements; recommends pool size 1 and prepared statements off for serverless; shared pooler is IPv4 |
| **Neon pooler** | Managed (`-pooler` hostname) | PgBouncer, transaction mode | Up to 10,000 client connections; no `SET`/`RESET`, `LISTEN/NOTIFY`, SQL `PREPARE`; use the direct host for migrations and `pg_dump` |
| **Amazon RDS Proxy** | AWS (paid per vCPU/ACU) | Transaction multiplexing | **Pinning**: on PostgreSQL, `SET`, SQL `PREPARE`, temp tables, cursors, session advisory locks, and statements > 16 KB pin a client to one connection and defeat multiplexing |
| **Cloudflare Hyperdrive** | Cloudflare Workers only | Pooling + query cache | Works with `pg`, `postgres.js`, `mysql2`; available on free and paid plans |
| **Prisma Accelerate** | Managed (commercial) | Pooling + global cache | **Retired 1 December 2026** — do not adopt; Prisma Postgres has built-in pooling |

Rules of thumb: migrations always use the **direct** URL (DDL, advisory locks, and `SET` do not survive transaction pooling); the app uses the **pooled** URL; and check whether your driver's prepared statements are compatible with the pooler you picked.

### Mitigation 3 — drivers that do not hold a TCP connection

| Driver | Version (Oct 2026) | Database | Transport | Transactions |
|---|---|---|---|---|
| `@neondatabase/serverless` | 1.2.0 (~3.0M/wk) | Neon Postgres (also PlanetScale Postgres) | HTTP via `neon()`; WebSocket via `Pool`/`Client` | HTTP: non-interactive only (`sql.transaction([...])`). WebSocket: full interactive |
| `@planetscale/database` | 2.0.0 (~285k/wk) | PlanetScale MySQL (Vitess) | HTTP (`fetch`) | `conn.transaction(async tx => …)` over an HTTP session |
| `@libsql/client` | 0.18.0 (~2.3M/wk) | Turso / libSQL (SQLite) | HTTP or WebSocket (`@libsql/client/web` outside Node) | `batch()` runs in an implicit transaction; interactive transactions lock writes, 5 s timeout |
| Cloudflare D1 binding | platform API | D1 (SQLite) | Workers binding | No interactive transactions; `batch()` is atomic |
| Cloudflare Hyperdrive | platform API | Your existing Postgres/MySQL | TCP from Workers via `connect()` | Full (it is a real Postgres/MySQL connection) |

Footguns: `@planetscale/database` **2.0.0** (September 2026) removed client-side parameter interpolation and requires Node 22+; `@prisma/adapter-planetscale` 7.10.1 still depends on `^1.19.0`, so do not bump the driver independently. In edge isolates, Neon WebSocket `Pool`/`Client` objects cannot outlive a request — create and close them inside the handler.

### Which ORMs run outside Node.js

"Edge" today mostly means **Cloudflare Workers** (via OpenNext or a separate API), not Next.js Edge routes, which are deprecated. The question is whether the ORM is pure JavaScript with a Web-API driver available.

| ORM / query builder | Node.js (TCP) | Edge isolate (Workers / legacy Next.js Edge) | How | Verified against |
|---|---|---|---|---|
| **Drizzle** 0.45.4 | Yes | Yes | `drizzle-orm/neon-http`, `neon-serverless`, `planetscale-serverless`, `libsql`, `d1`; `pg`/`postgres` on Workers with Hyperdrive | Drizzle connect docs; `neon-http` throws `No transactions support in neon-http driver` on `db.transaction()` — use `db.batch()` |
| **Prisma** 7.10.1 | Yes (`@prisma/adapter-pg`) | Yes, via driver adapters | `@prisma/adapter-neon` (`PrismaNeon` WebSocket, `PrismaNeonHttp` HTTP), `adapter-planetscale`, `adapter-libsql`, `adapter-d1`, `adapter-ppg`; `adapter-pg` on Workers | Prisma edge docs; `PrismaNeonHttp` rejects `startTransaction` ("Transactions are not supported in HTTP mode"); D1 transactions are ignored and run as individual queries |
| **Kysely** 0.29.7 | Yes | Yes | Core `PostgresDialect` accepts Neon's `pg`-compatible `Pool`; community dialects for PlanetScale, libSQL, D1, Neon HTTP | Kysely dialects page |
| **MikroORM** 7.2.5 | Yes | Claimed for Workers in v7 | Zero-dependency core, pre-compiled entities, bundled migrations; check your driver | v7 release post — not verified end to end here |
| **TypeORM** 1.1.2 | Yes | No (not documented) | Depends on Node drivers and reflection metadata | TypeORM 1.0 release notes list no edge target |
| **Sequelize** 6.37.8 | Yes | No | Node drivers only | — |

### Latency: region beats edge

A page that runs 5 sequential queries from an edge location 150 ms from the database spends 750 ms waiting; the same page in the database's region spends a few milliseconds. Edge placement only helps work that needs **no** central data (redirects, header checks, cached responses).

- Pin functions to the database's region (`vercel.json` `regions`, or per-function overrides). Vercel's default for new projects is `iad1` (Washington, D.C.).
- Keep `proxy.ts` free of database calls — it runs on every matched request, before the route.
- Read-heavy global traffic: cache (`use cache`, CDN) or add regional read replicas, rather than moving compute away from the primary.

### Transactions over HTTP drivers

HTTP is stateless, so a classic interactive transaction (`BEGIN` → read → decide in code → write → `COMMIT`) needs either a session (WebSocket, PlanetScale HTTP session) or is not possible:

- **Batch / non-interactive** — all statements sent at once and run atomically (`neon()` `sql.transaction([...])`, Drizzle `db.batch()` on Neon HTTP/libSQL/D1, D1 `batch()`). You cannot branch on intermediate results.
- **Interactive** — needs WebSocket (`Pool` from `@neondatabase/serverless`, Drizzle `neon-serverless`, `PrismaNeon`) or a TCP driver.
- If a flow needs `SELECT ... FOR UPDATE` and conditional logic, use a TCP or WebSocket driver in a Node.js function, or move the logic into a single SQL statement.

---

## Examples

### Node.js runtime on Vercel Fluid: TCP pool + Drizzle

```ts
// lib/db.ts
import "server-only";
import { Pool } from "pg";
import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { pool?: Pool };

const pool =
  globalForDb.pool ??
  new Pool({
    connectionString: process.env.DATABASE_URL, // pooled URL
    max: 5,                       // small, but not 1 under in-function concurrency
    idleTimeoutMillis: 5_000,     // release quickly between bursts
    connectionTimeoutMillis: 5_000,
  });

if (process.env.NODE_ENV !== "production") globalForDb.pool = pool;
attachDatabasePool(pool); // close idle clients before the instance suspends

export const db = drizzle(pool, { schema });
```

### Prisma 7 with the same pool

```ts
// lib/prisma.ts
import "server-only";
import { Pool } from "pg";
import { attachDatabasePool } from "@vercel/functions";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client"; // generator output path

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5, idleTimeoutMillis: 5_000 });
attachDatabasePool(pool);

export const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
```

### HTTP driver: Neon + Drizzle, batch instead of transaction

```ts
// lib/db-http.ts — works in Node.js and in edge isolates (no TCP, no pool)
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, sql } from "drizzle-orm";
import { accounts, transfers } from "./schema";

export const db = drizzle(neon(process.env.DATABASE_URL!));

export async function transfer(from: number, to: number, amount: number) {
  // db.transaction() throws on neon-http; db.batch() runs atomically in one HTTP call
  await db.batch([
    db.update(accounts).set({ balance: sql`${accounts.balance} - ${amount}` }).where(eq(accounts.id, from)),
    db.update(accounts).set({ balance: sql`${accounts.balance} + ${amount}` }).where(eq(accounts.id, to)),
    db.insert(transfers).values({ from, to, amount }),
  ]);
  // No "check balance, then decide" here — that needs an interactive transaction.
}
```

### Interactive transaction over WebSocket (create per request in isolates)

```ts
import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { eq } from "drizzle-orm";
import { accounts } from "./schema";

export async function withdraw(id: number, amount: number) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const db = drizzle(pool);
    return await db.transaction(async (tx) => {
      const [acc] = await tx.select().from(accounts).where(eq(accounts.id, id)).for("update");
      if (!acc || acc.balance < amount) throw new Error("Insufficient funds");
      await tx.update(accounts).set({ balance: acc.balance - amount }).where(eq(accounts.id, id));
    });
  } finally {
    await pool.end(); // WebSocket connections cannot outlive the request in edge isolates
  }
}
```

---

## When to use

- Use the **Node.js runtime** (the Next.js 16 default) with a small TCP pool and `attachDatabasePool` on Vercel Fluid — it is the simplest correct setup and keeps full transaction support.
- Use a **pooler in transaction mode** (provider pooler, PgBouncer, RDS Proxy) whenever many instances can connect at once; keep a direct URL for migrations.
- Use **HTTP drivers** (`neon()`, `@planetscale/database`, libSQL) for single-query or batch-shaped workloads, for Cloudflare Workers, or when you want zero connection management.
- Use **Drizzle or Kysely** when you need the same data layer to run on Node.js and on Workers; **Prisma 7** with a driver adapter when you are already on Prisma.
- Pin function regions next to the primary database, and cache reads for global latency.

## When NOT to use

- Do not add `export const runtime = 'edge'` to new Next.js routes — it is deprecated since 16.3, and an edge function talking to a central database is usually slower than a regional Node.js function.
- Do not query the database from `proxy.ts`; do coarse checks with cookies/headers and authorize in the route.
- Do not set `max: 1` on Vercel Fluid, and do not use a large pool (default `pg` max is 10) on one-request-per-instance platforms.
- Do not run migrations or session-dependent code (`SET`, advisory locks, `LISTEN/NOTIFY`) through a transaction-mode pooler.
- Do not rely on HTTP drivers for flows that need read-then-write logic inside one transaction; do not assume Prisma or Drizzle "transactions" on D1 or Neon HTTP are atomic.
- Do not adopt Prisma Accelerate (retired 1 December 2026) or `@vercel/postgres` (deprecated) in new projects.
- Do not plan on TypeORM or Sequelize for edge isolates.

---

## References

- [Next.js — `proxy.js` file convention (Node.js runtime default)](https://nextjs.org/docs/app/api-reference/file-conventions/proxy)
- [Next.js — `runtime` route segment config (Edge deprecated)](https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config/runtime)
- [Next.js — Edge Runtime deprecated](https://nextjs.org/docs/messages/edge-runtime-deprecated)
- [Vercel — Edge runtime (recommendation to migrate to Node.js)](https://vercel.com/docs/functions/runtimes/edge)
- [Vercel — Fluid compute](https://vercel.com/docs/fluid-compute)
- [Vercel — `@vercel/functions` API reference (`attachDatabasePool`)](https://vercel.com/docs/functions/functions-api-reference/vercel-functions-package)
- [Vercel — The real serverless compute to database connection problem, solved](https://vercel.com/blog/the-real-serverless-compute-to-database-connection-problem-solved)
- [Vercel — Configuring regions for Vercel Functions](https://vercel.com/docs/functions/configuring-functions/region)
- [PgBouncer — configuration (`max_prepared_statements`)](https://www.pgbouncer.org/config.html) and [changelog](https://www.pgbouncer.org/changelog.html)
- [Supabase — Connecting to Postgres (Supavisor modes)](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [Neon — Connection pooling](https://neon.com/docs/connect/connection-pooling) and [serverless driver](https://neon.com/docs/serverless/serverless-driver)
- [AWS — Avoiding pinning an RDS Proxy](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy-pinning.html)
- [Cloudflare — Hyperdrive](https://developers.cloudflare.com/hyperdrive/) and [D1 Workers API](https://developers.cloudflare.com/d1/worker-api/d1-database/)
- [PlanetScale — database-js v2.0.0 release](https://github.com/planetscale/database-js/releases)
- [Turso — libSQL TypeScript reference](https://docs.turso.tech/sdk/ts/reference)
- [Prisma — Deploying to edge functions](https://www.prisma.io/docs/orm/prisma-client/deployment/edge/overview), [Upgrading to Prisma 7](https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-7), [Cloudflare D1](https://www.prisma.io/docs/orm/overview/databases/cloudflare-d1), [Accelerate](https://www.prisma.io/docs/accelerate)
- [Drizzle — Connect overview](https://orm.drizzle.team/docs/connect-overview), [Neon](https://orm.drizzle.team/docs/connect-neon), [Batch API](https://orm.drizzle.team/docs/batch-api)
- [Kysely — Dialects](https://kysely.dev/docs/dialects)
- [MikroORM — v7 released](https://mikro-orm.io/blog/mikro-orm-7-released)
- [TypeORM — 1.0 release notes](https://typeorm.io/docs/releases/1.0/release-notes/)
