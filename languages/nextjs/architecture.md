---
type: concept
tags:
  - language
  - nextjs
  - full-stack
  - architecture
related:
  - languages/nextjs/project-setup
  - languages/nextjs/server-and-client-components
  - languages/nodejs/architecture
language: "nextjs"
---
# Next.js Application Architecture

> Structure a Next.js app by keeping the `app/` tree focused on routing, extracting features and data access into separate modules, and drawing a clear server/client boundary.

---

## What is it?

Application architecture in Next.js is how you organize code around the App Router so it scales. The core ideas: keep **routing** concerns in `app/`, put **reusable UI** and **feature logic** in their own directories, isolate **data access** in a server-only layer, and make the **server/client boundary** deliberate rather than accidental.

---

## Why does it matter?

Next.js makes it easy to pile data fetching, business logic, and UI into route files, coupling everything to the framework and scattering the client boundary. That doesn't scale. A clear structure keeps business logic testable and framework-agnostic, minimizes shipped JavaScript, and prevents secrets from leaking to the client.

---

## How it works

### Layering on top of the router

```
src/
├── app/                  # ROUTING ONLY: pages, layouts, route handlers, actions
│   ├── (marketing)/
│   ├── (app)/dashboard/
│   └── api/
├── features/             # feature modules: components + hooks + local logic
│   └── billing/
├── components/           # shared, presentational UI (mostly server-safe)
├── lib/                  # server-only: db clients, data access, domain logic
│   ├── db.ts
│   └── server-only.ts
└── styles/
```

Route files stay thin: they compose feature components and call into `lib/`.

### Server/client boundary as an architectural decision

- Default to **Server Components**; data access and secrets live in `lib/` (server-only).
- Mark interactive leaves `"use client"`; keep them small.
- Use the `server-only` package on modules that must never reach the browser.

```ts
// lib/db.ts
import "server-only"; // build error if imported into a Client Component
export const db = createClient(process.env.DATABASE_URL!);
```

### Where logic goes

| Concern | Location |
|---|---|
| Routing, layouts, loading/error | `app/` |
| Mutations from the UI | Server Actions (colocated `actions.ts`) |
| Public APIs / webhooks | Route Handlers (`app/api/.../route.ts`) |
| Data access, domain rules | `lib/` (server-only), or a separate package |
| Reusable UI | `components/`, `features/*` |

### Talking to a backend

Next.js can *be* the backend (Server Actions + Route Handlers + `lib/` data access) for small/medium apps. For larger systems, treat Next.js as the presentation tier and call a separate service (its architecture is covered in [nodejs/architecture](../nodejs/architecture.md)); keep the boundary in `lib/` behind functions so the UI doesn't care whether data is local or remote.

### Feature-based organization

As the app grows, group by feature (each with its UI, hooks, and calls into `lib/`) rather than by technical type — it localizes change and keeps modules cohesive.

---

## Examples

```tsx
// Route file stays thin: compose feature UI, delegate data access to lib/
// app/(app)/dashboard/page.tsx
import { getDashboard } from "@/lib/dashboard";   // server-only data access
import { DashboardView } from "@/features/dashboard/DashboardView";

export default async function Page() {
  const data = await getDashboard();               // runs on the server
  return <DashboardView data={data} />;
}
```

---

## When to use

- Keep `app/` focused on routing; extract features, shared UI, and data access into their own directories.
- Isolate data access and secrets in a server-only `lib/` layer behind functions.
- Make the server/client boundary explicit; keep Client Components at the leaves.
- Organize by feature/module as the app grows; call an external service through a thin data-access seam when Next.js is only the presentation tier.

## When NOT to use

- Do not put business logic or direct DB calls inside route files or Client Components.
- Do not import server-only modules into Client Components — guard them with `server-only`.
- Do not over-architect a small app with layers it doesn't need — start simple, extract as it grows.
- Do not scatter `process.env`/secrets across the tree — funnel through server-only config.

---

## References

- [Next.js — Project Organization and File Colocation](https://nextjs.org/docs/app/building-your-application/routing/colocation)
- [Next.js — Server and Client Composition Patterns](https://nextjs.org/docs/app/building-your-application/rendering/composition-patterns)
- [Next.js — Data Security & `server-only`](https://nextjs.org/docs/app/building-your-application/rendering/composition-patterns#keeping-server-only-code-out-of-the-client-environment)
- [Next.js — Getting Started: Project Structure](https://nextjs.org/docs/app/getting-started/project-structure)
