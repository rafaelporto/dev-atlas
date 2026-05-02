# Architecture

Architectural styles define how a system is organized at a high level — how responsibilities are separated, how components communicate, and how the system evolves over time.

---

## Articles

| Article | Description |
|---|---|
| [Layered Architecture](layered.md) | Classic N-tier separation of concerns |
| [Hexagonal Architecture](hexagonal.md) | Ports and Adapters — isolate the core from external systems |
| [Onion Architecture](onion.md) | Concentric layers with the domain model at the center |
| [Clean Architecture](clean.md) | Dependency rule and use-case-centric design by Uncle Bob |
| [Microservices](microservices.md) | System decomposed into independently deployable services |
| [Event-Driven Architecture](event-driven.md) | Components communicate through events asynchronously |
| [CQRS](cqrs.md) | Separate read and write models for scalability and clarity |
| [Event Sourcing](event-sourcing.md) | Store state as an immutable sequence of events |

---

> These styles are not mutually exclusive. A microservices system can use Hexagonal Architecture inside each service. CQRS and Event Sourcing are frequently combined.
