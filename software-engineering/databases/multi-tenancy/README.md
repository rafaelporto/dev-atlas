# Multi-Tenancy

How one database serves many tenants without one tenant seeing another's data. The tenancy models are general; the mechanics and examples are PostgreSQL-specific (row-level security). For the application side see [Multi-Tenant Applications](../../architecture/multi-tenancy.md).

---

## Articles

| Article | Description |
|---|---|
| [Overview](overview.md) | Database, schema, or shared tables per tenant — trade-offs and when row-level security fits |
| [PostgreSQL Row-Level Security](postgres-row-level-security.md) | Policies, USING vs WITH CHECK, roles that bypass RLS, and performance |
| [Passing the Tenant Context](tenant-context.md) | Transaction-local settings, single vs multiple tenants, failing closed, and connection pools |
| [Pitfalls](pitfalls.md) | The ways tenant isolation leaks: pooled sessions, missing scope, owner bypass, and more |
| [Testing Tenant Isolation](testing-tenant-isolation.md) | A two-tenant integration test that proves the policies hold |
