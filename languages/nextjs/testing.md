---
type: concept
tags:
  - language
  - nextjs
  - full-stack
  - testing
  - concept
related:
  - languages/react/testing
  - languages/nextjs/server-and-client-components
  - languages/nextjs/architecture
language: "nextjs"
---
# Testing Next.js

> Unit-test Client Components with a component testing library, test extracted logic directly, and cover full flows — including Server Components and routing — with end-to-end tests.

---

## What is it?

Testing a Next.js app combines the React testing story with Next-specific realities. **Unit/component tests** (Vitest or Jest + React Testing Library) cover Client Components and pure logic. **End-to-end tests** (Playwright or Cypress) drive the running app and are currently the most reliable way to test **Server Components**, routing, Server Actions, and streaming together.

---

## Why does it matter?

Much of a Next.js app runs on the server (async Server Components, Actions, Route Handlers), which unit-test runners don't execute the way the framework does. Knowing what to test at which level — logic in isolation, Client Components with a component library, and server-driven flows end-to-end — avoids brittle tests and gaps in coverage.

---

## How it works

### Unit-test logic, not the framework

The best Next.js code extracts data access and domain logic into `lib/` functions. Test those directly — no framework needed.

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeTotals } from "@/lib/cart";

test("computeTotals applies tax", () => {
  assert.equal(computeTotals([{ price: 100 }], 0.1).total, 110);
});
```

### Component-test Client Components

Client Components behave like normal React — test them with React Testing Library under Vitest/Jest.

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LikeButton } from "@/components/LikeButton";

test("increments likes", async () => {
  render(<LikeButton postId="1" initial={0} />);
  await userEvent.click(screen.getByRole("button"));
  expect(screen.getByRole("button")).toHaveTextContent("1");
});
```

### Test Route Handlers directly

Route Handlers are functions over `Request`/`Response` — call them with a `Request`.

```ts
import { GET } from "@/app/api/health/route";
test("health returns ok", async () => {
  const res = await GET();
  assert.equal((await res.json()).status, "ok");
});
```

### End-to-end for server-rendered flows

Async Server Components, Server Actions, caching, and streaming are best verified through the running app.

```ts
// e2e/todos.spec.ts (Playwright)
import { test, expect } from "@playwright/test";

test("creates a todo via a Server Action", async ({ page }) => {
  await page.goto("/todos");
  await page.getByLabel("title").fill("Buy milk");
  await page.getByRole("button", { name: "Add" }).click();
  await expect(page.getByText("Buy milk")).toBeVisible();
});
```

### Mocking data

For component/unit tests that call APIs, intercept at the network layer with **MSW** rather than mocking `fetch` directly.

---

## Examples

A single feature — a cart with a "checkout" Server Action — tested at each appropriate level: the pure logic in isolation, the Client Component with React Testing Library, and the full server-driven flow end-to-end.

```ts
// lib/cart.test.ts — fast, framework-free unit test of extracted logic
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeTotals } from "@/lib/cart";

test("computeTotals applies tax to the subtotal", () => {
  const result = computeTotals([{ price: 100 }, { price: 50 }], 0.1);
  assert.equal(result.total, 165);
});
```

```tsx
// components/AddToCartButton.test.tsx — Client Component with RTL
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddToCartButton } from "@/components/AddToCartButton";

test("shows the updated item count after a click", async () => {
  render(<AddToCartButton productId="p1" initialCount={0} />);
  await userEvent.click(screen.getByRole("button", { name: "Add to cart" }));
  expect(screen.getByRole("status")).toHaveTextContent("1");
});
```

```ts
// e2e/checkout.spec.ts — Playwright covers the Server Action + routing + render
import { test, expect } from "@playwright/test";

test("completes checkout via a Server Action", async ({ page }) => {
  await page.goto("/cart");
  await page.getByRole("button", { name: "Add to cart" }).click();
  await page.getByRole("button", { name: "Checkout" }).click();
  await expect(page).toHaveURL(/\/order\/\w+/);
  await expect(page.getByText("Order confirmed")).toBeVisible();
});
```

---

## When to use

- Extract logic/data access into `lib/` and **unit-test it directly** — the fast, stable majority of tests.
- **Component-test** Client Components with React Testing Library.
- **Call Route Handlers directly** in tests using `Request`/`Response`.
- Use **Playwright/Cypress** for flows involving Server Components, Server Actions, routing, and streaming.
- Intercept network calls with MSW in component tests.

## When NOT to use

- Do not try to unit-test async Server Components in a plain test runner — they don't run as the framework runs them; cover them end-to-end.
- Do not push most coverage to slow E2E tests — keep them for critical, integrated flows.
- Do not mock the framework's internals (router, cache) — test behavior through public surfaces.
- Do not test implementation details of components — assert on what users see.

---

## References

- [Next.js — Testing](https://nextjs.org/docs/app/building-your-application/testing)
- [Next.js — Testing with Playwright](https://nextjs.org/docs/app/building-your-application/testing/playwright)
- [Next.js — Testing with Vitest](https://nextjs.org/docs/app/building-your-application/testing/vitest)
- [Testing Library — React](https://testing-library.com/docs/react-testing-library/intro/)
