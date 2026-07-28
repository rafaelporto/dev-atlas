---
type: concept
tags:
  - language
  - typescript
  - concept
related:
  - languages/typescript/type-system-basics
  - languages/typescript/functions-and-signatures
  - languages/typescript/error-handling
language: "typescript"
---
# Narrowing and Type Guards

> Narrowing is how TypeScript refines a broad type (like a union) down to a specific one based on runtime checks, and type guards are the checks that drive it.

---

## What is it?

**Narrowing** is the compiler's flow analysis: after a check like `typeof x === "string"`, TypeScript *knows* `x` is a string in that branch. A **type guard** is any expression that narrows — built-in (`typeof`, `instanceof`, `in`, truthiness) or user-defined (a function returning `x is T`).

---

## Why does it matter?

Unions and `unknown` are only useful if you can safely get from the wide type to the specific one. Narrowing is what makes `string | number` or parsed JSON usable without unsafe casts. Discriminated unions plus exhaustive narrowing are the idiomatic way to model states and messages in TypeScript.

---

## How it works

### Built-in guards

```typescript
function pad(value: string | number): string {
  if (typeof value === "number") return " ".repeat(value); // value: number here
  return value;                                             // value: string here
}

if (err instanceof RangeError) { /* err: RangeError */ }
if ("role" in user) { /* user has role */ }
if (value != null) { /* excludes null and undefined */ }
```

### Discriminated unions

A shared literal "tag" property lets the compiler pick the right member.

```typescript
type Action =
  | { type: "add"; amount: number }
  | { type: "reset" };

function reduce(state: number, action: Action): number {
  switch (action.type) {
    case "add": return state + action.amount; // amount available
    case "reset": return 0;
  }
}
```

### User-defined type guards

A function whose return type is `arg is Type`.

```typescript
interface Cat { meow(): void; }
function isCat(pet: unknown): pet is Cat {
  return typeof pet === "object" && pet !== null && "meow" in pet;
}
if (isCat(pet)) pet.meow();  // pet: Cat
```

### Assertion functions

Throw if a condition fails, narrowing afterward.

```typescript
function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}
function use(x: string | null) {
  assert(x !== null, "x required");
  x.toUpperCase(); // x: string
}
```

### Exhaustiveness with `never`

```typescript
function assertNever(x: never): never {
  throw new Error(`Unhandled: ${JSON.stringify(x)}`);
}
```

---

## Examples

```typescript
// Safely consume unknown external data
function toUser(raw: unknown): User {
  if (
    typeof raw === "object" && raw !== null &&
    "id" in raw && typeof (raw as any).id === "number"
  ) {
    return raw as User;
  }
  throw new Error("invalid user");
}

// For real projects, prefer a schema validator (e.g., Zod) that generates the guard
```

---

## When to use

- Use `typeof`/`instanceof`/`in` for quick, local narrowing.
- Model finite states/messages as **discriminated unions** and narrow on the tag.
- Write **user-defined guards** (`x is T`) or **assertion functions** for reusable, named checks.
- Use `assertNever` to make the compiler enforce exhaustive handling.

## When NOT to use

- Do not use `as` type assertions to skip narrowing — they turn off checking and can lie; narrow with a guard instead.
- Do not hand-write deep validation guards for complex external input — use a runtime schema library that also infers the type.
- Do not forget the `default`/exhaustiveness branch on unions — new members will otherwise slip through silently.

---

## References

- [TypeScript — Narrowing (Handbook)](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)
- [TypeScript — Using type predicates](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates)
- [TypeScript — Assertion functions](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-7.html#assertion-functions)
- [TypeScript — Discriminated unions](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions)
