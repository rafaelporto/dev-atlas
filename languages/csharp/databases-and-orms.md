---
type: concept
tags:
  - language
  - csharp
  - database
  - backend
related:
  - languages/csharp/overview
  - languages/csharp/linq-and-collections
  - languages/csharp/async-and-concurrency
language: "csharp"
---
# Databases and ORMs

> .NET offers a full ORM (Entity Framework Core), a micro-ORM (Dapper), and raw ADO.NET — a spectrum from maximum productivity to maximum control.

---

## What is it?

C# talks to relational databases through three layers of abstraction:

- **ADO.NET** — the low-level foundation (`DbConnection`, `DbCommand`, `DbDataReader`). Every higher tool is built on it.
- **Dapper** — a micro-ORM: you write the SQL, Dapper maps result rows to C# objects.
- **Entity Framework Core (EF Core)** — a full object-relational mapper: you model entities as classes, query with LINQ, and EF Core generates SQL, tracks changes, and manages migrations.

All three are asynchronous and work across SQL Server, PostgreSQL, SQLite, MySQL, and more via providers.

---

## Why does it matter?

The choice sets the trade-off between productivity and control. EF Core lets you build data access fast with LINQ, change tracking, and schema migrations — at the cost of some SQL transparency and overhead. Dapper gives you exact SQL and near-hand-written performance, at the cost of writing and maintaining that SQL. ADO.NET gives total control and is rarely used directly once the others exist.

Picking correctly per project — or mixing them (EF Core for CRUD, Dapper for hot read paths) — is a common real-world decision.

---

## How it works

### Entity Framework Core

Define entities and a `DbContext`, then query with LINQ:

```csharp
public class Blog
{
    public int Id { get; set; }
    public required string Title { get; set; }
    public List<Post> Posts { get; set; } = [];
}

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Blog> Blogs => Set<Blog>();
    public DbSet<Post> Posts => Set<Post>();
}

// query — translated to SQL, executed on the server
var recent = await db.Blogs
    .Where(b => b.Posts.Count > 5)
    .OrderByDescending(b => b.Id)
    .Include(b => b.Posts)
    .ToListAsync(ct);

// write — change tracking + one SaveChanges
db.Blogs.Add(new Blog { Title = "Hello" });
await db.SaveChangesAsync(ct);
```

Register it with DI and a provider:

```csharp
builder.Services.AddDbContext<AppDbContext>(o =>
    o.UseNpgsql(builder.Configuration.GetConnectionString("Default")));
```

### Migrations

EF Core generates and applies schema changes from your model:

```bash
dotnet ef migrations add InitialCreate
dotnet ef database update
```

### Dapper

You own the SQL; Dapper handles parameterization and mapping:

```csharp
using var conn = new NpgsqlConnection(connectionString);

var blogs = await conn.QueryAsync<Blog>(
    "SELECT id, title FROM blogs WHERE post_count > @min",
    new { min = 5 });

await conn.ExecuteAsync(
    "INSERT INTO blogs (title) VALUES (@Title)",
    new { Title = "Hello" });
```

Parameters (`@min`, `@Title`) are always sent as SQL parameters — never string-concatenated — which is the built-in defence against SQL injection.

### ADO.NET (raw)

The underlying API the others wrap:

```csharp
await using var conn = new NpgsqlConnection(connectionString);
await conn.OpenAsync(ct);

await using var cmd = new NpgsqlCommand("SELECT title FROM blogs WHERE id = @id", conn);
cmd.Parameters.AddWithValue("id", id);

await using var reader = await cmd.ExecuteReaderAsync(ct);
while (await reader.ReadAsync(ct))
    Console.WriteLine(reader.GetString(0));
```

---

## Choosing between them

| | EF Core | Dapper | ADO.NET |
|---|---|---|---|
| Abstraction | Full ORM | Micro-ORM | Raw |
| You write SQL | Rarely (LINQ) | Always | Always |
| Change tracking | Yes | No | No |
| Migrations | Built-in | No | No |
| Performance | Good | Near-raw | Raw |
| Best for | CRUD apps, rich domains | Read-heavy, tuned queries | Full control, rare |

A common hybrid: EF Core for writes and normal CRUD, Dapper for performance-critical read queries and reports.

---

## Examples

A repository using EF Core for writes and Dapper for a tuned read:

```csharp
public sealed class OrderRepository(AppDbContext db, IDbConnection conn)
{
    // EF Core: change-tracked write
    public async Task AddAsync(Order order, CancellationToken ct)
    {
        db.Orders.Add(order);
        await db.SaveChangesAsync(ct);
    }

    // Dapper: hand-tuned read for a hot dashboard query
    public Task<IEnumerable<OrderSummary>> TopAsync(int limit) =>
        conn.QueryAsync<OrderSummary>(
            """
            SELECT customer_id AS CustomerId, SUM(amount) AS Total
            FROM orders
            GROUP BY customer_id
            ORDER BY Total DESC
            LIMIT @limit
            """,
            new { limit });
}
```

---

## When to use

- **EF Core** — most applications: CRUD, rich domain models, when migrations and change tracking save time.
- **Dapper** — read-heavy paths, reporting queries, and anywhere you need precise, hand-tuned SQL with minimal overhead.
- **ADO.NET directly** — bulk operations, streaming huge result sets, or providers/features the higher layers do not expose.
- **Always use parameters** — never build SQL by string concatenation.

---

## When NOT to use

- **Do not reach for raw ADO.NET by default** — Dapper gives the same control with far less boilerplate.
- **Do not fight EF Core with complex hand-shaped SQL** — if a query is easier to write in SQL, use Dapper for it instead of contorting LINQ.
- **Do not ignore EF Core's generated SQL** — profile it; naive LINQ can produce N+1 queries (use `Include` / projections).
- **Never concatenate user input into SQL** — it is a SQL-injection vulnerability; use parameters in every layer.

---

## References

- [Entity Framework Core documentation — Microsoft Learn](https://learn.microsoft.com/en-us/ef/core/)
- [EF Core migrations — Microsoft Learn](https://learn.microsoft.com/en-us/ef/core/managing-schemas/migrations/)
- [ADO.NET overview — Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/framework/data/adonet/ado-net-overview)
- [Dapper — official repository](https://github.com/DapperLib/Dapper)
