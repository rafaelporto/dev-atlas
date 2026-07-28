---
type: concept
tags:
  - language
  - nodejs
  - backend
  - architecture
related:
  - languages/nodejs/data-access
  - languages/nodejs/http-and-web-servers
  - languages/nodejs/configuration-and-environment
language: "nodejs"
---
# Node.js Backend Architecture

> Structure a Node service in layers — transport, application/domain, and infrastructure — so business logic stays independent of the framework and the database.

---

## What is it?

Backend architecture is how you organize a service's code so responsibilities are separated and dependencies point inward. The common approach layers the app into **transport** (HTTP/routing), **application/domain** (business logic), and **infrastructure** (database, external APIs), with the domain at the center — a pragmatic take on layered and hexagonal (ports-and-adapters) architecture.

---

## Why does it matter?

Node's frameworks make it easy to scatter business logic across route handlers, coupling it to Express/Fastify and the database. That code is hard to test and change. Isolating the domain behind interfaces lets you unit-test logic without a server or DB, swap infrastructure, and keep the codebase understandable as it grows.

---

## How it works

### Layers and the dependency rule

```
        ┌─────────────────────────────────────┐
        │  Transport (routes/controllers)      │  HTTP, validation, (de)serialization
        ├─────────────────────────────────────┤
        │  Application / Domain (services)     │  business rules — no framework, no SQL
        ├─────────────────────────────────────┤
        │  Infrastructure (repositories, APIs) │  DB drivers, HTTP clients, queues
        └─────────────────────────────────────┘
   Dependencies point INWARD: transport → domain ← infrastructure
```

The domain defines **interfaces** (ports); infrastructure provides **implementations** (adapters). The domain never imports `pg`, `express`, or a specific client.

### Dependency inversion

```javascript
// domain/ports.js — what the domain needs, not how it's done
// interface UserRepository { findById(id): Promise<User|null>; save(u): Promise<void> }

// domain/user-service.js — pure logic, depends on the port
export class UserService {
  constructor(users /* : UserRepository */) { this.users = users; }
  async promote(id) {
    const user = await this.users.findById(id);
    if (!user) throw new AppError("not found", { status: 404 });
    user.role = "admin";
    await this.users.save(user);
    return user;
  }
}

// infrastructure/pg-user-repository.js — the adapter
export class PgUserRepository {
  constructor(pool) { this.pool = pool; }
  async findById(id) { /* SQL via pool */ }
  async save(user) { /* SQL via pool */ }
}
```

### Composition root

Wire concrete implementations to abstractions in one place at startup — the only file that knows every dependency.

```javascript
// index.js
const pool = new Pool({ connectionString: config.databaseUrl });
const users = new PgUserRepository(pool);
const userService = new UserService(users);
registerRoutes(app, { userService }); // inject into transport
```

### Folder structure

```
src/
├── index.ts            # composition root + bootstrap
├── config.ts
├── transport/          # routes, controllers, request validation
├── domain/             # entities, services, port interfaces (framework-free)
└── infrastructure/     # repositories, external clients, adapters
```

For larger systems, organize by **feature/module** (each with its own transport/domain/infra) rather than by technical layer alone.

---

## Examples

```javascript
// Thin controller: parse/validate, delegate to the service, map the result
router.post("/users/:id/promote", async (req, res, next) => {
  try {
    const user = await userService.promote(req.params.id); // no business logic here
    res.json(user);
  } catch (err) { next(err); }
});
```

---

## When to use

- Layer any non-trivial service; keep business logic framework- and DB-agnostic behind interfaces.
- Use dependency injection and a single composition root so units are testable in isolation.
- Organize by feature/module once the app grows beyond a handful of endpoints.
- Keep controllers thin — validate, delegate, map responses.

## When NOT to use

- Do not over-engineer a tiny script or single-endpoint tool with full hexagonal layering.
- Do not put business logic in route handlers or SQL in the domain layer.
- Do not let the domain import framework or driver packages — depend on ports.
- Do not create abstractions with a single implementation and no foreseeable second one, purely "for flexibility."

---

## References

- [Node.js — Learn (guides)](https://nodejs.org/en/learn)
- [The Twelve-Factor App](https://12factor.net/)
- [Express — Guide: Routing & middleware](https://expressjs.com/en/guide/routing.html)
- [Fastify — Guides: Getting Started](https://fastify.dev/docs/latest/Guides/Getting-Started/)
