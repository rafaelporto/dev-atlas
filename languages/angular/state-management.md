---
type: concept
tags:
  - language
  - angular
  - typescript
  - state-management
related:
  - languages/angular/signals-and-change-detection
  - languages/angular/dependency-injection
  - languages/react/state-management
  - software-engineering/architecture/frontend/state-management-architecture
language: "angular"
---

# State Management

> How Angular applications manage shared state — from signal-based services to full stores like NgRx — and how to pick by scale.

---

## What is it?

**State management** is how an app stores and shares data that outlives a single component: the current user, a shopping cart, cached server data, UI flags. Angular offers a spectrum: local component [signals](signals-and-change-detection.md), shared signal-based **services**, and dedicated stores such as **NgRx** and **NgRx SignalStore** for large, complex applications.

---

## Why does it matter?

Choosing the right level matters more than choosing a specific library. Reaching for a heavyweight store when a service with a few signals would do adds ceremony; hand-rolling ad-hoc shared state when the app is genuinely complex leads to bugs and untraceable updates. Angular's DI and signals make the lightweight end of the spectrum very capable, so most apps need far less machinery than they once did.

---

## How it works

### The spectrum

```
   local signal   →   signal service   →   NgRx SignalStore   →   NgRx Store
   (one component)   (shared, most apps)   (structured, medium)   (large, event-driven)
```

### Signal-based service (the modern default)

For most shared state, an injectable service holding signals is enough — it's testable, DI-scoped, and needs no extra library:

```typescript
@Injectable({ providedIn: 'root' })
export class CartStore {
  private readonly _items = signal<Item[]>([]);

  readonly items = this._items.asReadonly();               // expose read-only
  readonly count = computed(() => this._items().length);
  readonly total = computed(() =>
    this._items().reduce((sum, i) => sum + i.price, 0));

  add(item: Item)    { this._items.update((xs) => [...xs, item]); }
  remove(id: string) { this._items.update((xs) => xs.filter((i) => i.id !== id)); }
  clear()            { this._items.set([]); }
}
```

Components inject it and read the computed signals directly — updates are fine-grained and automatic.

### NgRx SignalStore (structured, medium apps)

A lightweight store built on signals with a declarative API for state, computed values, and methods:

```typescript
export const BooksStore = signalStore(
  { providedIn: 'root' },
  withState({ books: [] as Book[], loading: false }),
  withComputed(({ books }) => ({ count: computed(() => books().length) })),
  withMethods((store, api = inject(BookApi)) => ({
    async load() {
      patchState(store, { loading: true });
      patchState(store, { books: await api.list(), loading: false });
    },
  })),
);
```

### NgRx Store (large, event-driven apps)

The full Redux-style store: **actions** describe events, **reducers** are pure state transitions, **selectors** derive views, and **effects** handle async side effects. It brings a strict unidirectional flow and excellent time-travel/debugging — at the cost of significant boilerplate. Reserve it for large apps with complex, cross-cutting state and many contributors who benefit from the rigid structure.

---

## Examples

Distinguishing *server state* from *client state* — a common source of over-engineering:

```typescript
// Client/UI state → a signal service is ideal
@Injectable({ providedIn: 'root' })
export class UiStore {
  readonly sidebarOpen = signal(false);
  toggleSidebar() { this.sidebarOpen.update((v) => !v); }
}

// Server state (fetched, cached, refetched) → prefer a data-fetching
// library (e.g. TanStack Query) over stuffing it into a global store.
```

Treating fetched server data as if it were client state — manually caching and invalidating it in a store — is the classic mistake; see [state management architecture](../../software-engineering/architecture/frontend/state-management-architecture.md).

---

## When to use

- **Local signals** for state owned by one component.
- **Signal service** for shared client/UI state — the right default for the large majority of apps.
- **NgRx SignalStore** when a feature's state grows enough to want structure without full Redux ceremony.
- **NgRx Store** for large apps with complex event-driven state and teams that benefit from strict conventions and tooling.

## When NOT to use

- Don't adopt NgRx Store by default — most apps never need it; start light and escalate only on real pain.
- Don't store server-fetched data in a global client store just to "have one store" — use a server-cache library.
- Don't expose writable signals from services — expose `asReadonly()`/`computed` and mutate through methods.

## References

- Angular Team. [Signals](https://angular.dev/guide/signals). angular.dev.
- NgRx Team. [NgRx SignalStore](https://ngrx.io/guide/signals/signal-store). ngrx.io.
- NgRx Team. [NgRx Store](https://ngrx.io/guide/store). ngrx.io.
