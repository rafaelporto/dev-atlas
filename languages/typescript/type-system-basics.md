---
type: concept
tags:
  - language
  - typescript
  - concept
related:
  - languages/javascript/types-and-coercion
  - languages/typescript/overview
  - languages/typescript/narrowing-and-type-guards
language: "typescript"
---
# Type System Basics

> The building blocks of TypeScript's type system: primitives, arrays, tuples, objects, unions, literals, and the special types `any`, `unknown`, `never`, and `void`.

---

## What is it?

The type system is the set of rules describing what values an expression can hold. TypeScript's is **structural** and **static**. This article covers the foundational types you compose everything else from.

---

## Why does it matter?

Getting the basics right — especially `any` vs `unknown`, and unions vs enums — determines whether the type system helps you or gets in your way. Misusing `any` silently disables checking; using `unknown` and unions correctly gives you safety with flexibility.

---

## How it works

### Primitive and common types

```typescript
let s: string = "hi";
let n: number = 42;
let b: boolean = true;
let big: bigint = 10n;
let sym: symbol = Symbol();
let nothing: null = null;
let missing: undefined = undefined;
```

### Arrays and tuples

```typescript
const xs: number[] = [1, 2, 3];
const ys: Array<string> = ["a"];        // generic form
const pair: [string, number] = ["age", 30]; // fixed-length tuple
const [key, value] = pair;               // typed destructuring
```

### Object types

```typescript
type User = {
  id: number;
  name: string;
  email?: string;          // optional
  readonly createdAt: Date; // cannot be reassigned
};
```

### Unions and literals

Unions express "one of these types"; literal types narrow to exact values.

```typescript
type Status = "idle" | "loading" | "error"; // string literal union
type Id = string | number;
let s: Status = "idle";       // only the three allowed values compile
```

### Enums vs unions

TypeScript has `enum`, but string-literal unions are usually preferred (no runtime code, simpler).

```typescript
enum Color { Red, Green }          // emits runtime object
type ColorU = "red" | "green";     // erased; often the better default
```

### The special types

| Type | Meaning | Use |
|---|---|---|
| `any` | opt out of checking | Avoid; last resort during migration |
| `unknown` | typed "I don't know yet" | Safe top type — must narrow before use |
| `never` | no possible value | Exhaustiveness checks, functions that never return |
| `void` | no useful return | Function return type |

```typescript
function parse(json: string): unknown {   // safer than `any`
  return JSON.parse(json);
}
const data = parse(input);
// data.foo;          // ❌ error — must narrow first
if (typeof data === "object" && data !== null) { /* now usable */ }
```

### Type aliases vs annotations

```typescript
type Meters = number;             // alias
const distance: Meters = 5;
```

---

## Examples

```typescript
// Exhaustiveness with never — the compiler flags a forgotten case
type Shape = { kind: "circle" } | { kind: "square" };
function label(s: Shape): string {
  switch (s.kind) {
    case "circle": return "○";
    case "square": return "□";
    default: {
      const _exhaustive: never = s; // errors if a new kind is added
      return _exhaustive;
    }
  }
}
```

---

## When to use

- Use **literal unions** for finite sets of string/number values (states, kinds) — prefer them over `enum`.
- Use **`unknown`** for values of uncertain type (parsed JSON, external input) and narrow before use.
- Use **`never`** to enforce exhaustive `switch` handling.
- Use **`readonly`** and optional (`?`) properties to model intent precisely.

## When NOT to use

- Do not use `any` to silence errors — it disables checking transitively; prefer `unknown` + narrowing.
- Do not reach for `enum` by default — string unions are lighter and have no runtime footprint (numeric enums also allow invalid values).
- Do not annotate what the compiler already infers cleanly (e.g., `const n: number = 1`) — it adds noise.
- Do not use tuples where an object with named fields would be clearer.

---

## References

- [TypeScript — Everyday Types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html)
- [TypeScript — Unions and Literal Types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#union-types)
- [TypeScript — unknown vs any](https://www.typescriptlang.org/docs/handbook/2/functions.html#unknown)
- [TypeScript — Enums](https://www.typescriptlang.org/docs/handbook/enums.html)
