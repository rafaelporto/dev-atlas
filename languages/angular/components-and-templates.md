---
type: concept
tags:
  - language
  - angular
  - typescript
  - frontend
  - component-driven
related:
  - languages/angular/overview
  - languages/angular/signals-and-change-detection
  - languages/angular/forms
  - software-engineering/architecture/frontend/component-driven-architecture
language: "angular"
---

# Components and Templates

> How Angular UIs are built from components and their templates — the `@Component` class, data binding, the new control-flow blocks, directives, and pipes.

---

## What is it?

A **component** is the unit of UI in Angular: a TypeScript class decorated with `@Component`, paired with an HTML **template** that describes what to render. The class holds state and behavior; the template binds to that state and reacts to user events. Components nest to form a tree, which is the whole application.

---

## Why does it matter?

The template syntax is where you spend most of your time in Angular, and it changed significantly in recent versions. The modern **block control flow** (`@if`, `@for`, `@switch`) replaced the older structural directives (`*ngIf`, `*ngFor`), and `input()`/`output()` functions replaced the `@Input()`/`@Output()` decorators. Knowing the current idioms — and recognizing the legacy ones in existing code — is essential to reading and writing Angular effectively.

---

## How it works

### Anatomy of a component

```typescript
import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-user-card',   // how it's used in a template: <app-user-card>
  standalone: true,
  template: `
    <article class="card">
      <h3>{{ name() }}</h3>
      <button (click)="select.emit(name())">Select</button>
    </article>
  `,
  styles: `.card { padding: 1rem; border: 1px solid #ccc; }`,
})
export class UserCardComponent {
  readonly name = input.required<string>(); // parent → child data
  readonly select = output<string>();        // child → parent events
}
```

### Data binding

Angular has four binding forms, distinguished by punctuation:

| Syntax | Direction | Example | Meaning |
|---|---|---|---|
| `{{ expr }}` | class → DOM | `{{ user.name }}` | Interpolate text |
| `[prop]="expr"` | class → DOM | `[disabled]="isBusy()"` | Bind a property |
| `(event)="handler()"` | DOM → class | `(click)="save()"` | Handle an event |
| `[(ngModel)]="x"` | two-way | `[(ngModel)]="query"` | Bind + update |

### Control flow (Angular 17+)

Control flow is now built into the template language as blocks — no imports required:

```html
@if (user(); as u) {
  <p>Welcome, {{ u.name }}</p>
} @else {
  <p>Please sign in</p>
}

@for (item of items(); track item.id) {
  <li>{{ item.label }}</li>
} @empty {
  <li>No items</li>
}

@switch (status()) {
  @case ('loading') { <spinner /> }
  @case ('error')   { <p>Failed</p> }
  @default          { <p>Ready</p> }
}
```

The `track` expression is **required** in `@for` — it gives each item a stable identity so Angular can reuse DOM nodes instead of recreating them (the same idea as keys elsewhere).

### Directives and pipes

- **Attribute directives** change an element's appearance or behavior (`[ngClass]`, `[ngStyle]`, or your own).
- **Pipes** transform a value in the template: `{{ amount | currency:'USD' }}`, `{{ date | date:'short' }}`, `{{ items | async }}`. Pipes are pure by default (recomputed only when inputs change).

---

## Examples

Using the component above with control flow:

```typescript
import { Component, signal } from '@angular/core';
import { UserCardComponent } from './user-card.component';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [UserCardComponent], // template dependency
  template: `
    @for (name of names(); track name) {
      <app-user-card [name]="name" (select)="onSelect($event)" />
    } @empty {
      <p>No users.</p>
    }
    <p>Selected: {{ selected() ?? 'none' }}</p>
  `,
})
export class UserListComponent {
  readonly names = signal(['Ada', 'Grace', 'Linus']);
  readonly selected = signal<string | null>(null);

  onSelect(name: string): void {
    this.selected.set(name);
  }
}
```

---

## When to use

- Always — components and templates are the primary way to build any Angular UI.
- Use `input()`/`output()` and the block control flow for all new code.
- Reach for pipes to format values declaratively instead of precomputing formatted strings in the class.

## When NOT to use

- Don't put heavy logic in templates — expressions should be cheap and side-effect-free; move real work into the class or a service.
- Don't create custom directives when a component or a simple binding would do; directives are for cross-cutting DOM behavior.
- Avoid the legacy `*ngIf`/`*ngFor` in new code — prefer the built-in `@if`/`@for` blocks.

## References

- Angular Team. [Components](https://angular.dev/guide/components). angular.dev.
- Angular Team. [Control flow](https://angular.dev/guide/templates/control-flow). angular.dev.
- Angular Team. [Binding](https://angular.dev/guide/templates/binding). angular.dev.
- Angular Team. [Pipes](https://angular.dev/guide/pipes). angular.dev.
