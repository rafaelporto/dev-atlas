---
type: concept
tags:
  - language
  - csharp
  - backend
  - error-handling
related:
  - languages/csharp/overview
  - languages/csharp/types-and-nullability
  - languages/csharp/async-and-concurrency
language: "csharp"
---
# Error Handling

> C# signals failure with exceptions — objects thrown up the call stack and caught with `try`/`catch`/`finally` — reserved for exceptional conditions rather than ordinary control flow.

---

## What is it?

Unlike Go, which returns errors as values, C# uses **exceptions**. When something goes wrong, code `throw`s an object derived from `System.Exception`. The runtime unwinds the call stack until it finds a matching `catch` block; `finally` blocks run on the way out regardless of success or failure.

Exceptions carry a message, a stack trace, and optionally an `InnerException`, forming a chain that records what failed and where.

---

## Why does it matter?

Exceptions separate the **happy path** from error handling: the main logic reads cleanly, and failure handling lives in dedicated blocks. They cannot be silently ignored the way a returned error code can — an unhandled exception crashes the program loudly rather than corrupting state quietly.

The trade-off is cost and discipline. Throwing is relatively expensive, so idiomatic C# reserves exceptions for genuinely exceptional situations and uses ordinary return values (or the `Try...` pattern) for expected, routine failures.

---

## How it works

### try / catch / finally

```csharp
try
{
    var content = File.ReadAllText(path);
    Process(content);
}
catch (FileNotFoundException ex)
{
    logger.LogWarning(ex, "File {Path} missing", path);
}
catch (IOException ex)
{
    logger.LogError(ex, "I/O failure reading {Path}", path);
    throw;              // rethrow preserving the original stack trace
}
finally
{
    // always runs — cleanup, release resources
}
```

`throw;` (bare) rethrows preserving the stack trace. `throw ex;` resets it — avoid that.

### Exception filters (`when`)

C# 6 added `when` filters that catch only when a condition holds, without entering and leaving the block:

```csharp
try
{
    await CallApiAsync();
}
catch (HttpRequestException ex) when (ex.StatusCode == HttpStatusCode.TooManyRequests)
{
    await BackOffAndRetryAsync();
}
```

### Deterministic cleanup — `using` and `IDisposable`

Types holding unmanaged resources (files, sockets, DB connections) implement `IDisposable`. The `using` statement guarantees `Dispose()` runs, even on exceptions:

```csharp
// using declaration (C# 8): disposed at end of enclosing scope
using var stream = File.OpenRead(path);
var data = ReadAll(stream);
// stream.Dispose() called automatically here
```

### Custom exceptions

Derive from `Exception`, and chain the cause via `InnerException`:

```csharp
public sealed class DataAccessException : Exception
{
    public DataAccessException(string message, Exception inner)
        : base(message, inner) { }
}

// wrap a lower-level failure with domain context
catch (SqlException ex)
{
    throw new DataAccessException($"Failed loading order {orderId}", ex);
}
```

### The `Try` pattern — for expected failures

For failures that are routine rather than exceptional, expose a `bool Try...(out T result)` method instead of throwing:

```csharp
if (int.TryParse(input, out var number))
    Use(number);
else
    ReportInvalidInput();
```

---

## Examples

A service method that translates infrastructure exceptions into a domain exception:

```csharp
public async Task<Order> GetOrderAsync(Guid id, CancellationToken ct)
{
    try
    {
        return await _repository.FindAsync(id, ct)
            ?? throw new KeyNotFoundException($"Order {id} not found");
    }
    catch (DbException ex)
    {
        // preserve the cause as InnerException
        throw new DataAccessException($"Failed loading order {id}", ex);
    }
}
```

Global handling in ASP.NET Core keeps `try`/`catch` out of every controller:

```csharp
app.UseExceptionHandler("/error");   // one place maps exceptions to HTTP responses
```

---

## When to use

- **Throw** for genuinely exceptional conditions: violated invariants, unreachable states, unrecoverable I/O failures, invalid arguments at public boundaries.
- **Catch specific exception types**, most specific first, and only when you can meaningfully handle them.
- **Use `when` filters** to catch conditionally without unwinding for cases you cannot handle.
- **Use `using`/`IDisposable`** for every resource that must be released.

---

## When NOT to use

- **Do not use exceptions for control flow** — expected outcomes (item not found, input invalid) belong in return values or the `Try` pattern; throwing is slow and obscures intent.
- **Do not catch `Exception` broadly and swallow it** — an empty `catch` hides bugs; at minimum log and rethrow.
- **Do not use `throw ex;`** — it resets the stack trace; use bare `throw;`.
- **Do not catch what you cannot handle** — let it propagate to a boundary that can log and translate it.

---

## References

- [Exceptions and exception handling — Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/exceptions/)
- [Best practices for exceptions — Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/standard/exceptions/best-practices-for-exceptions)
- [Exception-handling statements (try/catch/finally) — Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/statements/exception-handling-statements)
- [using statement — Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/statements/using)
