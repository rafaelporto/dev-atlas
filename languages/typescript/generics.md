---
type: concept
tags:
  - language
  - typescript
  - concept
related:
  - languages/typescript/functions-and-signatures
  - languages/typescript/utility-types
  - languages/typescript/advanced-types
language: "typescript"
---
# Generics

> Generics let you write reusable code parameterized over types, preserving type information instead of falling back to `any`.

---

## What is it?

A **generic** is a type parameter — a placeholder type that is filled in at the point of use. `Array<T>`, `Promise<T>`, and `Map<K, V>` are all generic. You write the logic once and it works for any type while keeping the relationship between inputs and outputs.

---

## Why does it matter?

Without generics, reusable functions and containers must use `any`, discarding type safety. Generics keep the connection: `first<T>(xs: T[]): T` guarantees that taking the first element of a `string[]` yields a `string`, not `any`. This is the mechanism behind most of the standard library and every well-typed utility.

---

## How it works

### Generic functions

```typescript
function identity<T>(value: T): T {
  return value;
}
identity<string>("hi"); // explicit
identity(42);            // inferred T = number
```

### Generic constraints

Restrict a type parameter with `extends`.

```typescript
function longest<T extends { length: number }>(a: T, b: T): T {
  return a.length >= b.length ? a : b;
}
longest([1, 2], [1]);     // OK — arrays have length
longest("abc", "ab");     // OK — strings have length
// longest(1, 2);         // ❌ numbers have no length
```

### Using `keyof` to link parameters

```typescript
function getProp<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}
const name = getProp({ id: 1, name: "Ada" }, "name"); // typed as string
```

### Generic types and interfaces

```typescript
interface ApiResponse<T> {
  data: T;
  status: number;
}
type Dict<V> = Record<string, V>;

class Stack<T> {
  #items: T[] = [];
  push(x: T): void { this.#items.push(x); }
  pop(): T | undefined { return this.#items.pop(); }
}
```

### Default type parameters

```typescript
interface Options<T = string> { value: T; }
const a: Options = { value: "x" };       // T defaults to string
const b: Options<number> = { value: 1 };
```

---

## Examples

```typescript
// A typed, reusable result wrapper
type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

function ok<T>(value: T): Result<T> { return { ok: true, value }; }

// Constrained generic keeps the input's exact type through a transform
function mapValues<T extends object, U>(
  obj: T,
  fn: (v: T[keyof T]) => U,
): Record<keyof T, U> {
  const out = {} as Record<keyof T, U>;
  for (const k in obj) out[k] = fn(obj[k]);
  return out;
}
```

---

## When to use

- Use generics for containers, utilities, and functions that should work over many types while preserving type relationships.
- Constrain type parameters with `extends` when the body relies on certain properties.
- Use `keyof` + generics to type property access and object transformations.

## When NOT to use

- Do not add a type parameter that is used only once — if `T` appears in a single position, a plain type usually suffices (avoid "generic for generic's sake").
- Do not over-constrain or nest generics until signatures become unreadable — favor clarity.
- Do not use generics to work around `any`; if you truly don't know the type, use `unknown` and narrow.

---

## References

- [TypeScript — Generics (Handbook)](https://www.typescriptlang.org/docs/handbook/2/generics.html)
- [TypeScript — Generic Constraints](https://www.typescriptlang.org/docs/handbook/2/generics.html#generic-constraints)
- [TypeScript — keyof Type Operator](https://www.typescriptlang.org/docs/handbook/2/keyof-types.html)
- [TypeScript — Indexed Access Types](https://www.typescriptlang.org/docs/handbook/2/indexed-access-types.html)
