---
type: concept
tags:
  - language
  - typescript
  - concept
related:
  - languages/typescript/utility-types
  - languages/typescript/generics
  - languages/typescript/typescript-patterns
language: "typescript"
---
# Advanced Types

> Conditional types, mapped types, template literal types, and `infer` let you compute types from other types — the machinery behind the utility types and library-grade type safety.

---

## What is it?

Advanced types are TypeScript's type-level programming features. They treat types as inputs and produce new types as outputs: **conditional types** branch, **mapped types** iterate over keys, **template literal types** build string types, and **`infer`** extracts a type from within another.

---

## Why does it matter?

These features are how the standard utility types are implemented and how libraries provide precise, self-adjusting types (e.g., a router that types params from a path string). You won't reach for them daily, but understanding them lets you read library types and build reusable, exact abstractions instead of resorting to `any`.

---

## How it works

### Conditional types

```typescript
type IsString<T> = T extends string ? true : false;
type A = IsString<"x">;   // true
type B = IsString<number>; // false

// Distributive over unions
type NonNull<T> = T extends null | undefined ? never : T;
type C = NonNull<string | null>; // string
```

### `infer` — extract a type

```typescript
type ElementType<T> = T extends (infer U)[] ? U : T;
type D = ElementType<string[]>;  // string

type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;
type E = UnwrapPromise<Promise<number>>; // number
```

### Mapped types

Iterate over the keys of a type to build a new one.

```typescript
type Optional<T> = { [K in keyof T]?: T[K] };        // ~ Partial
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};
// Getters<{ name: string }> → { getName: () => string }
```

Key remapping (`as`) and modifiers (`readonly`, `?`, and their removal with `-readonly`/`-?`) make these powerful.

### Template literal types

Build and match string types.

```typescript
type Event = `on${Capitalize<"click" | "hover">}`; // "onClick" | "onHover"
type Route = `/api/${string}`;
```

---

## Examples

```typescript
// A typed event map derived from a data type
type State = { count: number; name: string };
type Handlers = {
  [K in keyof State as `set${Capitalize<K & string>}`]: (v: State[K]) => void;
};
// { setCount: (v: number) => void; setName: (v: string) => void }

// Deep readonly with a recursive mapped + conditional type
type DeepReadonly<T> = T extends object
  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T;
```

---

## When to use

- Use these to build **reusable, generic library types** and to keep types derived from a single source.
- Use `infer` to extract element/return/parameter types generically.
- Use template literal types for typed string APIs (routes, event names, keys).

## When NOT to use

- Do not use type-level programming in application code where a simple explicit type is clearer — favor readability.
- Do not build deeply recursive conditional types that slow the compiler and produce cryptic errors.
- Do not treat this as a substitute for runtime validation — it is all erased at compile time.
- If you find yourself reimplementing a utility type, use the built-in instead.

---

## References

- [TypeScript — Conditional Types](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html)
- [TypeScript — Mapped Types](https://www.typescriptlang.org/docs/handbook/2/mapped-types.html)
- [TypeScript — Template Literal Types](https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html)
- [TypeScript — Creating Types from Types](https://www.typescriptlang.org/docs/handbook/2/types-from-types.html)
