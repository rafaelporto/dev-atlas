---
type: concept
tags:
  - language
  - nodejs
  - typescript
  - multi-tenancy
  - backend
related:
  - software-engineering/architecture/multi-tenancy
  - software-engineering/databases/multi-tenancy/tenant-context
  - software-engineering/databases/multi-tenancy/testing-tenant-isolation
  - languages/javascript-typescript/runtimes/nodejs/orms/drizzle
  - languages/javascript-typescript/runtimes/nodejs/data-access
  - languages/javascript-typescript/runtimes/nodejs/architecture
language: "nodejs"
---
# Multi-Tenancy in Node.js

> In Node.js the tenant is resolved in an HTTP-server hook, carried either explicitly or with `AsyncLocalStorage`, and handed to PostgreSQL through a transaction that sets the tenant scope — and with Drizzle the row-level security policies can live in the schema itself.

---

## What is it?

A multi-tenant Node.js service serves many customers (tenants) from one process and one database, and must make sure each request only reads and writes its own tenant's rows. This article applies the language-agnostic design from [Multi-Tenant Applications](../../../../software-engineering/architecture/multi-tenancy.md) to Node.js and TypeScript: where the tenant is resolved (Fastify or Express), how it travels through the code, and how it reaches PostgreSQL so that [row-level security](../../../../software-engineering/databases/multi-tenancy/postgres-row-level-security.md) enforces the isolation.

---

## Why does it matter?

A Node.js process is single-threaded but handles many requests at once: while one request awaits the database, the event loop runs another. Anything stored in a module-level variable — `let currentTenant` — is shared by every request in flight, so tenant A's handler can resume and read tenant B's value. The same applies to a database session: a pooled `pg` connection that ran `SET app.tenant_ids = ...` carries that value to whichever request borrows it next.

The safe design has three parts: resolve and authorize the tenant once at the edge, carry it in a per-request place (an explicit parameter or `AsyncLocalStorage`, never a global), and run every unit of work inside a transaction that sets `app.tenant_ids` locally, so PostgreSQL filters rows regardless of which query builder issued them.

---

## How it works

```
request
   │
   ▼
onRequest hook ─────── verify token → memberships → request.tenant (+ ALS store)
   │
   ▼
route handler ──────── passes tenant explicitly to the service
   │
   ▼
withTenants(db, ids, fn)
   │  BEGIN
   │  select set_config('app.tenant_ids', $1, true)
   │  queries via tx            ← RLS policy filters rows
   ▼  COMMIT (setting disappears with the transaction)
```

### Resolving the tenant

- **Fastify** — an `onRequest` hook runs before body parsing and before `preHandler`, so it is the earliest place to reject a request without a valid tenant. Attach the result to the request (`request.tenant`, declared by augmenting `FastifyRequest`) and give it its own child logger. This is the primary example below, matching [HTTP and Web Servers](http-and-web-servers.md).
- **Express** — the same logic as a middleware registered before the routers; store the result on `res.locals` or a typed `req` property.
- **NestJS** — request-scoped providers (`Scope.REQUEST`) or the `nestjs-cls` package (`AsyncLocalStorage`-based) carry the tenant; a guard resolves and validates it.

In all three, a header, subdomain, or path segment is a *request* for a tenant, not proof of access. The tenant list comes from the access layer — the authenticated user's memberships — and a requested tenant can only narrow it.

### Carrying the tenant: explicit or `AsyncLocalStorage`

| | Explicit parameter | `AsyncLocalStorage` |
|---|---|---|
| Visible in signatures | Yes — `listProjects(tenant, …)` | No — hidden ambient state |
| Testable without setup | Yes | Needs `als.run(store, …)` in each test |
| Reaches deep infra (logger, db helper) | Only if threaded through | Yes, automatically |
| Survives callbacks, timers, promises | Yes | Yes, for async work started inside `run()` |
| Failure mode | Compile error when missing | `getStore()` returns `undefined` at runtime |

`AsyncLocalStorage` (`node:async_hooks`) is stable and is what tracing libraries use. Use `als.run(store, fn)` — the docs discourage `enterWith()`, which is still experimental and leaks the context into unrelated callbacks. In Fastify, `@fastify/request-context` wraps the request lifecycle in an ALS context for you.

**Recommendation:** pass the tenant explicitly through domain and application code (it is part of the use case's input), and use `AsyncLocalStorage` only at the edges — logging, tracing, and a defensive check inside the database helper. Never read a tenant from ALS and fall back to "all tenants" when it is missing; throw.

### The tenant-scoped transaction

`set_config('app.tenant_ids', $1, true)` is transaction-local: it is gone after `COMMIT`/`ROLLBACK`, so the pooled connection goes back clean (see [Passing the Tenant Context](../../../../software-engineering/databases/multi-tenancy/tenant-context.md)). Every query of the unit of work must use the transaction handle (`tx`), not the top-level `db` — a query on `db` runs on a different pooled connection, outside the scope, and returns nothing.

`node-postgres` serializes a JavaScript array parameter to a PostgreSQL array literal, so `${ids}::uuid[]::text` keeps the value typed and parameterized — no string building.

**Driver limit:** HTTP drivers such as `neon-http` and Cloudflare D1 do not support interactive transactions, so there is no transaction for `set_config(..., true)` to live in. Use a TCP or WebSocket driver (`node-postgres`, `postgres.js`, `neon-serverless`) for RLS-scoped work — the same limit [Drizzle ORM](orms/drizzle.md) notes for transactions in general.

### Drizzle: policies declared in the schema

Drizzle can declare roles and policies next to the table, and drizzle-kit emits them into the generated migration:

- `pgRole('app_user').existing()` references a role created outside Drizzle (by infrastructure or a custom migration), so drizzle-kit does not try to create it. To let drizzle-kit manage roles, set `entities: { roles: true }` in `drizzle.config.ts`.
- `pgPolicy(name, { as, for, to, using, withCheck })` in the table's third argument defines a policy; adding any policy enables RLS on the table.
- `pgTable.withRLS(...)` enables RLS on a table that has no policies yet (default deny). On 0.x releases the equivalent is `.enableRLS()` on the table.
- `crudPolicy` (from `drizzle-orm/neon`) is a shortcut that expands into the four per-command policies for a role — useful on Neon, where its `authUid` helper fits; for a tenant-list setting, write `pgPolicy` directly.
- drizzle-kit does **not** emit `FORCE ROW LEVEL SECURITY`. Add it in a custom migration (`drizzle-kit generate --custom`), and run migrations as `app_owner` while the app connects as `app_user`.

### Prisma and Kysely

- **Prisma** has no RLS model. The documented approach is a client extension that wraps each operation in a batch `$transaction([...])` whose first statement is `$executeRaw\`select set_config(...)\``. Prisma's own example ([`prisma-client-extensions/row-level-security`](https://github.com/prisma/prisma-client-extensions/tree/main/row-level-security)) is marked "example only, not intended for production" and warns that explicit `$transaction()` calls on the extended client may not behave as intended — test it before relying on it.
- **Kysely** maps directly: `db.transaction().execute(async (trx) => { await sql\`select set_config(...)\`.execute(trx); … })`.

### Workers and observability

A queue consumer has no HTTP request: read the tenant from the message envelope (set by a trusted producer), open the scoped transaction for it, and run the handler inside `als.run(...)` so logs carry it. Add `tenant.id` to every log line (a pino child logger — Fastify's `request.log`) and to every span (`span.setAttribute('tenant.id', …)` in OpenTelemetry).

---

## Examples

### Fastify hook: resolve and authorize the tenant

```ts
import Fastify, { type FastifyRequest } from 'fastify';
import { AsyncLocalStorage } from 'node:async_hooks';
import { trace } from '@opentelemetry/api';

export type TenantScope = { readonly tenantIds: readonly string[] };

declare module 'fastify' {
  interface FastifyRequest {
    tenant: TenantScope;
  }
}

export const tenantStorage = new AsyncLocalStorage<TenantScope>();

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const app = Fastify({ logger: true });
app.decorateRequest('tenant', null as unknown as TenantScope);

app.addHook('onRequest', async (request, reply) => {
  const user = await verifyAccessToken(request.headers.authorization); // your auth layer
  if (!user) return reply.code(401).send();

  // The access layer decides the scope; a requested tenant may only narrow it.
  const allowed = await memberships.tenantIdsForUser(user.id);
  const requested = request.headers['x-tenant-id'];
  const tenantIds =
    typeof requested === 'string'
      ? UUID.test(requested) && allowed.includes(requested) ? [requested] : []
      : allowed;

  if (tenantIds.length === 0) return reply.code(403).send();

  request.tenant = { tenantIds };
  request.log = request.log.child({ 'tenant.id': tenantIds.join(',') });
  trace.getActiveSpan()?.setAttribute('tenant.id', tenantIds.join(','));
});

// The handler passes the tenant explicitly; ALS wraps the call for infra code.
app.get('/projects', (request: FastifyRequest) =>
  tenantStorage.run(request.tenant, () => projectService.list(request.tenant)),
);
```

### `withTenants` with Drizzle

```ts
import { sql } from 'drizzle-orm';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { tenantStorage, type TenantScope } from './tenant';
import * as schema from './schema';

export const db = drizzle(process.env.APP_DATABASE_URL!, { schema }); // connects as app_user

type Db = NodePgDatabase<typeof schema>;
type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

export async function withTenants<T>(
  db: Db,
  tenant: TenantScope,
  fn: (tx: Tx) => Promise<T>,
): Promise<T> {
  if (tenant.tenantIds.length === 0) throw new Error('Tenant scope cannot be empty');

  // Defensive check: the ambient scope, when present, must match the explicit one.
  const ambient = tenantStorage.getStore();
  if (ambient && ambient.tenantIds.join(',') !== tenant.tenantIds.join(',')) {
    throw new Error('Tenant scope mismatch');
  }

  return db.transaction(async (tx) => {
    // Array → uuid[] → text, as a bound parameter.
    await tx.execute(
      sql`select set_config('app.tenant_ids', ${tenant.tenantIds}::uuid[]::text, true)`,
    );
    return fn(tx);
  });
}

// Usage — every query goes through tx, never db
export const projectService = {
  list: (tenant: TenantScope) =>
    withTenants(db, tenant, (tx) =>
      tx.select().from(schema.projects).orderBy(schema.projects.name),
    ),
};
```

### Drizzle schema with `pgPolicy`

```ts
import { sql } from 'drizzle-orm';
import { pgPolicy, pgRole, pgTable, text, uuid } from 'drizzle-orm/pg-core';

export const appUser = pgRole('app_user').existing();

const inScope = sql`tenant_id = ANY (coalesce(nullif(current_setting('app.tenant_ids', true), '')::uuid[], '{}'))`;

export const tenants = pgTable('tenants', {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
});

export const projects = pgTable(
  'projects',
  {
    id: uuid().primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
    name: text().notNull(),
  },
  () => [
    pgPolicy('tenant_isolation', {
      as: 'permissive',
      for: 'all',
      to: appUser,
      using: inScope,
      withCheck: inScope,
    }),
  ],
);
```

`npx drizzle-kit generate` then writes SQL along these lines (review it before committing):

```sql
CREATE TABLE "projects" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "name" text NOT NULL
);
ALTER TABLE "projects" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "projects" AS PERMISSIVE FOR ALL TO "app_user"
  USING (tenant_id = ANY (coalesce(nullif(current_setting('app.tenant_ids', true), '')::uuid[], '{}')))
  WITH CHECK (tenant_id = ANY (coalesce(nullif(current_setting('app.tenant_ids', true), '')::uuid[], '{}')));
```

And a custom migration (`npx drizzle-kit generate --custom --name=force-rls`) for what drizzle-kit does not emit:

```sql
ALTER TABLE "projects" FORCE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS "projects_tenant_id_idx" ON "projects" ("tenant_id");
GRANT SELECT, INSERT, UPDATE, DELETE ON "projects" TO "app_user";
```

### Queue consumer

```ts
type Envelope<T> = { tenantId: string; payload: T };

export async function handleProjectEvent(message: Envelope<ProjectEvent>, log: Logger) {
  const tenant: TenantScope = { tenantIds: [message.tenantId] };
  const childLog = log.child({ 'tenant.id': message.tenantId });

  await tenantStorage.run(tenant, () =>
    withTenants(db, tenant, async (tx) => {
      childLog.info({ type: message.payload.type }, 'handling project event');
      await applyEvent(tx, message.payload);
    }),
  );
}
```

The two-tenant integration test (Vitest + `@testcontainers/postgresql` + `node-postgres`, asserting `err.code === '42501'`) is in [Testing Tenant Isolation](../../../../software-engineering/databases/multi-tenancy/testing-tenant-isolation.md).

---

## When to use

- Node.js/TypeScript APIs and workers on PostgreSQL with tenants sharing tables.
- Drizzle's `pgPolicy` when you want policies reviewed in the same diff as the schema change that needs them.
- `AsyncLocalStorage` for cross-cutting infrastructure — logs, traces, a sanity check in the database helper.
- Explicit tenant parameters in services and use cases, so a missing tenant is a type error.

## When NOT to use

- HTTP-only database drivers (`neon-http`, D1) for RLS-scoped work — they cannot hold an interactive transaction.
- `AsyncLocalStorage` as the only way the domain layer learns the tenant — the dependency becomes invisible and a missing store fails at runtime.
- `als.enterWith()` in a hook — the context leaks into unrelated callbacks; use `run()` or `@fastify/request-context`.
- An ORM-level filter (a Prisma extension that adds `where: { tenantId }`, a base repository) without RLS behind it — raw SQL and other clients bypass it.
- A module-level "current tenant" variable, or a session-level `SET` on a pooled connection.

---

## References

- [Drizzle ORM — Row-Level Security (RLS)](https://orm.drizzle.team/docs/rls)
- [Drizzle Kit — `generate` (custom migrations)](https://orm.drizzle.team/docs/drizzle-kit-generate)
- [Node.js — Asynchronous context tracking (`AsyncLocalStorage`)](https://nodejs.org/api/async_context.html)
- [Fastify — Hooks](https://fastify.dev/docs/latest/Reference/Hooks/)
- [`@fastify/request-context`](https://github.com/fastify/fastify-request-context)
- [Prisma — Client extensions](https://www.prisma.io/docs/orm/prisma-client/client-extensions)
- [Prisma — Row-level security client extension example](https://github.com/prisma/prisma-client-extensions/tree/main/row-level-security)
- [node-postgres — Transactions](https://node-postgres.com/features/transactions)
- [PostgreSQL — Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
