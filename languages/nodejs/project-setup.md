---
type: how-to
tags:
  - language
  - nodejs
  - backend
  - tool
related:
  - languages/nodejs/installation
  - languages/nodejs/toolchain
  - languages/nodejs/architecture
language: "nodejs"
---
# Node.js Project Setup

> How to initialize a Node.js project as an ES Module, structure it, add scripts, and wire in TypeScript.

---

## Prerequisites

- Node.js (active LTS) installed (`node --version`).
- A version manager or pinned version recommended (see installation).

---

## Steps

### 1. Initialize the project

```bash
mkdir myservice && cd myservice
npm init -y
```

### 2. Opt into ES Modules

Set `"type": "module"` so `import`/`export` work without `.mjs`.

```json
{
  "name": "myservice",
  "type": "module",
  "engines": { "node": ">=22" }
}
```

### 3. Choose a directory layout

A layout that scales for a service:

```
myservice/
├── package.json
├── tsconfig.json          # if using TypeScript
├── .env                   # local config (never commit)
├── src/
│   ├── index.ts           # entry point / bootstrap
│   ├── config.ts          # validated environment config
│   ├── routes/            # HTTP handlers
│   ├── services/          # business logic
│   ├── repositories/      # data access
│   └── lib/               # cross-cutting helpers
└── test/
```

Keep the entry point thin: load config, wire dependencies, start the server.

### 4. Add TypeScript (recommended)

```bash
npm install --save-dev typescript tsx @types/node
npx tsc --init
```

Set `"module": "NodeNext"`, `"moduleResolution": "NodeNext"`, `"strict": true`, `"outDir": "dist"`, `"rootDir": "src"`.

### 5. Add scripts

```json
{
  "scripts": {
    "dev": "node --watch --import tsx src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "node --test",
    "typecheck": "tsc --noEmit"
  }
}
```

### 6. Add a .gitignore

```
node_modules/
dist/
.env
```

---

## Verification

```bash
npm run dev        # starts and reloads on change
npm run build      # compiles to dist/
npm start          # runs the built output
```

---

## Common issues

| Symptom | Likely cause | Fix |
|---|---|---|
| `Cannot use import statement outside a module` | Missing `"type": "module"` | Add it to `package.json` |
| `ERR_MODULE_NOT_FOUND` for local import | Missing `.js` extension under NodeNext | Import with the `.js` extension |
| `.env` values undefined | Not loaded | Use `node --env-file=.env` or a config loader |
| Secrets committed | `.env` not ignored | Add `.env` to `.gitignore`; rotate leaked secrets |

---

## References

- [Node.js — package.json / npm init](https://docs.npmjs.com/cli/v10/configuring-npm/package-json)
- [Node.js — ECMAScript modules](https://nodejs.org/api/esm.html)
- [Node.js — `--env-file`](https://nodejs.org/api/cli.html#--env-fileconfig)
- [Node.js — `--watch`](https://nodejs.org/api/cli.html#--watch)
