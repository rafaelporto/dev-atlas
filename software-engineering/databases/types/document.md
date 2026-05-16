# Document Databases

> Stores self-contained documents (usually JSON or BSON) instead of rows in tables. Schema is flexible; the document is the unit of read, write, and consistency.

---

## What is it?

A document database stores data as **documents**: self-contained records — usually JSON, BSON, or XML — that group together everything you would normally retrieve as a single unit. There are no foreign-key joins between documents; nested data lives inside its parent.

Documents are organized into **collections** (the rough equivalent of tables), but unlike tables, a collection does not enforce a uniform schema. Each document can have different fields, and fields can be deeply nested arrays and objects. The application — not the database — is responsible for the shape of the data.

The category was popularized in the late 2000s by MongoDB and CouchDB, alongside the broader NoSQL movement. Today, the line between "document" and "relational" is blurred: PostgreSQL's `JSONB`, SQL Server's JSON columns, and MySQL's JSON type all let relational engines store documents natively.

## Why does it matter?

Document databases solve three problems that relational databases handle awkwardly:

- **Schema evolution without migrations** — adding a field to one document does not require altering a table. Different documents in the same collection can have different fields, which is valuable when the domain is still in flux.
- **Aggregate-shaped data fits naturally** — an order with its line items, billing address, and shipping details is *one* document. No joins, no impedance mismatch, no ORM gymnastics.
- **Read patterns that fetch the whole thing** — when the application almost always retrieves an entity along with its children, embedding them in one document is faster than joining four tables.

This category is at its best when **the unit of consistency and the unit of access are the same aggregate**. When they are not, document databases push complexity into application code.

## How it works

A document store is built around three ideas:

```
┌─────────────────────────────────────────────────────────┐
│  Collection: "orders"                                    │
│                                                          │
│  ┌──────────────────────┐  ┌──────────────────────┐    │
│  │ { _id: 1,            │  │ { _id: 2,            │    │
│  │   customer: {        │  │   customer: {        │    │
│  │     name: "Alice"    │  │     name: "Bob",     │    │
│  │   },                 │  │     vip: true        │    │
│  │   items: [           │  │   },                 │    │
│  │     { sku: "A", n:1},│  │   items: [],         │    │
│  │     { sku: "B", n:2} │  │   note: "express"    │    │
│  │   ]                  │  │ }                    │    │
│  │ }                    │  │  ← different shape!  │    │
│  └──────────────────────┘  └──────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

- **Documents are the atomic unit**: a single document write is atomic; multi-document transactions exist (MongoDB 4.0+) but are an opt-in, more expensive operation.
- **Indexes on fields and paths**: secondary indexes can be created on any field, including nested ones (`customer.vip`), but the engine does not know what fields exist until you tell it.
- **Query languages vary**: MongoDB's MQL uses JSON-shaped operators (`$gt`, `$in`, `$elemMatch`); CouchDB uses MapReduce-style views; PostgreSQL's `JSONB` is queried with SQL plus JSON operators.

Most document databases scale horizontally by **sharding**: documents are partitioned across nodes by a shard key derived from a field in the document.

## Examples

A document and a query against it. Note that the JSON literal *is* the document — there is no schema to declare first:

```javascript
// Insert (MongoDB)
db.orders.insertOne({
  customer: { name: "Alice", vip: true },
  items:    [{ sku: "A-1", qty: 1 }, { sku: "B-2", qty: 2 }],
  total:    4200,
  placedAt: ISODate("2026-05-15T10:00:00Z")
});

// Find all VIP orders placed in the last 7 days, with at least 2 items
db.orders.find({
  "customer.vip": true,
  placedAt:       { $gte: ISODate("2026-05-08T00:00:00Z") },
  items:          { $size: { $gte: 2 } }
});
```

The same document, stored relationally with `JSONB` in PostgreSQL — querying it with SQL:

```sql
CREATE TABLE orders (
  id        BIGSERIAL PRIMARY KEY,
  data      JSONB     NOT NULL,
  placed_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX orders_vip_idx ON orders ((data -> 'customer' ->> 'vip'));

SELECT data
FROM   orders
WHERE  (data -> 'customer' ->> 'vip')::boolean = true
  AND  placed_at >= NOW() - INTERVAL '7 days';
```

## When to use

- The domain is **aggregate-shaped**: each entity is mostly self-contained and is almost always read/written as a whole (orders + line items, blog posts + comments, product catalog entries).
- The schema is **evolving rapidly** and migrations are expensive or disruptive.
- You need to store **heterogeneous records** in the same collection (e.g., events of many different shapes).
- You can shard cleanly by some field of the document (tenant ID, user ID, region).
- Application code is already JSON-shaped; mapping to and from documents is essentially free.

## When NOT to use

- **Highly relational data with many references**: a graph of users, companies, projects, and roles cross-referencing each other will be slower and more error-prone than a [relational](relational.md) model.
- **Multi-document transactions are routine**: they exist in modern document stores, but they are slower and operationally heavier than relational transactions.
- **Strong referential integrity is required**: nothing stops `orderId` in one document from pointing at a non-existent order. The application has to enforce this.
- **Ad-hoc analytical queries** over the whole dataset: scanning millions of documents and projecting a few fields is what [columnar OLAP engines](olap-columnar.md) are built for.
- **You only need a flexible column on a few rows**: a relational engine with a JSON column is often a better answer than a separate document store.

## References

- [*Designing Data-Intensive Applications*, Martin Kleppmann](https://dataintensive.net/) — Chapter 2 on document data models
- [MongoDB Manual](https://www.mongodb.com/docs/manual/)
- [PostgreSQL JSON Functions and Operators](https://www.postgresql.org/docs/current/functions-json.html)
- [Martin Fowler — *NoSQL Distilled*](https://martinfowler.com/books/nosql.html)
