---
type: concept
tags:
  - language
  - nextjs
  - full-stack
  - orm
  - overview
related:
  - languages/javascript-typescript/frameworks/nextjs/orms/serverless-and-edge
  - languages/javascript-typescript/runtimes/nodejs/orms/overview
  - languages/javascript-typescript/runtimes/nodejs/orms/choosing
  - languages/javascript-typescript/runtimes/nodejs/orms/pitfalls
  - languages/javascript-typescript/frameworks/nextjs/architecture
  - languages/javascript-typescript/frameworks/nextjs/data-fetching-and-caching
  - languages/javascript-typescript/frameworks/nextjs/server-actions-and-mutations
  - languages/javascript-typescript/frameworks/nextjs/authentication
language: "nextjs"
---
# Databases and ORMs in Next.js

> How the Node.js ORM choices apply inside a Next.js App Router app: a server-only data access layer, one client per process (including during hot reload), per-render deduplication with `cache()`, transactions in Server Actions, and how the runtime and deployment target constrain which driver and ORM you can use.

---

## What is it?

A Next.js app with Server Components and Server Actions talks to its database directly from server code. Nothing forces a separate API in between. This article covers what changes when the [Node.js ORM landscape](../../../runtimes/nodejs/orms/overview.md) runs inside Next.js: where the database code lives, how the client is created, how it interacts with rendering and caching, and which constraints come from where the app is deployed.

The ORM choice itself is the same as for any Node service. Read [Choosing a Data Access Tool](../../../runtimes/nodejs/orms/choosing.md) first. The two Next.js-specific factors that can change the answer are covered in [Serverless and Edge](serverless-and-edge.md): **serverless connection limits** and **non-Node runtimes**.

---

## Why does it matter?

Next.js blurs the line between UI code and backend code. That convenience creates failure modes a plain Node service does not have:

- **Accidental client exposure** — a module that imports the database client can end up imported by a Client Component. The build then fails, or worse, secrets and server logic leak into the bundle.
- **Connection storms in development** — hot reload re-evaluates modules, and each re-evaluation creates a new client with its own pool until the database refuses connections.
- **Duplicate queries per render** — layouts, pages, and `generateMetadata` often need the same row, and each call is a separate query unless it is deduplicated.
- **Mutations without boundaries** — Server Actions are public HTTP endpoints. Database writes in them need authorization, validation, and transactions like any API handler.
- **Deployment-dependent behaviour** — the same code that works on a long-running `next start` server can exhaust connections on serverless or fail to load on a non-Node runtime (Cloudflare Workers, or the Edge runtime in older Next.js versions).

---

## How it works

### A server-only Data Access Layer

All database access lives in server-only modules (for example `lib/db.ts` plus `lib/data/*.ts` or `features/*/data.ts`). Route files, Server Components, and Server Actions call **functions** from this layer; they never import the ORM client directly.

```
app/ (routes, Server Components, Server Actions)
   │  calls
   ▼
lib/data/*.ts      import "server-only"; authz checks, DTO mapping, cache()
   │  uses
   ▼
lib/db.ts          import "server-only"; the single ORM/driver client
   │
   ▼
Database
```

- `import "server-only"` at the top of these modules turns an accidental client-side import into a build error.
- Data functions check the session and authorization before querying (see [Authentication](../authentication.md)) and return **DTOs**, never raw ORM entities, so a Server Component cannot pass a password hash or internal flag to a Client Component.
- This is the same repository/DAL boundary recommended for Node services in [ORM Pitfalls](../../../runtimes/nodejs/orms/pitfalls.md) (item 9). In Next.js it doubles as a security boundary.

### One client per process, including in development

Production `next start` evaluates `lib/db.ts` once per server process. In development, Fast Refresh can evaluate it many times. The standard fix is to cache the client on `globalThis` outside production:

```ts
// lib/db.ts
import "server-only";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";

const globalForDb = globalThis as unknown as { pool?: Pool };

const pool = globalForDb.pool ?? new Pool({ connectionString: process.env.DATABASE_URL, max: 10 });
if (process.env.NODE_ENV !== "production") globalForDb.pool = pool;

export const db = drizzle(pool);
```

The same pattern applies to `PrismaClient`, a Kysely instance, or a MikroORM/TypeORM data source. On serverless platforms "one per process" means one per function instance. That is why pool size and an external pooler matter there; see [Serverless and Edge](serverless-and-edge.md).

### Deduplicating reads within a render

`fetch` calls are memoized per render, but ORM calls are not. Wrap read functions in React's `cache()` so a layout, a page, and `generateMetadata` asking for the same record trigger one query:

```ts
// lib/data/projects.ts
import "server-only";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { projects } from "@/lib/schema";
import { verifySession } from "@/lib/auth";

export const getProject = cache(async (id: string) => {
  const session = await verifySession();
  const [project] = await db
    .select({ id: projects.id, name: projects.name, ownerId: projects.ownerId })
    .from(projects)
    .where(eq(projects.id, id));
  if (!project || project.ownerId !== session.userId) return null;
  return { id: project.id, name: project.name };
});
```

`cache()` is **per request** memoization. It is not a cross-request cache. Caching database results across requests (Next.js data cache, `"use cache"` in recent versions, `unstable_cache` in older ones) is a separate decision with invalidation costs. See [Data Fetching and Caching](../data-fetching-and-caching.md), and confirm the API for your Next.js version.

### Writes in Server Actions

A Server Action is an HTTP endpoint the framework generates for you. Treat it like a route handler:

1. **Authenticate and authorize** inside the action (or the DAL function it calls), not only in the page that renders the form.
2. **Validate input** with a schema (e.g. Zod). `FormData` is untrusted.
3. **Run multi-statement writes in one transaction**, and keep it short and database-only.
4. **Invalidate** affected data (`revalidatePath`/`revalidateTag`) after the transaction commits, not inside it.

```ts
// app/projects/[id]/actions.ts
"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { addMember } from "@/lib/data/projects";

const Input = z.object({ projectId: z.string().uuid(), userId: z.string().uuid() });

export async function addMemberAction(formData: FormData) {
  const input = Input.parse(Object.fromEntries(formData));
  await addMember(input);                       // authz + transaction live in the DAL
  revalidatePath(`/projects/${input.projectId}`);
}
```

### Runtime and deployment constraints

| Where the code runs | Practical consequence for data access |
|---|---|
| `next start` / container (long-running Node process) | Same as any Node service: one pooled client, any ORM |
| Serverless functions (Node runtime) | Many short-lived instances: small pools, external pooler or a platform that reuses instances; any ORM, but watch cold-start cost |
| Edge runtime (`runtime = "edge"`) | Deprecated since Next.js 16 and unsupported on Vercel from 16.3; routes run on Node.js. Do not start new database code here |
| Non-Node hosts (Cloudflare Workers via an adapter) | No TCP sockets or native modules unless the platform provides them (e.g. Hyperdrive). Only HTTP/WebSocket drivers and ORMs that support them |
| Middleware / `proxy.ts` | Not a place for database queries. Keep it to cookie checks and redirects |

Details, drivers, and an ORM compatibility matrix are in [Serverless and Edge](serverless-and-edge.md).

### Which ORM fits Next.js

The general recommendation from [Choosing a Data Access Tool](../../../runtimes/nodejs/orms/choosing.md) holds, with Next.js-specific weight on two factors:

- **Runtime portability** — if the app may run on a non-Node host such as Cloudflare Workers, prefer tools with first-class HTTP/edge drivers (Drizzle, Kysely; Prisma through driver adapters). On Vercel with Next.js 16, everything runs on Node.js, so this weighs less than it did.
- **Cold start and bundle size** — on serverless, a lighter client loads faster. Measure it rather than guess. The Prisma-specific trade-offs are in [Prisma](../../../runtimes/nodejs/orms/prisma.md).

Entity-class ORMs (TypeORM, MikroORM) work on the Node runtime. TypeORM relies on decorator metadata and explicit entity registration, which is fiddly under the Next.js bundler. MikroORM 7 avoids decorators with `defineEntity`, but its Unit of Work needs a forked `EntityManager` per request. Both fit less naturally than schema-in-code tools.

---

## Examples

**A DAL function with authorization and a transaction** (Drizzle API; Prisma `$transaction(async (tx) => …)` is equivalent):

```ts
// lib/data/projects.ts
import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { projects, memberships, auditLog } from "@/lib/schema";
import { verifySession } from "@/lib/auth";

export async function addMember(input: { projectId: string; userId: string }) {
  const session = await verifySession();

  await db.transaction(async (tx) => {
    const [project] = await tx
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, input.projectId), eq(projects.ownerId, session.userId)));
    if (!project) throw new Error("Forbidden");

    await tx.insert(memberships).values(input).onConflictDoNothing();
    await tx.insert(auditLog).values({ actorId: session.userId, action: "member.add", target: input.userId });
  });
}
```

**Prisma singleton for development hot reload:**

```ts
// lib/db.ts
import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client"; // Prisma 7: generator output path

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

(Prisma 7 requires a driver adapter and generates the client into your project. See [Prisma](../../../runtimes/nodejs/orms/prisma.md).)

---

## When to use

- Use a **server-only DAL** in every Next.js app that touches a database, from day one. It is cheap, and it is the main defense against leaking data to Client Components.
- Use **direct database access from Server Components and Server Actions** when the Next.js app is the only consumer of the data. A separate API adds latency and code without benefit.
- Use **`cache()`** on every DAL read that more than one component in a render may call.
- Use a **`globalThis` singleton** for the client in development, whatever the ORM.
- Use **interactive transactions** in DAL functions called by Server Actions whenever a mutation writes more than one row.

## When NOT to use

- Do not import the ORM client in route files, components, or Client Components. Go through the DAL.
- Do not query the database from middleware/`proxy.ts`. It runs on every matched request and is not a security boundary.
- Do not put database code on the Edge runtime: it is deprecated in Next.js 16. On other non-Node hosts, do it only when the driver and ORM support it **and** the database is reachable with acceptable latency.
- Do not call the app's own Route Handlers from Server Components to reach the database. Call the DAL function directly.
- Do not rely on `cache()` as a cross-request cache, and do not add cross-request caching of database reads without an invalidation plan.
- Do not use Next.js as the only backend when other clients (mobile apps, partners, workers) need the same data and rules. Extract a service or shared package instead.

---

## References

- [Next.js — Data Security (Data Access Layer)](https://nextjs.org/docs/app/guides/data-security)
- [Next.js — Fetching data](https://nextjs.org/docs/app/getting-started/fetching-data)
- [Next.js — Mutating data](https://nextjs.org/docs/app/getting-started/mutating-data)
- [React — `cache`](https://react.dev/reference/react/cache)
- [npm — `server-only`](https://www.npmjs.com/package/server-only)
- [Prisma — Best practice for instantiating Prisma Client with Next.js](https://www.prisma.io/docs/orm/more/help-and-troubleshooting/nextjs-help)
- [Drizzle — Get started with PostgreSQL](https://orm.drizzle.team/docs/get-started-postgresql)
