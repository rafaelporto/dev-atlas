---
type: concept
tags:
  - database
  - concept
  - multi-tenancy
  - security
  - antipattern
related:
  - software-engineering/databases/multi-tenancy/postgres-row-level-security
  - software-engineering/databases/multi-tenancy/tenant-context
  - software-engineering/databases/multi-tenancy/testing-tenant-isolation
  - languages/javascript-typescript/runtimes/nodejs/orms/pitfalls
language: null
---
# Multi-Tenancy Pitfalls

> Row-level security fails silently — the query runs and simply returns more (or fewer) rows than it should — so these are the known ways tenant isolation leaks even when the policies exist.

---

## What is it?

This is a catalogue of mistakes that break tenant isolation in PostgreSQL applications that use shared tables and [row-level security](postgres-row-level-security.md). Each one survives code review easily because the code looks correct and the tests that only use one tenant pass.

Each entry has the **symptom** you notice, the **cause**, and the **fix**, with the wrong and the right version side by side.

---

## Why does it matter?

None of these mistakes raises an exception. They show up as:

- A customer reporting that they can see another customer's data — the worst way to find out.
- Data that "disappears" intermittently, because a query ran without a scope and the policy correctly returned nothing.
- A test suite that is green because it connects as a superuser, for whom no policy applies.

Isolation bugs are security incidents. The cheapest place to catch them is a review checklist and a [two-tenant isolation test](testing-tenant-isolation.md); this article is the checklist.

---

## How it works

### 1. A session-level `SET` leaking across the pool

- **Symptom** — intermittently, a request sees another tenant's rows; it cannot be reproduced locally with one user.
- **Cause** — the scope is set at session level (`SET app.tenant_ids = …` or `set_config(..., false)`). The connection goes back to the pool still carrying it, and the next request that forgets to set a scope — or sets it on a different connection — inherits it.
- **Fix** — set the scope only with `set_config(..., true)` inside an explicit transaction, through one helper that every data-access path uses. See [Passing the Tenant Context](tenant-context.md).

```sql
-- wrong: lives as long as the connection
SET app.tenant_ids = '{00000000-0000-0000-0000-00000000000a}';

-- right: lives until COMMIT/ROLLBACK
BEGIN;
SELECT set_config('app.tenant_ids', '{00000000-0000-0000-0000-00000000000a}', true);
-- …
COMMIT;
```

### 2. Code that escapes the transaction

- **Symptom** — inside a scoped unit of work, some reads return nothing and some inserts fail with SQLSTATE `42501`; in the worst case (combined with pitfall 1), they see another tenant's rows.
- **Cause** — part of the work does not run on the scoped transaction: a query sent through the pool instead of the transaction handle, work started in a goroutine / `Task` / un-awaited promise that continues after the commit, or a repository that grabs its own connection.
- **Fix** — every query of the unit of work receives the transaction handle explicitly; repository functions take the executor as a parameter; nothing outlives the helper's callback.

### 3. An explicit `WHERE` as the only guard

- **Symptom** — isolation works everywhere except one report, one admin endpoint, or one hand-written fix script.
- **Cause** — tenant filtering is implemented only as `WHERE tenant_id = $1` in application queries (or an ORM global filter). Any query that forgets it — or opts out of the filter — reads every tenant.
- **Fix** — enable RLS with a policy on every tenant-owned table. Keep the `WHERE` if it helps readability or the planner, but treat it as intent, not enforcement.

```sql
-- wrong: the only guard is the query author's memory
SELECT * FROM projects WHERE tenant_id = $1;

-- right: the table enforces it, whatever the query says
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects FORCE  ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON projects FOR ALL TO app_user
  USING      (tenant_id = ANY (coalesce(nullif(current_setting('app.tenant_ids', true), '')::uuid[], '{}')))
  WITH CHECK (tenant_id = ANY (coalesce(nullif(current_setting('app.tenant_ids', true), '')::uuid[], '{}')));
```

### 4. A policy that lets a NULL or empty scope through

- **Symptom** — a job or endpoint that never sets a scope reads every tenant's data, and nobody notices because it "works".
- **Cause** — the policy was written to be convenient for background jobs or admin tools: `OR current_setting('app.tenant_ids', true) IS NULL`, `coalesce(..., <all tenants>)`, or a sentinel value meaning "everything".
- **Fix** — absent or empty scope must match nothing. Jobs that span tenants iterate over tenants and set each scope in turn; genuine cross-tenant access gets its own role with its own explicit policy.

```sql
-- wrong: no scope means "all tenants"
USING (current_setting('app.tenant_ids', true) IS NULL
       OR tenant_id = ANY (current_setting('app.tenant_ids', true)::uuid[]))

-- right: no scope means "no rows"
USING (tenant_id = ANY (coalesce(nullif(current_setting('app.tenant_ids', true), '')::uuid[], '{}')))
```

### 5. Building the tenant list from request input

- **Symptom** — a user can read another tenant's data by changing a header, a subdomain, or a query-string parameter.
- **Cause** — the value of `X-Tenant-Id` (or the path, or the subdomain) is passed straight into `set_config`. RLS faithfully enforces a scope that the attacker chose.
- **Fix** — the requested tenant is input to an authorization check, not the scope itself: intersect it with the authenticated user's memberships and reject the request when the intersection is empty.

### 6. Owner and superuser bypass surprises

- **Symptom** — policies exist, and yet the application (or the test suite, or a staging environment) sees every row.
- **Cause** — one of the roles that bypass RLS is in use: the application connects as the **table owner** and the table lacks `FORCE ROW LEVEL SECURITY`; it connects as a **superuser** (the default in many local Docker setups and some managed platforms); or its role has **`BYPASSRLS`**.
- **Fix** — the application connects as a dedicated role that owns nothing and has `NOBYPASSRLS`; tables use `FORCE`; CI asserts `current_user` and the role's attributes.

```sql
-- roles that ignore every policy
SELECT rolname FROM pg_roles WHERE rolsuper OR rolbypassrls;
```

### 7. `USING` without `WITH CHECK` (or a check that differs)

- **Symptom** — a user cannot see tenant B's rows, but can create rows in tenant B, or move one of their own rows into tenant B with `UPDATE … SET tenant_id = …`.
- **Cause** — a policy written `FOR SELECT` only, or separate per-command policies where the `INSERT`/`UPDATE` one has a looser `WITH CHECK` than the `USING` of the read policy.
- **Fix** — one `FOR ALL` policy with identical `USING` and `WITH CHECK` expressions, or per-command policies reviewed together. A cross-tenant insert must fail with `42501`.

### 8. A new table without RLS

- **Symptom** — everything is isolated except the feature shipped last month.
- **Cause** — a migration created a tenant-owned table and forgot `ENABLE`/`FORCE ROW LEVEL SECURITY` and the policy. Default deny only applies to tables where RLS is enabled.
- **Fix** — a migration checklist item, plus a CI query that fails when any table with a `tenant_id` column is not protected:

```sql
SELECT n.nspname AS schema_name, c.relname AS table_name,
       c.relrowsecurity      AS rls_enabled,
       c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind IN ('r', 'p')
  AND n.nspname NOT IN ('pg_catalog', 'information_schema')
  AND EXISTS (SELECT 1 FROM pg_attribute a
              WHERE a.attrelid = c.oid AND a.attname = 'tenant_id' AND NOT a.attisdropped)
  AND (NOT c.relrowsecurity OR NOT c.relforcerowsecurity
       OR NOT EXISTS (SELECT 1 FROM pg_policy p WHERE p.polrelid = c.oid));
-- expected: zero rows
```

### 9. Views and `SECURITY DEFINER` functions running as their owner

- **Symptom** — direct queries on the table are isolated, but a view or a database function returns every tenant's rows.
- **Cause** — by default a view accesses its base tables with the **view owner's** privileges and policies, and a `SECURITY DEFINER` function runs as the function's owner. If that owner bypasses RLS (superuser, `BYPASSRLS`, or table owner without `FORCE`), the view or function does too.
- **Fix** — create views `WITH (security_invoker = true)` (PostgreSQL 15+) so the caller's policies apply; keep `SECURITY DEFINER` functions minimal, owned by a role that does not bypass RLS, and with a pinned `search_path`.

```sql
-- wrong: runs with the owner's rights
CREATE VIEW active_projects AS SELECT * FROM projects WHERE NOT archived;

-- right: runs with the caller's rights and policies
CREATE VIEW active_projects WITH (security_invoker = true) AS
  SELECT * FROM projects WHERE NOT archived;
```

---

## Examples

Pitfalls 1 and 2 live in application code. The helpers referenced below are the `WithTenants` / `withTenants` / `WithTenantsAsync` functions from [Passing the Tenant Context](tenant-context.md).

### Session `SET` vs transaction-local scope

**Go (pgx):**

```go
// wrong: sets the scope on whichever pooled connection runs this statement,
// for the rest of that connection's life
_, _ = pool.Exec(ctx, "SELECT set_config('app.tenant_ids', $1::uuid[]::text, false)", ids)
rows, _ := pool.Query(ctx, "SELECT id, name FROM projects") // may run on another connection

// right: scope and queries on the same transaction, discarded at commit
err := WithTenants(ctx, pool, ids, func(tx pgx.Tx) error {
	rows, err := tx.Query(ctx, "SELECT id, name FROM projects")
	// …
	return err
})
```

**TypeScript (node-postgres):**

```ts
// wrong: session-level, and pool.query may pick a different connection each time
await pool.query("SELECT set_config('app.tenant_ids', $1::uuid[]::text, false)", [ids]);
const { rows } = await pool.query("SELECT id, name FROM projects");

// right
const rows = await withTenants(pool, ids, async (client) =>
  (await client.query("SELECT id, name FROM projects")).rows,
);
```

**C# (Npgsql):**

```csharp
// wrong: session-level on a pooled connection
await using (var cmd = dataSource.CreateCommand(
    "SELECT set_config('app.tenant_ids', $1::uuid[]::text, false)"))
{
    cmd.Parameters.Add(new NpgsqlParameter { Value = ids.ToArray() });
    await cmd.ExecuteNonQueryAsync();
}

// right
await WithTenantsAsync(dataSource, ids, async tx =>
{
    await using var cmd = new NpgsqlCommand("SELECT id, name FROM projects", tx.Connection, tx);
    await using var reader = await cmd.ExecuteReaderAsync();
    // …
});
```

### Escaping the transaction

**Go:**

```go
err := WithTenants(ctx, pool, ids, func(tx pgx.Tx) error {
	// wrong: goes through the pool, not the transaction — no scope
	_, _ = pool.Exec(ctx, "INSERT INTO projects (tenant_id, name) VALUES ($1, $2)", tenantID, name)

	// wrong: the goroutine may run after the commit, when tx is closed
	go func() { _, _ = tx.Exec(context.Background(), "UPDATE projects SET name = $1 WHERE id = $2", name, id) }()

	// right: on tx, synchronously
	_, err := tx.Exec(ctx, "INSERT INTO projects (tenant_id, name) VALUES ($1, $2)", tenantID, name)
	return err
})
```

**TypeScript:**

```ts
await withTenants(pool, ids, async (client) => {
  // wrong: pool.query uses another connection — no scope
  await pool.query("INSERT INTO projects (tenant_id, name) VALUES ($1, $2)", [tenantId, name]);

  // wrong: not awaited — may run after COMMIT and release()
  void client.query("UPDATE projects SET name = $1 WHERE id = $2", [name, id]);

  // right
  await client.query("INSERT INTO projects (tenant_id, name) VALUES ($1, $2)", [tenantId, name]);
});
```

**C#:**

```csharp
await WithTenantsAsync(dataSource, ids, async tx =>
{
    // wrong: a new command from the data source opens its own connection — no scope
    await using (var cmd = dataSource.CreateCommand("INSERT INTO projects (tenant_id, name) VALUES ($1, $2)"))
    { /* … */ }

    // wrong: fire-and-forget — may run after the transaction is committed and disposed
    _ = Task.Run(() => RenameAsync(tx, id, name));

    // right: on the transaction's connection, awaited
    await using var insert = new NpgsqlCommand(
        "INSERT INTO projects (tenant_id, name) VALUES ($1, $2)", tx.Connection, tx);
    insert.Parameters.Add(new NpgsqlParameter { Value = tenantId });
    insert.Parameters.Add(new NpgsqlParameter { Value = name });
    await insert.ExecuteNonQueryAsync();
});
```

---

## When to use

Use this list as a checklist:

- **Reviewing a pull request** that adds a table, a migration, a view, a database function, a background job, or a new data-access path.
- **Auditing an existing multi-tenant system** before a security review or a compliance assessment.
- **Designing the data-access layer** of a new service, to decide which guarantees the helper and the CI checks must provide.

---

## When NOT to use

- **Database-per-tenant or schema-per-tenant** systems have different failure modes — the wrong connection string, the wrong `search_path`, migrations that miss a tenant. Most entries here do not apply; see the [Overview](overview.md).
- **As a substitute for tests.** A checklist catches what a reviewer remembers to look for; the [isolation test](testing-tenant-isolation.md) catches what nobody thought of.

---

## References

- [PostgreSQL — Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [PostgreSQL — `CREATE VIEW` (`security_invoker`)](https://www.postgresql.org/docs/current/sql-createview.html)
- [PostgreSQL — `CREATE FUNCTION` (writing `SECURITY DEFINER` functions safely)](https://www.postgresql.org/docs/current/sql-createfunction.html)
- [AWS Database Blog — Multi-tenant data isolation with PostgreSQL Row Level Security](https://aws.amazon.com/blogs/database/multi-tenant-data-isolation-with-postgresql-row-level-security/)
