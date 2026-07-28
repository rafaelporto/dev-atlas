---
type: how-to
tags:
  - language
  - nodejs
  - backend
  - tool
related:
  - languages/nodejs/overview
  - languages/nodejs/project-setup
  - languages/nodejs/toolchain
language: "nodejs"
---
# Installing Node.js

> How to install Node.js, manage multiple versions per project, and verify the setup.

---

## Prerequisites

- A terminal (macOS/Linux shell or Windows PowerShell).
- Permission to install software on the machine.

---

## Steps

### 1. Choose an installation method

- **Official installer / package** — download the **LTS** build from nodejs.org. Simplest for a single version.
- **Version manager** (recommended for developers) — install `nvm`, `fnm`, or `volta` to switch versions per project. This avoids conflicts between projects requiring different Node versions.

### 2. Install a version manager (example: nvm)

```bash
# macOS/Linux — see the nvm README for the current install command
# then:
nvm install --lts       # install the latest LTS
nvm use --lts
nvm alias default lts/*  # make LTS the default in new shells
```

`fnm` and `volta` are faster alternatives with similar commands; `volta` also pins the version in `package.json`.

### 3. Pin the version per project

Record the version so the whole team (and CI) uses the same one.

```bash
node --version > .nvmrc      # e.g. writes "v22.x.x"
```

Or use the `"engines"` field in `package.json`:

```json
{ "engines": { "node": ">=22" } }
```

### 4. Verify npm

npm ships with Node. Optionally enable `pnpm`/`yarn` via Corepack:

```bash
corepack enable
```

---

## Verification

```bash
node --version    # prints the active version (aim for an LTS: v20/v22/...)
npm --version     # prints the bundled npm version
node -e "console.log('ok')"   # runs inline JavaScript
```

---

## Common issues

| Symptom | Likely cause | Fix |
|---|---|---|
| `node: command not found` after install | Shell PATH not updated | Restart the shell or source the version manager's init line |
| Wrong version in a project | No pinned version | Add `.nvmrc` / `engines`; run `nvm use` |
| `EACCES` installing global packages | Installing to a system dir | Use a version manager (installs to user dir) — never `sudo npm` |
| CI uses a different version | Version not pinned in CI config | Set the Node version in the CI workflow to match `.nvmrc` |

---

## References

- [Node.js — Download](https://nodejs.org/en/download)
- [Node.js — How to install Node.js](https://nodejs.org/en/learn/getting-started/how-to-install-nodejs)
- [nvm — README](https://github.com/nvm-sh/nvm)
- [Node.js — Corepack](https://nodejs.org/api/corepack.html)
