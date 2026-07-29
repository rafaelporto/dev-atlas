---
type: concept
tags:
  - language
  - angular
  - typescript
  - dependency-injection
related:
  - languages/angular/overview
  - languages/angular/http-and-data
  - languages/angular/state-management
  - software-engineering/concepts/solid/dependency-inversion
language: "angular"
---

# Dependency Injection

> Angular's built-in dependency injection system — how services are provided, requested, and scoped through a hierarchical injector tree.

---

## What is it?

**Dependency injection (DI)** is how Angular supplies objects a class needs instead of having the class create them itself. You declare a dependency (usually a **service**), and Angular's **injector** looks it up and provides an instance. This is a core, first-party part of the framework, not an add-on.

---

## Why does it matter?

DI is what makes Angular code testable, modular, and loosely coupled. A component that asks for a `UserService` doesn't know or care how it's built — in production it gets the real one; in a test it gets a mock. The framework itself is delivered through DI: the router, `HttpClient`, and forms are all injected services. Understanding the injector hierarchy is essential to controlling **how many instances exist** and **where state lives**.

---

## How it works

### Providing a service

The common case is an app-wide singleton, declared on the service itself:

```typescript
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' }) // one shared instance for the whole app
export class CartService {
  private readonly items = signal<Item[]>([]);
  add(item: Item) { this.items.update((xs) => [...xs, item]); }
  readonly count = computed(() => this.items().length);
}
```

`providedIn: 'root'` is both simple and tree-shakable: if nothing injects the service, it's dropped from the bundle.

### Requesting a service

Two equivalent styles — constructor injection and the `inject()` function:

```typescript
import { Component, inject } from '@angular/core';

@Component({ /* ... */ })
export class HeaderComponent {
  // modern function style (works in field initializers)
  private readonly cart = inject(CartService);

  // classic constructor style (also valid)
  // constructor(private cart: CartService) {}

  get count() { return this.cart.count(); }
}
```

`inject()` is preferred in modern Angular — it works in field initializers, functional guards/interceptors, and composable helper functions where a constructor isn't available.

### The injector hierarchy

Injectors form a tree that mirrors the component tree, with the **root injector** at the top:

```
   Root injector          (providedIn: 'root' → app-wide singleton)
       │
   Route injector         (providers on a lazy route → per-route scope)
       │
   Component injector      (providers: [...] on @Component → per-component)
```

Resolution walks **up** the tree from the requesting component until a provider is found. Providing a service lower in the tree creates a **narrower scope** — e.g. a per-component instance so each instance of a widget has its own state.

### Provider recipes

You can control exactly what gets injected for a token:

```typescript
providers: [
  CartService,                                   // useClass (default)
  { provide: API_URL, useValue: '/api' },        // a constant
  { provide: Logger, useClass: ConsoleLogger },  // swap implementations
  { provide: Store, useFactory: makeStore, deps: [Config] }, // computed
]
```

`InjectionToken` is used for non-class dependencies (config values, functions) so they have a unique DI key.

---

## Examples

Scoping a service per component so two instances don't share state:

```typescript
import { Component } from '@angular/core';

@Injectable() // NOT providedIn: 'root' — scoped by whoever provides it
export class WizardState {
  readonly step = signal(1);
  next() { this.step.update((s) => s + 1); }
}

@Component({
  selector: 'app-wizard',
  standalone: true,
  providers: [WizardState], // a fresh instance per <app-wizard>
  template: `Step {{ state.step() }} <button (click)="state.next()">Next</button>`,
})
export class WizardComponent {
  protected readonly state = inject(WizardState);
}
```

Two `<app-wizard>` elements now each have their own `WizardState`.

---

## When to use

- For all shared logic and state — put it in an injectable service, not in components.
- `providedIn: 'root'` for app-wide singletons (most services).
- Component- or route-level providers when you deliberately want a narrower, isolated instance.
- `InjectionToken` for configuration values and swappable implementations.

## When NOT to use

- Don't instantiate services with `new` — you lose DI, testability, and scoping.
- Don't provide a service at `'root'` *and* on components expecting a singleton — you'll accidentally create multiple instances.
- Don't over-scope: reaching for component providers when a root singleton would do adds needless complexity.

## References

- Angular Team. [Dependency injection overview](https://angular.dev/guide/di). angular.dev.
- Angular Team. [Understanding injection context and `inject()`](https://angular.dev/guide/di/dependency-injection-context). angular.dev.
- Angular Team. [Hierarchical injectors](https://angular.dev/guide/di/hierarchical-dependency-injection). angular.dev.
