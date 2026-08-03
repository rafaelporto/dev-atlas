---
type: concept
tags:
  - tool
  - ide
  - typescript
  - frontend
related:
  - tools/ides/overview
  - languages/typescript/overview
language: null
---
# WebStorm

> JetBrains' IDE for JavaScript, TypeScript, and web frameworks, with powerful analysis and refactoring available with zero setup.

---

## What is it?

WebStorm is a commercial IDE focused on web development: JavaScript, [TypeScript](../../languages/typescript/overview.md), Node.js, and frameworks like React, Angular, Vue, Svelte, and Next.js. Built on the IntelliJ platform, it bundles everything needed — completion, refactoring, debugging, testing, linting, and version control — preconfigured, so support for TypeScript and the major frameworks works immediately without installing extensions.

All of WebStorm's web tooling is also included in IntelliJ IDEA Ultimate; WebStorm is the standalone, web-focused package.

## Why does it matter?

WebStorm's edge over an extension-based setup is depth and cohesion out of the box. Its TypeScript understanding, framework-aware completion (including template languages and component props), and safe, project-wide refactorings work without assembling a toolchain. For developers who spend all day in a large JS/TS codebase, that reliability and zero-config experience is the draw.

Since recent releases, WebStorm is **free for non-commercial use**, which broadens its reach for learning and personal projects. The trade-off versus [VS Code](vscode.md) is a heavier footprint and, for commercial use, a paid license.

## How it works

WebStorm indexes the whole project into a semantic model and layers framework-specific knowledge on top, so it understands, for example, a React component's props or an Angular template binding. It integrates Node.js, the package manager, bundlers, linters (ESLint), formatters (Prettier), and test runners (Jest, Vitest, Playwright), surfacing their results inline.

```
WebStorm
├── Project index (JS/TS semantic model)
│     ├── Framework support (React, Angular, Vue, Svelte, Next.js)
│     └── Refactorings (rename, extract, move, safe delete)
├── Node.js + package manager (npm / pnpm / yarn)
├── ESLint / Prettier integration
└── Debugger (Node + browser) + test runners (Jest, Vitest, Playwright)
```

It uses the project's own tooling (the installed TypeScript version, ESLint config, etc.), so results match the command line and CI.

**Complexity level: Medium.** Immediately productive for web work; the full feature depth takes time to explore.

## Getting Started

Install via JetBrains Toolbox or directly, with Node.js available:

```bash
# macOS
brew install --cask webstorm

# Node.js (if not already installed)
brew install node
```

Open a project folder containing `package.json`; WebStorm detects the Node interpreter, TypeScript version, and linters. Enable ESLint/Prettier "on save" under **Settings → Languages & Frameworks**.

| Symptom | Likely cause | Fix |
|---|---|---|
| Type errors differ from CLI `tsc` | IDE using a bundled TypeScript, not the project's | Set **TypeScript version** to the workspace's under Settings |
| ESLint/Prettier not applied | Integration not enabled, or config not found | Turn on "Run eslint --fix on save"; verify the config path |
| Framework completion missing | Plugin disabled or wrong project type | Enable the framework plugin; ensure dependencies are installed |
| High memory use | Large project indexing | Increase IDE memory; exclude `node_modules`/build output |

## Examples

WebStorm honours the project's own tooling config, so the shared, committed artefacts are the standard web configs — for example a formatter config the IDE applies on save:

```json
// .prettierrc
{
  "singleQuote": true,
  "semi": false,
  "trailingComma": "all"
}
```

Run/debug configurations and code style can also be stored under `.idea/` for the team. ESLint rules and framework specifics live in their own config files and documentation rather than here.

## When to use

- Full-time JavaScript/TypeScript and web-framework development on sizeable codebases.
- Teams that want deep, framework-aware analysis and refactoring with no editor assembly.
- Test- and lint-heavy front-end projects benefiting from the integrated runners.

## When NOT to use

- Polyglot repos or lightweight editing where [VS Code](vscode.md)/[Cursor](cursor.md) with a few extensions is enough.
- Backend-heavy JVM/.NET/Go work — use the matching JetBrains IDE instead.
- Resource-constrained machines where a lighter editor is preferable.

## References

- [WebStorm documentation](https://www.jetbrains.com/help/webstorm/)
- [TypeScript documentation](https://www.typescriptlang.org/docs/)
