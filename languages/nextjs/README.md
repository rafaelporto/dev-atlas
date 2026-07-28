# Next.js

> A study guide covering the Next.js App Router: rendering strategies, React Server Components, data fetching and caching, routing, full-stack features, optimization, and deployment.

---

## Overview & Getting Started

| Article | Description |
|---|---|
| [Overview](overview.md) | What Next.js is, the App Router, server-first rendering, where it fits |
| [Installation](installation.md) | Scaffolding with `create-next-app` and running the dev server |
| [Project Setup](project-setup.md) | `app/` conventions, colocation, route groups, env config, path aliases |

---

## Routing and UI

| Article | Description |
|---|---|
| [The App Router](app-router.md) | File-based routing and the special files (`page`, `layout`, `loading`, `error`, `route`) |
| [Layouts, Pages, and UI States](layouts-and-pages.md) | Nested layouts, loading/error/not-found, metadata |
| [Navigation and Linking](navigation-and-linking.md) | `<Link>`, `useRouter`, server `redirect`, prefetching, active links |
| [Middleware](middleware.md) | Pre-request rewrites, redirects, headers at the edge |

---

## Rendering and Data

| Article | Description |
|---|---|
| [Rendering Strategies](rendering-strategies.md) | Static, dynamic, ISR, and client rendering — and how they're chosen |
| [Server and Client Components](server-and-client-components.md) | RSC defaults, `"use client"`, the boundary rules, composition |
| [Server Actions and Mutations](server-actions-and-mutations.md) | `"use server"` mutations from forms, revalidation, security |
| [Data Fetching and Caching](data-fetching-and-caching.md) | Fetching in Server Components and the caching/revalidation layers |
| [Route Handlers](route-handlers.md) | Building HTTP APIs with `route.ts` and Web `Request`/`Response` |
| [Streaming and Suspense](streaming-and-suspense.md) | Progressive rendering with `<Suspense>` and `loading.tsx` |

---

## Styling, Performance, and Delivery

| Article | Description |
|---|---|
| [Styling and Assets](styling-and-assets.md) | CSS Modules, Tailwind, CSS-in-JS, `next/image`, `next/font` |
| [Optimization](optimization.md) | Code-splitting, `next/dynamic`, metadata/SEO, bundle analysis |
| [Application Architecture](architecture.md) | Structuring `app/`, features, server-only `lib/`, the client boundary |
| [Testing](testing.md) | Unit, component, Route Handler, and end-to-end testing |
| [Deploy](deploy.md) | Managed platform, self-hosted `next start`, standalone containers |
| [Best Practices](best-practices.md) | Consolidated production guidelines |
