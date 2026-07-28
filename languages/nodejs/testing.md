---
type: concept
tags:
  - language
  - nodejs
  - backend
  - testing
  - concept
related:
  - languages/javascript/testing
  - languages/nodejs/architecture
  - languages/nodejs/toolchain
language: "nodejs"
---
# Testing Node.js Services

> Node ships a built-in test runner (`node:test`), and the same layered architecture that keeps logic testable also decides what to unit-test versus integration-test.

---

## What is it?

Testing a Node service spans unit tests for domain logic, integration tests for the pieces that touch I/O (HTTP handlers, repositories against a real or containerized database), and a few end-to-end tests through the running server. Node's **built-in test runner** (`node:test` + `node:assert`) covers this with zero dependencies; **Vitest**/**Jest** are richer alternatives.

---

## Why does it matter?

Server bugs are expensive — they corrupt data or take down endpoints. A layered architecture (domain isolated behind ports) lets you unit-test business rules fast, without spinning up a database or server, and integration-test the boundaries deliberately. The built-in runner removes the friction of adding a test framework.

---

## How it works

### The built-in runner

```javascript
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { UserService } from "../src/domain/user-service.js";

describe("UserService.promote", () => {
  test("promotes an existing user", async () => {
    const fakeRepo = {
      findById: async () => ({ id: "1", role: "user" }),
      save: async () => {},
    };
    const service = new UserService(fakeRepo);
    const user = await service.promote("1");
    assert.equal(user.role, "admin");
  });

  test("throws when the user is missing", async () => {
    const service = new UserService({ findById: async () => null });
    await assert.rejects(() => service.promote("x"), /not found/);
  });
});
```

Run with `node --test` (add `--watch` for TDD).

### Unit-testing the domain

Because the domain depends on **interfaces**, inject fakes/stubs — no DB needed. This is where most tests should live (fast, deterministic).

### Integration-testing boundaries

Test repositories against a **real database** — ideally a disposable one via Testcontainers or a Docker service in CI — not a mock, so you catch SQL and mapping errors.

```javascript
// Repository test against a throwaway Postgres, seeded in `before`, cleaned in `after`
```

### Testing HTTP handlers

Send requests to the app without binding a port (frameworks expose the handler) or use a library like `supertest`.

```javascript
// const res = await request(app).get("/health"); assert.equal(res.status, 200);
```

### Intercepting external HTTP

For code that calls other services, intercept at the network layer (e.g., **MSW** / **nock**) rather than mocking your own client.

---

## Examples

```javascript
// Setup/teardown around a resource
import { test, before, after } from "node:test";
let db;
before(async () => { db = await startTestDb(); });
after(async () => { await db.stop(); });

test("saves and reads back a user", async () => {
  const repo = new PgUserRepository(db.pool);
  await repo.save({ id: "1", name: "Ada", role: "user" });
  const found = await repo.findById("1");
  assert.equal(found.name, "Ada");
});
```

---

## When to use

- Use `node:test` for zero-dependency testing; Vitest/Jest when you want richer matchers/mocking.
- Put the bulk of tests at the **unit** level on domain logic, using injected fakes.
- Write **integration** tests for repositories and handlers against real (disposable) dependencies.
- Intercept outbound HTTP at the network layer; run integration DB tests in CI with a containerized database.

## When NOT to use

- Do not mock the database in a repository test — you'd be testing the mock, not the SQL; use a real one.
- Do not push most coverage to slow end-to-end tests — keep them few and reserved for critical flows.
- Do not test private internals — test observable behavior so refactors don't break tests.
- Do not share mutable state between tests — set up and tear down per test/suite.

---

## References

- [Node.js — Test runner](https://nodejs.org/api/test.html)
- [Node.js — Assert](https://nodejs.org/api/assert.html)
- [Vitest — Guide](https://vitest.dev/guide/)
- [Node.js — Testing (Learn)](https://nodejs.org/en/learn/test-runner/introduction)
