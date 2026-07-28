---
type: concept
tags:
  - language
  - typescript
  - concept
related:
  - languages/typescript/generics
  - languages/typescript/advanced-types
  - languages/typescript/interfaces-vs-types
language: "typescript"
---
# Utility Types

> TypeScript ships a set of built-in generic types — `Partial`, `Pick`, `Omit`, `Record`, `Readonly`, and more — that transform existing types instead of redefining them.

---

## What is it?

Utility types are predefined generics in the standard library that derive new types from existing ones. Rather than writing a second interface for "a user without an id" or "all fields optional", you compose from the source type, so the derived type stays in sync automatically.

---

## Why does it matter?

Manually duplicating types drifts: change the source and the copy is now wrong. Utility types keep a single source of truth. They also express intent precisely (`Omit<User, "password">` for a public DTO) and are the vocabulary most TypeScript codebases and libraries speak in.

---

## How it works

### The core set

```typescript
interface User {
  id: number;
  name: string;
  email: string;
  password: string;
}

Partial<User>;              // all properties optional
Required<User>;             // all properties required
Readonly<User>;             // all properties readonly
Pick<User, "id" | "name">;  // subset: { id; name }
Omit<User, "password">;     // everything except password
Record<string, User>;       // { [key: string]: User }
```

### Union manipulation

```typescript
type Status = "idle" | "loading" | "error";
Exclude<Status, "error">;     // "idle" | "loading"
Extract<Status, "error" | "x">; // "error"
NonNullable<string | null>;   // string
```

### Function-related

```typescript
type Fn = (a: number, b: string) => boolean;
Parameters<Fn>;    // [number, string]
ReturnType<Fn>;    // boolean
Awaited<Promise<number>>; // number  (unwraps promises, recursively)
```

### Composing them

```typescript
// A create-payload: everything except server-managed fields, all required
type CreateUser = Required<Omit<User, "id">>;

// A patch: any subset of updatable fields
type UpdateUser = Partial<Omit<User, "id" | "password">>;

// A public projection
type PublicUser = Omit<User, "password">;
```

---

## Examples

```typescript
// Keep DTOs derived from the domain model
interface Product { id: string; name: string; price: number; cost: number; }

type ProductListItem = Pick<Product, "id" | "name" | "price">; // hide cost
type ProductDraft = Omit<Product, "id">;                       // no id yet

function publish(draft: ProductDraft): Product {
  return { id: crypto.randomUUID(), ...draft };
}

// Record for lookup tables
const rolesByUser: Record<string, "admin" | "user"> = {};
```

---

## When to use

- Use `Pick`/`Omit` to derive DTOs, view models, and payloads from a canonical type.
- Use `Partial` for update/patch shapes and optional-config objects.
- Use `Record<K, V>` for dictionaries/lookup maps.
- Use `ReturnType`/`Parameters`/`Awaited` to derive types from existing functions instead of restating them.

## When NOT to use

- Do not chain so many utilities that the type becomes unreadable — extract a named intermediate `type`.
- Do not use `Partial` on a type where most fields are actually required — it hides missing-field bugs; be specific with `Omit`/`Pick`.
- Do not reinvent these with hand-written mapped types when a built-in exists.

---

## References

- [TypeScript — Utility Types (reference)](https://www.typescriptlang.org/docs/handbook/utility-types.html)
- [TypeScript — Mapped Types](https://www.typescriptlang.org/docs/handbook/2/mapped-types.html)
- [TypeScript — keyof Type Operator](https://www.typescriptlang.org/docs/handbook/2/keyof-types.html)
- [TypeScript — Indexed Access Types](https://www.typescriptlang.org/docs/handbook/2/indexed-access-types.html)
