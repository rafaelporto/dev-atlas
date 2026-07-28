---
type: concept
tags:
  - language
  - csharp
  - object-oriented
  - functional
  - imperative
related:
  - languages/csharp/overview
  - languages/csharp/types-and-nullability
  - languages/csharp/linq-and-collections
language: "csharp"
---
# C# Paradigms

> C# is a multi-paradigm language: object-oriented at its core, with mature functional and imperative styles that most modern code blends together.

---

## What is it?

A paradigm is a style of structuring programs. C# does not force a single one. It began as a class-based object-oriented language in the mould of Java, but every release since C# 3.0 has added functional capabilities — LINQ, lambdas, immutability, pattern matching — until modern idiomatic C# freely mixes styles within the same method.

The three paradigms that matter in day-to-day C# are **object-oriented**, **functional**, and **imperative**.

---

## Why does it matter?

Knowing which paradigm a piece of code leans on tells you how to read and extend it. A data-transformation pipeline written with LINQ reads declaratively; a stateful service written with classes and interfaces reads object-oriented; a tight loop reads imperatively.

Choosing the right style per problem — immutable records and LINQ for data flow, interfaces and DI for architecture, plain loops for hot paths — is what separates idiomatic modern C# from code that fights the language.

---

## How it works

### Object-oriented

C# supports single inheritance of classes, multiple interface implementation, encapsulation via access modifiers, and polymorphism through `virtual`/`override`. Interfaces (including default interface members since C# 8) define contracts; dependency injection wires implementations together.

```csharp
public interface INotifier
{
    Task NotifyAsync(string message);
}

public sealed class EmailNotifier : INotifier
{
    public Task NotifyAsync(string message) =>
        Task.CompletedTask; // send email...
}

// Depend on the abstraction, not the concrete type
public sealed class OrderService(INotifier notifier)
{
    public async Task PlaceOrderAsync(Order order)
    {
        // ...
        await notifier.NotifyAsync($"Order {order.Id} placed");
    }
}
```

C# favours **composition and interfaces over deep inheritance hierarchies**. `sealed` classes are common; broad `abstract` base-class trees are discouraged.

### Functional

Functions are values (delegates, `Func<>`, `Action<>`), collections are transformed with LINQ, and data is modelled with immutable records. Pattern matching replaces long `if`/`switch` ladders.

```csharp
Func<int, int> square = x => x * x;

var result = numbers
    .Where(n => n % 2 == 0)
    .Select(square)
    .Sum();

// Pattern matching + expression form
static string Describe(object value) => value switch
{
    null            => "nothing",
    int n when n < 0 => "negative",
    int              => "an integer",
    string s         => $"text of length {s.Length}",
    _                => "something else",
};
```

Records give value-based equality and non-destructive mutation with `with`:

```csharp
public record Point(int X, int Y);

var a = new Point(1, 2);
var b = a with { Y = 5 }; // new instance, a is unchanged
```

### Imperative

Under the declarative surface, C# is still an imperative language: statements, mutable locals, loops, and explicit control flow. This is the right style for performance-critical code where you want tight control over allocation and iteration.

```csharp
var total = 0;
for (var i = 0; i < items.Length; i++)
{
    total += items[i].Price;
}
```

---

## Examples

Idiomatic C# blends paradigms. A service class (OOP) whose method transforms data with LINQ (functional) and falls back to a manual loop only where profiling demands it (imperative):

```csharp
public sealed class ReportService(IOrderRepository repository)
{
    public async Task<IReadOnlyList<CustomerTotal>> TopCustomersAsync(int limit)
    {
        var orders = await repository.GetRecentAsync();

        return orders
            .GroupBy(o => o.CustomerId)
            .Select(g => new CustomerTotal(g.Key, g.Sum(o => o.Amount)))
            .OrderByDescending(t => t.Total)
            .Take(limit)
            .ToList();
    }
}

public record CustomerTotal(Guid CustomerId, decimal Total);
```

---

## When to use

- **Object-oriented** — for application architecture: services, boundaries, dependency injection, and anywhere polymorphism models real variation in behaviour.
- **Functional** — for data transformation, pipelines, immutable domain models, and anywhere you want expressions over statements.
- **Imperative** — for performance hot paths, low-level algorithms, and simple sequential logic where a loop is clearest.

---

## When NOT to use

- **Do not force deep inheritance** — prefer interfaces and composition; reach for inheritance only when there is a genuine "is-a" relationship with shared implementation.
- **Do not overuse LINQ in hot paths** — chained LINQ allocates iterators and delegates; a plain loop is faster and clearer for tight, measured bottlenecks.
- **Do not mutate shared state functionally** — immutability only helps if you actually avoid side effects; a record you mutate through escape hatches gives the worst of both worlds.

---

## References

- [A tour of the C# language — Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/csharp/tour-of-csharp/)
- [Functional programming vs. imperative programming — Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/standard/linq/functional-vs-imperative-programming)
- [Pattern matching — Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/functional/pattern-matching)
- [Object-oriented programming (C#) — Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/tutorials/oop)
