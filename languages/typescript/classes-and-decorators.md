---
type: concept
tags:
  - language
  - typescript
  - concept
related:
  - languages/javascript/objects-and-prototypes
  - languages/typescript/generics
  - languages/typescript/typescript-patterns
language: "typescript"
---
# Classes and Decorators

> TypeScript adds access modifiers, parameter properties, abstract classes, and implements-clauses to JavaScript classes, plus standardized decorators for annotating class members.

---

## What is it?

TypeScript classes are JavaScript classes with static-typing features layered on: visibility modifiers (`public`/`private`/`protected`), `readonly`, parameter properties, `abstract`, and `implements`. **Decorators** are functions that annotate and modify classes and their members, standardized in ECMAScript and supported by TypeScript.

---

## Why does it matter?

Classes model entities with identity and behavior; TypeScript's modifiers enforce encapsulation at compile time and cut boilerplate (parameter properties). Decorators underpin popular frameworks (NestJS, Angular, TypeORM) for dependency injection, routing, and ORM mapping — reading and using them is essential in those ecosystems.

---

## How it works

### Class features

```typescript
abstract class Repository<T> {
  protected abstract table: string;                 // subclasses must provide
  abstract findById(id: string): Promise<T | null>;
}

class Service {
  // Parameter properties: declare + assign in one line
  constructor(
    private readonly repo: Repository<User>,
    public name: string,
  ) {}
}
```

### Visibility: TypeScript vs runtime privacy

Two mechanisms exist:
- `private`/`protected` — **compile-time only**, erased at runtime.
- `#field` — **runtime-enforced** ECMAScript private field.

```typescript
class Account {
  #balance = 0;          // truly private at runtime
  private ledger = [];   // private only to the type checker
}
```

Prefer `#fields` when genuine runtime privacy matters.

### implements

```typescript
interface Serializable { toJSON(): string; }
class Money implements Serializable {
  constructor(private cents: number) {}
  toJSON(): string { return JSON.stringify({ cents: this.cents }); }
}
```

### Decorators

A decorator is a function applied with `@`. The standardized (ES) decorators are enabled by modern TypeScript without special flags.

```typescript
function logged<This, Args extends any[], Return>(
  target: (this: This, ...args: Args) => Return,
  context: ClassMethodDecoratorContext,
) {
  return function (this: This, ...args: Args): Return {
    console.log(`calling ${String(context.name)}`);
    return target.call(this, ...args);
  };
}

class Api {
  @logged
  fetchUser(id: string) { /* ... */ }
}
```

Framework decorators (`@Injectable()`, `@Entity()`, `@Get()`) build on this to register metadata. Note: some frameworks still use the older *experimental* decorators (`experimentalDecorators`) — check the framework's required config.

---

## Examples

```typescript
// Dependency injection via constructor parameter properties
class OrderService {
  constructor(
    private readonly orders: Repository<Order>,
    private readonly payments: PaymentGateway,
  ) {}

  async checkout(id: string): Promise<void> {
    const order = await this.orders.findById(id);
    if (!order) throw new Error("not found");
    await this.payments.charge(order.total);
  }
}
```

---

## When to use

- Use classes for entities/services with identity, encapsulated state, and lifecycle.
- Use **parameter properties** to remove constructor boilerplate.
- Use `#private` fields when runtime privacy matters; `private` when compile-time is enough.
- Use decorators when your framework (NestJS, Angular, TypeORM) is built around them.

## When NOT to use

- Do not use classes for plain data — use `type`/`interface` and plain objects.
- Do not rely on `private`/`protected` for security — they are erased at runtime; use `#fields`.
- Do not adopt decorators for general application logic outside a framework that expects them — plain higher-order functions are simpler and more portable.
- Do not mix experimental and standard decorators without checking your framework's requirements.

---

## References

- [TypeScript — Classes (Handbook)](https://www.typescriptlang.org/docs/handbook/2/classes.html)
- [TypeScript — Decorators](https://www.typescriptlang.org/docs/handbook/decorators.html)
- [TypeScript 5.0 — Decorators release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-0.html#decorators)
- [TypeScript — Parameter Properties](https://www.typescriptlang.org/docs/handbook/2/classes.html#parameter-properties)
