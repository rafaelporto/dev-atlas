---
type: how-to
tags:
  - language
  - typescript
  - tool
related:
  - languages/typescript/overview
  - languages/typescript/toolchain
  - languages/typescript/best-practices
language: "typescript"
---
# TypeScript Installation and Setup

> How to add TypeScript to a project, create a strict `tsconfig.json`, and compile or run TypeScript files.

---

## Prerequisites

- Node.js installed (`node --version` prints a result).
- An initialized project with a `package.json` (`npm init -y`).

---

## Steps

### 1. Install TypeScript

Install it as a dev dependency (local, versioned per project — preferred over global).

```bash
npm install --save-dev typescript
npx tsc --version
```

### 2. Generate a tsconfig.json

```bash
npx tsc --init
```

Then set the essentials. A solid modern baseline:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

`"strict": true` is the most important line — do not disable it.

### 3. Write a source file

```typescript
// src/index.ts
export function greet(name: string): string {
  return `Hello, ${name}`;
}
console.log(greet("world"));
```

### 4. Compile

```bash
npx tsc          # emits dist/index.js per tsconfig
```

### 5. Or run directly without a separate build

Use `tsx` for development (executes TS via esbuild, no emit step).

```bash
npm install --save-dev tsx
npx tsx src/index.ts
```

Modern Node.js can also run TypeScript directly for simple cases via type stripping — check your Node version's docs.

### 6. Add scripts

```json
{
  "scripts": {
    "build": "tsc",
    "dev": "tsx watch src/index.ts",
    "typecheck": "tsc --noEmit"
  }
}
```

---

## Verification

```bash
npx tsc --noEmit     # type-checks without emitting; exits 0 if clean
npm run build        # produces dist/
node dist/index.js   # runs the compiled output
```

---

## Common issues

| Symptom | Likely cause | Fix |
|---|---|---|
| `Cannot find module` for a `.js` import | `NodeNext` requires explicit extensions | Import with `./file.js` even from `.ts` source |
| Types from a library are missing | No bundled or `@types` package | `npm i -D @types/<pkg>` or check the package ships types |
| `strict` errors flood a JS migration | Enabling strict all at once | Migrate file by file; enable strict flags incrementally |
| `tsc` slow on large repos | Rechecking everything | Use `incremental` / project references |
| Emitted JS runs but has no types | That's expected | Types are erased; publish `.d.ts` for libraries |

---

## References

- [TypeScript — Download / Installation](https://www.typescriptlang.org/download/)
- [TypeScript — tsc CLI options](https://www.typescriptlang.org/docs/handbook/compiler-options.html)
- [TypeScript — What is a tsconfig.json](https://www.typescriptlang.org/docs/handbook/tsconfig-json.html)
- [TypeScript — tsconfig reference](https://www.typescriptlang.org/tsconfig/)
