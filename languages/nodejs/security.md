---
type: concept
tags:
  - language
  - nodejs
  - backend
  - best-practice
related:
  - languages/nodejs/configuration-and-environment
  - languages/nodejs/data-access
  - languages/nodejs/http-and-web-servers
language: "nodejs"
---
# Node.js Security

> Practical server-side security for Node: validate all input, avoid injection, manage dependencies and secrets carefully, and follow the official Node.js and OWASP guidance.

---

## What is it?

Security in a Node service is the set of practices that keep it from being exploited: validating untrusted input, preventing injection (SQL, command, path), handling dependencies and secrets safely, and hardening the HTTP surface. It spans the code, the dependency tree, and the runtime configuration.

---

## Why does it matter?

Node servers are internet-facing and pull in large dependency trees from npm, widening the attack surface. A single unvalidated input, leaked secret, or vulnerable transitive dependency can lead to data breaches or remote code execution. Most incidents come from a small, well-known set of mistakes that are cheap to prevent.

---

## How it works

### Validate all untrusted input

Never trust request bodies, query params, headers, or env values. Validate shape and type at the boundary with a schema (e.g., Zod) and reject early.

```javascript
// Reject malformed input before it reaches business logic
const body = CreateUserSchema.parse(req.body); // throws → 400 via error handler
```

### Prevent injection

- **SQL** — always use parameterized queries; never concatenate input into SQL (see data-access).
- **Command** — avoid `child_process.exec` with interpolated input; use `execFile`/`spawn` with an argument array.
- **Path traversal** — never build file paths from raw user input; resolve and confirm the result stays inside an allowed base directory.

```javascript
import { execFile } from "node:child_process";
execFile("convert", [userFilename, "out.png"]); // args array — no shell parsing
```

### Manage dependencies

```bash
npm audit                    # report known vulnerabilities
npm audit fix                # apply compatible fixes
npm outdated                 # find stale deps
```

Pin versions with a committed lockfile, review new dependencies, and minimize the tree. Enable automated dependency-update and audit checks in CI.

### Secrets

Keep secrets out of source, inject via the environment/secret manager, never log them, and rotate on any exposure (see configuration-and-environment).

### Harden the HTTP surface

- Set security headers (e.g., via `helmet` for Express) — CSP, HSTS, `X-Content-Type-Options`.
- Apply rate limiting and body-size limits to mitigate abuse and DoS.
- Configure CORS explicitly; do not reflect arbitrary origins.
- Use HTTPS/TLS (usually terminated at a proxy/load balancer).

### Authentication and crypto

- Use vetted libraries for auth and password hashing (`node:crypto` `scrypt`, or `argon2`/`bcrypt`) — never roll your own.
- Use `crypto.randomUUID()` / `crypto.randomBytes` for tokens, never `Math.random()`.
- Compare secrets with `crypto.timingSafeEqual` to avoid timing attacks.

### Run with least privilege

Run as a non-root user in containers, drop unnecessary capabilities, and keep the runtime on a supported LTS with security patches.

---

## Examples

```javascript
// Safe path handling — confine to a base directory
import { resolve, relative } from "node:path";
function safeJoin(base, userPath) {
  const target = resolve(base, userPath);
  if (relative(base, target).startsWith("..")) throw new Error("path traversal");
  return target;
}

// Timing-safe token comparison
import { timingSafeEqual } from "node:crypto";
function tokensMatch(a, b) {
  const ba = Buffer.from(a), bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}
```

---

## When to use

- Validate and sanitize every piece of untrusted input at the boundary.
- Use parameterized queries and argument arrays to eliminate injection.
- Run `npm audit` and dependency updates in CI; keep the lockfile committed.
- Use vetted crypto/auth libraries and the CSPRNG (`node:crypto`) for anything security-sensitive.
- Follow the official Node.js best-practices guide and OWASP cheat sheets.

## When NOT to use

- Do not build SQL, shell commands, or file paths from raw user input.
- Do not implement your own cryptography, password hashing, or session tokens.
- Do not commit or log secrets; do not use `Math.random()` for tokens.
- Do not run production containers as root or on end-of-life Node versions.
- Do not disable TLS certificate validation or use permissive `*` CORS in production.

---

## References

- [Node.js — Security Best Practices](https://nodejs.org/en/learn/getting-started/security-best-practices)
- [OWASP — Node.js Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Nodejs_Security_Cheat_Sheet.html)
- [Node.js — Crypto](https://nodejs.org/api/crypto.html)
- [npm — Auditing package dependencies](https://docs.npmjs.com/cli/v10/commands/npm-audit)
