# Stateful and Stateless Architectures

Where a service keeps its state — and the patterns and frameworks that let it keep state safely.

Start with the [Overview](overview.md) for the vocabulary, the trade-offs, and the spectrum from fully stateless to fully stateful. The [Actor Model](actor-model.md) is the best-known way to build a stateful service on purpose; [Stateful Patterns](stateful-patterns.md) covers the alternatives.

---

## Articles

| Article | Description |
|---|---|
| [Overview](overview.md) | Stateless vs stateful services — trade-offs, the spectrum between them, and how to choose |
| [Actor Model](actor-model.md) | Isolated actors that own state and talk by messages; classic vs virtual actors, and the frameworks that implement them |
| [Stateful Patterns](stateful-patterns.md) | Externalized state, sticky sessions, partitioned ownership, durable execution, stateful streams |

---

## Implementations by stack

| Stack | Article |
|---|---|
| Go | [Stateless and Stateful Services in Go](../../../languages/go/stateful-services.md) |
| Node.js | [Stateless and Stateful Services in Node.js](../../../languages/javascript-typescript/runtimes/nodejs/stateful-services.md) |
| .NET | [Stateless and Stateful Services in .NET](../../../languages/csharp/stateful-services.md) |
