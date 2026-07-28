---
type: concept
tags:
  - language
  - typescript
  - error-handling
  - concept
related:
  - languages/javascript/error-handling
  - languages/typescript/narrowing-and-type-guards
  - languages/typescript/typescript-patterns
language: "typescript"
---
# Error Handling in TypeScript

> TypeScript types caught errors as `unknown`, pushing you to narrow before use, and enables a typed `Result` pattern for expected failures without exceptions.

---

## What is it?

Error handling in TypeScript is JavaScript's exceptions plus the type system's influence: since `catch` bindings are typed `unknown` (with `useUnknownInCatchVariables`, on under `strict`), you must narrow them before use. Beyond exceptions, TypeScript makes a **`Result`/discriminated-union** style practical for modeling expected failures in the type signature.

---

## Why does it matter?

`throw` is untyped in JavaScript — a function's signature never tells you what it might throw. TypeScript can't fix that for exceptions, but it *can* make failure explicit in return types via `Result`, so callers are forced by the compiler to handle both outcomes. Choosing between exceptions and `Result` deliberately is a core design decision.

---

## How it works

### Errors are `unknown` in catch

```typescript
try {
  await risky();
} catch (err) {
  // err: unknown — cannot access err.message directly
  if (err instanceof Error) console.error(err.message);
  else console.error("Unknown error", err);
}
```

A reusable guard:

```typescript
function toError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err));
}
```

### Typed custom errors

```typescript
class HttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = "HttpError";
  }
}

function handle(err: unknown) {
  if (err instanceof HttpError && err.status === 404) return notFound();
  throw err;
}
```

### The Result pattern

Model expected failures as data, not exceptions.

```typescript
type Result<T, E = string> =
  | { ok: true; value: T }
  | { ok: false; error: E };

function parsePort(raw: string): Result<number> {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0
    ? { ok: true, value: n }
    : { ok: false, error: "port must be a positive integer" };
}

const r = parsePort(input);
if (!r.ok) return reportError(r.error); // compiler forces handling
use(r.value);                            // narrowed to number
```

### Runtime validation at boundaries

Types are erased, so external input needs runtime checks. Schema libraries (e.g., **Zod**) validate and *infer* the static type in one step.

```typescript
// Pattern (library-agnostic): validate → get a typed, trusted value
const user = UserSchema.parse(await res.json()); // throws on invalid; user is typed
```

---

## Examples

```typescript
// Exceptions for truly exceptional cases; Result for expected ones
async function loadConfig(path: string): Promise<Result<Config>> {
  try {
    const raw = await readFile(path, "utf8"); // may throw (I/O failure)
    return { ok: true, value: JSON.parse(raw) };
  } catch (err) {
    return { ok: false, error: toError(err).message };
  }
}
```

---

## When to use

- Enable `strict` (which types catch variables as `unknown`) and narrow with `instanceof`/guards.
- Use custom `Error` subclasses to branch on error kinds.
- Use the **`Result` pattern** for *expected* failures (validation, parsing, not-found) that callers should handle explicitly.
- Validate external/untrusted input at runtime with a schema library that infers types.

## When NOT to use

- Do not access `err.message` without narrowing — the binding is `unknown`.
- Do not use `Result` everywhere — for genuinely exceptional, unrecoverable errors, `throw` and handle at a boundary is simpler.
- Do not trust `JSON.parse` output — it is `any`/`unknown`; validate before using as a typed value.
- Do not annotate a `throws` type manually and assume it's enforced — TypeScript has no checked exceptions.

---

## References

- [TypeScript — useUnknownInCatchVariables](https://www.typescriptlang.org/tsconfig/#useUnknownInCatchVariables)
- [TypeScript — Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)
- [TypeScript — Discriminated Unions](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions)
- [MDN — Error](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error)
