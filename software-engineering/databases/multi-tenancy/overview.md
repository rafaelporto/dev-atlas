---
type: concept
tags:
  - database
  - concept
  - multi-tenancy
  - overview
related:
  - software-engineering/databases/multi-tenancy/postgres-row-level-security
  - software-engineering/databases/multi-tenancy/tenant-context
  - software-engineering/architecture/multi-tenancy
  - software-engineering/databases/types/relational
language: null
---
# Multi-Tenancy in the Database — Overview

> A database can keep tenants apart at three levels — a database per tenant, a schema per tenant, or shared tables with a tenant column — and each level trades isolation strength for operational cost.

---

## What is it?

A **tenant** is a customer of a system — usually a company or organisation — whose users and data must be kept separate from every other customer's. **Multi-tenancy** means one running system serves many tenants at once instead of installing a separate copy per customer.

In the database, multi-tenancy is the decision of *where the boundary between tenants lives*:

- **Database per tenant** — each tenant gets its own database.
- **Schema per tenant** — one database, one schema (namespace) per tenant, each holding the same tables.
- **Shared tables** — one set of tables for everybody; every row carries a `tenant_id` column that says who owns it.

This subsection covers the three models and then goes deep on the third, as implemented in PostgreSQL with **row-level security** (RLS).

---

## Why does it matter?

- **A cross-tenant leak is a security incident**, not a bug. Showing one customer another customer's invoices ends contracts and can trigger regulatory reporting.
- **The model fixes your cost curve.** A database per tenant costs connections, memory, and backups per customer; shared tables cost almost nothing per extra tenant.
- **The model fixes your operations.** Schema migrations, backup and restore of a single tenant, moving a tenant to another region, and deleting a tenant's data on offboarding are each easy in one model and painful in another.
- **Noisy neighbours.** The more resources tenants share, the more one heavy tenant can slow everybody else down.
- **Changing the model later is expensive.** It means migrating every tenant's data and rewriting the data-access layer, so it is worth choosing deliberately.

---

## How it works

### Database per tenant

```
 app ──┬──► db_tenant_a  (projects, invoices, …)
       ├──► db_tenant_b  (projects, invoices, …)
       └──► db_tenant_c  (projects, invoices, …)
```

The application keeps a catalog that maps a tenant to a connection string and opens a connection to the right database per request. Isolation is as strong as PostgreSQL's database boundary: a query cannot even name another tenant's tables. The cost is one connection pool, one migration run, and one backup per tenant.

### Schema per tenant

```
 app ──► one database
           ├── schema tenant_a  (projects, invoices, …)
           ├── schema tenant_b  (projects, invoices, …)
           └── schema tenant_c  (projects, invoices, …)
```

The application points each request at the right schema, typically with `search_path`. Connections can be shared, but every migration still runs once per schema, and the catalog (`pg_class`, `pg_attribute`) grows with tenants × tables, which slows down tooling and planning in the thousands of schemas.

### Shared tables with a tenant column

```
 app ──► one database, one schema
           projects
           ┌──────────┬──────────────┬─────────┐
           │ id       │ tenant_id    │ name    │
           ├──────────┼──────────────┼─────────┤
           │ …        │ tenant A     │ Website │
           │ …        │ tenant B     │ Mobile  │
           └──────────┴──────────────┴─────────┘
                 ▲
                 └── row-level security policy: only rows whose
                     tenant_id is in the current transaction's scope
```

Every tenant-owned table has a `tenant_id` column. Without anything else, isolation depends on every query remembering `WHERE tenant_id = …`. **Row-level security** moves that rule into the database: a policy attached to the table filters every query, so a forgotten `WHERE` returns nothing instead of everything. See [PostgreSQL Row-Level Security](postgres-row-level-security.md).

### Comparison

| | Database per tenant | Schema per tenant | Shared tables + RLS |
|---|---|---|---|
| Isolation | Strongest — separate database | Strong — separate namespace, same server | Logical — enforced by policies |
| Cost per extra tenant | High (pool, storage, backups) | Medium (catalog growth) | Near zero |
| Migrations | Once per tenant | Once per schema | Once |
| Restore a single tenant | Restore one database | Dump/restore one schema | Hard — filter rows out of a full backup |
| Practical scale | Hundreds to low thousands | Low thousands | Millions of tenants |
| Cross-tenant queries (reporting) | Need a federation layer | `UNION` across schemas | Plain SQL with a dedicated role |
| Per-tenant schema customisation | Easy | Possible | Not practical |
| Noisy-neighbour control | Per database | Weak | Weak — needs app-level quotas |

### Hybrid

The models combine. A common shape: most tenants live in shared tables, and a few large or regulated tenants get a dedicated database with **the same schema**, `tenant_id` column included. Because the schema is identical, moving a tenant out is a data copy, not a rewrite, and the same RLS policies keep working inside the dedicated database.

---

## Examples

PostgreSQL DDL for each model, using a `projects` table.

**Database per tenant** — one database each, created from the same migrations:

```sql
CREATE DATABASE tenant_a OWNER app_owner;
CREATE DATABASE tenant_b OWNER app_owner;

-- run the same migration in each database
CREATE TABLE projects (
  id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL
);
```

**Schema per tenant** — one schema each, selected with `search_path`:

```sql
CREATE SCHEMA tenant_a AUTHORIZATION app_owner;
CREATE TABLE tenant_a.projects (
  id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL
);

-- per transaction, before running queries for tenant A
SET LOCAL search_path = tenant_a;
SELECT * FROM projects;   -- resolves to tenant_a.projects
```

**Shared tables with RLS** — one table, a tenant column, and a policy:

```sql
CREATE TABLE tenants (
  id   uuid PRIMARY KEY,
  name text NOT NULL
);

CREATE TABLE projects (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  name      text NOT NULL
);
CREATE INDEX projects_tenant_id_idx ON projects (tenant_id);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON projects
  FOR ALL TO app_user
  USING      (tenant_id = ANY (coalesce(nullif(current_setting('app.tenant_ids', true), '')::uuid[], '{}')))
  WITH CHECK (tenant_id = ANY (coalesce(nullif(current_setting('app.tenant_ids', true), '')::uuid[], '{}')));
```

The policy reads the tenant scope from a transaction-local setting; how the application sets it is covered in [Passing the Tenant Context](tenant-context.md).

---

## When to use

Shared tables with row-level security fit when:

- There are **many small, similar tenants** — hundreds to millions — and per-tenant infrastructure would dominate the cost.
- **All tenants run the same schema**, and you want to migrate once.
- **Onboarding must be instant and cheap**: a new tenant is an `INSERT`, not a provisioning job.
- The data is accessed through **more than one path** (API, background jobs, admin tools, BI) and you want one isolation rule enforced by the database for all of them.
- You want **defence in depth** even when the application also filters by tenant.

---

## When NOT to use

Prefer a database (or schema) per tenant when:

- **Regulation or contracts require physical isolation**, data residency per tenant, or a per-tenant encryption key.
- **Tenants need divergent schemas** — custom columns, indexes, or extensions per customer.
- **One tenant dominates the load** and must not share I/O and locks with the rest; give it its own database (the hybrid model).
- **Restoring a single tenant to a point in time is a frequent operation** — with shared tables it means filtering rows out of a full backup.
- **You do not control the database roles** — RLS depends on the application connecting as a role that owns nothing and cannot bypass policies.

---

## References

- [PostgreSQL — Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [PostgreSQL — Schemas](https://www.postgresql.org/docs/current/ddl-schemas.html)
- [AWS Whitepaper — SaaS Tenant Isolation Strategies](https://docs.aws.amazon.com/whitepapers/latest/saas-tenant-isolation-strategies/saas-tenant-isolation-strategies.html)
- [Microsoft Learn — Multitenant SaaS database tenancy patterns](https://learn.microsoft.com/en-us/azure/azure-sql/database/saas-tenancy-app-design-patterns)
