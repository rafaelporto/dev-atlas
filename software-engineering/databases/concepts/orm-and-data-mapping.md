---
type: concept
tags:
  - database
  - concept
  - orm
  - comparison
related:
  - software-engineering/databases/concepts/n-plus-one-problem
  - software-engineering/databases/types/relational
  - software-engineering/databases/types/object
  - software-engineering/architecture/hexagonal
  - languages/nodejs/orms/overview
  - languages/java/databases-and-orms
  - languages/csharp/databases-and-orms
language: null
---
# ORMs and Data Mapping

> How application code turns rows into objects and back — the spectrum from raw drivers to full ORMs, the Active Record and Data Mapper patterns, Unit of Work and Identity Map, and why every ORM is a leaky abstraction you must be able to see through.

---

## What is it?

An **ORM** (Object-Relational Mapper) is a library that lets you read and write database rows as if they were ordinary objects in your programming language, so you call `user.save()` or `repo.find(id)` instead of writing `INSERT` and `SELECT` statements by hand.

More precisely, it automates three jobs that every data-access layer has to do somewhere:

1. **Mapping** — converting a row (columns, SQL types) into an in-memory value (fields, language types), and back.
2. **Query generation** — producing SQL from a higher-level API (method calls, criteria objects, a schema-aware DSL).
3. **State tracking** — knowing which objects are new, changed, or deleted, and writing those changes back in the right order, usually inside a transaction.

Tools that do only some of these jobs are not ORMs. A **driver** does none of them (you write SQL, you get rows). A **query builder** does query generation, and often typed mapping, but no state tracking. A **full ORM** does all three.

---

## Why does it matter?

Most business software keeps its state in a relational database but expresses its logic in an object-oriented or functional language. The two models do not line up — this is the **object-relational impedance mismatch**:

| Object world | Relational world |
|---|---|
| Object graphs with references | Flat tables joined by foreign keys |
| Identity = reference (`a === b`) | Identity = primary key |
| Inheritance, polymorphism | No inheritance (must be emulated) |
| Collections inside objects | A separate table plus a join |
| Navigate one object at a time | Operate on sets, in one statement |

Every application pays to bridge this gap. An ORM pays it once, in a library, with conventions. Hand-written SQL pays it per query, with full control. Choosing badly shows up in two classic ways:

- **Too much abstraction** — the ORM issues hundreds of queries for one page ([N+1](n-plus-one-problem.md)), loads whole tables into memory, or cannot express the query you need, so the team fights the tool.
- **Too little abstraction** — hand-rolled mapping duplicated across the codebase, SQL built by string concatenation (injection risk), and no consistent transaction or migration story.

Ted Neward called ORM "the Vietnam of computer science": easy early wins followed by a long slog of edge cases. Martin Fowler's reply ("OrmHate") is the balanced view this wiki adopts: the mismatch is real and hard, ORMs solve the boring 80% well, and the mistake is pretending the database is not there.

---

## How it works

### The abstraction spectrum

```
  more control                                                more convenience
  ◄──────────────────────────────────────────────────────────────────────────►
  Driver            Typed SQL          Query builder        Data Mapper ORM       Active Record ORM
  you write SQL     SQL files, types   SQL as code,         entities + session    entities that
  get raw rows      generated from     typed results,       (Unit of Work),       save themselves
                    the schema         no state tracking    change tracking
```

| | Driver | Typed SQL | Query builder | ORM |
|---|---|---|---|---|
| Who writes the SQL | You | You | The builder, 1:1 with your calls | The ORM |
| Result typing | Manual | Generated | Inferred from schema types | Inferred from the model |
| Relations | Manual joins | Manual joins | Manual joins / JSON helpers | Declared once, loaded on demand |
| Change tracking | None | None | None | Yes |
| Predictability of SQL | Total | Total | High | Medium to low |
| Boilerplate | High | Medium | Medium | Low |
| Lock-in | None | Low | Low | High (model, migrations, API) |

The further right you go, the less SQL you write and the less you *see*. Every step right must be repaid by being able to read the SQL the tool generates.

### Active Record vs Data Mapper

The two main ORM designs, both named in Martin Fowler's *Patterns of Enterprise Application Architecture*.

**Active Record** — the object *is* the row and knows how to persist itself.

```
class User extends ActiveRecord
    fields: id, name, active

user = User.find(42)          -- SELECT ... WHERE id = 42
user.name = "Ada"
user.save()                   -- UPDATE users SET name = 'Ada' WHERE id = 42
```

**Data Mapper** — the object is plain; a separate mapper (repository, entity manager) moves it to and from the database.

```
class User                    -- no persistence code, no base class
    fields: id, name, active

user = userRepository.findById(42)
user.rename("Ada")            -- pure domain logic
userRepository.save(user)     -- the mapper decides what SQL to run
```

| | Active Record | Data Mapper |
|---|---|---|
| Domain object knows about the DB | Yes | No |
| Simplicity for CRUD | Excellent | More ceremony |
| Testing domain logic without a DB | Hard | Easy |
| Rich domain model / DDD | Poor fit | Good fit |
| Coupling of schema to class | Tight (one class per table) | Loose (mapping can differ) |
| Typical examples | Rails ActiveRecord, Laravel Eloquent, TypeORM (AR mode), Sequelize | Hibernate/JPA, EF Core, Doctrine, MikroORM, TypeORM (DM mode) |

Active Record wins when the domain is a thin layer over tables. Data Mapper wins when business rules are rich and must stay independent of persistence — the usual pairing with [hexagonal architecture](../../architecture/hexagonal.md) and domain-driven design.

Schema-first clients such as Prisma fit neither pattern cleanly: they return plain data objects (no `save()`), have no change tracking, and behave like a very typed query API over a generated model.

### Unit of Work and Identity Map

Full Data Mapper ORMs add two cooperating patterns:

- **Identity Map** — within one session, each database row is loaded into at most one object. Asking twice for user 42 returns the same instance, so two parts of the code cannot hold conflicting copies.
- **Unit of Work** — the session records every object you create, modify, or delete. On `flush`/`commit` it computes the minimal set of `INSERT`/`UPDATE`/`DELETE` statements, orders them to respect foreign keys, and runs them in one transaction.

```
session = orm.openSession()          -- new Unit of Work + Identity Map

order = session.find(Order, 7)       -- SELECT (cached in the identity map)
order.addLine(product, qty: 2)       -- tracked: new OrderLine
order.customer.points += 10          -- tracked: Customer changed

session.flush()
  -- BEGIN
  -- INSERT INTO order_lines ...
  -- UPDATE customers SET points = ... WHERE id = ...
  -- COMMIT
```

Benefits: fewer round trips (batched writes), consistent in-memory state, transaction boundaries in one place. Costs: memory for every tracked entity, surprising write timing (nothing hits the DB until flush), and a session whose lifetime must be scoped carefully — one per request, never shared across requests or kept alive in a long-running loop.

### Lazy and eager loading

Relations can be loaded **lazily** (on first access, with an extra query) or **eagerly** (in the original query, via a join or a second batched query). Lazy loading is convenient and is the root cause of the [N+1 problem](n-plus-one-problem.md); eager loading avoids N+1 but can over-fetch. A good ORM lets you choose per query, not per model.

### Why every ORM leaks

Joel Spolsky's law of leaky abstractions applies fully: the database's behaviour shows through the ORM, usually at the worst time.

- **Performance** — the number and shape of queries depends on how you navigate objects. Two lines that look the same can produce 1 or 1,001 queries.
- **Transactions and isolation** — the ORM does not change what the database guarantees. Concurrency anomalies, deadlocks, and lock waits come from the DB, not the library.
- **Features beyond the common subset** — window functions, CTEs, upserts, full-text search, JSON operators, `LISTEN/NOTIFY`, partial indexes. ORMs support a portable subset; the rest needs raw SQL.
- **Schema evolution** — migrations generated from model diffs can be wrong (renames read as drop + add) or dangerous (locking a large table).

The practical rule: use the ORM for what it is good at, log the SQL it generates in development, and keep a typed raw-SQL escape hatch for the rest.

---

## Examples

**The same read at four levels of abstraction.** All of them should end up running roughly this SQL:

```sql
SELECT u.id, u.name
FROM users u
WHERE u.active = true
ORDER BY u.name
LIMIT 20;
```

```
-- 1. Driver: SQL string + positional parameters, untyped rows
rows = db.query("SELECT id, name FROM users WHERE active = $1 ORDER BY name LIMIT $2", [true, 20])

-- 2. Query builder: SQL structure as code, typed result
rows = db.selectFrom("users").select(["id", "name"]).where("active", "=", true)
         .orderBy("name").limit(20).execute()

-- 3. Data Mapper ORM: repository returns entities tracked by the session
users = userRepository.find(where: { active: true }, orderBy: { name: ASC }, take: 20)

-- 4. Active Record ORM: the class queries itself
users = User.where(active: true).order(:name).limit(20)
```

**A write where Unit of Work changes the SQL you get.**

```
-- Without Unit of Work: each call is a statement, in the order written
updateCustomerPoints(customerId, +10)   -- UPDATE customers ...
insertOrderLine(orderId, productId, 2)  -- INSERT INTO order_lines ...

-- With Unit of Work: change objects, then flush once
order.addLine(product, 2)
customer.points += 10
session.flush()   -- one transaction, statements ordered by FK dependencies, batched where possible
```

**A short TypeScript illustration** of the difference between a plain data result (schema-first client) and a tracked entity (Data Mapper ORM):

```ts
// Schema-first client: plain object, no tracking — you must say what to update
const user = await prisma.user.findUniqueOrThrow({ where: { id } });
await prisma.user.update({ where: { id }, data: { name: "Ada" } });

// Data Mapper with Unit of Work: mutate the entity, flush writes the diff
const user2 = await em.findOneOrFail(User, id);
user2.name = "Ada";
await em.flush(); // UPDATE users SET name = 'Ada' WHERE id = ?
```

---

## When to use

- **Use an ORM** for CRUD-heavy applications where most queries are "load this aggregate, change it, save it", and the team values consistent conventions over hand-tuned SQL.
- **Use a Data Mapper ORM with Unit of Work** when the domain model is rich (DDD aggregates, invariants across several entities) and must stay testable without a database.
- **Use Active Record** for small apps, admin tools, and prototypes where tables and classes map one to one.
- **Use a query builder or typed SQL** when you want type safety and composability but also want to predict every statement — a strong default for services with non-trivial queries.
- **Mix levels deliberately**: ORM or query builder for the common path, raw SQL for reporting, bulk operations, and database-specific features.

## When NOT to use

- Do not use an ORM to avoid learning SQL — you cannot debug what you cannot read, and the generated SQL is your production workload.
- Do not use an ORM for analytics, reporting, or bulk data processing; set-based SQL is faster and clearer.
- Do not rely on lazy loading in request paths without measuring query counts — it is the most common cause of N+1.
- Do not share an ORM session (Unit of Work, Identity Map) across requests, threads, or long-running jobs — memory grows and data goes stale.
- Do not pick Active Record for a domain that needs rich invariants across aggregates; persistence concerns will leak into every business method.
- Do not trust auto-generated migrations or schema `sync` features in production without reviewing the SQL.

---

## References

- [Martin Fowler — Patterns of Enterprise Application Architecture: Active Record](https://martinfowler.com/eaaCatalog/activeRecord.html)
- [Martin Fowler — Data Mapper](https://martinfowler.com/eaaCatalog/dataMapper.html)
- [Martin Fowler — Unit of Work](https://martinfowler.com/eaaCatalog/unitOfWork.html)
- [Martin Fowler — Identity Map](https://martinfowler.com/eaaCatalog/identityMap.html)
- [Martin Fowler — OrmHate](https://martinfowler.com/bliki/OrmHate.html)
- [Ted Neward — The Vietnam of Computer Science (2006, PDF)](https://www.odbms.org/wp-content/uploads/2013/11/031.01-Neward-The-Vietnam-of-Computer-Science-June-2006.pdf)
- [Joel Spolsky — The Law of Leaky Abstractions](https://www.joelonsoftware.com/2002/11/11/the-law-of-leaky-abstractions/)
