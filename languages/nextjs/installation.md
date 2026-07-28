---
type: how-to
tags:
  - language
  - nextjs
  - full-stack
  - tool
related:
  - languages/nextjs/overview
  - languages/nextjs/project-setup
  - languages/react/project-setup
language: "nextjs"
---
# Installing Next.js

> How to scaffold a new Next.js App Router project and run the development server.

---

## Prerequisites

- Node.js (active LTS) installed (`node --version`).
- Familiarity with React basics (components, JSX).

---

## Steps

### 1. Scaffold with create-next-app

The official generator sets up the App Router, TypeScript, ESLint, and optionally Tailwind.

```bash
npx create-next-app@latest myapp
```

Answer the prompts — recommended defaults for a new project:

- TypeScript: **Yes**
- ESLint: **Yes**
- Tailwind CSS: your choice
- `src/` directory: **Yes** (keeps app code separate from config)
- App Router: **Yes**
- Turbopack (dev bundler): **Yes**

### 2. Understand the generated structure

```
myapp/
├── src/app/
│   ├── layout.tsx      # root layout (required)
│   ├── page.tsx        # home route "/"
│   └── globals.css
├── public/             # static assets served at /
├── next.config.ts
├── tsconfig.json
└── package.json
```

### 3. Run the dev server

```bash
cd myapp
npm run dev            # starts on http://localhost:3000 with hot reload
```

### 4. Build and start for production

```bash
npm run build          # optimized production build
npm start              # serve the production build
```

---

## Verification

```bash
npm run dev            # open http://localhost:3000 — the starter page renders
npm run build          # completes without errors; prints route/render summary
```

The build output labels each route as Static, Dynamic, or otherwise — a quick check that rendering behaves as intended.

---

## Common issues

| Symptom | Likely cause | Fix |
|---|---|---|
| `create-next-app` fails | Outdated npm / Node | Update Node to LTS; re-run with `@latest` |
| Port 3000 in use | Another process bound | `npm run dev -- -p 3001` |
| Type errors on build | Strict TS on generated code | Fix types; the build type-checks by default |
| Changes not reflected | Stale cache | Delete `.next/` and restart `npm run dev` |

---

## References

- [Next.js — Installation](https://nextjs.org/docs/app/getting-started/installation)
- [Next.js — create-next-app CLI](https://nextjs.org/docs/app/api-reference/cli/create-next-app)
- [Next.js — Project structure](https://nextjs.org/docs/app/getting-started/project-structure)
- [Next.js — next.config.js](https://nextjs.org/docs/app/api-reference/config/next-config-js)
