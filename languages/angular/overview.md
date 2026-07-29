---
type: concept
tags:
  - language
  - angular
  - typescript
  - frontend
  - overview
related:
  - languages/angular/project-setup
  - languages/angular/components-and-templates
  - languages/angular/signals-and-change-detection
  - languages/angular/dependency-injection
  - software-engineering/architecture/frontend/frontend-stacks-and-tooling
language: "angular"
---

# Angular

> Angular is a full, opinionated TypeScript framework, maintained by Google, for building large-scale web applications with batteries included.

---

## What is it?

**Angular** is a framework for building web applications. Unlike a UI library that only handles rendering, Angular ships a complete, integrated toolkit: a component and template system, a dependency injection container, a router, a forms system, an HTTP client, and a CLI that scaffolds and builds the whole thing. You write applications in **TypeScript**, and the framework provides strong conventions for how the pieces fit together.

The modern Angular (v17+) is built around **standalone components** (no `NgModule` boilerplate), **signals** for reactivity, and a new block-based template control flow (`@if`, `@for`, `@switch`). This is a substantial simplification over the older module-based Angular many developers remember.

---

## Why does it matter?

Most of the frontend ecosystem is *assembled*: you pick React (or Vue, or Svelte) and then choose a router, a data-fetching library, a forms library, a state manager, and glue them together. That flexibility is powerful but costly — every team makes different choices, and onboarding means learning a bespoke stack.

Angular takes the opposite bet: **one blessed way to do most things**, maintained together and versioned together. The router, forms, HTTP, and DI are first-party and designed to interoperate. For large organizations and long-lived applications, this consistency is the point — a developer moving between Angular projects finds the same structure, the same patterns, and the same upgrade path (Angular ships automated migrations via `ng update`).

The trade-off is a larger up-front concept count and a heavier framework than a minimal library. Angular is optimized for **big apps and big teams**, not for a tiny widget.

---

## How it works

### The building blocks

```
┌──────────────────────────────────────────────────────────┐
│  Component  = TypeScript class + HTML template + styles    │
│      │ uses                                                │
│      ▼                                                      │
│  Services   = injectable classes (business logic, state)   │
│      ▲ provided by                                         │
│      │                                                      │
│  Dependency Injection  = hierarchical injector tree        │
│                                                            │
│  Router · Forms · HttpClient  = first-party feature libs   │
└──────────────────────────────────────────────────────────┘
```

- **Components** are the unit of UI: a class decorated with `@Component`, a template (inline or in a `.html` file), and optional styles. Components form a tree, passing data down via `input()` and emitting events up via `output()`.
- **Templates** are HTML augmented with Angular syntax: bindings (`[prop]`, `(event)`, `[(ngModel)]`), the control-flow blocks (`@if`/`@for`), and pipes (`| date`).
- **Services** hold logic and state and are shared via **dependency injection** — you declare what you need in a constructor or with `inject()`, and Angular supplies it.
- **Change detection** keeps the DOM in sync with your data. Historically driven by Zone.js; modern Angular is moving to **signals**, which track dependencies precisely and enable a *zoneless* mode.

### Standalone-first

Since v17, the default is **standalone components**: a component declares its own template dependencies in an `imports` array, and you bootstrap the app with `bootstrapApplication(AppComponent, { providers: [...] })`. `NgModule` still exists for legacy code but is no longer needed for new apps.

### Reactivity: RxJS and signals

Angular has two complementary reactive models:

- **Signals** — synchronous, fine-grained reactive values (`signal`, `computed`, `effect`), ideal for component and UI state. See [signals and change detection](signals-and-change-detection.md).
- **RxJS Observables** — asynchronous streams, used by `HttpClient`, the router, and reactive forms. See [RxJS and observables](rxjs-and-observables.md).

The current direction is signals for state and RxJS for genuine event/async streams, with interop helpers (`toSignal`, `toObservable`) between them.

---

## Examples

A minimal standalone component with a signal and the new control flow:

```typescript
import { Component, signal, computed } from '@angular/core';

@Component({
  selector: 'app-counter',
  standalone: true,
  template: `
    <button (click)="increment()">Clicked {{ count() }} times</button>
    @if (count() > 5) {
      <p>That's a lot of clicks — {{ doubled() }} doubled.</p>
    }
  `,
})
export class CounterComponent {
  protected readonly count = signal(0);
  protected readonly doubled = computed(() => this.count() * 2);

  increment(): void {
    this.count.update((n) => n + 1);
  }
}
```

Bootstrapping the application (no `NgModule`):

```typescript
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';

bootstrapApplication(AppComponent, {
  providers: [provideRouter(routes), provideHttpClient()],
});
```

---

## When to use

- Large, long-lived applications where consistency and strong conventions pay off over time.
- Enterprise teams that want first-party, integrated routing, forms, HTTP, and DI rather than assembling a stack.
- Projects that value an official, automated upgrade path (`ng update`) across many contributors.
- Apps with complex forms — Angular's reactive forms system is a genuine differentiator.

## When NOT to use

- Small sites, landing pages, or simple widgets — Angular's framework surface is overkill; a lighter library or [Svelte](../svelte/overview.md)/[Vue](../vue/overview.md) fits better.
- Teams that want maximum flexibility to hand-pick every library — Angular's opinionation works against that.
- Situations where minimal bundle size is the top priority and the app is genuinely simple — a compiler-first framework will ship less.

## References

- Angular Team. [Angular — Official Documentation](https://angular.dev/). angular.dev.
- Angular Team. [What is Angular?](https://angular.dev/overview). angular.dev.
- Angular Team. [Angular Roadmap](https://angular.dev/roadmap). angular.dev.
