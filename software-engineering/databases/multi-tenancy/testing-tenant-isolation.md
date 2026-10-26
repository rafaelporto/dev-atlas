---
type: how-to
tags:
  - database
  - multi-tenancy
  - security
  - testing
related:
  - software-engineering/databases/multi-tenancy/postgres-row-level-security
  - software-engineering/databases/multi-tenancy/pitfalls
  - languages/go/testing
  - languages/csharp/testing
  - languages/javascript-typescript/runtimes/nodejs/testing
language: null
---
# How to Test Tenant Isolation

> A two-tenant integration test against a real PostgreSQL proves that the row-level security policies isolate tenants, and a mutation check proves that the test would notice if they did not.

---

## Prerequisites

- A container runtime (Docker, Colima, Podman) for [Testcontainers](https://testcontainers.com/). The test needs a **real PostgreSQL** — mocks and SQLite have no row-level security.
- The schema, roles, and `tenant_isolation` policy from [PostgreSQL Row-Level Security](postgres-row-level-security.md), saved as a SQL file the test can run (`testdata/schema.sql` below).
- The transaction helper from [Passing the Tenant Context](tenant-context.md) — `WithTenants` (Go), `withTenants` (TypeScript), `WithTenantsAsync` (C#). The test exercises the same helper production code uses.
- A test framework per language: Go's `testing` with `testcontainers-go` and pgx; Node's `node:test` with `@testcontainers/postgresql` and `pg`; xUnit with `Testcontainers.PostgreSql` and Npgsql.

Three connections play different roles in the test:

| Connection | Role | Used for |
|---|---|---|
| `admin` | The container's superuser | Creating roles, running the schema, seeding, the mutation switch. Superusers bypass RLS, which is what seeding needs. |
| `app` | `app_user` | **Every assertion.** The policies apply only to this role. |
| — | `app_owner` | Owns the tables (set by `schema.sql`). With `FORCE ROW LEVEL SECURITY` it sees nothing, so it is not used for seeding. |

## Steps

### 1. Start PostgreSQL and apply the schema

Start a throwaway container, create the roles, apply the schema as `app_owner`, and open a second pool that logs in as `app_user`. The `RLS_MUTATION` switch is used in step 8.

`testdata/schema.sql` starts with the role setup and then the DDL from the RLS article:

```sql
CREATE ROLE app_owner NOLOGIN;
CREATE ROLE app_user  LOGIN NOBYPASSRLS PASSWORD 'app-user-test-only';  -- throwaway container only
GRANT CREATE ON SCHEMA public TO app_owner;

SET ROLE app_owner;
-- … CREATE TABLE tenants / memberships / projects, ENABLE + FORCE RLS,
--   CREATE POLICY tenant_isolation, GRANTs to app_user …
RESET ROLE;
```

**Go:**

```go
func setup(t *testing.T) (admin, app *pgxpool.Pool) {
	t.Helper()
	ctx := context.Background()

	ctr, err := postgres.Run(ctx, "postgres:17-alpine", postgres.BasicWaitStrategies())
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = testcontainers.TerminateContainer(ctr) })

	dsn, err := ctr.ConnectionString(ctx, "sslmode=disable")
	if err != nil {
		t.Fatal(err)
	}
	admin, err = pgxpool.New(ctx, dsn)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(admin.Close)

	schema, err := os.ReadFile("testdata/schema.sql")
	if err != nil {
		t.Fatal(err)
	}
	mustExec(t, admin, string(schema))
	if os.Getenv("RLS_MUTATION") == "disable" {
		mustExec(t, admin, "ALTER TABLE projects DISABLE ROW LEVEL SECURITY")
	}
	seed(t, admin)

	cfg, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		t.Fatal(err)
	}
	cfg.ConnConfig.User = "app_user"
	cfg.ConnConfig.Password = "app-user-test-only"
	app, err = pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(app.Close)
	return admin, app
}
```

**TypeScript (`node:test`):**

```ts
import { after, before, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import pg from "pg";

let container: StartedPostgreSqlContainer;
let admin: pg.Pool;
let app: pg.Pool;

before(async () => {
  container = await new PostgreSqlContainer("postgres:17-alpine").start();
  admin = new pg.Pool({ connectionString: container.getConnectionUri() });

  await admin.query(await readFile("testdata/schema.sql", "utf8"));
  if (process.env.RLS_MUTATION === "disable") {
    await admin.query("ALTER TABLE projects DISABLE ROW LEVEL SECURITY");
  }
  await admin.query(await readFile("testdata/seed.sql", "utf8"));

  app = new pg.Pool({
    host: container.getHost(),
    port: container.getPort(),
    database: container.getDatabase(),
    user: "app_user",
    password: "app-user-test-only",
  });
});

after(async () => {
  await app?.end();
  await admin?.end();
  await container?.stop();
});
```

**C# (xUnit):**

```csharp
public sealed class TenantIsolationTests : IAsyncLifetime
{
    private readonly PostgreSqlContainer _container =
        new PostgreSqlBuilder("postgres:17-alpine").Build();
    private NpgsqlDataSource _admin = null!;
    private NpgsqlDataSource _app = null!;

    public async Task InitializeAsync()   // xUnit v3: ValueTask
    {
        await _container.StartAsync();
        _admin = NpgsqlDataSource.Create(_container.GetConnectionString());

        await ExecAsync(_admin, await File.ReadAllTextAsync("testdata/schema.sql"));
        if (Environment.GetEnvironmentVariable("RLS_MUTATION") == "disable")
            await ExecAsync(_admin, "ALTER TABLE projects DISABLE ROW LEVEL SECURITY");
        await ExecAsync(_admin, await File.ReadAllTextAsync("testdata/seed.sql"));

        var appConnection = new NpgsqlConnectionStringBuilder(_container.GetConnectionString())
        {
            Username = "app_user",
            Password = "app-user-test-only",
        };
        _app = NpgsqlDataSource.Create(appConnection.ConnectionString);
    }

    public async Task DisposeAsync()
    {
        await _app.DisposeAsync();
        await _admin.DisposeAsync();
        await _container.DisposeAsync();
    }

    private static async Task ExecAsync(NpgsqlDataSource ds, string sql)
    {
        await using var cmd = ds.CreateCommand(sql);
        await cmd.ExecuteNonQueryAsync();
    }
}
```

### 2. Seed two tenants

One row per tenant is enough. Seed as the superuser (`admin`), which bypasses RLS. `testdata/seed.sql` (Go runs the same SQL inside `seed`):

```sql
INSERT INTO tenants (id, name) VALUES
  ('00000000-0000-0000-0000-00000000000a', 'Tenant A'),
  ('00000000-0000-0000-0000-00000000000b', 'Tenant B');

INSERT INTO projects (id, tenant_id, name) VALUES
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000000a', 'Website'),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000000b', 'Mobile');
```

The tests below use these ids as `tenantA`, `tenantB`, `projectA`, `projectB` (`TenantA`… in C#), plus a few small helpers:

**Go** — one test function, subtests sharing the setup:

```go
var (
	tenantA  = uuid.MustParse("00000000-0000-0000-0000-00000000000a")
	tenantB  = uuid.MustParse("00000000-0000-0000-0000-00000000000b")
	projectA = uuid.MustParse("00000000-0000-0000-0000-0000000000a1")
	projectB = uuid.MustParse("00000000-0000-0000-0000-0000000000b1")
)

func TestTenantIsolation(t *testing.T) {
	ctx := context.Background()
	admin, app := setup(t)
	// t.Run(...) subtests from steps 3–6 go here
}

func mustExec(t *testing.T, pool *pgxpool.Pool, sql string) {
	t.Helper()
	if _, err := pool.Exec(context.Background(), sql); err != nil {
		t.Fatal(err)
	}
}

func seed(t *testing.T, admin *pgxpool.Pool) {
	t.Helper()
	sql, err := os.ReadFile("testdata/seed.sql")
	if err != nil {
		t.Fatal(err)
	}
	mustExec(t, admin, string(sql))
}
```

**C#** — command helpers on the scoped transaction (`TenantDb.WithTenantsAsync` is the helper from the tenant-context article):

```csharp
private static async Task<int> ExecAsync(NpgsqlTransaction tx, string sql, params object[] args)
{
    await using var cmd = new NpgsqlCommand(sql, tx.Connection, tx);
    foreach (var arg in args) cmd.Parameters.Add(new NpgsqlParameter { Value = arg });
    return await cmd.ExecuteNonQueryAsync();
}

private static async Task<T> ScalarAsync<T>(NpgsqlTransaction tx, string sql, params object[] args)
{
    await using var cmd = new NpgsqlCommand(sql, tx.Connection, tx);
    foreach (var arg in args) cmd.Parameters.Add(new NpgsqlParameter { Value = arg });
    return (T)(await cmd.ExecuteScalarAsync())!;
}
```

### 3. Reads see only the scoped tenant

In tenant A's scope, exactly one project is visible, and tenant B's project is not found even when asked for by primary key.

**Go:**

```go
t.Run("reads are scoped", func(t *testing.T) {
	err := WithTenants(ctx, app, []uuid.UUID{tenantA}, func(tx pgx.Tx) error {
		var total, other int
		if err := tx.QueryRow(ctx, "SELECT count(*) FROM projects").Scan(&total); err != nil {
			return err
		}
		if err := tx.QueryRow(ctx, "SELECT count(*) FROM projects WHERE id = $1", projectB).Scan(&other); err != nil {
			return err
		}
		if total != 1 || other != 0 {
			t.Errorf("want 1 visible and 0 of tenant B, got %d and %d", total, other)
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
})
```

**TypeScript:**

```ts
it("reads are scoped", async () => {
  await withTenants(app, [tenantA], async (client) => {
    const all = await client.query("SELECT id FROM projects");
    const other = await client.query("SELECT id FROM projects WHERE id = $1", [projectB]);
    assert.deepEqual(all.rows.map((r) => r.id), [projectA]);
    assert.equal(other.rowCount, 0);
  });
});
```

**C#:**

```csharp
[Fact]
public async Task Reads_are_scoped()
{
    await TenantDb.WithTenantsAsync(_app, [TenantA], async tx =>
    {
        Assert.Equal(1L, await ScalarAsync<long>(tx, "SELECT count(*) FROM projects"));
        Assert.Equal(0L, await ScalarAsync<long>(tx, "SELECT count(*) FROM projects WHERE id = $1", ProjectB));
    });
}
```

### 4. Cross-tenant updates and deletes affect nothing

Rows hidden by `USING` cannot be targeted: `UPDATE` and `DELETE` on tenant B's row succeed with **0 rows affected**, and the row is still there afterwards.

**Go:**

```go
t.Run("cross-tenant update and delete affect 0 rows", func(t *testing.T) {
	err := WithTenants(ctx, app, []uuid.UUID{tenantA}, func(tx pgx.Tx) error {
		upd, err := tx.Exec(ctx, "UPDATE projects SET name = 'hacked' WHERE id = $1", projectB)
		if err != nil {
			return err
		}
		del, err := tx.Exec(ctx, "DELETE FROM projects WHERE id = $1", projectB)
		if err != nil {
			return err
		}
		if upd.RowsAffected() != 0 || del.RowsAffected() != 0 {
			t.Errorf("want 0 rows affected, got update=%d delete=%d", upd.RowsAffected(), del.RowsAffected())
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
	var name string
	if err := admin.QueryRow(ctx, "SELECT name FROM projects WHERE id = $1", projectB).Scan(&name); err != nil || name != "Mobile" {
		t.Errorf("tenant B's row changed: name=%q err=%v", name, err)
	}
})
```

**TypeScript:**

```ts
it("cross-tenant update and delete affect 0 rows", async () => {
  await withTenants(app, [tenantA], async (client) => {
    const upd = await client.query("UPDATE projects SET name = 'hacked' WHERE id = $1", [projectB]);
    const del = await client.query("DELETE FROM projects WHERE id = $1", [projectB]);
    assert.equal(upd.rowCount, 0);
    assert.equal(del.rowCount, 0);
  });
  const { rows } = await admin.query("SELECT name FROM projects WHERE id = $1", [projectB]);
  assert.equal(rows[0]?.name, "Mobile");
});
```

**C#:**

```csharp
[Fact]
public async Task Cross_tenant_update_and_delete_affect_zero_rows()
{
    await TenantDb.WithTenantsAsync(_app, [TenantA], async tx =>
    {
        Assert.Equal(0, await ExecAsync(tx, "UPDATE projects SET name = 'hacked' WHERE id = $1", ProjectB));
        Assert.Equal(0, await ExecAsync(tx, "DELETE FROM projects WHERE id = $1", ProjectB));
    });
    await using var cmd = _admin.CreateCommand("SELECT name FROM projects WHERE id = $1");
    cmd.Parameters.Add(new NpgsqlParameter { Value = ProjectB });
    Assert.Equal("Mobile", (string?)await cmd.ExecuteScalarAsync());
}
```

### 5. Cross-tenant inserts and moves are rejected with `42501`

`WITH CHECK` rejects new row versions outside the scope: inserting a row for tenant B, and moving tenant A's row to tenant B, both raise SQLSTATE `42501` (`insufficient_privilege`).

**Go:**

```go
t.Run("cross-tenant insert and move are rejected", func(t *testing.T) {
	err := WithTenants(ctx, app, []uuid.UUID{tenantA}, func(tx pgx.Tx) error {
		_, err := tx.Exec(ctx, "INSERT INTO projects (tenant_id, name) VALUES ($1, 'Intruder')", tenantB)
		return err
	})
	requireSQLState(t, err, "42501")

	err = WithTenants(ctx, app, []uuid.UUID{tenantA}, func(tx pgx.Tx) error {
		_, err := tx.Exec(ctx, "UPDATE projects SET tenant_id = $1 WHERE id = $2", tenantB, projectA)
		return err
	})
	requireSQLState(t, err, "42501")
})
```

**TypeScript:**

```ts
it("cross-tenant insert and move are rejected", async () => {
  await assert.rejects(
    withTenants(app, [tenantA], (client) =>
      client.query("INSERT INTO projects (tenant_id, name) VALUES ($1, 'Intruder')", [tenantB])),
    { code: "42501" },
  );
  await assert.rejects(
    withTenants(app, [tenantA], (client) =>
      client.query("UPDATE projects SET tenant_id = $1 WHERE id = $2", [tenantB, projectA])),
    { code: "42501" },
  );
});
```

**C#:**

```csharp
[Fact]
public async Task Cross_tenant_insert_and_move_are_rejected()
{
    var insert = await Assert.ThrowsAsync<PostgresException>(() =>
        TenantDb.WithTenantsAsync(_app, [TenantA], tx =>
            ExecAsync(tx, "INSERT INTO projects (tenant_id, name) VALUES ($1, 'Intruder')", TenantB)));
    Assert.Equal(PostgresErrorCodes.InsufficientPrivilege, insert.SqlState);

    var move = await Assert.ThrowsAsync<PostgresException>(() =>
        TenantDb.WithTenantsAsync(_app, [TenantA], tx =>
            ExecAsync(tx, "UPDATE projects SET tenant_id = $1 WHERE id = $2", TenantB, ProjectA)));
    Assert.Equal(PostgresErrorCodes.InsufficientPrivilege, move.SqlState);
}
```

### 6. No scope means no access

Without a scope — no `set_config` at all, or an explicitly empty `'{}'` — reads return nothing and writes are rejected. The helper itself refuses an empty list before reaching the database.

**Go:**

```go
t.Run("no scope sees nothing", func(t *testing.T) {
	var n int
	if err := app.QueryRow(ctx, "SELECT count(*) FROM projects").Scan(&n); err != nil || n != 0 {
		t.Errorf("without scope: want 0 rows, got %d (err=%v)", n, err)
	}
	_, err := app.Exec(ctx, "INSERT INTO projects (tenant_id, name) VALUES ($1, 'Orphan')", tenantA)
	requireSQLState(t, err, "42501")

	if err := WithTenants(ctx, app, nil, func(pgx.Tx) error { return nil }); !errors.Is(err, ErrNoTenantScope) {
		t.Errorf("want ErrNoTenantScope, got %v", err)
	}
})
```

**TypeScript:**

```ts
it("no scope sees nothing", async () => {
  const { rowCount } = await app.query("SELECT id FROM projects");
  assert.equal(rowCount, 0);
  await assert.rejects(
    app.query("INSERT INTO projects (tenant_id, name) VALUES ($1, 'Orphan')", [tenantA]),
    { code: "42501" },
  );
  await assert.rejects(withTenants(app, [], async () => {}), /tenant scope is empty/);
});
```

**C#:**

```csharp
[Fact]
public async Task No_scope_sees_nothing()
{
    await using (var count = _app.CreateCommand("SELECT count(*) FROM projects"))
        Assert.Equal(0L, (long)(await count.ExecuteScalarAsync())!);

    await using var insert = _app.CreateCommand("INSERT INTO projects (tenant_id, name) VALUES ($1, 'Orphan')");
    insert.Parameters.Add(new NpgsqlParameter { Value = TenantA });
    var ex = await Assert.ThrowsAsync<PostgresException>(() => insert.ExecuteNonQueryAsync());
    Assert.Equal(PostgresErrorCodes.InsufficientPrivilege, ex.SqlState);

    await Assert.ThrowsAsync<InvalidOperationException>(() =>
        TenantDb.WithTenantsAsync(_app, [], _ => Task.CompletedTask));
}
```

### 7. Assert on SQLSTATE, never on the message

The error text (`new row violates row-level security policy for table "projects"`) changes between PostgreSQL versions and with the server's `lc_messages` locale. The SQLSTATE code is stable. Each driver exposes it:

**Go:**

```go
func requireSQLState(t *testing.T, err error, code string) {
	t.Helper()
	var pgErr *pgconn.PgError
	if !errors.As(err, &pgErr) || pgErr.Code != code {
		t.Fatalf("want SQLSTATE %s, got %v", code, err)
	}
}
```

**TypeScript:** `DatabaseError` from `pg` carries the code in `err.code`; `assert.rejects(promise, { code: "42501" })` matches on that property, as in steps 5 and 6.

**C#:** `PostgresException.SqlState`, compared with the constants in `PostgresErrorCodes` (`InsufficientPrivilege` is `"42501"`), as in steps 5 and 6.

### 8. Prove the test can fail (mutation check)

A test that passes with and without the policy proves nothing. Run the suite once with RLS switched off and require it to **fail**:

```bash
# Go
RLS_MUTATION=disable go test ./internal/store/... && { echo "isolation tests passed without RLS"; exit 1; } || true

# Node
RLS_MUTATION=disable node --test && { echo "isolation tests passed without RLS"; exit 1; } || true

# .NET
RLS_MUTATION=disable dotnet test && { echo "isolation tests passed without RLS"; exit 1; } || true
```

Run this check in CI after any change to the policies, the roles, or the helper — or at least on a schedule. A variant that is closer to real mistakes: instead of disabling RLS, drop the `WITH CHECK` clause or add a permissive `OR current_setting(...) IS NULL`, and confirm that steps 5 and 6 catch it.

## Verification

- The suite **passes** with RLS enabled:

  ```bash
  go test ./internal/store/...     # or: node --test   /   dotnet test
  ```

- The suite **fails** with `RLS_MUTATION=disable` (step 8) — at least the read, update/delete, insert, and no-scope tests.
- The assertions really run as `app_user`. Add a guard to the setup:

  ```sql
  SELECT current_user, r.rolsuper, r.rolbypassrls
  FROM pg_roles r WHERE r.rolname = current_user;
  -- expected: app_user | f | f
  ```

## Common issues

| Symptom | Likely cause | Fix |
|---|---|---|
| The suite passes even with `RLS_MUTATION=disable` | Assertions run on the superuser or owner connection, which bypasses RLS | Run every assertion through the `app_user` pool; add the `current_user` guard |
| Seeding fails with `new row violates row-level security policy` | Seeding as `app_owner` with `FORCE ROW LEVEL SECURITY` | Seed as the container's superuser, or as `app_user` inside each tenant's scope |
| Cross-tenant insert succeeds | Policy has `USING` but a missing or looser `WITH CHECK`, or it is `FOR SELECT` only | Use one `FOR ALL` policy with identical `USING` and `WITH CHECK` |
| `unrecognized configuration parameter "app.tenant_ids"` | `current_setting` called without the second argument `true` | Use `current_setting('app.tenant_ids', true)` in the policy |
| `malformed array literal: ""` on queries without scope | The policy casts `current_setting(...)` directly; after a scoped transaction the setting reads `''` | Wrap it: `nullif(current_setting('app.tenant_ids', true), '')` |
| Tests pass alone but fail (or leak) when run together | A session-level `SET` survives on pooled connections between tests | Set the scope only with `set_config(..., true)` inside the helper's transaction |
| `permission denied for table projects` (SQLSTATE `42501` on `SELECT`) | Missing `GRANT` to `app_user` — a privilege error, not an RLS one | Grant `SELECT, INSERT, UPDATE, DELETE` on the table to `app_user` |

## References

- [PostgreSQL — Appendix A: Error Codes](https://www.postgresql.org/docs/current/errcodes-appendix.html)
- [PostgreSQL — Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Testcontainers for Go — Postgres module](https://golang.testcontainers.org/modules/postgres/)
- [Testcontainers for Node.js — PostgreSQL module](https://node.testcontainers.org/modules/postgresql/)
- [Testcontainers for .NET — PostgreSQL module](https://dotnet.testcontainers.org/modules/postgres/)
