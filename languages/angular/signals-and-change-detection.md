---
type: concept
tags:
  - language
  - angular
  - typescript
  - reactive
  - state-management
related:
  - languages/angular/overview
  - languages/angular/rxjs-and-observables
  - languages/angular/state-management
  - languages/react/state-and-events
language: "angular"
---

# Signals and Change Detection

> Angular's fine-grained reactive primitive — `signal`, `computed`, `effect` — and how it changes the way the framework keeps the DOM in sync with your data.

---

## What is it?

A **signal** is a reactive value: a container you read by calling it (`count()`) and write with `.set()` or `.update()`. When a signal's value changes, everything that read it — computed values, effects, and templates — is notified and re-evaluated automatically. **Change detection** is the framework process that turns those changes into DOM updates.

Signals were introduced in Angular 16 and are now the recommended way to model reactive state.

---

## Why does it matter?

For years Angular's change detection was driven by **Zone.js**, which monkey-patches browser APIs (events, timers, promises) to know *when something might have changed*, then re-checks components to find *what* changed. It works, but it's coarse: any async event can trigger a check of large parts of the tree.

Signals invert this. Because a signal knows exactly which computeds, effects, and template bindings depend on it, Angular can update **only** what actually changed — no tree-walking guesswork. This unlocks **zoneless** Angular (dropping Zone.js entirely), smaller bundles, and more predictable performance. It also makes reactive state simpler to reason about than manually wiring `ChangeDetectorRef`.

---

## How it works

### The three primitives

```typescript
import { signal, computed, effect } from '@angular/core';

const price = signal(100);              // writable signal
const qty = signal(2);

const total = computed(() => price() * qty()); // derived, cached, read-only

effect(() => {
  // runs now, and again whenever price or qty changes
  console.log(`Total is ${total()}`);
});

price.set(120);        // total recomputes lazily; effect re-runs
qty.update((n) => n + 1);
```

- **`signal(value)`** — a writable source of truth. Read with `s()`, write with `s.set(v)` or `s.update(fn)`.
- **`computed(fn)`** — a derived value that tracks the signals it reads and recomputes lazily (only when read after a dependency changed). Its result is cached.
- **`effect(fn)`** — a side effect that re-runs when any signal it reads changes. Use for logging, syncing to `localStorage`, or imperative DOM/third-party integration — **not** for deriving state (use `computed` for that).

### Dependency tracking

Tracking is **automatic and dynamic**: whichever signals you read *during* a computed/effect run become its dependencies for that run. There is no dependency array to maintain (unlike React's hooks).

```
   price ──┐
           ├──► total (computed) ──► template binding {{ total() }}
   qty ────┘                    └──► effect (log)
```

### Signals in components

Reading a signal in a template registers that template as a consumer, so the view updates when the signal changes — even in zoneless mode. `input()` and `model()` (two-way) produce signals too, so props participate in the same graph.

```typescript
@Component({
  template: `<p>{{ total() }}</p><button (click)="add()">+</button>`,
})
export class CartComponent {
  readonly qty = signal(1);
  readonly total = computed(() => this.qty() * 100);
  add() { this.qty.update((n) => n + 1); }
}
```

### Interop with RxJS

Signals and Observables coexist. Convert between them when needed:

```typescript
import { toSignal, toObservable } from '@angular/core/rxjs-interop';

readonly user = toSignal(this.http.get<User>('/api/me')); // Observable → signal
readonly query$ = toObservable(this.query);               // signal → Observable
```

---

## Examples

A search box deriving a filtered list without any manual subscription:

```typescript
import { Component, signal, computed } from '@angular/core';

@Component({
  selector: 'app-search',
  standalone: true,
  template: `
    <input (input)="query.set($any($event.target).value)" placeholder="Filter" />
    <ul>
      @for (name of filtered(); track name) { <li>{{ name }}</li> }
    </ul>
  `,
})
export class SearchComponent {
  private readonly all = signal(['Ada', 'Alan', 'Grace', 'Linus']);
  readonly query = signal('');

  readonly filtered = computed(() => {
    const q = this.query().toLowerCase();
    return this.all().filter((n) => n.toLowerCase().includes(q));
  });
}
```

---

## When to use

- For component and application state — signals are the default choice for new Angular code.
- For derived values — `computed` replaces manually recalculating in getters or lifecycle hooks.
- For synchronizing state to the outside world — `effect` for logging, storage, analytics.
- When adopting zoneless change detection for performance-sensitive apps.

## When NOT to use

- Don't use `effect` to set other signals as a way to derive state — that's what `computed` is for; effects for derivation cause redundant runs and warnings.
- Don't reach for signals to model genuine async event streams (websockets, debounced input pipelines) — RxJS Observables are better; bridge with `toSignal`. See [RxJS and observables](rxjs-and-observables.md).
- Don't write to signals inside a `computed` — computeds must be pure.

## References

- Angular Team. [Signals](https://angular.dev/guide/signals). angular.dev.
- Angular Team. [Zoneless](https://angular.dev/guide/experimental/zoneless). angular.dev.
- Angular Team. [RxJS Interop with signals](https://angular.dev/ecosystem/rxjs-interop). angular.dev.
