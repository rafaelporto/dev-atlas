# Node.js — ORMs and Data Access

> Choosing and using ORMs, query builders, and raw SQL in Node.js and TypeScript — a critical look at the mature tools, when each fits, when to skip the ORM entirely, migrations, and the pitfalls that cause production incidents.

---

| Article | Description |
|---|---|
| [Overview](overview.md) | The driver → query builder → ORM spectrum in Node/TS, the 2026 landscape and maturity of each tool, and the default recommendations |
| [Choosing a Data Access Tool](choosing.md) | Decision criteria, decision flow, and a comparison matrix across Prisma, Drizzle, Kysely, TypeORM, MikroORM, and raw SQL |
| [Prisma](prisma.md) | Schema-first ORM — generated client, Prisma Migrate, raw SQL escape hatches, engine history, performance, and lock-in |
| [Drizzle](drizzle.md) | SQL-like TypeScript ORM — schema in code, relational queries, drizzle-kit, edge drivers, and maturity caveats |
| [Kysely](kysely.md) | Type-safe query builder — schema types, codegen, the migrator, and relations via JSON helpers |
| [TypeORM and MikroORM](typeorm-and-mikro-orm.md) | The decorator/entity ORMs — Active Record vs Data Mapper, Unit of Work, NestJS fit, and maintenance status |
| [Legacy and Declining Tools](legacy-and-declining.md) | Sequelize, Knex, Objection, Bookshelf, and Waterline — status, risks of staying, and incremental migration paths |
| [Raw SQL](raw-sql.md) | When to skip the ORM — `pg`, `postgres.js`, typed SQL with codegen, safe parameterization, and the hybrid approach |
| [Migrations](migrations.md) | Diff-based vs imperative migrations, running them in deploy, and expand/contract for zero-downtime schema changes |
| [ORM Pitfalls](pitfalls.md) | N+1, over-fetching, client-per-request, transaction mistakes, read-modify-write races, and mocked databases |
