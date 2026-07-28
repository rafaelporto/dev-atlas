---
type: concept
tags:
  - language
  - typescript
  - comparison
  - concept
related:
  - languages/typescript/type-system-basics
  - languages/typescript/advanced-types
  - languages/typescript/best-practices
language: "typescript"
---
# Interfaces vs Type Aliases

> `interface` and `type` overlap heavily for describing object shapes; the practical rule is "interfaces for objects/public APIs, type aliases for everything else."

---

## What is it?

TypeScript offers two ways to name a type: `interface` (declares an object contract, supports declaration merging and `extends`) and `type` (a type alias for *any* type — objects, unions, primitives, tuples, functions, mapped/conditional types). For plain object shapes they are almost interchangeable.

---

## Why does it matter?

Teams waste time debating this. Knowing the genuine differences — declaration merging, `extends` vs intersection, and what only `type` can express — lets you pick with confidence and keep the codebase consistent.

---

## How it works

### Both describe object shapes

```typescript
interface UserI { id: number; name: string; }
type UserT = { id: number; name: string };
// Functionally equivalent for consumers.
```

### What only `type` can do

Aliases work for any type, not just objects.

```typescript
type Id = string | number;             // union
type Pair = [number, number];          // tuple
type Handler = (e: Event) => void;      // function type
type Keys = keyof UserI;               // operators
type Nullable<T> = T | null;            // generic alias
```

### What is distinctive about `interface`

**Declaration merging** — two interfaces with the same name combine. Useful for augmenting third-party or global types; a footgun if unintended.

```typescript
interface Window { myGlobal: string; } // augments the DOM's Window
```

### Extending

```typescript
interface Admin extends UserI { role: string; }        // interface extends
type AdminT = UserT & { role: string };                 // type intersection
```

### Performance and errors

The compiler caches interface relationships slightly more efficiently on very large object hierarchies, and interface error messages are often more readable. In practice the difference is negligible for most projects.

---

## Examples

```typescript
// Public API surface / object contracts → interface
interface Repository<T> {
  findById(id: string): Promise<T | null>;
  save(entity: T): Promise<void>;
}

// Unions, function types, mapped/conditional types → type
type Result<T> = { ok: true; value: T } | { ok: false; error: string };
type ReadonlyUser = Readonly<UserI>;
```

---

## When to use

- Use **`interface`** for object shapes, class contracts, and public library APIs (readable errors, `extends`, intentional augmentation).
- Use **`type`** for unions, tuples, function types, primitives, and anything built with type operators (`keyof`, mapped, conditional).
- Pick one convention per codebase and enforce it with a lint rule.

## When NOT to use

- Do not use `interface` for a union or a mapped type — it cannot express them.
- Do not rely on interface **declaration merging** unless you specifically want augmentation — accidental merges cause confusing bugs.
- Do not agonize over the choice for a simple object shape — either works; consistency matters more than the pick.

---

## References

- [TypeScript — Interfaces (Everyday Types)](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#interfaces)
- [TypeScript — Type Aliases vs Interfaces](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#differences-between-type-aliases-and-interfaces)
- [TypeScript — Declaration Merging](https://www.typescriptlang.org/docs/handbook/declaration-merging.html)
- [TypeScript — Objects (Handbook)](https://www.typescriptlang.org/docs/handbook/2/objects.html)
