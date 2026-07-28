---
type: concept
tags:
  - language
  - typescript
  - frontend
  - backend
  - overview
related:
  - languages/javascript/overview
  - languages/typescript/type-system-basics
  - languages/react/typescript-with-react
language: "typescript"
---
# TypeScript Overview

> TypeScript is a strongly typed superset of JavaScript that adds a static, structural type system checked at compile time and erased at runtime.

---

## What is it?

TypeScript is JavaScript with **static types**. Any valid JavaScript is valid TypeScript; TypeScript adds type annotations, interfaces, generics, and a compiler (`tsc`) that checks them and then **erases** them, emitting plain JavaScript. It is developed by Microsoft and has become the default language for serious JavaScript projects.

Two properties define it:
- **Structural typing** — compatibility is based on an object's shape, not its declared name ("duck typing" with compile-time checks).
- **Gradual typing** — you can adopt it incrementally; `any` is an escape hatch, and types are optional at the boundaries.

---

## Why does it matter?

JavaScript defers almost all errors to runtime. TypeScript moves a large class of them — typos, wrong arguments, `undefined` access, incorrect refactors — to compile time, before code ships. It also powers editor tooling: autocomplete, inline documentation, safe rename, and go-to-definition all rely on the type information. On a codebase of any size, this is a major productivity and reliability gain.

---

## How it works

### Compile-time only

Types exist only during development and compilation. At runtime there is **no** type information — TypeScript does not add runtime checks.

```typescript
interface User { id: number; name: string; }

function greet(u: User): string {
  return `Hi, ${u.name}`;
}
// Compiles to plain JS with all types removed:
// function greet(u) { return `Hi, ${u.name}`; }
```

This is why you cannot check `if (x instanceof User)` for an interface — interfaces don't exist at runtime. Runtime validation needs a library (e.g., Zod) or manual guards.

### Structural typing

```typescript
interface Point { x: number; y: number; }
const p = { x: 1, y: 2, z: 3 };
const usePoint = (pt: Point) => pt.x + pt.y;
usePoint(p);   // OK — p has at least the shape of Point
```

### Type inference

You rarely annotate everything; the compiler infers.

```typescript
const nums = [1, 2, 3];          // inferred number[]
const doubled = nums.map((n) => n * 2); // n inferred number
let name = "Ada";                 // inferred string
```

### The compiler and strictness

`tsc` reads `tsconfig.json`. The single most important setting is `"strict": true`, which enables `strictNullChecks`, `noImplicitAny`, and more — turning TypeScript from "optional hints" into a genuine safety net.

---

## Examples

```typescript
// Union + narrowing = exhaustive, safe handling
type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "square"; side: number };

function area(s: Shape): number {
  switch (s.kind) {
    case "circle": return Math.PI * s.radius ** 2;
    case "square": return s.side ** 2;
  }
}

// Generics preserve types through transformations
function first<T>(xs: T[]): T | undefined {
  return xs[0];
}
const n = first([1, 2, 3]); // number | undefined
```

---

## When to use

- Any project beyond a small script, especially with multiple contributors.
- Libraries and shared code — consumers benefit from published types.
- Front-end frameworks (React, Vue, Angular all embrace TS) and Node back-ends.
- Refactoring-heavy codebases where the compiler catches breakages.

## When NOT to use

- Tiny throwaway scripts or one-off automation where the setup cost outweighs the benefit.
- Environments where a build step is genuinely impossible (though `tsx`/loaders make this rare).
- As a substitute for runtime validation of external input — types are erased; validate untrusted data separately.

---

## References

- [TypeScript — The Basics (Handbook)](https://www.typescriptlang.org/docs/handbook/2/basic-types.html)
- [TypeScript — TypeScript for JavaScript Programmers](https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes.html)
- [TypeScript — Type Compatibility](https://www.typescriptlang.org/docs/handbook/type-compatibility.html)
- [TypeScript — tsconfig `strict`](https://www.typescriptlang.org/tsconfig/#strict)
