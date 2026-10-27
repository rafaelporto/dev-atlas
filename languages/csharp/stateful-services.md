---
type: concept
tags:
  - language
  - csharp
  - dotnet
  - backend
  - concurrency
related:
  - software-engineering/architecture/stateful-and-stateless/overview
  - software-engineering/architecture/stateful-and-stateless/actor-model
  - software-engineering/architecture/stateful-and-stateless/stateful-patterns
  - languages/csharp/async-and-concurrency
  - languages/csharp/csharp-patterns
  - languages/csharp/deploy
language: "csharp"
---
# Stateless and Stateful Services in .NET

> ASP.NET Core is stateless by design, but .NET also has the most mature stateful options of any mainstream stack — Orleans, Akka.NET, Dapr actors, and Durable Functions.

---

## What is it?

This article applies the [stateless vs stateful distinction](../../software-engineering/architecture/stateful-and-stateless/overview.md) to .NET services. ASP.NET Core handles each request independently, and the framework's own building blocks — distributed cache, Data Protection, SignalR backplanes — are designed for many identical replicas. State creeps in through three doors:

- **DI lifetimes.** A `Singleton` service with mutable fields is per-process state (see [C# patterns — Factory via DI registration](csharp-patterns.md)).
- **`IMemoryCache`** — a per-process cache.
- **`ISession` backed by the in-memory distributed cache** — per-process sessions.

On the stateful side, .NET has a full ladder of options:

1. **Stateless ASP.NET Core** with `IDistributedCache`, persisted Data Protection keys, and a SignalR backplane.
2. **Orleans** — virtual actors (grains), originally from Microsoft Research.
3. **Akka.NET** — classic actors with supervision and cluster sharding.
4. **Dapr Actors** — virtual actors through a sidecar, for polyglot platforms.
5. **Durable Functions / Durable Task** — durable orchestrations and actor-like durable entities.

---

## Why does it matter?

Running an ASP.NET Core app on more than one replica exposes the per-process defaults:

- **`IMemoryCache` diverges** between replicas — two identical requests see different data until each cache expires.
- **Sessions disappear** when they are stored with `AddDistributedMemoryCache()`, which despite its name is local to the process.
- **Data Protection keys are per-instance by default.** Cookies, antiforgery tokens, and anything protected by one replica cannot be read by another — users are logged out, forms fail with antiforgery errors — unless the key ring is persisted to shared storage.
- **SignalR without a backplane** delivers `Clients.All` and group messages only to connections on the current replica; long polling also needs sticky sessions.

---

## How it works

### 1. Stateless ASP.NET Core

Point every per-process default at shared infrastructure: `AddStackExchangeRedisCache` for `IDistributedCache` (and sessions), `PersistKeysToStackExchangeRedis` (or blob storage) for Data Protection, and `AddSignalR().AddStackExchangeRedis(...)` or Azure SignalR Service for real-time messages. Register mutable services as `Scoped`, not `Singleton`, unless their state is genuinely process-local (a connection pool, a compiled regex).

### 2. Orleans

Orleans implements the [virtual actor](../../software-engineering/architecture/stateful-and-stateless/actor-model.md) model. A **grain** is identified by an interface and a key (`IShoppingCartGrain` + `"user-42"`); it is activated on some **silo** (a host process in the cluster) on the first call and deactivated when idle. Calls to one grain are processed one at a time by default. State is declared with `IPersistentState<T>` and written to a configured storage provider (Azure Table/Blob, ADO.NET, Redis, Cosmos DB, and others). When a silo dies, the next call re-activates the grain elsewhere from its persisted state. Serializable types are marked with `[GenerateSerializer]` and `[Id(n)]`.

### 3. Akka.NET

A port of Akka: classic actors (`ReceiveActor`), explicit supervision strategies, and Akka.Cluster with **Cluster Sharding** to distribute entity actors by ID across nodes, plus Akka.Persistence for event-sourced state. More control and more concepts than Orleans; a good fit for teams that want explicit supervision trees or are coming from Akka on the JVM.

### 4. Dapr Actors

The `Dapr.Actors` and `Dapr.Actors.AspNetCore` packages host virtual actors inside an ASP.NET Core app, with the Dapr sidecar providing placement, turn-based concurrency, timers, reminders, and state. The same actors can be called from Go, Java, Python, or JavaScript services through Dapr, which is the main reason to choose it over Orleans.

### 5. Durable Functions / Durable Task

Durable Functions (on Azure Functions) and the Durable Task SDKs implement [durable execution](../../software-engineering/architecture/stateful-and-stateless/stateful-patterns.md): an **orchestrator** function is replayed from its history after a restart and continues where it stopped, with durable timers that can wait for days. **Durable entities** are small actor-like objects addressed by name and key, whose operations run one at a time and whose state is persisted automatically.

### Choosing between them

| | Orleans | Akka.NET | Dapr Actors | Durable Functions / Entities |
|---|---|---|---|---|
| Model | Virtual actors | Classic actors + sharding | Virtual actors (sidecar) | Durable orchestrations + entities |
| Hosting | Any .NET host (silo) | Any .NET host | App + Dapr sidecar (Kubernetes, self-hosted) | Azure Functions, or Durable Task SDK hosts |
| Polyglot | .NET only | .NET (Akka/Pekko on JVM are separate) | Yes | .NET, plus SDKs in other languages |
| Learning curve | Low–medium | Medium–high | Low–medium (+ Dapr ops) | Low |
| Best for | High-throughput entity state in a .NET system | Explicit supervision, streams, event sourcing | Polyglot microservices already on Dapr | Long-running workflows; light per-entity state |

---

## Examples

### Stateless configuration for multiple replicas

```csharp
var builder = WebApplication.CreateBuilder(args);
var redis = ConnectionMultiplexer.Connect(builder.Configuration.GetConnectionString("Redis")!);

builder.Services.AddSingleton<IConnectionMultiplexer>(redis);

// IDistributedCache and ISession backed by Redis, shared by every replica.
builder.Services.AddStackExchangeRedisCache(o => o.ConnectionMultiplexerFactory = () => Task.FromResult<IConnectionMultiplexer>(redis));
builder.Services.AddSession(o => o.IdleTimeout = TimeSpan.FromHours(2));

// One key ring for all replicas, so cookies and antiforgery tokens validate everywhere.
builder.Services.AddDataProtection()
    .SetApplicationName("shop")
    .PersistKeysToStackExchangeRedis(redis, "DataProtection-Keys");

// SignalR messages reach clients connected to any replica.
builder.Services.AddSignalR().AddStackExchangeRedis(builder.Configuration.GetConnectionString("Redis")!);

var app = builder.Build();
app.UseSession();
```

### A shopping cart grain with Orleans

```csharp
[GenerateSerializer]
public sealed record CartItem([property: Id(0)] string Sku, [property: Id(1)] int Quantity);

[GenerateSerializer]
public sealed class CartState
{
    [Id(0)] public List<CartItem> Items { get; set; } = [];
}

public interface IShoppingCartGrain : IGrainWithStringKey
{
    Task<IReadOnlyList<CartItem>> AddItem(CartItem item);
    Task<IReadOnlyList<CartItem>> GetItems();
}

public sealed class ShoppingCartGrain(
    [PersistentState("cart", "carts")] IPersistentState<CartState> cart)
    : Grain, IShoppingCartGrain
{
    public async Task<IReadOnlyList<CartItem>> AddItem(CartItem item)
    {
        cart.State.Items.Add(item);     // no lock: one call at a time per grain
        await cart.WriteStateAsync();   // persisted to the "carts" storage provider
        return cart.State.Items;
    }

    public Task<IReadOnlyList<CartItem>> GetItems() =>
        Task.FromResult<IReadOnlyList<CartItem>>(cart.State.Items);
}
```

```csharp
// Program.cs — co-hosted silo and API
builder.UseOrleans(silo =>
{
    silo.UseLocalhostClustering();          // production: a clustering provider (Azure, ADO.NET, Kubernetes)
    silo.AddMemoryGrainStorage("carts");    // production: a durable storage provider
});

var app = builder.Build();

app.MapPost("/cart/{userId}/items", (string userId, CartItem item, IGrainFactory grains) =>
    grains.GetGrain<IShoppingCartGrain>(userId).AddItem(item));
```

### An account actor with Akka.NET

```csharp
public sealed record Deposit(decimal Amount);
public sealed record Withdraw(decimal Amount);
public sealed record Balance(decimal Value);
public sealed record Rejected(string Reason);

public sealed class AccountActor : ReceiveActor
{
    private decimal _balance;

    public AccountActor()
    {
        Receive<Deposit>(msg =>
        {
            _balance += msg.Amount;
            Sender.Tell(new Balance(_balance));
        });

        Receive<Withdraw>(msg =>
        {
            if (msg.Amount > _balance)
            {
                Sender.Tell(new Rejected("insufficient funds"));
                return;
            }
            _balance -= msg.Amount;
            Sender.Tell(new Balance(_balance));
        });
    }
}

var system = ActorSystem.Create("bank");
var account = system.ActorOf(Props.Create<AccountActor>(), "account-42");
var balance = await account.Ask<Balance>(new Deposit(100m), TimeSpan.FromSeconds(1));
```

In a cluster, the same actor becomes a sharded entity: Cluster Sharding routes messages by account ID to whichever node hosts that entity and moves it when nodes join or leave.

### A cart actor with Dapr

```csharp
public interface ICartActor : IActor
{
    Task<List<CartItem>> AddItem(CartItem item);
}

public sealed class CartActor(ActorHost host) : Actor(host), ICartActor
{
    public async Task<List<CartItem>> AddItem(CartItem item)
    {
        var current = await StateManager.TryGetStateAsync<List<CartItem>>("items");
        var items = current.HasValue ? current.Value : [];
        items.Add(item);
        await StateManager.SetStateAsync("items", items);
        return items;
    }
}

// Program.cs
builder.Services.AddActors(o => o.Actors.RegisterActor<CartActor>());
var app = builder.Build();
app.MapActorsHandlers();

// Caller, in this or any other service
var cart = ActorProxy.Create<ICartActor>(new ActorId("user-42"), nameof(CartActor));
await cart.AddItem(new CartItem("BOOK-1", 1));
```

### A durable orchestration and a durable entity

```csharp
public static class Provisioning
{
    [Function(nameof(ProvisionAccount))]
    public static async Task ProvisionAccount([OrchestrationTrigger] TaskOrchestrationContext context)
    {
        var customerId = context.GetInput<string>()!;
        var accountId = await context.CallActivityAsync<string>(nameof(CreateAccount), customerId);
        await context.CallActivityAsync(nameof(SendWelcome), customerId);

        // Durable timer: the function unloads and resumes in seven days, even across deploys.
        await context.CreateTimer(context.CurrentUtcDateTime.AddDays(7), CancellationToken.None);

        if (!await context.CallActivityAsync<bool>(nameof(HasLoggedIn), accountId))
        {
            await context.CallActivityAsync(nameof(SendReminder), customerId);
        }
    }
}

public sealed class LoginCounter : TaskEntity<int>
{
    public void Add(int amount) => State += amount;   // operations run one at a time per entity key

    [Function(nameof(LoginCounter))]
    public static Task Run([EntityTrigger] TaskEntityDispatcher dispatcher) =>
        dispatcher.DispatchAsync<LoginCounter>();
}
```

---

## When to use

- **Stateless ASP.NET Core** — the default for web APIs and MVC/Razor apps running more than one replica; always persist Data Protection keys once there are two.
- **Orleans** — a .NET system with many entities that each need hot state and serial updates: carts, devices, game sessions, user presence.
- **Akka.NET** — when you want explicit supervision, Akka Streams, or event-sourced entities with Akka.Persistence, or the team already knows Akka.
- **Dapr Actors** — a polyglot platform where non-.NET services must call the same actors, or Dapr is already deployed.
- **Durable Functions / Durable Task** — long-running workflows, fan-out/fan-in, human-approval steps, and light per-entity state, especially on Azure.

---

## When NOT to use

- **`Singleton` services with mutable fields, `IMemoryCache`, or in-memory sessions** as the source of truth in a multi-replica deployment.
- **Orleans or Akka.NET for CRUD** — EF Core with a stateless API is simpler to query and operate.
- **Akka.NET when virtual actors suffice** — you would be designing supervision and sharding that Orleans gives you implicitly.
- **Dapr Actors in a .NET-only system** without other Dapr needs — Orleans runs in-process, without a sidecar to operate.
- **Durable entities for high-frequency state** — each operation goes through the durable backend; they suit coordination and counters, not thousands of updates per second per entity.
- **Durable orchestrations with non-deterministic code** — `DateTime.UtcNow`, `Guid.NewGuid()`, or direct I/O in an orchestrator break replay; use `context.CurrentUtcDateTime`, `context.NewGuid()`, and activities.

---

## References

- [Microsoft Learn — Orleans overview](https://learn.microsoft.com/en-us/dotnet/orleans/overview)
- [Microsoft Learn — Grain persistence](https://learn.microsoft.com/en-us/dotnet/orleans/grains/grain-persistence/)
- [Microsoft Learn — Distributed caching in ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/performance/caching/distributed)
- [Microsoft Learn — Configure ASP.NET Core Data Protection](https://learn.microsoft.com/en-us/aspnet/core/security/data-protection/configuration/overview)
- [Microsoft Learn — Durable Functions overview](https://learn.microsoft.com/en-us/azure/azure-functions/durable/durable-functions-overview)
- [Akka.NET documentation](https://getakka.net/)
- [Dapr — .NET SDK actors](https://docs.dapr.io/developing-applications/sdks/dotnet/dotnet-actors/)
