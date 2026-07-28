---
type: concept
tags:
  - language
  - typescript
  - best-practice
  - concept
related:
  - languages/typescript/advanced-types
  - languages/typescript/error-handling
  - languages/typescript/generics
language: "typescript"
---
# TypeScript Patterns

> Type-driven patterns — branded types, discriminated unions, the builder, and dependency inversion via interfaces — that make illegal states unrepresentable.

---

## What is it?

These are recurring, idiomatic ways to use TypeScript's type system for design, not just annotation. The unifying goal is **"make illegal states unrepresentable"**: shape your types so the compiler rejects invalid combinations before they reach runtime.

---

## Why does it matter?

Well-chosen types eliminate whole categories of bugs and defensive checks. A discriminated union removes "this field is only set when status is X" comments; a branded type stops a raw string being passed where a validated `Email` is required. The patterns below are the practical toolkit for this.

---

## How it works

### Discriminated unions for state

Model mutually exclusive states as a tagged union, not a bag of optional fields.

```typescript
// ❌ allows impossible combos (data + error both set)
type BadState = { loading: boolean; data?: User; error?: string };

// ✅ each state is exact
type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: User }
  | { status: "error"; error: string };
```

### Branded (nominal) types

TypeScript is structural; branding simulates nominal typing so a validated value can't be confused with a raw one.

```typescript
type Email = string & { readonly __brand: "Email" };

function parseEmail(raw: string): Email {
  if (!raw.includes("@")) throw new Error("invalid email");
  return raw as Email;             // only this function can mint an Email
}
function send(to: Email): void {}
// send("nope");                   // ❌ plain string rejected
send(parseEmail(userInput));       // ✅ minted through the validator
```

### Builder with a fluent, typed API

```typescript
class QueryBuilder<T> {
  #parts: string[] = [];
  where(clause: string): this { this.#parts.push(clause); return this; }
  build(): string { return this.#parts.join(" AND "); }
}
```

### Dependency inversion via interfaces

Depend on an interface, inject the implementation — enables testing and swapping.

```typescript
interface Clock { now(): number; }
class RealClock implements Clock { now() { return Date.now(); } }
class FakeClock implements Clock { now() { return 0; } } // for tests

class TokenService {
  constructor(private clock: Clock) {}
}
```

### `satisfies` for typed-but-inferred literals

```typescript
const config = {
  port: 3000,
  host: "localhost",
} satisfies Record<string, string | number>;
// config.port stays typed as number (not widened), and the shape is checked
```

---

## Examples

```typescript
// Combine: a validated identifier + exhaustive handling
type UserId = string & { readonly __brand: "UserId" };
type Command =
  | { kind: "create"; name: string }
  | { kind: "delete"; id: UserId };

function apply(cmd: Command): void {
  switch (cmd.kind) {
    case "create": return createUser(cmd.name);
    case "delete": return deleteUser(cmd.id);
    default: { const _: never = cmd; return _; } // exhaustiveness
  }
}
```

---

## When to use

- Use **discriminated unions** for any finite set of states/messages/events.
- Use **branded types** for values that must be validated before use (ids, emails, sanitized HTML).
- Use **interfaces + injection** to decouple modules and enable fakes in tests.
- Use **`satisfies`** to validate a literal against a type without widening its inferred type.

## When NOT to use

- Do not brand everything — reserve it for values where confusion would be a real bug.
- Do not build elaborate type-level machinery when a plain type communicates the same intent.
- Do not use a class builder where a plain object literal (validated with `satisfies`) is clearer.
- Do not skip runtime validation for branded types derived from external input — the brand is compile-time only.

---

## References

- [TypeScript — Discriminated Unions](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions)
- [TypeScript — `satisfies` operator](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html#the-satisfies-operator)
- [TypeScript — Handbook (Objects & Types from Types)](https://www.typescriptlang.org/docs/handbook/2/objects.html)
- [TypeScript — Generics](https://www.typescriptlang.org/docs/handbook/2/generics.html)
