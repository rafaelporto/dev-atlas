---
type: concept
tags:
  - language
  - csharp
  - design-pattern
  - creational
  - structural
  - behavioral
related:
  - languages/csharp/overview
  - languages/csharp/paradigms
  - languages/csharp/error-handling
language: "csharp"
---
# C# Patterns

> C# expresses the classic GoF patterns through built-in language and framework features — the DI container, `IDisposable`, records, and pattern matching — so idiomatic code often needs less scaffolding than the textbook versions.

---

## What is it?

C# patterns are idiomatic solutions to recurring design problems. They fall into two groups:

1. **GoF adaptations** — classic Gang of Four patterns, but expressed through C#'s language features and the .NET framework rather than hand-built class hierarchies.
2. **C#/.NET idioms** — patterns that emerged from the platform itself: the built-in dependency injection container, the Options pattern, `IDisposable`/`using`, and pattern matching.

Recognizing them makes unfamiliar C# code readable and keeps your own code aligned with the ecosystem's conventions.

---

## Why does it matter?

Much of the "pattern" work in other languages is already provided by .NET. The framework ships a DI container, so you rarely hand-roll a Factory or Service Locator. Records give you value objects for free. `switch` expressions with patterns replace Visitor-style dispatch. Using the built-in mechanism instead of reinventing it produces less code that other C# developers immediately understand.

---

## GoF Pattern Adaptations

### Factory via DI registration

The .NET dependency injection container is the idiomatic factory. You register how to build a type once; the container constructs it (and its dependencies) on demand.

```csharp
builder.Services.AddSingleton<IClock, SystemClock>();
builder.Services.AddScoped<IOrderService, OrderService>();
builder.Services.AddTransient<IEmailSender, SmtpEmailSender>();

// consumers receive dependencies via constructor injection
public sealed class OrderService(IClock clock, IEmailSender email) : IOrderService
{
    // clock and email are supplied by the container
}
```

**Frequency:** Universal in ASP.NET Core and any host-based app.

### Singleton via DI lifetime

C# has no need for the classic double-checked-locking singleton. Register the service as `Singleton` and the container guarantees one instance:

```csharp
builder.Services.AddSingleton<CacheService>();
```

For a rare non-DI singleton, `Lazy<T>` is thread-safe by default:

```csharp
private static readonly Lazy<Config> _config = new(() => Config.Load());
public static Config Current => _config.Value;
```

**Frequency:** Common for shared, stateless services and caches.

### Builder via object initializers and `with`

Object initializers and record `with` expressions cover most Builder needs without a separate builder class:

```csharp
var options = new DbOptions
{
    ConnectionString = cs,
    Timeout = TimeSpan.FromSeconds(30),
    RetryCount = 3,
};

var updated = options with { RetryCount = 5 }; // records only
```

For fluent, staged construction (e.g. ASP.NET Core's `WebApplicationBuilder`), a dedicated builder is still idiomatic.

**Frequency:** Common.

### Strategy via interface or delegate

Pass behaviour as an interface (injected) or as a `Func<>`/delegate:

```csharp
public interface IPricingStrategy { decimal Price(Order order); }

public sealed class Checkout(IPricingStrategy pricing)
{
    public decimal Total(Order order) => pricing.Price(order);
}

// or, lightweight, as a delegate
public sealed class Checkout2(Func<Order, decimal> price)
{
    public decimal Total(Order order) => price(order);
}
```

**Frequency:** Common — any behaviour that varies at runtime.

### Decorator via DI

Wrap a registered service to add behaviour (caching, logging, retries) without touching the original:

```csharp
public sealed class CachingRepository(IRepository inner, IMemoryCache cache) : IRepository
{
    public async Task<Item?> GetAsync(Guid id) =>
        await cache.GetOrCreateAsync(id, _ => inner.GetAsync(id));
}
```

**Frequency:** Common at cross-cutting boundaries.

### Adapter via interface wrapping

Wrap a third-party type behind a local interface so the domain does not depend on the external SDK:

```csharp
public interface IMailer { Task SendAsync(string to, string subject, string body); }

public sealed class SendGridMailer(ISendGridClient client) : IMailer
{
    public Task SendAsync(string to, string subject, string body) =>
        client.SendEmailAsync(BuildMessage(to, subject, body));
}
```

**Frequency:** Common at every integration boundary.

### Observer via events or `IObservable<T>`

C# has language-level `event`s; for reactive streams, `IObservable<T>` (System.Reactive) or `IAsyncEnumerable<T>` apply.

```csharp
public sealed class Downloader
{
    public event EventHandler<int>? ProgressChanged;
    private void Report(int pct) => ProgressChanged?.Invoke(this, pct);
}
```

**Frequency:** Common in UI and event-driven code.

---

## C# / .NET Idioms

### The Options pattern

The idiomatic way to bind strongly-typed configuration and inject it. Bind a section of configuration to a class, then inject `IOptions<T>`:

```csharp
public sealed class SmtpOptions
{
    public required string Host { get; init; }
    public int Port { get; init; } = 587;
}

builder.Services.Configure<SmtpOptions>(builder.Configuration.GetSection("Smtp"));

public sealed class SmtpEmailSender(IOptions<SmtpOptions> options)
{
    private readonly SmtpOptions _opts = options.Value;
}
```

**Frequency:** Universal for configuration in host-based apps.

### Dispose pattern with `using`

Deterministic resource cleanup. Implement `IDisposable` (or `IAsyncDisposable`) and let `using` call `Dispose` automatically:

```csharp
public sealed class TempFile : IDisposable
{
    public string Path { get; } = System.IO.Path.GetTempFileName();
    public void Dispose() => File.Delete(Path);
}

using var temp = new TempFile();     // deleted at end of scope
```

**Frequency:** Universal for files, connections, streams.

### Pattern matching over type hierarchies

`switch` expressions with type and property patterns replace visitor-style dispatch and long `if` chains:

```csharp
static decimal Area(Shape shape) => shape switch
{
    Circle c    => (decimal)(Math.PI * c.Radius * c.Radius),
    Square { Side: var s } => s * s,
    Rectangle r => r.Width * r.Height,
    _           => throw new ArgumentException("unknown shape"),
};
```

**Frequency:** Common wherever behaviour depends on a runtime type or shape.

### Result-returning `Try` methods

For expected failures, expose `bool TryX(out T value)` instead of throwing (see [Error Handling](error-handling.md)):

```csharp
if (cache.TryGetValue(key, out var value))
    Use(value);
```

**Frequency:** Common for parsing, lookups, and caches.

---

## Quick Reference

| Pattern | Category | .NET mechanism | Frequency |
|---|---|---|---|
| Factory | Creational | DI container registration | Universal |
| Singleton | Creational | `AddSingleton` / `Lazy<T>` | Common |
| Builder | Creational | Object initializers / `with` | Common |
| Strategy | Behavioral | Interface or `Func<>` injection | Common |
| Decorator | Structural | Wrapping a registered service | Common |
| Adapter | Structural | Local interface over external SDK | Common |
| Observer | Behavioral | `event` / `IObservable<T>` | Common |
| Options | .NET idiom | `Configure<T>` + `IOptions<T>` | Universal |
| Dispose | .NET idiom | `IDisposable` + `using` | Universal |
| Pattern matching dispatch | .NET idiom | `switch` expression + patterns | Common |
| Try pattern | .NET idiom | `bool TryX(out T)` | Common |

---

## How it works

C# rarely hand-builds pattern scaffolding because the platform already provides the seams:

- **The built-in DI container** is the factory and lifetime manager: registrations decide whether a type is a Singleton, Scoped, or Transient, and constructor injection wires collaborators together. This absorbs Factory, Singleton, and Service Locator.
- **Interfaces and delegates (`Func<>`)** are the abstraction seam behind Strategy, Adapter, Decorator, and Observer — you wrap or inject an implementation rather than subclass.
- **Language features collapse ceremony**: `record` + `with` cover value objects and much of Builder, `switch` expressions with patterns replace Visitor-style dispatch, and `IDisposable` + `using` give deterministic cleanup.

So an idiomatic C# "pattern" is usually a registration plus an interface, not a bespoke class hierarchy.

---

## Examples

One flow combining several idioms — records for data, a Strategy interface and a Decorator both registered in DI, the Options pattern for config, and a `switch` expression over a result:

```csharp
public record Order(Guid Id, decimal Subtotal);

public interface IPricingStrategy { decimal Price(Order order); }
public sealed class TenPercentOff : IPricingStrategy
{
    public decimal Price(Order order) => order.Subtotal * 0.9m;
}

public interface IRates { decimal TaxFor(Guid orderId); }

// Decorator: adds caching over any IRates
public sealed class CachingRates(IRates inner, IMemoryCache cache) : IRates
{
    public decimal TaxFor(Guid id) =>
        cache.GetOrCreate(id, _ => inner.TaxFor(id));
}

public sealed class CheckoutOptions { public bool AllowZero { get; init; } }

public sealed class Checkout(
    IPricingStrategy pricing, IRates rates, IOptions<CheckoutOptions> options)
{
    public string Charge(Order order)
    {
        decimal total = pricing.Price(order) * (1 + rates.TaxFor(order.Id));
        return (total, options.Value.AllowZero) switch
        {
            ( > 0, _)      => $"charged {total}",
            (0, true)      => "charged nothing",
            _              => "rejected",
        };
    }
}

// Wiring in Program.cs
builder.Services.Configure<CheckoutOptions>(builder.Configuration.GetSection("Checkout"));
builder.Services.AddSingleton<IPricingStrategy, TenPercentOff>();
builder.Services.AddSingleton<IRates>(sp =>
    new CachingRates(new FlatRates(), sp.GetRequiredService<IMemoryCache>()));
builder.Services.AddScoped<Checkout>();
```

---

## When to use

- **Factory / Singleton via DI** — the default for any host-based (ASP.NET Core) app; let the container own construction and lifetime.
- **Strategy (interface or `Func<>`)** — behaviour that varies at runtime, e.g. pricing or formatting.
- **Decorator / Adapter** — cross-cutting concerns (caching, logging, retries) and wrapping third-party SDKs behind a local interface.
- **Options pattern** — strongly-typed configuration in host-based apps.
- **`IDisposable`/`using`, pattern-matching `switch`, `Try` methods** — resource cleanup, type/shape dispatch, and expected-failure returns.

---

## When NOT to use

- **Hand-rolled double-checked-locking Singletons** — register `AddSingleton` (or use `Lazy<T>`) instead.
- **A separate Builder class** where object initializers or record `with` already suffice.
- **Throwing exceptions for expected, routine failures** — prefer a `bool TryX(out T)` method.
- **A formal pattern for a shape that appears once** — wait for repetition before abstracting.
- **`IObservable<T>`/`event` plumbing** where a simple method call or `IAsyncEnumerable<T>` is clearer.

---

## References

- [Dependency injection in .NET — Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/core/extensions/dependency-injection)
- [Options pattern in .NET — Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/core/extensions/options)
- [Implementing a Dispose method — Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/standard/garbage-collection/implementing-dispose)
- [Pattern matching — Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/functional/pattern-matching)
- *Design Patterns: Elements of Reusable Object-Oriented Software* — Gamma, Helm, Johnson, Vlissides (Addison-Wesley, 1994)
