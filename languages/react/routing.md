---
type: concept
tags: []
related: []
language: "react"
---
# Routing

> React has no built-in router. The mature options are React Router (general purpose), TanStack Router (type-safe, search-param-first), and Next.js App Router (file-based, integrated with RSC).

---

## What is it?

A **router** maps URL paths to components and manages navigation history. React itself stays out of routing — you bring a library.

Three mainstream choices:

1. **React Router** — the most widely adopted; flexible, framework-agnostic.
2. **TanStack Router** — fully type-safe routes, search params as first-class state, fine-grained loaders.
3. **Next.js App Router** — file-based routing tied to a fullstack framework; required for RSC.

---

## Why does it matter?

Routing is more than swapping components. A real router handles nested layouts, code splitting, scroll restoration, deep linking, search/query params, prefetching, and data loading per route. Picking the right one shapes how your app is structured for years.

---

## How it works

### React Router

The classic. Routes are defined in JSX (or as objects), supports nested routes, data APIs (loaders/actions), and SSR via React Router v7+ integration.

```tsx
import { createBrowserRouter, RouterProvider, Outlet } from "react-router-dom";

const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: "users/:id", element: <UserPage />, loader: userLoader },
      { path: "*", element: <NotFound /> },
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

function RootLayout() {
  return <><Header /><Outlet /></>;
}
```

`<Outlet />` renders the active child route. `loader` runs before the route renders.

### TanStack Router

Type-safe routes. The compiler knows your routes, their params, and their search params:

```tsx
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/users/$userId")({
  validateSearch: (search) => ({ tab: (search.tab as string) ?? "profile" }),
  loader: ({ params }) => fetchUser(params.userId),
  component: UserPage,
});

function UserPage() {
  const { userId } = Route.useParams();      // typed
  const { tab }    = Route.useSearch();      // typed
  const user       = Route.useLoaderData();  // typed
  return null;
}
```

Search params behave as first-class state — you `navigate({ search: { tab: "security" } })` and the URL updates.

### Next.js App Router

File-based: every folder is a route segment, `page.tsx` is the leaf. Tightly integrated with React Server Components.

```
app/
├─ layout.tsx           → root layout
├─ page.tsx             → /
├─ users/
│  ├─ layout.tsx        → users layout
│  └─ [id]/
│     ├─ page.tsx       → /users/[id]
│     ├─ loading.tsx    → Suspense fallback
│     └─ error.tsx      → error boundary
```

```tsx
// app/users/[id]/page.tsx
export default async function UserPage({ params }: { params: { id: string } }) {
  const user = await fetchUser(params.id);
  return <h1>{user.name}</h1>;
}
```

Routing, data loading, error handling, and streaming are unified.

### Choosing

| | React Router | TanStack Router | Next.js App Router |
|---|---|---|---|
| Type safety | Partial | Full (compile-time) | Partial |
| Search params as state | Manual | First-class | Manual |
| Loaders / actions | Yes (v6.4+) | Yes | Yes (RSC + actions) |
| RSC / SSR | Via v7 integration | Client-first | Built-in |
| Code splitting | Manual or `lazy` | Built-in | Built-in |
| Best for | Most SPAs, broad ecosystem | Type-safe SPAs, search-heavy UIs | Fullstack apps, RSC, SEO |

---

## Examples

### Nested layouts with React Router

```tsx
const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      {
        path: "settings",
        element: <SettingsLayout />,
        children: [
          { index: true, element: <Navigate to="profile" replace /> },
          { path: "profile", element: <Profile /> },
          { path: "security", element: <Security /> },
        ],
      },
    ],
  },
]);
```

### Type-safe navigation with TanStack Router

```tsx
const navigate = useNavigate();
navigate({
  to: "/users/$userId",
  params: { userId: "42" },
  search: (prev) => ({ ...prev, tab: "security" }),
});
```

Wrong params or unknown search keys are compile errors.

### Linking

```tsx
// React Router
<Link to="/users/42">Profile</Link>

// TanStack Router
<Link to="/users/$userId" params={{ userId: "42" }}>Profile</Link>

// Next.js
<Link href="/users/42">Profile</Link>
```

---

## When to use

- **React Router** — most SPAs, mature ecosystem, easy migration from older versions.
- **TanStack Router** — projects where type safety and search params drive the UI (filters, dashboards, search-heavy apps).
- **Next.js App Router** — fullstack apps, content sites, anything needing RSC, SEO, or SSR with minimal config.

---

## When NOT to use

- Don't roll your own router. The hand-rolled "switch on `location.pathname`" approach skips nested layouts, lazy loading, scroll restoration, and a dozen other things you'll re-implement badly.
- Don't store URL-worthy state (filters, sort, current tab) in Redux/Zustand — use search params.
- Don't put auth checks in components only — guard at the route layer (`loader`, middleware, layout).

---

## References

- [React Router](https://reactrouter.com)
- [TanStack Router](https://tanstack.com/router)
- [Next.js App Router](https://nextjs.org/docs/app)
