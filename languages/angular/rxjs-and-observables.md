---
type: concept
tags:
  - language
  - angular
  - typescript
  - reactive
  - async
related:
  - languages/angular/signals-and-change-detection
  - languages/angular/http-and-data
  - languages/angular/overview
language: "angular"
---

# RxJS and Observables

> Angular's reactive-streams library — Observables, operators, and the `async` pipe — used for asynchronous data and events across the framework.

---

## What is it?

**RxJS** is a library for composing asynchronous and event-based programs using **Observables**. An Observable is a stream of values over time that you subscribe to. Angular uses RxJS throughout its first-party APIs: `HttpClient` returns Observables, the router exposes route params as Observables, and reactive forms expose `valueChanges` as Observables.

---

## Why does it matter?

Some things are naturally streams: HTTP responses, user keystrokes, websocket messages, router navigation. RxJS gives you a rich vocabulary of **operators** to transform, combine, filter, debounce, and cancel these streams declaratively — logic that would be tangled and bug-prone with raw callbacks or promises. With [signals](signals-and-change-detection.md) now handling synchronous state, RxJS's role has narrowed to what it does best: **genuine asynchronous event streams**.

---

## How it works

### Observables vs promises

A promise resolves **once**. An Observable can emit **many** values, is **lazy** (nothing runs until you subscribe), and is **cancellable** (unsubscribing stops the work). This is why it fits streams of events, not just single requests.

```
   source ──► operator ──► operator ──► subscriber
   (emits)     (map)       (filter)      (reacts)
```

### Operators

Operators are pure functions piped together to build a processing pipeline:

```typescript
import { fromEvent } from 'rxjs';
import { map, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';

const input = document.querySelector('input')!;

const results$ = fromEvent(input, 'input').pipe(
  map((e) => (e.target as HTMLInputElement).value),
  debounceTime(300),            // wait for a pause in typing
  distinctUntilChanged(),       // ignore unchanged values
  switchMap((q) => this.api.search(q)), // cancel the previous request
);
```

`switchMap` is the canonical "cancel the in-flight request when a new one starts" operator — impossible to express cleanly with promises.

### Consuming Observables in Angular

Prefer the **`async` pipe** in templates: it subscribes, renders the latest value, and unsubscribes automatically when the component is destroyed — no manual cleanup, no memory leaks.

```html
@if (user$ | async; as user) {
  <p>{{ user.name }}</p>
}
```

When you must subscribe manually (side effects), unsubscribe to avoid leaks — the modern idiom is `takeUntilDestroyed()`:

```typescript
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

constructor() {
  this.search$.pipe(takeUntilDestroyed()).subscribe((r) => this.handle(r));
}
```

### Bridging to signals

For values you want to read synchronously in a template or computed, convert the stream to a signal with `toSignal` — it manages the subscription for you:

```typescript
readonly user = toSignal(this.http.get<User>('/api/me'));
// use as this.user() — no async pipe, no manual subscribe
```

---

## Examples

A typeahead search combining RxJS operators with signal output:

```typescript
import { Component, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-typeahead',
  standalone: true,
  template: `
    <input (input)="query.set($any($event.target).value)" />
    <ul>@for (r of results(); track r.id) { <li>{{ r.title }}</li> }</ul>
  `,
})
export class TypeaheadComponent {
  readonly query = signal('');

  readonly results = toSignal(
    toObservable(this.query).pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((q) => this.api.search(q)),
    ),
    { initialValue: [] },
  );

  constructor(private api: SearchApi) {}
}
```

---

## When to use

- Asynchronous streams: HTTP requests, websockets, router events, form `valueChanges`.
- Event pipelines that need debouncing, throttling, cancellation, or combination of multiple sources.
- Anywhere Angular's first-party APIs hand you an Observable.

## When NOT to use

- For plain synchronous component state — use [signals](signals-and-change-detection.md); RxJS is heavier and less direct.
- For a single one-shot value where a promise/`async-await` reads more simply and you don't need cancellation.
- Deeply nested `subscribe` calls — flatten with `switchMap`/`mergeMap` instead; nested subscribes are an anti-pattern.

## References

- RxJS Team. [RxJS — Introduction](https://rxjs.dev/guide/overview). rxjs.dev.
- Angular Team. [Observables in Angular](https://angular.dev/guide/http). angular.dev.
- Angular Team. [RxJS Interop](https://angular.dev/ecosystem/rxjs-interop). angular.dev.
