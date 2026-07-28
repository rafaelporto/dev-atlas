---
type: concept
tags:
  - language
  - nodejs
  - backend
  - concept
related:
  - languages/nodejs/project-setup
  - languages/nodejs/security
  - languages/nodejs/architecture
language: "nodejs"
---
# Configuration and Environment

> Configuration should come from the environment, be validated at startup, and keep secrets out of source control — following the twelve-factor principle of strict config/code separation.

---

## What is it?

Configuration is everything that varies between deployments: ports, database URLs, feature flags, API keys. In Node, config is conventionally read from **environment variables** (`process.env`), loaded from a `.env` file in development, and injected by the platform in production. Secrets are a special case that must never live in the repository.

---

## Why does it matter?

Hardcoded or unvalidated config is a top cause of production incidents ("it worked locally") and security leaks (committed API keys). Validating config at boot converts a vague runtime failure deep in a request into a clear, immediate startup error (Fail Fast), and separating config from code lets the same artifact run in every environment.

---

## How it works

### Reading environment variables

```javascript
const port = process.env.PORT;           // always a string or undefined
```

### Loading .env in development

Modern Node loads env files natively — no dependency for simple cases:

```bash
node --env-file=.env src/index.js
```

`.env` must be in `.gitignore`. Commit a `.env.example` documenting the required keys (without values).

### Validate and centralize at startup

Parse `process.env` once into a typed, validated config object. Fail fast if anything is missing or malformed.

```javascript
// config.js — the ONLY place that reads process.env
function required(name) {
  const v = process.env[name];
  if (v === undefined || v === "") throw new Error(`Missing env var: ${name}`);
  return v;
}

export const config = Object.freeze({
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: required("DATABASE_URL"),
  nodeEnv: process.env.NODE_ENV ?? "development",
  logLevel: process.env.LOG_LEVEL ?? "info",
});
```

With TypeScript, a schema validator (e.g., Zod) both validates and infers the config type:

```typescript
// const config = EnvSchema.parse(process.env); // throws on invalid; fully typed
```

### Secrets in production

- Inject via the platform's secret manager (Kubernetes Secrets, AWS Secrets Manager, Vault) as env vars or mounted files.
- Never log secrets; redact them in error reporting.
- Rotate any secret that is ever committed or leaked.

### NODE_ENV

`NODE_ENV=production` enables optimizations in many libraries. Use it for coarse environment switches, not for feature configuration.

---

## Examples

```javascript
// Everything downstream imports the validated config — never process.env directly
import { config } from "./config.js";
const server = app.listen(config.port);

// Fail fast at boot: a missing DATABASE_URL crashes on startup with a clear message,
// not on the first request that touches the database.
```

---

## When to use

- Read config from environment variables and centralize parsing in one module.
- Validate all config at startup; fail fast with clear messages.
- Use `--env-file` (or a loader) for local development; platform injection in production.
- Provide `.env.example`; keep real `.env` and secrets out of git.

## When NOT to use

- Do not hardcode environment-specific values or secrets in source.
- Do not read `process.env` scattered throughout the codebase — funnel it through one validated module.
- Do not commit `.env` files or log secret values.
- Do not rely on config defaults for required secrets — require them explicitly.

---

## References

- [Node.js — `--env-file`](https://nodejs.org/api/cli.html#--env-fileconfig)
- [Node.js — process.env](https://nodejs.org/api/process.html#processenv)
- [The Twelve-Factor App — Config](https://12factor.net/config)
- [OWASP — Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
