---
type: concept
tags:
  - language
  - csharp
  - dotnet
  - multi-tenancy
  - backend
related:
  - software-engineering/architecture/multi-tenancy
  - software-engineering/databases/multi-tenancy/tenant-context
  - software-engineering/databases/multi-tenancy/testing-tenant-isolation
  - languages/csharp/databases-and-orms
  - languages/csharp/csharp-patterns
language: "csharp"
---
# Multi-Tenancy in C# and .NET

> In ASP.NET Core, the tenant is resolved by middleware (your own or Finbuckle.MultiTenant), lives in a scoped service, and reaches PostgreSQL through an Npgsql transaction that sets the tenant scope before EF Core or Dapper runs a single query.

---

## What is it?

A multi-tenant .NET application serves many customers (tenants) from one deployment and one database, and has to make sure every request only touches its own tenant's data. This article applies the language-agnostic design from [Multi-Tenant Applications](../../software-engineering/architecture/multi-tenancy.md) to the .NET stack: where the tenant is resolved, how it travels through dependency injection, and how it is handed to PostgreSQL so that [row-level security](../../software-engineering/databases/multi-tenancy/postgres-row-level-security.md) does the actual isolation.

---

## Why does it matter?

.NET ships most of the pieces already — scoped dependency injection, middleware, EF Core global query filters, and a mature library for tenant resolution (Finbuckle.MultiTenant). None of them isolates tenants **in the database** on its own:

- A global query filter is a `Where` that EF Core adds to LINQ queries. `IgnoreQueryFilters()`, raw SQL, Dapper, and a second `DbContext` all go around it.
- Finbuckle tells you *which tenant the request names*; it does not check that the signed-in user belongs to that tenant, and it does not talk to PostgreSQL.

The safe design combines them: the framework resolves and authorizes the tenant, a scoped `ITenantContext` carries it, and every unit of work runs inside a transaction that sets `app.tenant_ids` so PostgreSQL's policies filter rows no matter which API issued the query.

---

## How it works

```
HTTP request
   │
   ▼
UseMultiTenant() / custom middleware ── resolves identifier (claim, host, header)
   │
   ▼
Tenant authorization middleware ──────── checks memberships, fills ITenantContext (scoped)
   │
   ▼
Endpoint → service → ExecuteInTenantScopeAsync
                          │  BEGIN
                          │  select set_config('app.tenant_ids', @ids, true)
                          │  EF Core / Dapper queries   ← RLS policy filters rows
                          ▼  COMMIT (setting disappears)
```

### Resolving the tenant

Two options, both ending in the same scoped `ITenantContext`:

- **Your own middleware** — enough when the tenant comes from one place, usually a claim in the access token. Twenty lines, no dependency.
- **[Finbuckle.MultiTenant](https://www.finbuckle.com/MultiTenant)** — the de facto library. `AddMultiTenant<TenantInfo>()` plus one or more strategies (`WithClaimStrategy`, `WithHostStrategy`, `WithRouteStrategy`, `WithHeaderStrategy`, `WithBasePathStrategy`, …) and a store (`WithConfigurationStore`, an EF Core store, a distributed-cache store). `UseMultiTenant()` resolves the tenant early in the pipeline; you read it with `HttpContext.GetMultiTenantContext<TenantInfo>()` or `IMultiTenantContextAccessor<TenantInfo>`. It also supports per-tenant options, authentication settings, and connection strings, which matters if some tenants get a dedicated database.

Whichever you use, a header, route value, or subdomain is a *claim by the caller*, not a fact. Validate it against the user's memberships before it reaches `ITenantContext`.

Two full application frameworks also ship multi-tenancy: **ABP Framework** (a modular application framework with tenant management, per-tenant connection strings, and data filters) and **Orchard Core** (a CMS/application framework where each tenant is an isolated site). They make sense when you adopt the whole framework; they are heavy if all you need is tenant resolution.

### Carrying the tenant: a scoped service

Register `ITenantContext` as **scoped** — one instance per HTTP request — and fill it once in middleware. Everything downstream (DbContext, repositories, handlers) takes it through constructor injection.

- **Background services** have no request scope. Create a new scope per message (`IServiceScopeFactory.CreateAsyncScope()`) and fill `ITenantContext` from the message envelope inside it.
- **`AsyncLocal<T>`** works but is invisible in constructors and easy to leak into fire-and-forget tasks. Use it only where DI cannot reach (static helpers, third-party callbacks).
- **`AddDbContextPool`** reuses `DbContext` instances across requests, so a context must not capture the scoped tenant in its constructor. Use `AddDbContext` (or a scoped `IDbContextFactory`) for tenant-aware contexts.

### EF Core global query filters: convenience, not protection

A query filter keeps tenant predicates out of every LINQ query and gives you correct results in tests that run without RLS:

```csharp
modelBuilder.Entity<Project>()
    .HasQueryFilter("TenantFilter", p => TenantIds.Contains(p.TenantId));
```

Named filters (EF Core 10+) let you disable one filter without disabling the others: `IgnoreQueryFilters(["TenantFilter"])`. Before EF Core 10, a second `HasQueryFilter` call overwrites the first, so combine predicates with `&&`.

Finbuckle's EF Core integration (`MultiTenantDbContext`, `IsMultiTenant()`) does the same thing for a single tenant: a shadow `TenantId` property, a named query filter, and `TenantId` assignment and checks on `SaveChanges` (`TenantMismatchMode.Throw` by default).

Both are **application-side**. They do not apply to `FromSql`/`ExecuteSql` written against other tables, to Dapper, to `IgnoreQueryFilters()`, or to anything that connects without EF Core. Treat them as ergonomics; the [PostgreSQL policy](../../software-engineering/databases/multi-tenancy/postgres-row-level-security.md) is the guard.

### Npgsql and the tenant-scoped transaction

The scope is set with `set_config('app.tenant_ids', …, true)` — transaction-local, so it vanishes on `COMMIT`/`ROLLBACK` and can never leak to the next borrower of the pooled connection (see [Passing the Tenant Context](../../software-engineering/databases/multi-tenancy/tenant-context.md)). Three ways to wire it in .NET:

1. **An explicit helper** — `ExecuteInTenantScopeAsync` (EF Core) or `WithTenantsAsync` (`NpgsqlDataSource`): begin a transaction, set the scope, run the work, commit. Explicit and easy to review; the recommended default.
2. **A `DbTransactionInterceptor`** — override `TransactionStartedAsync` to run `set_config` on every transaction EF Core starts, including the implicit one `SaveChanges` opens. Reads that run *without* a transaction get no scope and return nothing — which fails closed, but surprises people. Pair it with the helper rather than relying on it alone.
3. **A `DbConnectionInterceptor` on `ConnectionOpened`** — avoid. Outside a transaction a local setting is gone after one statement, and a session-level setting (`set_config(..., false)`) is exactly the [pooled-connection leak](../../software-engineering/databases/multi-tenancy/pitfalls.md).

Passing the ids as a `Guid[]` parameter and casting in SQL (`@ids::uuid[]::text`) keeps the value typed and parameterized — no string building.

Npgsql resets pooled connections by default: when a connection is returned, Npgsql queues a `DISCARD ALL` (or equivalent statements when prepared statements are kept) and sends it with the first command of the next use. `No Reset On Close=true` turns that off for performance. The reset is a safety net, not the design — transaction-local settings are correct even with the reset disabled or behind PgBouncer in transaction mode.

### Policies live in migrations

EF Core does not model RLS. Add policies with `migrationBuilder.Sql(...)` in the migration that creates the table, and run migrations with the **owner** connection string (`app_owner`), while the application connects as `app_user`. Two connection strings, two roles — the app role never owns tables, so `FORCE ROW LEVEL SECURITY` plus the policy always applies to it.

### Observability

Put the tenant on every log line and span: `ILogger.BeginScope` with a `tenant.id` key (structured providers such as Serilog or OpenTelemetry logging export it as an attribute) and `Activity.Current?.SetTag("tenant.id", …)` for traces.

---

## Examples

### Tenant context and authorization middleware

```csharp
public interface ITenantContext
{
    IReadOnlyList<Guid> TenantIds { get; }
}

public sealed class TenantContext : ITenantContext
{
    private IReadOnlyList<Guid>? _tenantIds;

    // Fail closed: reading before the middleware ran is a bug, not "all tenants".
    public IReadOnlyList<Guid> TenantIds =>
        _tenantIds ?? throw new InvalidOperationException("Tenant scope was not set for this request.");

    internal void Set(IReadOnlyList<Guid> tenantIds)
    {
        if (tenantIds.Count == 0)
            throw new InvalidOperationException("Tenant scope cannot be empty.");
        _tenantIds = tenantIds;
    }
}

public sealed class TenantAuthorizationMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(
        HttpContext http, TenantContext tenant, IMembershipStore memberships, ILogger<TenantAuthorizationMiddleware> logger)
    {
        var userId = http.User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null) { http.Response.StatusCode = StatusCodes.Status401Unauthorized; return; }

        // The access layer decides the scope: the user's memberships, optionally narrowed by a requested tenant.
        var allowed = await memberships.TenantIdsForUserAsync(Guid.Parse(userId), http.RequestAborted);
        var requested = http.Request.Headers["X-Tenant-Id"].FirstOrDefault();

        IReadOnlyList<Guid> scope = requested is null
            ? allowed
            : Guid.TryParse(requested, out var id) && allowed.Contains(id) ? [id] : [];

        if (scope.Count == 0) { http.Response.StatusCode = StatusCodes.Status403Forbidden; return; }

        tenant.Set(scope);
        Activity.Current?.SetTag("tenant.id", string.Join(',', scope));
        using (logger.BeginScope(new Dictionary<string, object> { ["tenant.id"] = string.Join(',', scope) }))
        {
            await next(http);
        }
    }
}
```

Registration:

```csharp
builder.Services.AddScoped<TenantContext>();
builder.Services.AddScoped<ITenantContext>(sp => sp.GetRequiredService<TenantContext>());

var app = builder.Build();
app.UseAuthentication();
app.UseAuthorization();
app.UseMiddleware<TenantAuthorizationMiddleware>();
```

### Resolving with Finbuckle.MultiTenant

```csharp
builder.Services.AddMultiTenant<TenantInfo>()
    .WithClaimStrategy("tenant_id")        // default claim type is "__tenant__"
    .WithHostStrategy("__tenant__.*")      // fallback: acme.app.test → "acme"
    .WithConfigurationStore();             // or an EF Core / distributed-cache store

var app = builder.Build();
app.UseMultiTenant();                      // before anything that needs the tenant
app.UseAuthentication();
app.UseAuthorization();

// Bridge Finbuckle's resolved tenant into ITenantContext — after checking membership.
app.Use(async (http, next) =>
{
    var info = http.GetMultiTenantContext<TenantInfo>()?.TenantInfo;
    var tenant = http.RequestServices.GetRequiredService<TenantContext>();
    var memberships = http.RequestServices.GetRequiredService<IMembershipStore>();
    var userId = Guid.Parse(http.User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    if (info is null || !Guid.TryParse(info.Id, out var tenantId)
        || !await memberships.IsMemberAsync(userId, tenantId, http.RequestAborted))
    {
        http.Response.StatusCode = StatusCodes.Status403Forbidden;
        return;
    }

    tenant.Set([tenantId]);
    await next(http);
});
```

### The tenant-scoped transaction (EF Core, shared with Dapper)

```csharp
public sealed class AppDbContext(DbContextOptions<AppDbContext> options, ITenantContext tenant)
    : DbContext(options)
{
    public DbSet<Project> Projects => Set<Project>();

    // Read per query; EF Core parameterizes context members used in filters.
    private IReadOnlyList<Guid> TenantIds => tenant.TenantIds;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Project>(e =>
        {
            e.ToTable("projects");
            e.Property(p => p.Id).HasColumnName("id");
            e.Property(p => p.TenantId).HasColumnName("tenant_id");
            e.Property(p => p.Name).HasColumnName("name");
            // Convenience only — the RLS policy is what isolates tenants.
            e.HasQueryFilter("TenantFilter", p => TenantIds.Contains(p.TenantId));
        });
    }
}

public sealed class TenantScope(AppDbContext db, ITenantContext tenant)
{
    public async Task<T> ExecuteInTenantScopeAsync<T>(
        Func<AppDbContext, CancellationToken, Task<T>> work, CancellationToken ct = default)
    {
        await using var tx = await db.Database.BeginTransactionAsync(ct);

        // Guid[] → uuid[] → text; parameterized, never concatenated.
        Guid[] ids = [.. tenant.TenantIds];
        await db.Database.ExecuteSqlAsync(
            $"select set_config('app.tenant_ids', {ids}::uuid[]::text, true)", ct);

        var result = await work(db, ct);
        await tx.CommitAsync(ct);
        return result;
    }
}

// Usage: EF Core and Dapper in the same scoped transaction
var summary = await scope.ExecuteInTenantScopeAsync(async (db, ct) =>
{
    var projects = await db.Projects.OrderBy(p => p.Name).ToListAsync(ct);

    var conn = db.Database.GetDbConnection();
    var tx = db.Database.CurrentTransaction!.GetDbTransaction();
    var count = await conn.ExecuteScalarAsync<long>("select count(*) from projects", transaction: tx);

    return (projects, count);
}, ct);
```

### The same helper on `NpgsqlDataSource` (no EF Core)

```csharp
public static class TenantScopeExtensions
{
    public static async Task<T> WithTenantsAsync<T>(
        this NpgsqlDataSource dataSource,
        IReadOnlyCollection<Guid> tenantIds,
        Func<NpgsqlConnection, NpgsqlTransaction, Task<T>> work,
        CancellationToken ct = default)
    {
        if (tenantIds.Count == 0)
            throw new InvalidOperationException("Tenant scope cannot be empty.");

        await using var conn = await dataSource.OpenConnectionAsync(ct);
        await using var tx = await conn.BeginTransactionAsync(ct);

        await using (var cmd = new NpgsqlCommand(
            "select set_config('app.tenant_ids', $1::uuid[]::text, true)", conn, tx))
        {
            cmd.Parameters.Add(new NpgsqlParameter { Value = tenantIds.ToArray() });
            await cmd.ExecuteNonQueryAsync(ct);
        }

        var result = await work(conn, tx);
        await tx.CommitAsync(ct);
        return result;
    }
}
```

### Setting the scope from an interceptor

```csharp
public sealed class TenantScopeTransactionInterceptor(ITenantContext tenant) : DbTransactionInterceptor
{
    public override async ValueTask<DbTransaction> TransactionStartedAsync(
        DbConnection connection, TransactionEndEventData eventData, DbTransaction result,
        CancellationToken cancellationToken = default)
    {
        await using var cmd = connection.CreateCommand();
        cmd.Transaction = result;
        cmd.CommandText = "select set_config('app.tenant_ids', $1::uuid[]::text, true)";
        cmd.Parameters.Add(new NpgsqlParameter { Value = tenant.TenantIds.ToArray() });
        await cmd.ExecuteNonQueryAsync(cancellationToken);
        return result;
    }
}

builder.Services.AddScoped<TenantScopeTransactionInterceptor>();
builder.Services.AddDbContext<AppDbContext>((sp, o) => o
    .UseNpgsql(builder.Configuration.GetConnectionString("App"))   // connects as app_user
    .AddInterceptors(sp.GetRequiredService<TenantScopeTransactionInterceptor>()));
```

### The policy in an EF Core migration

```csharp
public partial class AddProjectsRowLevelSecurity : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
            ALTER TABLE projects FORCE ROW LEVEL SECURITY;

            CREATE POLICY tenant_isolation ON projects
                FOR ALL TO app_user
                USING (tenant_id = ANY (coalesce(nullif(current_setting('app.tenant_ids', true), '')::uuid[], '{}')))
                WITH CHECK (tenant_id = ANY (coalesce(nullif(current_setting('app.tenant_ids', true), '')::uuid[], '{}')));

            GRANT SELECT, INSERT, UPDATE, DELETE ON projects TO app_user;
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            DROP POLICY tenant_isolation ON projects;
            ALTER TABLE projects NO FORCE ROW LEVEL SECURITY;
            ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
            """);
    }
}

// Apply with the owner role, not the app role:
// dotnet ef database update --connection "<app_owner connection string>"
```

### Queue consumer: one scope per message

```csharp
public sealed class ProjectEventsConsumer(
    IServiceScopeFactory scopes, IMessageSource source, ILogger<ProjectEventsConsumer> logger)
    : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await foreach (var message in source.ReadAllAsync(stoppingToken))
        {
            await using var scope = scopes.CreateAsyncScope();

            // The envelope carries the tenant; set by a trusted producer, not by the end user.
            scope.ServiceProvider.GetRequiredService<TenantContext>().Set([message.TenantId]);

            using (logger.BeginScope(new Dictionary<string, object> { ["tenant.id"] = message.TenantId }))
            {
                var tenantScope = scope.ServiceProvider.GetRequiredService<TenantScope>();
                await tenantScope.ExecuteInTenantScopeAsync(
                    (db, ct) => HandleAsync(db, message, ct), stoppingToken);
            }
        }
    }

    private static Task<bool> HandleAsync(AppDbContext db, ProjectEvent message, CancellationToken ct) =>
        Task.FromResult(true); // domain logic
}
```

The two-tenant integration test that proves all of this (xUnit + Testcontainers.PostgreSql, asserting `PostgresErrorCodes.InsufficientPrivilege`) is in [Testing Tenant Isolation](../../software-engineering/databases/multi-tenancy/testing-tenant-isolation.md).

---

## When to use

- ASP.NET Core APIs or workers on PostgreSQL with tenants sharing tables.
- Finbuckle.MultiTenant when tenants are resolved from several sources (host, route, claim) or need per-tenant options, authentication settings, or connection strings.
- EF Core global query filters on top of RLS, for clean LINQ and correct results in tests that bypass the database policy.
- A `DbTransactionInterceptor` as a second line of defense so no EF Core transaction starts without a scope.

## When NOT to use

- Query filters (yours or Finbuckle's) as the **only** isolation — `IgnoreQueryFilters()`, raw SQL, Dapper, and reporting tools go straight past them.
- Finbuckle when the tenant always comes from one token claim — a small middleware is less to learn and upgrade.
- ABP Framework or Orchard Core just for multi-tenancy — you adopt the whole application framework, its module system, and its conventions.
- `AddDbContextPool` for contexts that depend on the scoped tenant, or a `DbConnectionInterceptor` that sets a session-level scope on open.
- Migrations run with the application's connection string — the app role must never own tables.

---

## References

- [Finbuckle.MultiTenant — Getting Started](https://www.finbuckle.com/MultiTenant/Docs/GettingStarted)
- [Finbuckle.MultiTenant — Strategies](https://www.finbuckle.com/MultiTenant/Docs/Strategies)
- [Finbuckle.MultiTenant — EF Core data isolation](https://www.finbuckle.com/MultiTenant/Docs/EFCore)
- [Microsoft Learn — EF Core Global Query Filters](https://learn.microsoft.com/en-us/ef/core/querying/filters)
- [Microsoft Learn — Multi-tenancy in EF Core](https://learn.microsoft.com/en-us/ef/core/miscellaneous/multitenancy)
- [Microsoft Learn — EF Core Interceptors](https://learn.microsoft.com/en-us/ef/core/logging-events-diagnostics/interceptors)
- [Npgsql — Connection String Parameters](https://www.npgsql.org/doc/connection-string-parameters.html)
- [Npgsql — Performance (connection reset)](https://www.npgsql.org/doc/performance.html)
- [PostgreSQL — Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
