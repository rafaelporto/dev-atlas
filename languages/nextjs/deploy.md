---
type: how-to
tags:
  - language
  - nextjs
  - full-stack
  - tool
related:
  - languages/nextjs/rendering-strategies
  - languages/nodejs/deploy
  - languages/nextjs/best-practices
language: "nextjs"
---
# Deploying Next.js

> How to build a Next.js app for production and deploy it — on a managed platform, as a self-hosted Node server, or as a standalone container.

---

## Prerequisites

- A Next.js app that builds cleanly (`npm run build`).
- Config sourced from environment variables (secrets unprefixed; client vars `NEXT_PUBLIC_*`).
- Node.js (active LTS) for self-hosting.

---

## Steps

### 1. Build

```bash
npm run build
```

The output summary labels each route as static or dynamic — verify it matches your intent before deploying.

### 2. Choose a deployment target

- **Managed platform (Vercel)** — zero-config for Next.js (the framework's origin); handles builds, CDN, serverless/edge functions, ISR, and image optimization automatically.
- **Self-hosted Node server** — run `next start` behind a reverse proxy; you control the infrastructure.
- **Standalone / container** — Next.js can emit a minimal standalone server for Docker/Kubernetes.
- **Static export** — `output: "export"` produces pure static files if the app uses no server features.

### 3. Self-host with `next start`

```bash
npm run build
npm start            # runs `next start` — a Node server serving the build
```

Set `NODE_ENV=production` and inject env vars via the platform.

### 4. Containerize with standalone output

Enable standalone output to get a slim image with only the files needed to run.

```ts
// next.config.ts
export default { output: "standalone" };
```

```dockerfile
FROM node:22-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build            # produces .next/standalone

FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
USER node
EXPOSE 3000
CMD ["node", "server.js"]    # standalone entry point
```

### 5. Handle env vars correctly

- `NEXT_PUBLIC_*` are inlined at **build time** — rebuild to change them.
- Server-only secrets are read at runtime; inject them via the platform's secret store.

### 6. Configure caching/ISR in production

Ensure the host supports ISR/revalidation and image optimization, or configure a custom cache handler when self-hosting at scale.

---

## Verification

```bash
npm run build && npm start
curl -I http://localhost:3000/          # 200; check cache headers
# Confirm static routes are cached and dynamic routes render per request
```

For self-hosted deployments, verify graceful shutdown and health checks as in [nodejs/deploy](../nodejs/deploy.md).

---

## Common issues

| Symptom | Likely cause | Fix |
|---|---|---|
| Env change not reflected | `NEXT_PUBLIC_*` inlined at build | Rebuild; don't expect runtime updates for public vars |
| Secret visible in browser | Used `NEXT_PUBLIC_` prefix on a secret | Remove the prefix; keep secrets server-only |
| Huge Docker image | Copying full `.next`/node_modules | Use `output: "standalone"` and copy only its output |
| ISR not revalidating when self-hosted | Host lacks revalidation support | Configure a cache handler / supported platform |
| Image optimization failing | Remote domains not allowed | Configure `images` in `next.config` |

---

## References

- [Next.js — Deploying](https://nextjs.org/docs/app/building-your-application/deploying)
- [Next.js — Self-Hosting](https://nextjs.org/docs/app/building-your-application/deploying#self-hosting)
- [Next.js — `output: "standalone"`](https://nextjs.org/docs/app/api-reference/config/next-config-js/output)
- [Next.js — Static Exports](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)
