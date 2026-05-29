---
type: concept
tags: []
related: []
language: "react"
---
# Project Setup

> The mainstream choices for scaffolding a React project: **Vite** (SPA), **Next.js** (fullstack with RSC), **React Router v7+** (fullstack with route-based loaders), and **TanStack Start** (type-safety-first SSR). Pick by what the app needs to do, not by popularity.

---

## What is it?

Scaffolding a React project means choosing a build tool and an app framework. The bare React library is just a runtime; you always combine it with one of:

1. **Vite** — fast dev server and bundler. Outputs a single-page app. No router or data layer included.
2. **Next.js** — fullstack framework. File-based routing, Server Components, server actions, SSR/SSG.
3. **React Router (v7)** — fullstack framework (formerly Remix). Route-based loaders/actions, nested layouts, optional SSR.
4. **TanStack Start** — TanStack Router + SSR + Server Functions; newer, type-safety-first option.

The choice shapes routing, data fetching, deployment, and a year of decisions.

---

## Why does it matter?

The "boilerplate" question dominates the first day of any React project, but the real impact is years long: where data is fetched, what gets bundled to the client, how routes are defined, how you deploy. Picking the right framework removes a lot of architectural friction.

---

## How it works

### Vite — a fast SPA

When you want a simple client-rendered SPA, no server, no SSR:

```bash
npm create vite@latest my-app -- --template react-ts
cd my-app
npm install
npm run dev
```

Output: a static SPA you can host anywhere (Netlify, Vercel, Cloudflare Pages, S3 + CDN).

Add a router (React Router or TanStack Router) and a data layer (TanStack Query) and you have a complete SPA stack.

### Next.js — fullstack with App Router

When you need SSR/SSG, RSC, or a fullstack app with one deployment unit:

```bash
npx create-next-app@latest my-app --typescript --eslint --app
cd my-app
npm run dev
```

Pick **App Router** (the `--app` flag) for new projects — it's where the platform investment is. Pages Router is legacy.

Comes with: file-based routing, Server Components, server actions, image optimisation, route handlers (API routes), middleware, deployment integrations.

### React Router v7

When you want fullstack with a routing-centric model and route-level data loaders:

```bash
npx create-react-router@latest my-app
cd my-app
npm run dev
```

Comes with: nested routes, loaders/actions, SSR, progressive enhancement, error boundaries per route.

### TanStack Start

A newer entrant that pairs TanStack Router (full type safety) with SSR and server functions. Good fit for teams already invested in TanStack libraries.

```bash
npx create-tsr@latest my-app --template typescript
```

### Comparison

| | Vite SPA | Next.js (App Router) | React Router v7 | TanStack Start |
|---|---|---|---|---|
| Server-side rendering | No | Yes | Yes | Yes |
| Server Components | No | Yes | Limited | Planned |
| File-based routing | No | Yes | Yes | Yes |
| Route loaders/actions | No (manual) | Yes (RSC + actions) | Yes | Yes (Server Functions) |
| Type safety | Manual | Partial | Partial | Full |
| Best for | Internal tools, embedded apps | Marketing + product, SEO, RSC apps | Apps with strong route-level data | Type-safety-first apps |
| Deployment | Static / CDN | Vercel / Node / Docker | Node / serverless | Node / serverless |

### What to install on day one

- **TypeScript** — always.
- **ESLint + Prettier** (or Biome) — formatting and linting.
- **`eslint-plugin-react-hooks`**, **`eslint-plugin-jsx-a11y`** — non-negotiable.
- **TanStack Query** — if you fetch from APIs.
- **A form library** — React Hook Form + Zod.
- **A styling solution** — Tailwind for most new projects.
- **Test setup** — Vitest + React Testing Library + Playwright.

### Folder structure

After scaffolding, set up the project structure intentionally — see [Folder Structure](folder-structure.md).

---

## Examples

### A minimal Vite + React + TS app

```bash
npm create vite@latest my-app -- --template react-ts
cd my-app
npm install react-router-dom @tanstack/react-query react-hook-form zod tailwindcss
npm install -D vitest @testing-library/react @testing-library/user-event jsdom
```

### A Next.js App Router app

```bash
npx create-next-app@latest my-app --typescript --eslint --app --tailwind
cd my-app
npm install @tanstack/react-query react-hook-form zod
```

For server components, no `useQuery` is needed for the initial load — fetch in the page. Use TanStack Query only for client-side interactivity.

---

## When to use

- **Vite SPA** — internal tools, dashboards behind auth, embedded widgets, anywhere SEO doesn't matter and you don't need SSR.
- **Next.js App Router** — public-facing apps that need SEO, marketing pages mixed with product surfaces, anywhere you want RSC.
- **React Router v7** — apps with deeply nested routes and complex per-route data; teams comfortable with the loader/action model.
- **TanStack Start** — projects that prioritise compile-time type safety end-to-end.

---

## When NOT to use

- Don't pick Next.js for an internal SPA — the SSR/RSC machinery is overhead you won't use.
- Don't use Vite for an SEO-sensitive site without SSR — you'll fight to add it later.
- Don't use Create React App — it's deprecated. The React team recommends a framework or Vite for new projects.
- Don't roll your own bundler config unless you have a very specific reason.

---

## References

- [Vite](https://vitejs.dev)
- [Next.js](https://nextjs.org)
- [React Router](https://reactrouter.com)
- [TanStack Start](https://tanstack.com/start)
- [Start a New React Project — react.dev](https://react.dev/learn/start-a-new-react-project)
