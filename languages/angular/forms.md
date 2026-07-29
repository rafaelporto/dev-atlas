---
type: concept
tags:
  - language
  - angular
  - typescript
  - frontend
related:
  - languages/angular/components-and-templates
  - languages/angular/signals-and-change-detection
  - languages/react/forms
language: "angular"
---

# Forms

> Angular's two form systems — reactive forms and template-driven forms — for capturing, validating, and reacting to user input.

---

## What is it?

Angular provides two ways to build forms. **Reactive forms** define the form model explicitly in the component class as `FormControl`/`FormGroup` objects — a code-first, strongly typed approach. **Template-driven forms** build the model implicitly from directives (`ngModel`) in the template — a simpler, HTML-first approach. Both are first-party (`@angular/forms`).

---

## Why does it matter?

Forms are where most real application complexity lives: validation, cross-field rules, dynamic fields, async checks, and error display. Angular's reactive forms are one of the framework's genuine differentiators — a structured, testable, typed model of form state with a rich validation system built in. Choosing the right approach (and knowing the strongly-typed reactive API) saves a lot of hand-rolled state management.

---

## How it works

### Reactive forms (recommended for non-trivial forms)

You build the model in the class and bind it to the template. Angular 14+ made these **strictly typed**:

```typescript
import { Component, inject } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()">
      <input formControlName="name" placeholder="Name" />
      @if (form.controls.name.invalid && form.controls.name.touched) {
        <small>Name is required</small>
      }
      <input formControlName="age" type="number" />
      <button [disabled]="form.invalid">Sign up</button>
    </form>
  `,
})
export class SignupComponent {
  private fb = inject(FormBuilder);

  readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    age: [0, [Validators.min(18)]],
  });

  submit() {
    if (this.form.valid) console.log(this.form.getRawValue());
  }
}
```

`form.value`, `form.valid`, and `form.controls.name.errors` are fully typed. The form model reacts to changes and exposes `valueChanges`/`statusChanges` as Observables for advanced pipelines.

### Template-driven forms (simple cases)

The model is inferred from `ngModel` bindings; less code, but less control and no static typing of the whole form:

```typescript
import { FormsModule } from '@angular/forms';

@Component({
  standalone: true,
  imports: [FormsModule],
  template: `
    <form #f="ngForm" (ngSubmit)="save(f.value)">
      <input name="email" [(ngModel)]="email" required />
      <button [disabled]="f.invalid">Save</button>
    </form>
  `,
})
export class ProfileComponent {
  email = '';
  save(value: unknown) { console.log(value); }
}
```

### Validation

Angular ships built-in validators (`required`, `min`, `max`, `email`, `pattern`, `minLength`) and supports custom sync and async validators:

```typescript
// custom validator: value must not be in a banned list
function notReserved(reserved: string[]): ValidatorFn {
  return (c) => (reserved.includes(c.value) ? { reserved: true } : null);
}

// async validator returns an Observable/Promise of errors-or-null
function uniqueName(api: Api): AsyncValidatorFn {
  return (c) => api.isNameTaken(c.value).pipe(
    map((taken) => (taken ? { taken: true } : null)),
  );
}
```

---

## Examples

A dynamic list of fields with `FormArray`:

```typescript
readonly form = this.fb.group({
  title: ['', Validators.required],
  tags: this.fb.array<string>([]),
});

get tags() { return this.form.controls.tags; }

addTag(value: string) {
  this.tags.push(this.fb.nonNullable.control(value, Validators.required));
}
removeTag(i: number) { this.tags.removeAt(i); }
```

```html
<div formArrayName="tags">
  @for (tag of tags.controls; track $index) {
    <input [formControlName]="$index" />
    <button (click)="removeTag($index)">×</button>
  }
</div>
```

---

## When to use

- **Reactive forms**: non-trivial forms, dynamic fields, complex or cross-field validation, anything you want to unit-test or type strictly. This is the default for real apps.
- **Template-driven forms**: small, static forms (a login box, a single search field) where the extra structure of reactive forms isn't worth it.

## When NOT to use

- Don't mix the two systems in the same form — pick one per form.
- Don't hand-roll form state with signals and manual validation when reactive forms already provide it, unless you have a specific reason.
- Avoid heavy synchronous validators that block typing; prefer async validators with debouncing for expensive checks (e.g. server uniqueness).

## References

- Angular Team. [Forms overview](https://angular.dev/guide/forms). angular.dev.
- Angular Team. [Reactive forms](https://angular.dev/guide/forms/reactive-forms). angular.dev.
- Angular Team. [Form validation](https://angular.dev/guide/forms/form-validation). angular.dev.
