---
type: concept
tags:
  - language
  - svelte
  - typescript
  - testing
related:
  - languages/svelte/components-and-templates
  - languages/svelte/reactivity-and-runes
  - languages/vue/testing
language: "svelte"
---

# Testing

> Testing Svelte and SvelteKit apps — unit and component tests with Vitest and Testing Library, and end-to-end flows with Playwright.

---

## What is it?

Svelte's recommended test stack pairs **Vitest** (the Vite-native test runner) with **`@testing-library/svelte`** for component tests, and **Playwright** for end-to-end browser tests. Because Svelte projects are built on Vite, Vitest shares the same configuration and compiles `.svelte` files out of the box. The official `sv create` scaffold can set all of this up for you.

---

## Why does it matter?

Testing components the way a user interacts with them — rendering, clicking, typing, asserting on visible output — produces tests that survive refactors, and Testing Library encourages exactly that. Pure logic (including rune-based `.svelte.ts` modules) is fast to unit-test in isolation. Reserving slow, high-value Playwright tests for critical journeys keeps the suite fast and trustworthy.

---

## How it works

### The testing pyramid

```
        ▲  E2E (Playwright)        — few, real-browser user journeys
        │  Component (Testing Lib) — render a component, interact, assert DOM
        ▼  Unit (Vitest)          — many, fast; pure logic and .svelte.ts modules
```

### Unit tests

Plain functions and rune-based modules test directly with Vitest. Rune state used *outside* a component runs inside `$effect.root` or is tested through the module's public API:

```typescript
import { describe, it, expect } from 'vitest';
import { createCounter } from '@/lib/counter.svelte';

describe('counter', () => {
  it('increments', () => {
    const c = createCounter();
    expect(c.count).toBe(0);
    c.inc();
    expect(c.count).toBe(1);
  });
});
```

### Component tests with Testing Library

```typescript
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import Counter from '@/lib/Counter.svelte';

test('increments on click', async () => {
  render(Counter, { props: { start: 0 } });
  const button = screen.getByRole('button');
  await userEvent.click(button);
  expect(button).toHaveTextContent('1');
});
```

Vitest runs component tests in a browser-like environment (jsdom) or, for higher fidelity, in a real browser via Vitest's browser mode.

### End-to-end with Playwright

Playwright drives the built app in a real browser — the highest-confidence test, for critical flows:

```typescript
import { expect, test } from '@playwright/test';

test('user can sign up', async ({ page }) => {
  await page.goto('/signup');
  await page.getByLabel('Name').fill('Ada');
  await page.getByRole('button', { name: 'Sign up' }).click();
  await expect(page).toHaveURL('/welcome');
});
```

E2E tests are also the right place to verify SvelteKit form actions and progressive enhancement end to end.

---

## Examples

Configuring Vitest with the Svelte plugin (what the scaffold generates):

```typescript
// vite.config.ts
import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
```

---

## When to use

- Vitest for fast unit tests of pure logic and rune-based modules — the bulk of the suite.
- `@testing-library/svelte` for component behavior (rendering, interaction, output).
- Playwright for a small set of critical end-to-end journeys, including form actions.

## When NOT to use

- Don't E2E-test logic a fast unit test covers — E2E is slower and flakier.
- Don't assert on component internals — test what the user sees and does.
- Don't test rune state outside a component without an effect root — reactive derivations need a reactive context to update.

## References

- Svelte Team. [Testing](https://svelte.dev/docs/svelte/testing). svelte.dev.
- Testing Library. [Svelte Testing Library](https://testing-library.com/docs/svelte-testing-library/intro/). testing-library.com.
- Vitest Team. [Vitest — Getting Started](https://vitest.dev/guide/). vitest.dev.
