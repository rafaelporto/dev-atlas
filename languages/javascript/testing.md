---
type: concept
tags:
  - language
  - javascript
  - testing
  - concept
related:
  - languages/javascript/toolchain
  - languages/javascript/best-practices
  - languages/javascript/error-handling
language: "javascript"
---
# Testing

> JavaScript testing spans a fast unit layer up to end-to-end browser tests; the modern default is a Vitest/Jest-style runner plus the built-in `node:test` for zero-dependency needs.

---

## What is it?

Testing is running code that exercises your code and asserts on the results. The JavaScript ecosystem organizes tests into a **pyramid**: many fast **unit** tests (pure functions, modules), fewer **integration** tests (modules working together, real dependencies), and a small number of slow **end-to-end** tests (a real browser driving the whole app).

---

## Why does it matter?

In a dynamically typed language, tests are the primary safety net against regressions — the compiler catches far less than in typed languages. A fast, reliable test suite lets you refactor confidently and encodes the intended behavior as executable documentation.

---

## How it works

### Runners

- **Vitest** — Vite-native, ESM-first, fast, Jest-compatible API. Default for new front-end/TypeScript projects.
- **Jest** — mature, huge ecosystem; common in existing React/Node codebases.
- **`node:test`** — built into Node.js, no dependencies, good for libraries and Node services.

### Anatomy of a test

```javascript
import { describe, it, expect } from "vitest";
import { sum } from "./math.js";

describe("sum", () => {
  it("adds two numbers", () => {
    expect(sum(2, 3)).toBe(5);
  });

  it("handles negatives", () => {
    expect(sum(-1, 1)).toBe(0);
  });
});
```

The same with the built-in runner:

```javascript
import { test } from "node:test";
import assert from "node:assert/strict";
import { sum } from "./math.js";

test("adds two numbers", () => {
  assert.equal(sum(2, 3), 5);
});
```

### Async tests

```javascript
it("loads a user", async () => {
  const user = await loadUser(1);
  expect(user.id).toBe(1);
});

it("rejects on 404", async () => {
  await expect(loadUser(999)).rejects.toThrow("HTTP 404");
});
```

### Test doubles

Isolate the unit under test by replacing dependencies.

```javascript
import { vi } from "vitest";
const fetchUser = vi.fn().mockResolvedValue({ id: 1 });
expect(fetchUser).toHaveBeenCalledWith(1);
```

For network calls, prefer intercepting at the boundary (e.g., **MSW** — Mock Service Worker) over mocking `fetch` directly.

### End-to-end

**Playwright** or **Cypress** drive a real browser to test full user flows.

---

## Examples

```javascript
// Arrange–Act–Assert keeps tests readable
it("applies a discount", () => {
  const cart = new Cart([{ price: 100 }]); // arrange
  cart.applyDiscount(0.1);                  // act
  expect(cart.total).toBe(90);              // assert
});

// Table-driven cases reduce duplication
it.each([
  [0, "zero"],
  [1, "one"],
])("labels %i as %s", (n, label) => {
  expect(labelOf(n)).toBe(label);
});
```

---

## When to use

- Write **unit tests** for pure logic, edge cases, and bug fixes (add a failing test first).
- Write **integration tests** for modules that collaborate and for I/O boundaries (with MSW or a test DB).
- Write a **few end-to-end tests** for critical user journeys only.
- Use `node:test` for libraries/Node services wanting zero test dependencies; Vitest/Jest for richer needs.

## When NOT to use

- Do not write end-to-end tests for logic a unit test could cover — they are slow and flaky by comparison.
- Do not test implementation details (private internals) — test observable behavior so refactors don't break tests.
- Do not mock everything — over-mocking tests the mocks, not the code; prefer real collaborators where cheap.
- Do not chase 100% coverage as a goal in itself — coverage measures execution, not correctness.

---

## References

- [Vitest — Guide](https://vitest.dev/guide/)
- [Jest — Getting Started](https://jestjs.io/docs/getting-started)
- [Node.js — Test runner](https://nodejs.org/api/test.html)
- [Playwright — Docs](https://playwright.dev/docs/intro)
