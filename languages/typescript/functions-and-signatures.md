---
type: concept
tags:
  - language
  - typescript
  - concept
related:
  - languages/javascript/functions
  - languages/typescript/generics
  - languages/typescript/narrowing-and-type-guards
language: "typescript"
---
# Functions and Signatures

> How to type function parameters, return values, optional and rest parameters, overloads, and `this` — the contracts that make call sites safe.

---

## What is it?

A function signature is the type of a function: its parameter types, return type, and any generic type parameters. TypeScript checks every call against the signature and infers return types when you don't annotate them.

---

## Why does it matter?

Function boundaries are where most type errors surface — wrong argument order, missing arguments, forgetting a `null` return. Precise signatures catch these at the call site and drive editor autocomplete for callers.

---

## How it works

### Basic typing

```typescript
function add(a: number, b: number): number {
  return a + b;
}
const mul = (a: number, b: number): number => a * b;

// Return type is usually inferred — annotate public APIs for clarity/stability
const greet = (name: string) => `Hi, ${name}`; // inferred string
```

### Optional, default, and rest parameters

```typescript
function build(name: string, count = 1, ...tags: string[]): string {
  return `${name} x${count} [${tags.join(",")}]`;
}
function find(id: string, opts?: { deep: boolean }): void {} // optional param
```

### Function types

```typescript
type BinaryOp = (a: number, b: number) => number;
const subtract: BinaryOp = (a, b) => a - b;   // params inferred from the type

// Callbacks
function map<T, U>(xs: T[], fn: (x: T, i: number) => U): U[] {
  return xs.map(fn);
}
```

### Overloads

Multiple signatures for one implementation, when the return type depends on argument shape.

```typescript
function parse(x: string): string[];
function parse(x: number): number[];
function parse(x: string | number): string[] | number[] {
  return typeof x === "string" ? x.split("") : [x];
}
```

Prefer a union or generics when they express the same intent more simply — overloads are a heavier tool.

### Typing `this`

```typescript
interface Counter { count: number; inc(this: Counter): void; }
```

A leading `this` parameter is erased at runtime but ensures the method is called with the right receiver.

### `void` return and callbacks

A `void`-returning function type means "the return value is ignored" — a callback may still return something, which is discarded. This is why `arr.forEach(x => arr.push(x))` type-checks.

---

## Examples

```typescript
// Precise optional/return typing prevents null bugs at the call site
function findUser(id: string): User | undefined {
  return users.get(id);
}
const u = findUser("1");
// u.name;         // ❌ error — u possibly undefined
u?.name;           // ✅

// Generic higher-order function preserves the element type
const pluck = <T, K extends keyof T>(xs: T[], key: K): T[K][] =>
  xs.map((x) => x[key]);
```

---

## When to use

- Annotate **public API** return types explicitly for stability and readable errors; let internal helpers infer.
- Use optional (`?`) and default parameters instead of overloads for simple optionality.
- Use `this` parameters when a method's correct receiver must be enforced.
- Reach for **overloads** only when the return type genuinely varies by argument shape and a union/generic can't express it.

## When NOT to use

- Do not overuse overloads — they are verbose and easy to get subtly wrong; try generics/unions first.
- Do not annotate every inferred return type in internal code — it adds noise and can drift from reality.
- Do not type callbacks as `Function` — give a precise `(args) => ret` signature.
- Do not rely on a callback's return when the expected type is `void`.

---

## References

- [TypeScript — More on Functions](https://www.typescriptlang.org/docs/handbook/2/functions.html)
- [TypeScript — Function overloads](https://www.typescriptlang.org/docs/handbook/2/functions.html#function-overloads)
- [TypeScript — Declaring this in a function](https://www.typescriptlang.org/docs/handbook/2/functions.html#declaring-this-in-a-function)
- [TypeScript — Parameter destructuring & rest](https://www.typescriptlang.org/docs/handbook/2/functions.html#rest-parameters-and-arguments)
