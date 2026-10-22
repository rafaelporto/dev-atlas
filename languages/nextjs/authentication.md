---
type: concept
tags:
  - language
  - nextjs
  - full-stack
  - security
related:
  - languages/nextjs/middleware
  - languages/nextjs/server-actions-and-mutations
  - languages/nextjs/route-handlers
  - languages/nextjs/server-and-client-components
  - languages/nodejs/auth/overview
  - languages/nodejs/auth/libraries
  - languages/nodejs/auth/known-vulnerabilities
language: "nextjs"
---
# Authentication

> How to authenticate and authorize in the Next.js App Router: a Data Access Layer that verifies the session next to the data, why `proxy.ts`/middleware is only an optimistic check, the entry points you must protect, and where Better Auth, Auth.js, and Clerk fit.

---

## What is it?

Authentication in a Next.js application is the work of identifying the user on the server — in Server Components, Server Actions, Route Handlers, and the request proxy — and deciding, on each of those paths, what they may see or change. Next.js does not ship an auth system; it provides the places where checks run, and you bring a library, a managed provider, or your own session code.

> **Version note** — Next.js 16 (October 2025) renamed `middleware.ts` to **`proxy.ts`** and runs it on the Node.js runtime. `middleware.ts` still works but is deprecated; migrate with `npx @next/codemod@canary middleware-to-proxy .`. Everything below about "proxy" applies to middleware on older versions.

---

## Why does it matter?

The App Router multiplies entry points. A page renders on the server, its Client Components call Server Actions, a mobile client hits a Route Handler, and the proxy runs before all of them. Each is reachable by an attacker on its own: Server Actions are public HTTP endpoints, and the proxy can be skipped — Next.js has shipped a series of advisories where crafted requests bypassed middleware/proxy logic (CVE-2025-29927, CVE-2024-51479, and further bypasses fixed in May 2026). Applications that authorized **only** in middleware were exposed by every one of them.

The official guidance is therefore layered: an optimistic check at the edge for user experience, and a real check as close to the data as possible.

---

## How it works

### The layers

```
Request
  │
  ▼
proxy.ts ─────────── optimistic: is there a session cookie? redirect to /login if not
  │                  (fast, no DB; can be bypassed — never the only check)
  ▼
Page / Layout / Server Action / Route Handler
  │
  ▼
Data Access Layer ── real check: verify the session, authorize this user for this data
  │                  (runs on every path that reads or writes data)
  ▼
Database
```

### Data Access Layer (DAL)

Centralize session verification and data access in server-only modules. `verifySession()` reads and verifies the session once per request (memoized with React `cache`), and every data function calls it before touching the database. The functions return **DTOs** — only the fields the caller may see — so a Server Component cannot accidentally pass a password hash or internal flag to a Client Component.

### Entry points and what each needs

| Entry point | Reachable how | What to do |
|---|---|---|
| `proxy.ts` | Every matched request | Optimistic redirect based on cookie presence; no DB calls |
| Server Components (pages) | Navigation | Call DAL functions; they verify and authorize |
| Layouts | Navigation | Do **not** rely on them for checks — with partial rendering a layout does not re-run on every navigation |
| Server Actions | Public POST endpoints | Verify session and authorize **inside** the action, every time |
| Route Handlers | Public HTTP endpoints | Same as Server Actions; also validate input |
| Client Components | Browser | UI hints only (hide a button); never a security decision |

### Integrating an auth solution

The DAL pattern does not change with the library; only `verifySession()` does:

- **Better Auth** — `auth.api.getSession({ headers: await headers() })`; route handler from `toNextJsHandler(auth)`.
- **Auth.js** — `await auth()` from your `auth.ts`; maintenance mode, see [Auth Libraries](../nodejs/auth/libraries.md).
- **Clerk** — `await auth()` from `@clerk/nextjs/server`, plus `clerkMiddleware()` in the proxy. Keep `@clerk/nextjs` patched (CVE-2024-22206 affected exactly this helper).
- **Your own sessions** — a cookie holding a token you look up, as in [Implementing Your Own](../nodejs/auth/implementing-your-own.md), or a signed/encrypted cookie built with `jose`.

### Keep the framework patched

Framework-level bugs bypass application-level care. Besides the proxy bypasses, CVE-2025-55182 ("React2Shell") allowed unauthenticated remote code execution through the React Server Components protocol in Next.js 15 and 16. Track the Next.js security advisories and upgrade promptly.

---

## Examples

**Optimistic check in the proxy** (Next.js 16):

```ts
// proxy.ts
import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has("session"); // presence only — not verification
  if (!hasSession) return NextResponse.redirect(new URL("/login", request.url));
  return NextResponse.next();
}

export const config = { matcher: ["/dashboard/:path*", "/settings/:path*"] };
```

**Data Access Layer:**

```ts
// lib/dal.ts
import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth"; // Better Auth here; swap for your solution

export const verifySession = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  return { userId: session.user.id };
});

export async function getProject(projectId: string) {
  const { userId } = await verifySession();
  const project = await db.project.findFirst({
    where: { id: projectId, members: { some: { userId } } }, // authorization in the query
    select: { id: true, name: true, updatedAt: true },        // DTO: only safe fields
  });
  if (!project) throw new Error("Not found");
  return project;
}
```

**Server Action — authorize inside, every time:**

```ts
// app/projects/[id]/actions.ts
"use server";
import { verifySession } from "@/lib/dal";

export async function renameProject(projectId: string, name: string) {
  const { userId } = await verifySession();
  const updated = await db.project.updateMany({
    where: { id: projectId, members: { some: { userId, role: "owner" } } },
    data: { name },
  });
  if (updated.count === 0) throw new Error("Forbidden");
}
```

---

## When to use

- Use the proxy for fast redirects of signed-out users and for headers — nothing more.
- Put every real check in a server-only DAL and call it from pages, Server Actions, and Route Handlers.
- Return DTOs from the DAL so sensitive fields never reach Client Components.
- Pick Better Auth, Clerk, or your own sessions for new projects; keep Auth.js in apps that already use it.

## When NOT to use

- Do not treat `proxy.ts` or `middleware.ts` as your authorization layer; it has been bypassed repeatedly.
- Do not check auth only in a layout — it does not re-run on every navigation.
- Do not assume a Server Action is private because no UI calls it; it is a public endpoint.
- Do not pass full user or record objects from Server to Client Components.
- Do not leave Next.js or the auth SDK unpatched; several bypasses were framework bugs, not app bugs.

---

## References

- [Next.js — Authentication guide](https://nextjs.org/docs/app/guides/authentication)
- [Next.js 16 release — `proxy.ts` replaces `middleware.ts`](https://nextjs.org/blog/next-16)
- [GitHub Advisory — CVE-2025-29927, middleware bypass](https://github.com/advisories/GHSA-f82v-jwr5-mffw)
- [GitHub Advisory — CVE-2026-44574, proxy bypass via query parameters](https://github.com/advisories/GHSA-492v-c6pp-mqqv)
- [Next.js — Security advisory for CVE-2025-66478 / CVE-2025-55182](https://nextjs.org/blog/CVE-2025-66478)
- [Better Auth — Next.js integration](https://www.better-auth.com/docs/integrations/next)
- [Clerk — Next.js SDK](https://clerk.com/docs/references/nextjs/overview)
