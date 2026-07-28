---
type: how-to
tags:
  - language
  - nodejs
  - backend
  - tool
related:
  - languages/nodejs/project-setup
  - languages/javascript/toolchain
  - languages/nodejs/testing
language: "nodejs"
---
# Node.js Toolchain

> How to use Node's package manager, built-in dev tools (`--watch`, `--env-file`, `node:test`), and the key `package.json` fields that drive them.

---

## Prerequisites

- Node.js (active LTS) and a project with `package.json`.
- Familiarity with running terminal commands.

---

## Steps

### 1. Manage dependencies

```bash
npm install express          # runtime dependency
npm install --save-dev vitest # dev-only dependency
npm ci                        # clean, reproducible install from the lockfile (use in CI)
```

Commit the lockfile (`package-lock.json` / `pnpm-lock.yaml`). Alternatives to npm: **pnpm** (fast, strict, great for monorepos) and **yarn**.

### 2. Know the key package.json fields

```json
{
  "type": "module",
  "main": "dist/index.js",
  "exports": { ".": "./dist/index.js" },
  "bin": { "myctl": "dist/cli.js" },
  "scripts": { "start": "node dist/index.js" },
  "engines": { "node": ">=22" }
}
```

- `exports` controls the public entry points (preferred over `main` for modern packages).
- `bin` exposes CLI executables.
- `engines` documents/enforces the supported Node range.

### 3. Use the built-in dev tools

Modern Node reduces the need for extra dependencies:

```bash
node --watch src/index.js         # auto-restart on changes (replaces nodemon)
node --env-file=.env src/index.js # load env vars (replaces dotenv for simple cases)
node --test                        # run the built-in test runner
node --inspect src/index.js        # attach a debugger (Chrome DevTools / VS Code)
```

### 4. Run scripts

```bash
npm run <script>     # runs a package.json script
npx <tool>           # runs a local (or fetched) binary without global install
```

### 5. Profile and diagnose

```bash
node --prof app.js                    # V8 profiler → isolate-*.log
node --cpu-prof --cpu-prof-dir=./prof app.js
node --heap-prof app.js               # heap snapshot for memory analysis
```

---

## Verification

```bash
npm ci               # installs exactly per lockfile
node --test          # runs tests, exits non-zero on failure
node --watch app.js  # confirm auto-restart on save
```

---

## Common issues

| Symptom | Likely cause | Fix |
|---|---|---|
| Different installs across machines | Lockfile not committed / `npm install` drift | Commit the lockfile; use `npm ci` in CI |
| `nodemon: command not found` | Extra tool not needed | Use built-in `node --watch` |
| Env vars missing | `.env` not loaded | `node --env-file=.env` or a config loader |
| Global install permission errors | Installing globally with sudo | Prefer `npx` / local deps; use a version manager |
| Package entry points not resolving | `exports` misconfigured | Verify `exports` map matches built files |

---

## References

- [npm — CLI commands (install, ci)](https://docs.npmjs.com/cli/v10/commands)
- [Node.js — CLI options](https://nodejs.org/api/cli.html)
- [Node.js — Test runner](https://nodejs.org/api/test.html)
- [Node.js — Packages (`exports`, `type`)](https://nodejs.org/api/packages.html)
