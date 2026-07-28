---
type: how-to
tags:
  - language
  - nextjs
  - full-stack
  - tool
related:
  - languages/nextjs/installation
  - languages/nextjs/architecture
  - languages/nextjs/app-router
language: "nextjs"
---
# Next.js Project Setup

> How to structure a Next.js App Router project: the `app/` conventions, colocation, route groups, environment config, and TypeScript path aliases.

---

## Prerequisites

- A scaffolded Next.js project (see installation).
- Basic understanding of the App Router (see app-router).

---

## Steps

### 1. Decide on a top-level layout

A common, scalable structure with `src/`:

```
src/
├── app/                    # routing tree (pages, layouts, route handlers)
│   ├── (marketing)/        # route group — organizes without affecting the URL
│   ├── (app)/dashboard/
│   └── api/                # route handlers (REST endpoints)
├── components/             # shared, reusable UI
├── features/               # feature modules (ui + logic per feature)
├── lib/                    # data access, clients, server utilities
└── styles/
```

### 2. Colocate route-specific files

Files inside a route folder that are not special (`page`, `layout`, etc.) are **not** routable — so colocate a route's components, tests, and helpers next to it.

```
app/dashboard/
├── page.tsx
├── loading.tsx
├── _components/Chart.tsx   # colocated; underscore also marks a private folder
└── actions.ts             # server actions for this route
```

### 3. Use route groups and dynamic segments

```
app/(app)/settings/page.tsx      → /settings   (group name in () is ignored in URL)
app/blog/[slug]/page.tsx         → /blog/:slug  (dynamic segment)
app/shop/[...cat]/page.tsx       → catch-all
```

### 4. Configure environment variables

- Server-only vars: `DATABASE_URL=...` in `.env.local` (never committed).
- Browser-exposed vars must be prefixed `NEXT_PUBLIC_`.

```bash
# .env.local
DATABASE_URL=postgres://...
NEXT_PUBLIC_API_BASE=https://api.example.com
```

Only `NEXT_PUBLIC_*` values reach the client bundle — keep secrets unprefixed.

### 5. Set path aliases

`create-next-app` configures `@/*` → `src/*` in `tsconfig.json`:

```tsx
import { Button } from "@/components/Button";
```

### 6. Establish server/client boundaries early

Keep data access and secrets in Server Components / `lib/`; mark only interactive leaves with `"use client"` (see server-and-client-components).

---

## Verification

```bash
npm run dev            # routes resolve as expected
npm run build          # build summary shows the intended static/dynamic split
npx tsc --noEmit       # types are sound (if not relying solely on the build)
```

---

## Common issues

| Symptom | Likely cause | Fix |
|---|---|---|
| A colocated component became a route | Named a special file (`page`/`route`) | Rename; use `_folder` for private folders |
| Env var undefined in the browser | Missing `NEXT_PUBLIC_` prefix | Prefix it (only for non-secrets) |
| Secret leaked to client | Imported server code into a Client Component | Keep secrets in server-only modules |
| URL includes a folder you meant to hide | Not using a route group | Wrap the folder name in `(parentheses)` |

---

## References

- [Next.js — Project structure and organization](https://nextjs.org/docs/app/getting-started/project-structure)
- [Next.js — Route Groups](https://nextjs.org/docs/app/building-your-application/routing/route-groups)
- [Next.js — Environment Variables](https://nextjs.org/docs/app/guides/environment-variables)
- [Next.js — Dynamic Routes](https://nextjs.org/docs/app/building-your-application/routing/dynamic-routes)
