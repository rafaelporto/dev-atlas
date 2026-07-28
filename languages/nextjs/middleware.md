---
type: concept
tags:
  - language
  - nextjs
  - full-stack
  - concept
related:
  - languages/nextjs/route-handlers
  - languages/nextjs/navigation-and-linking
  - languages/nextjs/rendering-strategies
language: "nextjs"
---
# Middleware

> Middleware runs before a request is completed, letting you rewrite, redirect, or add headers — ideal for auth checks, localization, and A/B routing at the edge.

---

## What is it?

**Middleware** is a single `middleware.ts` file at the project root that runs **before** a matched request reaches a route. It receives the request and returns a response that can **continue**, **rewrite** (serve a different path transparently), **redirect**, or set **headers/cookies**. It runs in a lightweight (Edge) runtime, close to the user, before rendering.

---

## Why does it matter?

Some concerns must be decided before rendering: is the user authenticated, which locale/variant should they get, should this request be blocked or redirected? Doing this in middleware keeps it centralized and fast (no full render needed to redirect an unauthenticated user), and running at the edge minimizes latency.

---

## How it works

### Basic shape

```ts
// middleware.ts
import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const isLoggedIn = Boolean(request.cookies.get("session"));
  if (!isLoggedIn && request.nextUrl.pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

// Only run on these paths — keep the matcher tight for performance
export const config = {
  matcher: ["/dashboard/:path*", "/settings/:path*"],
};
```

### What you can do

- **Continue**: `NextResponse.next()`.
- **Redirect**: `NextResponse.redirect(url)` — change the URL the user sees.
- **Rewrite**: `NextResponse.rewrite(url)` — serve different content at the same URL (localization, A/B).
- **Headers/cookies**: set on the response (security headers, feature flags).

### The matcher

The `config.matcher` limits which paths trigger middleware. Scope it narrowly — middleware runs on every matched request, so a broad matcher adds latency everywhere.

### Runtime constraints

Middleware runs in the Edge runtime by default: no Node.js APIs (`fs`, native modules), limited execution time, and it should be fast and stateless. Do lightweight checks here; do heavy logic in the route/handler.

### Auth pattern

Use middleware for coarse gatekeeping (redirect unauthenticated users), but still authorize inside Server Components/Actions/Route Handlers — middleware alone is not sufficient authorization.

---

## Examples

```ts
// Locale rewrite + security header, scoped by matcher
import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const res = NextResponse.next();
  res.headers.set("x-frame-options", "DENY");

  const locale = request.cookies.get("locale")?.value;
  if (locale && !request.nextUrl.pathname.startsWith(`/${locale}`)) {
    return NextResponse.rewrite(new URL(`/${locale}${request.nextUrl.pathname}`, request.url));
  }
  return res;
}

export const config = { matcher: ["/((?!_next|api|favicon.ico).*)"] };
```

---

## When to use

- Use middleware for auth gatekeeping/redirects, localization, A/B routing, and setting security headers.
- Keep the `matcher` narrow so it runs only where needed.
- Keep logic lightweight and stateless; rely on cookies/headers, not heavy I/O.
- Combine with real authorization checks deeper in the stack.

## When NOT to use

- Do not put heavy computation, database queries, or Node-only APIs in middleware — the Edge runtime forbids/penalizes them.
- Do not treat middleware as your only authorization layer — enforce again in Server Components/Actions/handlers.
- Do not use an overly broad matcher — it taxes every request with extra latency.
- Do not perform mutations in middleware — it is for routing/headers, not writes.

---

## References

- [Next.js — Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [Next.js — Middleware API reference](https://nextjs.org/docs/app/api-reference/file-conventions/middleware)
- [Next.js — NextResponse](https://nextjs.org/docs/app/api-reference/functions/next-response)
- [Next.js — Edge Runtime](https://nextjs.org/docs/app/api-reference/edge)
