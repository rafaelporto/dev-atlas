---
type: concept
tags:
  - language
  - typescript
  - testing
  - concept
related:
  - languages/javascript/testing
  - languages/typescript/toolchain
  - languages/typescript/typescript-patterns
language: "typescript"
---
# Testing TypeScript

> Testing TypeScript adds two concerns to the JavaScript story: running tests without a slow build step, and verifying the *types themselves* — not just runtime behavior.

---

## What is it?

Testing TypeScript covers runtime tests (same runners as JavaScript — Vitest, Jest, `node:test`) executed against TypeScript sources, plus **type-level tests** that assert your types behave as intended (e.g., a generic returns the expected type). The extra tooling concern is transpiling TS on the fly so tests run fast.

---

## Why does it matter?

Types are a big part of a TypeScript library's contract; a refactor can silently loosen a type without breaking any runtime test. Type-level tests catch that. And because a full `tsc` build before every test run is slow, choosing a fast, TS-aware runner keeps the feedback loop tight.

---

## How it works

### Running tests on TypeScript

**Vitest** understands TypeScript natively (via esbuild) — no separate build.

```typescript
// sum.test.ts
import { describe, it, expect } from "vitest";
import { sum } from "./sum.js";

describe("sum", () => {
  it("adds", () => {
    expect(sum(2, 3)).toBe(5);
  });
});
```

Jest needs a transformer (`ts-jest` or an esbuild/SWC transform); `node:test` can run via `tsx` or Node's built-in type stripping.

### Typing test doubles

Type mocks so they match the real dependency and break when its signature changes.

```typescript
import { vi } from "vitest";
interface UserRepo { findById(id: string): Promise<User | null>; }

const repo: UserRepo = {
  findById: vi.fn<UserRepo["findById"]>().mockResolvedValue(null),
};
```

### Type-level tests

Assert relationships between types at compile time. A common lightweight helper:

```typescript
type Expect<T extends true> = T;
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

// These "tests" fail to compile if the type is wrong
type _1 = Expect<Equal<ReturnType<typeof sum>, number>>;
```

Libraries like `expect-type` or `tsd` formalize this. Running `tsc --noEmit` in CI then doubles as the type-test gate.

### Testing types that guard runtime

Pair a runtime test with the type it enforces — e.g., a Zod schema: assert it rejects bad input (runtime) and that its inferred type matches your domain type (type-level).

---

## Examples

```typescript
// Runtime + type behavior of a generic utility
import { first } from "./first.js";

it("returns the first element", () => {
  expect(first([1, 2, 3])).toBe(1);
  expect(first([])).toBeUndefined();
});

type _ = Expect<Equal<ReturnType<typeof first<number>>, number | undefined>>;
```

---

## When to use

- Use **Vitest** for TypeScript projects wanting zero-config TS support and speed.
- Add **type-level tests** for generic utilities and public library types whose type behavior is part of the contract.
- Run **`tsc --noEmit` in CI** as a gate — it is the definitive check that the whole project's types are sound.
- Type your mocks against the real interface so signature drift breaks tests.

## When NOT to use

- Do not rely only on a fast transpiler (esbuild/SWC) for correctness — it skips type-checking; keep `tsc --noEmit` in CI.
- Do not write type-level tests for trivial types — reserve them for non-obvious generic behavior.
- Do not cast mocks to `any` — you lose the safety that makes typed tests worthwhile.
- Do not duplicate runtime assertions as type tests or vice versa; each catches a different failure.

---

## References

- [Vitest — Guide](https://vitest.dev/guide/)
- [TypeScript — Compiler Options (`noEmit`)](https://www.typescriptlang.org/tsconfig/#noEmit)
- [ts-jest — Documentation](https://kulshekhar.github.io/ts-jest/docs/)
- [TypeScript — Testing types (Handbook: writing declaration files best practices)](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)
