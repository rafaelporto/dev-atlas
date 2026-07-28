---
type: concept
tags:
  - language
  - csharp
  - backend
  - declarative
related:
  - languages/csharp/overview
  - languages/csharp/paradigms
  - languages/csharp/databases-and-orms
language: "csharp"
---
# LINQ and Collections

> LINQ lets you write declarative, composable queries over collections, databases, and other data sources with one consistent syntax; the collection types underneath choose the right data structure for the job.

---

## What is it?

**LINQ** (Language-Integrated Query) is a set of standard query operators — `Where`, `Select`, `OrderBy`, `GroupBy`, `Aggregate`, and dozens more — that work over any type implementing `IEnumerable<T>`. It comes in two syntaxes: fluent **method syntax** (`.Where(...).Select(...)`) and SQL-like **query syntax** (`from x in xs where ... select ...`). Both compile to the same calls.

The **collections** LINQ operates on live in `System.Collections.Generic`: `List<T>`, `Dictionary<TKey,TValue>`, `HashSet<T>`, `Queue<T>`, `Stack<T>`, and the read-only and immutable variants.

---

## Why does it matter?

Before LINQ, transforming data meant nested loops, temporary lists, and manual bookkeeping. LINQ replaces that with a readable pipeline that states *what* you want, not *how* to compute it. The same query operators work on in-memory lists (LINQ to Objects) and on databases through Entity Framework Core (LINQ to Entities), where they are translated to SQL.

Picking the right collection type is equally important: using a `List<T>` for membership checks that a `HashSet<T>` would answer in O(1) is a common, avoidable performance mistake.

---

## How it works

### Deferred execution

Most LINQ operators are **lazy**: they build a query but do not run until you enumerate it (`foreach`, `ToList()`, `Count()`, `First()`). This lets you compose stages cheaply and only pay when you materialize.

```csharp
var query = numbers.Where(n => n > 0).Select(n => n * 2); // nothing runs yet
var results = query.ToList();                              // executes now
```

### Common operators

```csharp
var orders = GetOrders();

// filter + project
var summaries = orders
    .Where(o => o.Total > 100m)
    .Select(o => new { o.Id, o.Total });

// group + aggregate
var byCustomer = orders
    .GroupBy(o => o.CustomerId)
    .Select(g => new { Customer = g.Key, Total = g.Sum(o => o.Total) });

// ordering, paging
var page = orders
    .OrderByDescending(o => o.CreatedAt)
    .Skip(20)
    .Take(10);

// scalar results
var count   = orders.Count(o => o.IsPaid);
var biggest = orders.MaxBy(o => o.Total);
var exists  = orders.Any(o => o.Total > 1_000m);
```

### Query syntax

```csharp
var summaries =
    from o in orders
    where o.Total > 100m
    orderby o.CreatedAt descending
    select new { o.Id, o.Total };
```

### Choosing a collection

| Type | Best for | Lookup |
|---|---|---|
| `List<T>` | ordered, index-accessed sequences | O(n) search, O(1) index |
| `Dictionary<TKey,TValue>` | key/value lookup | O(1) average |
| `HashSet<T>` | membership / uniqueness | O(1) average |
| `Queue<T>` / `Stack<T>` | FIFO / LIFO processing | — |
| `IReadOnlyList<T>` | expose without allowing mutation | — |
| `ImmutableList<T>` etc. | shared, never-mutated data | — |

### Collection expressions (C# 12)

Modern C# initializes collections with a unified `[...]` syntax:

```csharp
int[] numbers = [1, 2, 3];
List<string> names = ["a", "b", "c"];
int[] combined = [..numbers, 4, 5];   // spread
```

---

## Examples

A small analytics pipeline mixing filtering, grouping, and aggregation:

```csharp
record Sale(string Region, string Product, decimal Amount);

IReadOnlyList<RegionReport> Report(IEnumerable<Sale> sales) =>
    sales
        .GroupBy(s => s.Region)
        .Select(g => new RegionReport(
            Region: g.Key,
            Total: g.Sum(s => s.Amount),
            TopProduct: g.MaxBy(s => s.Amount)!.Product))
        .OrderByDescending(r => r.Total)
        .ToList();

record RegionReport(string Region, decimal Total, string TopProduct);
```

Using the right collection for fast lookups:

```csharp
var bannedIds = new HashSet<Guid>(bannedList);   // build once
var allowed = users.Where(u => !bannedIds.Contains(u.Id)); // O(1) per check
```

---

## When to use

- **LINQ** for data transformation, filtering, grouping, and aggregation where clarity matters.
- **`HashSet<T>`/`Dictionary<>`** whenever you do repeated membership or key lookups.
- **Immutable/read-only collections** to expose data you do not want callers to mutate.
- **Query syntax** for complex joins and `let` clauses; method syntax for everything else.

---

## When NOT to use

- **Do not chain LINQ in measured hot paths** — each stage allocates an iterator and delegate; a plain loop is faster where profiling shows it matters.
- **Do not enumerate a lazy query multiple times** unintentionally — each enumeration re-runs it (and re-hits the database); materialize with `ToList()` once if you reuse it.
- **Do not use `List.Contains` for frequent membership tests** — switch to `HashSet<T>`.
- **Do not call `.Count()` on an `IEnumerable` you will also enumerate** — it may iterate twice.

---

## References

- [Language Integrated Query (LINQ) — Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/csharp/linq/)
- [Standard query operators overview — Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/csharp/linq/standard-query-operators/)
- [Collections and Data Structures — Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/standard/collections/)
- [Collection expressions — Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/operators/collection-expressions)
