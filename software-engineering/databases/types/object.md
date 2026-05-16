# Object Databases

> Persists application objects directly, with their identity, references, and class hierarchy preserved. No relational mapping in between. A niche category today, but the historical answer to the object-relational impedance mismatch.

---

## What is it?

An object database (OODBMS — Object-Oriented Database Management System) stores **objects** as understood by an object-oriented language: instances with identity, classes, inheritance, references to other objects, and methods. Persistence is transparent: you call `commit()` and the object graph is on disk; you call `get(id)` and you get the live object back — references and all — with no row-to-object translation in between.

The model rose to prominence in the late 1980s and early 1990s, championed by **ODMG** standards work and products like ObjectStore, GemStone, Versant, and Objectivity/DB. A short-lived second wave in the early 2000s included **db4o**. Today the category is small and largely confined to specialized domains (CAD/CAM, engineering simulations, telecom network management, some financial trading systems).

In practice, modern equivalents that occupy similar niches — without using the OODBMS label — include **Realm** and **ObjectBox** on mobile, and embedded object stores in some functional-language ecosystems.

## Why does it matter?

Object databases were designed to eliminate the **object-relational impedance mismatch**: the friction between an OO domain model (graphs of objects, deep inheritance, references) and a relational schema (flat tables, foreign keys, no inheritance, no references).

When the match holds — the database speaks the same language as the application — object databases offer:

- **No ORM layer** — no Hibernate, no Active Record, no `select_related`. Objects are loaded as objects, references are resolved as references.
- **Identity preserved** — the same object identity in memory is the same identity on disk. Two queries that return "the same customer" return the same Python/Java/Smalltalk object reference.
- **Complex object graphs as a natural unit** — CAD assemblies, engineering simulations, scene graphs: things that are awkward to flatten into tables.

The reasons the category never went mainstream are equally clear:

- **The ecosystem is sparse**: tooling, drivers, monitoring, backup, BI integrations — all weak or missing compared to RDBMS.
- **Cross-language interop is hard**: an object database tightly coupled to Java is a poor citizen in a polyglot stack.
- **The relational model proved more flexible** for unknown future queries.
- **JSON document stores swallowed most of the use cases** with simpler, language-neutral semantics. See [document databases](document.md).

## How it works

The conceptual picture is straightforward — and the very thing relational databases ask you to break apart:

```
   In-memory object graph (your application):

      ┌──────────────┐         ┌──────────────┐
      │ Customer #42 │────────▶│ Address #7   │
      │ name=Alice   │         │ city=Lisbon  │
      │ orders ──┐   │         └──────────────┘
      └──────────┼───┘
                 │
                 ▼
      ┌──────────────┐         ┌──────────────┐
      │ Order #1001  │────────▶│ Product #88  │
      │ total=42.00  │         │ name=Widget  │
      │ items ──┐    │         └──────────────┘
      └─────────┼────┘
                ▼
      ┌──────────────┐
      │ Order #1002  │
      └──────────────┘

   commit()  →  the database stores the graph
   get(42)   →  the database returns the same graph,
                with references resolved
```

Common mechanisms:

- **Implicit persistence** ("persistence by reachability"): when you commit a root object, every object reachable from it is persisted automatically.
- **Object identity (OID)**: every object has a database-assigned identifier independent of any business key.
- **Schema is the class**: the database tracks the class definitions and migrates instances as classes evolve.
- **Query languages vary**: OQL (the ODMG standard), language-native query syntax (`db4o`'s native queries), or simple traversal from a root object.

Modern mobile-targeted object stores like Realm and ObjectBox follow a similar idea — define classes, work with them as native objects — but with stronger guarantees about concurrency, observability of changes, and zero-copy reads.

## Examples

The defining flavour is that the application barely needs to think about persistence. The pseudo-code below illustrates the model rather than any single product:

```
class Customer {
    String name
    List<Order> orders
}

class Order {
    Customer customer
    double   total
}

// Open the database
db = ObjectDB.open("customers.odb")

// Build an object graph
alice = new Customer(name: "Alice")
alice.orders.add(new Order(customer: alice, total: 42.00))
alice.orders.add(new Order(customer: alice, total: 17.50))

// Persist by reachability — one call stores the whole graph
db.commit(alice)

// Retrieve — references resolve automatically
fetched = db.find(Customer, "Alice")
fetched.orders[0].customer == fetched   // true: same identity
```

The contrast with a relational stack is that there is no `CREATE TABLE customer`, no `CREATE TABLE "order"`, no foreign keys, no JOIN, no `customer.orders = orderRepository.findByCustomerId(customer.id)`. The object graph in memory and the object graph in storage are the same shape.

## When to use

- **Domain dominated by complex, deeply nested object graphs** with rich behaviour: CAD/CAM, engineering simulation, scientific computation, scene graphs.
- **Tightly coupled, single-language stack** where cross-language interop is a non-goal.
- **Mobile applications** that want a typed, observable, transactional local store — modern object stores like Realm and ObjectBox are the practical heirs to the category.
- **Legacy systems** where the application predates the relational era (Smalltalk, some long-lived Java systems with GemStone/Versant).

## When NOT to use

- **Almost any new server-side project**: the ecosystem disadvantage is too large.
- **Polyglot stacks**: another service or analytics tool needs to read the data and does not speak your language's object model.
- **Analytical workloads**: there is no columnar story, no BI tool integration, no [OLAP](olap-columnar.md) path.
- **You can model the domain as documents**: a [document database](document.md) gets you 90% of the ergonomics with a vastly larger ecosystem and language-neutral data.
- **You can model the domain as a relational schema and use a good ORM**: in the time since OODBMS were proposed, mature ORMs have made the impedance mismatch a much smaller problem than it used to be.

## References

- [*The Object-Oriented Database System Manifesto* (Atkinson et al., 1989)](https://www.cs.cmu.edu/~clamen/OODBS/Manifesto/htManifesto/Manifesto.html)
- [ODMG 3.0 (ISBN 1-55860-647-5)](https://www.elsevier.com/books/the-object-data-standard-odmg-3-0/cattell/978-1-55860-647-0) — the canonical standard for object databases
- [Realm Documentation](https://www.mongodb.com/docs/realm/) — modern object database for mobile
- [ObjectBox Documentation](https://docs.objectbox.io/)
