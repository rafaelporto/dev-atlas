---
type: concept
tags:
  - language
  - vue
  - typescript
  - testing
related:
  - languages/vue/template-syntax-and-components
  - languages/vue/composables
  - languages/react/testing
language: "vue"
---

# Testing

> Testing Vue applications — component tests with Vitest and Vue Test Utils, and end-to-end flows with Playwright or Cypress.

---

## What is it?

Vue's recommended test stack pairs **Vitest** (a fast, Vite-native test runner) with **Vue Test Utils** (the official component-mounting library) or **`@testing-library/vue`** (a user-centric wrapper). Pure logic and composables are tested as plain functions; full user journeys are covered with **Playwright** or **Cypress** in a real browser.

---

## Why does it matter?

Because Vue projects are built on Vite, Vitest shares the same config and transforms — SFCs, TypeScript, and aliases just work, with fast startup and watch mode. Testing components the way a user interacts with them (rendered output, clicks, typed input) rather than internal state produces resilient tests. Composables, being plain functions, are especially easy to unit-test in isolation.

---

## How it works

### The testing pyramid

```
        ▲  E2E (Playwright/Cypress)  — few, real-browser user journeys
        │  Component (Test Utils)    — mount a component, interact, assert DOM
        ▼  Unit (Vitest)            — many, fast; composables and pure logic
```

### Unit-testing a composable

Composables are just functions returning refs — test them directly:

```typescript
import { describe, it, expect } from 'vitest';
import { useCounter } from '@/composables/useCounter';

describe('useCounter', () => {
  it('increments', () => {
    const { count, inc } = useCounter();
    expect(count.value).toBe(0);
    inc();
    expect(count.value).toBe(1);
  });
});
```

Composables that use lifecycle hooks may need to be run inside a mounted component (via `@vue/test-utils`' `withSetup` pattern).

### Component test with Vue Test Utils

```typescript
import { mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';
import Counter from '@/components/Counter.vue';

describe('Counter', () => {
  it('increments on click', async () => {
    const wrapper = mount(Counter);
    await wrapper.find('button').trigger('click'); // await for reactivity to flush
    expect(wrapper.text()).toContain('1');
  });

  it('emits select with the name', async () => {
    const wrapper = mount(Counter, { props: { name: 'Ada' } });
    await wrapper.find('li').trigger('click');
    expect(wrapper.emitted('select')?.[0]).toEqual(['Ada']);
  });
});
```

Two essentials: `await` the interaction (Vue updates the DOM asynchronously), and prefer asserting rendered text/emitted events over internal component state.

### Testing Library flavor (user-centric queries)

```typescript
import { render, screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import Counter from '@/components/Counter.vue';

it('increments', async () => {
  render(Counter);
  await userEvent.click(screen.getByRole('button'));
  expect(screen.getByText(/1/)).toBeTruthy();
});
```

### End-to-end

Playwright drives a real browser against the built app for critical flows:

```typescript
import { test, expect } from '@playwright/test';

test('adds an item to the cart', async ({ page }) => {
  await page.goto('/products');
  await page.getByRole('button', { name: 'Add to cart' }).first().click();
  await expect(page.getByText('1 item')).toBeVisible();
});
```

---

## Examples

Providing a stubbed store or router when mounting a component that depends on them:

```typescript
import { createTestingPinia } from '@pinia/testing';
import { mount } from '@vue/test-utils';

const wrapper = mount(Cart, {
  global: { plugins: [createTestingPinia({ initialState: { cart: { items: [] } } })] },
});
```

---

## When to use

- Vitest for fast unit tests of composables and pure logic — the bulk of tests.
- Vue Test Utils / Testing Library for component behavior (rendering, interaction, emitted events).
- A small number of Playwright/Cypress E2E tests for critical end-to-end journeys.

## When NOT to use

- Don't E2E-test logic a fast unit test covers — E2E is slow and flakier.
- Don't assert on internal component state or private methods — test observable behavior.
- Don't forget to `await` interactions in component tests — the DOM updates asynchronously and assertions will race.

## References

- Vue Team. [Testing](https://vuejs.org/guide/scaling-up/testing.html). vuejs.org.
- Vue Team. [Vue Test Utils](https://test-utils.vuejs.org/guide/). test-utils.vuejs.org.
- Vitest Team. [Vitest — Getting Started](https://vitest.dev/guide/). vitest.dev.
