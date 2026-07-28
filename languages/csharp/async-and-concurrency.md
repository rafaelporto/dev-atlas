---
type: concept
tags:
  - language
  - csharp
  - backend
  - async
  - concurrency
related:
  - languages/csharp/overview
  - languages/csharp/error-handling
  - languages/csharp/linq-and-collections
language: "csharp"
---
# Async and Concurrency

> C# builds asynchrony into the language with `async`/`await` over `Task`, and layers parallelism, channels, and async streams on top for concurrent and high-throughput work.

---

## What is it?

C# has first-class **asynchronous programming**. A method marked `async` can `await` operations that take time (I/O, network, timers) without blocking the calling thread. The compiler rewrites the method into a state machine that suspends at each `await` and resumes when the awaited work completes.

The unit of asynchronous work is a **`Task`** (`Task<T>` when it returns a value). On top of tasks, .NET provides the Task Parallel Library (TPL) for CPU parallelism, `Channel<T>` for producer/consumer pipelines, and `IAsyncEnumerable<T>` for streaming sequences.

---

## Why does it matter?

Server workloads are dominated by waiting — for databases, HTTP calls, and disks. Blocking a thread while waiting wastes it; under load, a thread-per-request server exhausts its thread pool and stalls. `async`/`await` frees the thread during the wait, so a handful of threads can service thousands of concurrent requests.

C# introduced this model in 2012, and it proved influential enough that JavaScript, Python, Rust, and Swift adopted the same `async`/`await` keywords. Getting it right is essential for scalable .NET back ends.

---

## How it works

### async / await

```csharp
public async Task<string> FetchAsync(HttpClient client, string url)
{
    // control returns to the caller here while the request is in flight
    var response = await client.GetAsync(url);
    response.EnsureSuccessStatusCode();
    return await response.Content.ReadAsStringAsync();
}
```

Rules of thumb:

- **`async` all the way** — an async method should be awaited by an async caller; do not block on it.
- **Return `Task`/`Task<T>`**, and use `async Task` (not `async void`) except for event handlers.
- **Never call `.Result` or `.Wait()`** on a task in application code — it blocks the thread and risks deadlocks.

### Running work concurrently

`await` one at a time is sequential. To run tasks concurrently, start them all, then await together:

```csharp
// sequential — total time = sum of both
var a = await GetUserAsync(id);
var b = await GetOrdersAsync(id);

// concurrent — total time = max of both
var userTask = GetUserAsync(id);
var ordersTask = GetOrdersAsync(id);
await Task.WhenAll(userTask, ordersTask);
var user = await userTask;
var orders = await ordersTask;
```

### Cancellation

`CancellationToken` is the idiomatic way to cancel async work cooperatively. Pass it down the call chain:

```csharp
public async Task ProcessAsync(CancellationToken ct)
{
    await Task.Delay(TimeSpan.FromSeconds(1), ct);
    ct.ThrowIfCancellationRequested();
    await DoWorkAsync(ct);
}
```

### CPU-bound parallelism (TPL)

For work that burns CPU rather than waiting, use parallel constructs. `Task.Run` offloads to the thread pool; `Parallel.ForEachAsync` fans work out across cores:

```csharp
await Parallel.ForEachAsync(urls, async (url, ct) =>
{
    var content = await FetchAsync(client, url);
    await SaveAsync(content, ct);
});
```

### Async streams — `IAsyncEnumerable<T>`

Stream results as they arrive instead of buffering everything, using `await foreach`:

```csharp
public async IAsyncEnumerable<Order> StreamOrdersAsync(
    [EnumeratorCancellation] CancellationToken ct = default)
{
    await foreach (var row in _db.QueryStreamAsync(ct))
        yield return Map(row);
}

// consumer
await foreach (var order in StreamOrdersAsync(ct))
    Handle(order);
```

### Channels — producer/consumer

`System.Threading.Channels` gives a thread-safe, backpressure-aware queue connecting producers to consumers:

```csharp
var channel = Channel.CreateBounded<WorkItem>(capacity: 100);

// producer
await channel.Writer.WriteAsync(item, ct);
channel.Writer.Complete();

// consumer
await foreach (var item in channel.Reader.ReadAllAsync(ct))
    await ProcessAsync(item, ct);
```

---

## Examples

An async service that fetches from several sources concurrently, honours cancellation, and aggregates the results:

```csharp
public sealed class DashboardService(HttpClient client)
{
    public async Task<Dashboard> LoadAsync(Guid userId, CancellationToken ct)
    {
        var profileTask = client.GetFromJsonAsync<Profile>($"/users/{userId}", ct);
        var statsTask   = client.GetFromJsonAsync<Stats>($"/users/{userId}/stats", ct);

        await Task.WhenAll(profileTask, statsTask);

        return new Dashboard(
            await profileTask ?? throw new InvalidOperationException("no profile"),
            await statsTask ?? Stats.Empty);
    }
}
```

---

## When to use

- **`async`/`await`** for all I/O: database calls, HTTP requests, file access, message queues.
- **`Task.WhenAll`** to run independent async operations concurrently.
- **`Parallel.*` / `Task.Run`** for CPU-bound work you want spread across cores.
- **`IAsyncEnumerable<T>`** to stream large or unbounded sequences without buffering.
- **`Channel<T>`** for in-process producer/consumer pipelines with backpressure.

---

## When NOT to use

- **Do not use async for trivial CPU work** — the state-machine overhead outweighs the benefit; keep it synchronous.
- **Do not block on async code** (`.Result`, `.Wait()`, `.GetAwaiter().GetResult()`) in app code — it wastes a thread and can deadlock in some contexts.
- **Do not use `async void`** except for event handlers — its exceptions cannot be caught by the caller.
- **Do not use `Task.Run` to wrap I/O** — awaiting the async I/O method directly is both simpler and more scalable.

---

## References

- [Asynchronous programming with async and await — Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/csharp/asynchronous-programming/)
- [Task-based asynchronous pattern (TAP) — Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/standard/asynchronous-programming-patterns/task-based-asynchronous-pattern-tap)
- [Task Parallel Library (TPL) — Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/standard/parallel-programming/task-parallel-library-tpl)
- [System.Threading.Channels — Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/core/extensions/channels)
