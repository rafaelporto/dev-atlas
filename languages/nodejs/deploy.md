---
type: how-to
tags:
  - language
  - nodejs
  - backend
  - tool
related:
  - languages/nodejs/configuration-and-environment
  - languages/nodejs/worker-threads-and-scaling
  - languages/nodejs/security
language: "nodejs"
---
# Deploying Node.js

> How to package a Node.js service for production: reproducible install, a multi-stage container image, correct signal handling, and health checks.

---

## Prerequisites

- A Node.js project with a `build`/`start` script and committed lockfile.
- Config sourced from environment variables (see configuration-and-environment).
- Docker (for the container path) or a target platform (PaaS/serverless).

---

## Steps

### 1. Produce a reproducible install

Use `npm ci` (not `npm install`) so the lockfile is authoritative, and install only production deps for the runtime image.

```bash
npm ci               # exact, clean install for build
npm run build        # compile TS → dist/ (if applicable)
npm ci --omit=dev    # runtime deps only
```

### 2. Write a multi-stage Dockerfile

Build in one stage, copy only artifacts into a slim runtime image, and run as non-root.

```dockerfile
# Build stage
FROM node:22-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Runtime stage
FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
USER node                              # least privilege
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

### 3. Handle signals for graceful shutdown

Run Node as PID 1 correctly and stop cleanly on `SIGTERM` so in-flight requests finish (orchestrators send SIGTERM before killing).

```javascript
const server = app.listen(config.port);
process.on("SIGTERM", () => {
  server.close(() => process.exit(0)); // stop accepting, drain, exit
});
```

If Node is not PID 1 or signals misbehave, add an init (`--init` / tini).

### 4. Expose health checks

Provide a liveness/readiness endpoint the platform can probe.

```javascript
app.get("/health", (_req, res) => res.json({ status: "ok" }));
```

### 5. Set production configuration

- `NODE_ENV=production`.
- Inject secrets/config via the platform, not baked into the image.
- Consider memory limits (`--max-old-space-size`) aligned to the container's memory.

### 6. Scale

Run multiple replicas behind a load balancer (preferred in Kubernetes) rather than in-process clustering; scale horizontally (see worker-threads-and-scaling).

---

## Verification

```bash
docker build -t myservice .
docker run -p 3000:3000 --env-file .env myservice
curl -f http://localhost:3000/health     # expect {"status":"ok"}
docker kill --signal=SIGTERM <container>  # confirm graceful shutdown in logs
```

---

## Common issues

| Symptom | Likely cause | Fix |
|---|---|---|
| Container ignores Ctrl-C / slow to stop | Node not receiving SIGTERM (PID 1) | Add `--init`/tini; handle `SIGTERM` |
| Huge image | Dev deps / source in runtime image | Multi-stage build; `npm ci --omit=dev` |
| Works locally, fails in prod | Config baked in or missing env | Inject via environment; validate at boot |
| OOM killed | No memory limit awareness | Set `--max-old-space-size`; profile heap |
| Non-reproducible builds | `npm install` instead of `npm ci` | Use `npm ci` with a committed lockfile |

---

## References

- [Node.js — Docker best practices (nodejs/docker-node)](https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md)
- [Node.js — Security Best Practices](https://nodejs.org/en/learn/getting-started/security-best-practices)
- [npm — `npm ci`](https://docs.npmjs.com/cli/v10/commands/npm-ci)
- [The Twelve-Factor App](https://12factor.net/)
