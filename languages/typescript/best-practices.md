---
type: concept
tags:
  - language
  - typescript
  - best-practice
related:
  - languages/typescript/type-system-basics
  - languages/typescript/error-handling
  - languages/typescript/typescript-patterns
language: "typescript"
---
# TypeScript Best Practices

> Turn on `strict`, avoid `any`, model data precisely, and validate at the boundaries — the defaults that make TypeScript pay for itself.

---

## What is it?

A consolidated set of conventions for getting maximum safety and clarity from TypeScript with minimal friction. They center on compiler configuration (strictness), disciplined use of the type system, and where to draw the line between compile-time types and runtime validation.

---

## Why does it matter?

TypeScript's value scales with how honestly you use it. A codebase riddled with `any` and `as` casts has the cost of types with little of the benefit. The practices below are what separate a type system that catches real bugs from one that only decorates the code.

---

## How it works

### Compiler configuration

- Enable **`"strict": true`** — non-negotiable. It turns on `strictNullChecks`, `noImplicitAny`, and more.
- Add `noUncheckedIndexedAccess` (array/record access yields `T | undefined`) and `noImplicitReturns` for extra safety.
- Run **`tsc --noEmit` in CI** as the source of truth, even if you build with esbuild/SWC.

### Avoid `any`; prefer `unknown`

```typescript
// ❌ disables checking transitively
function parse(json: string): any { return JSON.parse(json); }

// ✅ forces the caller to narrow
function parse(json: string): unknown { return JSON.parse(json); }
```

### Do not lie with assertions

`as` and `!` (non-null) silence the checker without proving anything. Narrow with guards instead; reserve assertions for cases you can genuinely justify.

### Model data precisely

- Use **literal unions** over `string`/`enum` for finite sets.
- Use **discriminated unions** to make illegal states unrepresentable.
- Use `readonly` and utility types (`Pick`/`Omit`) to derive, not duplicate.

### Let inference work

Annotate **public API** signatures; let local variables and internal returns infer. Over-annotation adds noise and can drift.

### Validate external input at runtime

Types are erased. Anything crossing a boundary (HTTP, files, env, `JSON.parse`) must be validated at runtime — ideally with a schema library that infers the static type, so the type and the check never diverge.

### Type-only imports

Use `import type` for types to keep runtime imports minimal and avoid cycles.

---

## Examples

```typescript
// Boundary validation → trusted typed value (library-agnostic pattern)
const env = EnvSchema.parse(process.env);  // throws on invalid; env fully typed

// Precise modeling instead of loose optionals
type Fetch<T> =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ok"; data: T };
```

---

## When to use

- Start every project with `strict: true` and a `typecheck` CI step.
- Prefer `unknown` + narrowing, literal/discriminated unions, and derived types.
- Validate all external input at runtime with a schema that infers types.
- Adopt a shared ESLint (typescript-eslint) config to enforce these mechanically.

## When NOT to use

- Do not disable `strict` or sprinkle `any`/`as`/`!` to make errors go away — fix the underlying type instead.
- Do not treat compile-time types as runtime validation — they don't exist at runtime.
- Do not over-annotate inferred internals, and do not build baroque type-level code where a simple type reads better.
- Do not ignore `tsc` errors in CI by relying solely on a transpiler that skips type-checking.

---

## References

- [TypeScript — Do's and Don'ts](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)
- [TypeScript — tsconfig `strict`](https://www.typescriptlang.org/tsconfig/#strict)
- [TypeScript — `noUncheckedIndexedAccess`](https://www.typescriptlang.org/tsconfig/#noUncheckedIndexedAccess)
- [TypeScript — Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)
