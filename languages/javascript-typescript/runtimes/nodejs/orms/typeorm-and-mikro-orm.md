---
type: concept
tags:
  - language
  - nodejs
  - backend
  - orm
  - comparison
related:
  - languages/javascript-typescript/runtimes/nodejs/orms/overview
  - languages/javascript-typescript/runtimes/nodejs/orms/choosing
  - languages/javascript-typescript/runtimes/nodejs/orms/prisma
  - languages/javascript-typescript/runtimes/nodejs/orms/migrations
  - languages/javascript-typescript/runtimes/nodejs/orms/pitfalls
  - software-engineering/databases/concepts/orm-and-data-mapping
  - languages/javascript-typescript/typescript/classes-and-decorators
language: "nodejs"
---
# TypeORM and MikroORM

> TypeORM and MikroORM are the two class-based, "Hibernate-style" ORMs for Node.js: TypeORM is the widely deployed one that went from years of stagnation to a revived 1.0 in 2026, MikroORM is the more rigorous Unit-of-Work design carried mostly by one maintainer.

---

## What is it?

Both libraries let you describe database tables as TypeScript **classes** (or schema objects) and then load, change, and save instances of those classes instead of writing SQL. They are the closest thing Node.js has to Java's Hibernate/JPA or .NET's Entity Framework: entities, relations, repositories, migrations generated from the model, and a query builder for the cases the model does not cover.

They differ in how much the ORM tracks for you:

- **TypeORM** supports two styles — **Active Record** (`user.save()`) and **Data Mapper** (`repository.save(user)`) — and saves exactly what you tell it to save.
- **MikroORM** is strictly **Data Mapper + Unit of Work + Identity Map**: you change objects, then call `em.flush()`, and the ORM computes and runs the minimal set of `INSERT`/`UPDATE`/`DELETE` statements in one transaction.

See [ORM and Data Mapping](../../../../../software-engineering/databases/concepts/orm-and-data-mapping.md) for the underlying patterns.

> Versions, maintenance status, and weekly npm downloads were checked in **October 2026** (downloads: week of 12–18 October 2026). Re-check before choosing.

---

## Why does it matter?

- **TypeORM is everywhere.** About 2.8 million weekly downloads, and `@nestjs/typeorm` alone has about 1.7 million — it is the default ORM of most NestJS tutorials and a large share of existing TypeScript backends. If you join a NestJS codebase, odds are you inherit TypeORM.
- **Its history is a cautionary tale.** TypeORM sat at `0.x` for nine years, and between roughly 2022 and 2024 maintenance slowed so much that issues and PRs piled up unanswered. At the end of 2024 a new team took over; through 2025 it merged 575 PRs (63 the year before) and shipped **1.0 on 19 May 2026**. The revival is real, but the backlog (about 470 open issues and 240 open PRs) and the design debt are not gone.
- **MikroORM is the "do it properly" alternative.** It implements Unit of Work and Identity Map the way Hibernate and Doctrine do, has a small open-issue count (about 23 issues), and ships often. The trade-off is **bus factor**: one person, Martin Adámek, authored the overwhelming majority of commits.
- **Class-based ORMs carry a cost** that schema-first tools (Prisma) and SQL-first tools (Drizzle, Kysely) avoid: decorator metadata, runtime reflection, hydration overhead, and types that describe the *class* rather than the *query result*. Knowing where those costs bite is what this article is for.

---

## How it works

### TypeORM

**Status.** `typeorm` **1.1.2** (8 October 2026); 1.0.0 shipped 19 May 2026, 1.1.0 in July, 1.1.1 in September, plus nightly builds. The `0.3.x` line is on a `legacy` dist-tag (0.3.31, July 2026) with docs at `v0.typeorm.io`; no end-of-life date was published. Governance: a steering committee (Michael Bromley and David Höck, via their company Elevantiq), a technical lead, and about ten maintainers, funded through Open Collective, with a stated plan for a non-profit foundation.

**Model.** Entities are classes with **legacy (experimental) decorators** — `@Entity`, `@Column`, `@PrimaryGeneratedColumn`, `@ManyToOne`, `@OneToMany` — and `reflect-metadata` for column types. A `DataSource` holds the connection and metadata.

| Concept | What it does |
|---|---|
| **Active Record** | Entity extends `BaseEntity`; static `User.findOneBy()`, instance `user.save()`. Couples entity to the database. |
| **Data Mapper** | Plain entity; `dataSource.getRepository(User)` or `EntityManager` does persistence. Testable, the style to prefer. |
| **Find options** | `repo.find({ where, relations, order, take })` — object syntax, typed against entity keys. |
| **QueryBuilder** | `createQueryBuilder("u").leftJoinAndSelect("u.posts", "p").where("p.published = :p", { p: true })` — string aliases and SQL fragments. |
| **Lazy relations** | Declare the property as `Promise<Post[]>`; awaiting it fires a query. Convenient, and an N+1 generator. |
| **Eager relations** | `{ eager: true }` on a relation — always joined on `find*`. Silent over-fetching. |
| **Migrations** | `typeorm migration:generate` diffs entities against the live schema and writes `up`/`down` SQL; `migration:run` applies. |
| **`synchronize`** | Diffs entities and alters the schema **on every boot**. |

**What 1.0 changed.** Node.js 20+; `Connection`/`createConnection` and the global helpers removed in favour of `DataSource`; `TYPEORM_*` env config and `ormconfig` loading removed; string-based `select`/`relations` replaced by object syntax; `mysql2` only, `better-sqlite3` as the SQLite driver, MongoDB 7+; non-nullable relations now join with `INNER JOIN`; invalid `where` values throw instead of being ignored. Security fixes: identifiers (database/schema/table/column names) are escaped and `orderBy` expressions are validated at runtime. A codemod (`@typeorm/codemod`) assists the 0.3 → 1.0 upgrade.

**Type-safety gaps that remain.**

- **Loaded relations are not reflected in the result type.** `user.posts` is typed `Post[]` whether or not you asked for `relations: { posts: true }` — at runtime it is `undefined`.
- **`select` does not narrow the type.** Selecting two columns still returns a full `User`.
- **QueryBuilder is mostly strings.** Aliases, join paths, and `where` fragments are not checked; `getRawMany()` returns `any`.
- **Column types are declared twice** — once as the TypeScript type, once in the decorator — and can drift (`@Column("int") price: string`).

**The `synchronize: true` footgun.** The docs say it plainly: do not use it in production, you can lose data. Renaming a property is seen as *drop column + add column*; the data in the old column is gone. It is on in countless tutorials and starter templates, so it leaks into staging and production. Use `migration:generate` and review the SQL instead (see [Migrations](migrations.md)).

**NestJS.** `@nestjs/typeorm` provides `TypeOrmModule.forRoot()` and `@InjectRepository(User)`; it is the path of least resistance in Nest, which is the main reason TypeORM's download numbers stay high.

### MikroORM

**Status.** `@mikro-orm/core` **7.2.5** (9 October 2026). v7 ("Unchained") shipped 11 March 2026 after about 18 months of work; v6 still gets fixes (`latest-v6` 6.6.17, October 2026). Releases land every few days to weeks. About 540k weekly downloads of `@mikro-orm/core`; `@mikro-orm/nestjs` about 143k.

**Model.** Three patterns working together:

```
  request ──► em.fork() ──► Identity Map (one object per row per context)
                 │
     load / change plain objects (no save calls)
                 │
             em.flush() ──► Unit of Work computes change set
                 │             (dirty checking against loaded snapshot)
                 ▼
     BEGIN; INSERT…; UPDATE…; DELETE…; COMMIT   (ordered by FK dependencies)
```

- **EntityManager (`em`)** — the gateway. `em.find`, `em.findOne`, `em.create`, `em.persist`, `em.remove`, `em.flush`.
- **Identity Map** — loading the same row twice in one context returns the *same object*. Must be **per request**: use `em.fork()` or the `RequestContext` middleware (built on `AsyncLocalStorage`). Using the global `em` throws a validation error by default (`allowGlobalContext` disables it — do so only in tests).
- **Unit of Work** — `flush()` batches all pending changes into one transaction. You rarely write `UPDATE` by hand.
- **Entity definition** — `defineEntity()` with a `p.*` property builder (the v7 docs lead with this; types are inferred with `InferEntity`), or decorators from `@mikro-orm/decorators/legacy` (experimental decorators, optional `reflect-metadata`) or `@mikro-orm/decorators/es` (TC39 decorators). See [Classes and Decorators](../../../typescript/classes-and-decorators.md) for the decorator split.
- **Relations** — `Reference<T>` / `Ref<T>` wrappers and `Collection<T>` make "not loaded" explicit in the type; `populate: ['books']` narrows the returned type via `Loaded<T, 'books'>`. This is the type-safety gap TypeORM still has.
- **Migrations and schema diffing** — the schema generator compares entity metadata (and a stored snapshot) with the database; `mikro-orm migration:create` writes a migration class with the diff, `migration:up` applies it. `schema:update` exists for development; the same data-loss caveats as TypeORM's `synchronize` apply.
- **Databases** — PostgreSQL, MySQL, MariaDB, SQLite/libSQL, SQL Server, Oracle (new in v7), and **MongoDB**.

**What v7 changed.** `@mikro-orm/core` has **zero runtime dependencies** (dropped `reflect-metadata`, `dataloader`, `esprima`, `dotenv`); native ESM only; **Node.js 22.17+ and TypeScript 5.8+** required. **Knex was replaced by Kysely** for execution — `@mikro-orm/knex` became `@mikro-orm/sql` — and `em.getKysely()` returns a typed Kysely instance bound to the current transaction. The QueryBuilder now tracks joined aliases in its type parameters. For runtimes that forbid `new Function`/`eval` (Cloudflare Workers), a CLI `compile` step pre-generates the hydration functions.

**Performance trade-offs.** Unit of Work and Identity Map cost memory and CPU: every managed entity keeps a snapshot for dirty checking, and a long-lived context grows without bound. Batch jobs must `em.clear()` periodically or use `em.stream()`. In exchange, `flush()` batches writes, and the Identity Map avoids re-hydrating the same row. For read-heavy endpoints, drop to the QueryBuilder or Kysely and skip entity hydration.

### Comparison

| | TypeORM | MikroORM |
|---|---|---|
| Latest (Oct 2026) | 1.1.2 (1.0 in May 2026) | 7.2.5 (7.0 in Mar 2026) |
| Weekly downloads | ~2.8M | ~540k (`core`) |
| Open issues / PRs | ~470 / ~240 | ~23 / ~17 |
| Maintainers | Revived team since late 2024, steering committee, ~10 maintainers | One primary maintainer (bus factor 1) plus contributors |
| Persistence model | Active Record **or** Data Mapper; explicit `save()` | Data Mapper + Unit of Work + Identity Map; `flush()` |
| Entity definition | Legacy decorators + `reflect-metadata` | `defineEntity()`, legacy or ES decorators |
| Relation typing | Unloaded relations typed as present | `Ref`/`Collection` + `Loaded<T, …>` |
| Query escape hatch | QueryBuilder (string-heavy) | QueryBuilder (typed aliases) + `em.getKysely()` |
| Migrations | `migration:generate` from entity diff | `migration:create` from entity diff + snapshot |
| Schema auto-sync | `synchronize: true` (footgun) | `schema:update` (dev only) |
| MongoDB | Yes (limited) | Yes |
| Node.js minimum | 20 | 22.17 |
| NestJS integration | `@nestjs/typeorm` (official) | `@mikro-orm/nestjs` |
| Edge runtimes | Not a target | Possible with compiled functions + HTTP/libSQL drivers |

---

## Examples

### TypeORM — Data Mapper with an explicit relation load

```ts
import { DataSource, Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from "typeorm";

@Entity()
export class Author {
  @PrimaryGeneratedColumn() id!: number;
  @Column() name!: string;
  @OneToMany(() => Book, (b) => b.author) books!: Book[]; // typed as always present
}

@Entity()
export class Book {
  @PrimaryGeneratedColumn() id!: number;
  @Column() title!: string;
  @ManyToOne(() => Author, (a) => a.books, { nullable: false }) author!: Author;
}

export const db = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  entities: [Author, Book],
  migrations: ["dist/migrations/*.js"],
  synchronize: false, // never true outside a throwaway local database
});

const authors = db.getRepository(Author);
const a = await authors.findOne({ where: { id: 1 }, relations: { books: true } });
const b = await authors.findOneBy({ id: 1 });
b?.books.length; // compiles, but books is undefined at runtime — the type cannot tell
```

### MikroORM — Unit of Work with a forked context

```ts
import { MikroORM, defineEntity, p, type InferEntity } from "@mikro-orm/postgresql";

export const Author = defineEntity({
  name: "Author",
  properties: {
    id: p.integer().primary(),
    name: p.string(),
    books: () => p.oneToMany(Book).mappedBy("author"),
  },
});
export const Book = defineEntity({
  name: "Book",
  properties: {
    id: p.integer().primary(),
    title: p.string(),
    author: () => p.manyToOne(Author).inversedBy("books"),
  },
});
export type IAuthor = InferEntity<typeof Author>;

const orm = await MikroORM.init({ clientUrl: process.env.DATABASE_URL, entities: [Author, Book] });

// One fork per request (or use RequestContext middleware)
const em = orm.em.fork();
const author = await em.findOneOrFail(Author, 1, { populate: ["books"] });
author.name = "Renamed";                       // tracked, no save() call
em.create(Book, { title: "New", author });     // scheduled insert
await em.flush();                              // one transaction: UPDATE + INSERT
```

### MikroORM — dropping to Kysely inside the same transaction

```ts
await orm.em.transactional(async (em) => {
  // table and column names follow the entity definitions with this option
  const kysely = em.getKysely({ tableNamingStrategy: "entity", convertValues: true });
  await kysely.updateTable("Book").set({ title: "Renamed in bulk" }).where("id", "in", [1, 2, 3]).execute();
  // rolls back together with any ORM changes if this callback throws
});
```

---

## When to use

- **TypeORM**: you are in a NestJS codebase that already uses it — upgrade to 1.x rather than rewrite; the revived project makes staying reasonable.
- **TypeORM**: you need a database the SQL-first tools do not cover well (Oracle, SAP HANA, SQL Server, Spanner, MongoDB alongside SQL) and want one ORM for all.
- **MikroORM**: your domain is rich and write-heavy (aggregates, many related rows changed per request) and you want Unit of Work semantics — change objects, flush once.
- **MikroORM**: you come from Hibernate, Doctrine, or Entity Framework and want the same mental model with better relation typing than TypeORM.
- Either: the team prefers classes and a domain model over SQL-shaped query builders.

## When NOT to use

- **New greenfield TypeScript service with no NestJS constraint** — Prisma, Drizzle, or Kysely give stronger result typing with less runtime machinery (see [Choosing](choosing.md)).
- **Serverless or edge with tight cold-start budgets** — TypeORM's metadata loading is heavy and edge is not a target; MikroORM v7 can run there but needs the compile step and a compatible driver.
- **Teams that will not learn the Identity Map rules** — a shared global `em` in MikroORM, or `synchronize: true` in TypeORM, causes data corruption and data loss in ways that look like random bugs.
- **MikroORM when bus factor is a hard requirement** — the project is healthy, but one person carries it; assess that risk explicitly for a 10-year system.
- **TypeORM when you need the query result typed precisely** — partial selects and relation loading are not reflected in types; wrap it in your own repository layer or use another tool.
- **Analytics and reporting queries** — both ORMs add hydration cost and fight complex SQL; use raw SQL or a query builder (see [Pitfalls](pitfalls.md)).

---

## References

- [TypeORM — Documentation](https://typeorm.io/)
- [TypeORM — v1.0 Release Notes](https://typeorm.io/docs/releases/1.0/release-notes)
- [TypeORM — Upgrading from 0.3 to 1.0](https://typeorm.io/docs/releases/1.0/upgrading-from-0.3)
- [TypeORM blog — TypeORM 1.0 is here (May 2026)](https://typeorm.io/blog/typeorm-1-0)
- [TypeORM blog — The future of TypeORM](https://typeorm.io/blog/future-of-typeorm)
- [TypeORM — GitHub repository](https://github.com/typeorm/typeorm)
- [MikroORM — Documentation](https://mikro-orm.io/docs/)
- [MikroORM — MikroORM 7: Unchained (release post)](https://mikro-orm.io/blog/mikro-orm-7-released)
- [MikroORM — Identity Map and Request Context](https://mikro-orm.io/docs/identity-map)
- [MikroORM — defineEntity](https://mikro-orm.io/docs/define-entity)
- [MikroORM — Using decorators](https://mikro-orm.io/docs/using-decorators)
- [MikroORM — Kysely integration](https://mikro-orm.io/docs/kysely)
- [MikroORM — GitHub repository](https://github.com/mikro-orm/mikro-orm)
- [NestJS — Database (TypeORM integration)](https://docs.nestjs.com/techniques/database)
- [Martin Fowler — Unit of Work (P of EAA)](https://martinfowler.com/eaaCatalog/unitOfWork.html)
