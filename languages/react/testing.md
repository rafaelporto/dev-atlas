---
type: concept
tags:
  - language
  - react
  - typescript
  - frontend
  - testing
related: []
language: "react"
---
# Testing

> Test components the way users use them: with React Testing Library (queries by role, label, text), Vitest or Jest as the runner, and Playwright for true end-to-end coverage.

---

## What is it?

Testing a React app has three meaningful layers:

1. **Unit tests** — pure functions, custom hooks (Vitest or Jest).
2. **Component tests** — rendering a component and asserting against its DOM output ([React Testing Library](https://testing-library.com/react)).
3. **End-to-end tests** — full browser, real network, real navigation ([Playwright](https://playwright.dev), [Cypress](https://www.cypress.io)).

The dominant philosophy: **test behaviour, not implementation**. The user doesn't know about state shape — they know what they see and can interact with.

---

## Why does it matter?

Tests have value only if they catch real bugs and don't break on refactors. Testing implementation details (state names, internal callbacks, render counts) creates tests that fail every time you change code without changing behaviour. Testing Library exists to push you toward stable, user-centred tests.

---

## How it works

### Vitest

The modern default for new React projects. Compatible with most Jest tests, faster, integrates natively with Vite.

```ts
// vitest.config.ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
  },
});
```

```ts
// tests/setup.ts
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => cleanup());
```

### React Testing Library

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test } from "vitest";
import { Counter } from "./Counter";

test("increments when the button is clicked", async () => {
  render(<Counter initial={0} />);
  const button = screen.getByRole("button", { name: /clicked 0 times/i });

  await userEvent.click(button);

  expect(screen.getByRole("button", { name: /clicked 1 times/i })).toBeInTheDocument();
});
```

Principles:

- Query by **accessible role**, **label**, or **text** — the way a user finds elements.
- Use `userEvent` (not `fireEvent`) — it simulates real interaction with focus, typing, and keyboard.
- Assert by what's visible — `toBeInTheDocument`, `toHaveTextContent`, `toBeDisabled`.
- Avoid `data-testid` unless there's no semantic query (no role, no label, no text).

### Query priority

1. `getByRole` — `button`, `link`, `textbox`, `dialog`, etc. Best.
2. `getByLabelText` — for form fields.
3. `getByPlaceholderText`, `getByText` — when the above don't fit.
4. `getByAltText`, `getByTitle`.
5. `getByTestId` — last resort.

Higher in the list = more user-like, more accessibility-friendly.

### Testing custom hooks

```tsx
import { renderHook, act } from "@testing-library/react";
import { useToggle } from "./useToggle";

test("toggles the value", () => {
  const { result } = renderHook(() => useToggle(false));

  expect(result.current[0]).toBe(false);

  act(() => result.current[1]());

  expect(result.current[0]).toBe(true);
});
```

### Mocking the network

Use [Mock Service Worker (MSW)](https://mswjs.io). It intercepts requests at the network layer, so your component never knows it's mocked:

```ts
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

const server = setupServer(
  http.get("/api/users/:id", () => HttpResponse.json({ id: "1", name: "Ana" })),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(()  => server.close());
```

MSW works in tests, dev, and Storybook with the same handlers.

### End-to-end with Playwright

Playwright drives a real browser, supports parallelisation, traces, and visual snapshots.

```ts
import { test, expect } from "@playwright/test";

test("user can sign in", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("user@example.com");
  await page.getByLabel("Password").fill("hunter2");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByRole("heading", { name: /welcome/i })).toBeVisible();
});
```

Use E2E for **golden paths** that span multiple pages and the real backend. They are slower and flakier — keep them few and meaningful.

---

## Examples

### A controlled form test

```tsx
test("submits the form with the typed values", async () => {
  const onSubmit = vi.fn();
  render(<SignupForm onSubmit={onSubmit} />);

  await userEvent.type(screen.getByLabelText(/name/i),  "Ana");
  await userEvent.type(screen.getByLabelText(/email/i), "ana@example.com");
  await userEvent.click(screen.getByRole("button", { name: /sign up/i }));

  expect(onSubmit).toHaveBeenCalledWith({ name: "Ana", email: "ana@example.com" });
});
```

### Async component

```tsx
test("renders the loaded user", async () => {
  render(<UserProfile userId="1" />, { wrapper: QueryProvider });

  expect(screen.getByRole("progressbar")).toBeInTheDocument();
  expect(await screen.findByRole("heading", { name: /ana/i })).toBeInTheDocument();
});
```

---

## When to use

- **Vitest + RTL** — most tests; fast, faithful to user behaviour.
- **Hook tests** — for custom hooks with non-trivial state.
- **MSW** — anywhere a component fetches data.
- **Playwright** — golden paths, signup/checkout/auth flows, anything spanning routes or the real backend.

---

## When NOT to use

- Don't test internal implementation (state field names, callback shapes). Test what the user sees.
- Don't test third-party libraries — trust them; test the integration that's your code.
- Don't write snapshot tests as a substitute for assertions — they're hard to read and easy to ignore when they "just need updating".
- Don't rely on E2E for everything. They are slow, flaky, and expensive to run. Use them for the few flows that matter most.

---

## References

- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro)
- [Vitest](https://vitest.dev)
- [Mock Service Worker](https://mswjs.io)
- [Playwright](https://playwright.dev)
- [Kent C. Dodds — Common mistakes with React Testing Library](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
