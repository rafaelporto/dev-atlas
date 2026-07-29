---
type: concept
tags:
  - language
  - angular
  - typescript
  - testing
related:
  - languages/angular/components-and-templates
  - languages/angular/dependency-injection
  - languages/react/testing
language: "angular"
---

# Testing

> How Angular applications are tested — `TestBed` and component harnesses for units, and end-to-end tools for full flows.

---

## What is it?

Angular ships a first-party testing utility, **`TestBed`**, that constructs a miniature Angular environment so you can instantiate components and services with real dependency injection. Around it sit a test runner (historically Karma + Jasmine; increasingly **Jest** or the modern **Vitest**-based runner), the `ComponentFixture` API for interacting with rendered components, and end-to-end tools like **Playwright** or **Cypress** for full-browser flows.

---

## Why does it matter?

Because Angular leans on DI and change detection, testing benefits from framework-aware tooling: `TestBed` lets you swap real services for fakes through the same DI you use in production, and `ComponentFixture` drives change detection so assertions see the updated DOM. Testing behavior the way a user experiences it — rendered output and interactions, not implementation details — produces tests that survive refactors.

---

## How it works

### The testing pyramid

```
        ▲  E2E (Playwright/Cypress)  — few, full user journeys in a real browser
        │  Integration (TestBed)     — components + their template + real DI
        ▼  Unit (plain functions)    — many, fast, pure logic and services
```

### Unit-testing a service

Pure services often need no `TestBed` at all — construct them directly, or use `TestBed` to resolve dependencies:

```typescript
import { TestBed } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('UserApi', () => {
  it('fetches a user', () => {
    TestBed.configureTestingModule({
      providers: [UserApi, provideHttpClient(), provideHttpClientTesting()],
    });
    const api = TestBed.inject(UserApi);
    const http = TestBed.inject(HttpTestingController);

    let result: User | undefined;
    api.getUser('1').subscribe((u) => (result = u));

    http.expectOne('/api/users/1').flush({ id: '1', name: 'Ada' });
    expect(result?.name).toBe('Ada');
  });
});
```

### Testing a component

`TestBed` renders the component; the fixture drives change detection and exposes the DOM:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CounterComponent } from './counter.component';

describe('CounterComponent', () => {
  let fixture: ComponentFixture<CounterComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [CounterComponent] });
    fixture = TestBed.createComponent(CounterComponent);
    fixture.detectChanges(); // initial render
  });

  it('increments on click', () => {
    const button = fixture.nativeElement.querySelector('button');
    button.click();
    fixture.detectChanges();
    expect(button.textContent).toContain('1');
  });
});
```

For accessible, user-centric queries, `@testing-library/angular` layers a React-Testing-Library-style API on top of `TestBed`.

### End-to-end

Playwright drives a real browser against the running app — the highest-confidence test, reserved for critical journeys:

```typescript
import { test, expect } from '@playwright/test';

test('user can sign in', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Name').fill('Ada');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText('Welcome, Ada')).toBeVisible();
});
```

---

## Examples

Providing a fake dependency through DI — the pattern that makes Angular testable:

```typescript
class FakeAuth { isLoggedIn() { return true; } }

TestBed.configureTestingModule({
  imports: [DashboardComponent],
  providers: [{ provide: AuthService, useClass: FakeAuth }], // swap the real one
});
```

---

## When to use

- Unit tests for services and pure logic — many, fast, no `TestBed` when possible.
- `TestBed` integration tests for components with meaningful template logic and DI.
- A small number of Playwright/Cypress E2E tests for critical, end-to-end user journeys.

## When NOT to use

- Don't over-use E2E for logic that a fast unit test covers — E2E is slow and flakier.
- Don't assert on internal implementation details (private fields, exact call counts) — test observable behavior.
- Don't forget `fixture.detectChanges()` — without it the DOM won't reflect state changes and assertions mislead.

## References

- Angular Team. [Testing](https://angular.dev/guide/testing). angular.dev.
- Angular Team. [Testing services and components](https://angular.dev/guide/testing/components-basics). angular.dev.
- Testing Library. [Angular Testing Library](https://testing-library.com/docs/angular-testing-library/intro/). testing-library.com.
