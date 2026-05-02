# Layered Architecture

> Organize the application into horizontal layers, each with a specific responsibility. Each layer communicates only with the layer directly below it.

---

## What is it?

Layered Architecture (also called N-Tier Architecture) is the most common architectural style for enterprise applications. Responsibilities are divided into distinct layers stacked on top of each other. The most classic form has four layers:

```
┌──────────────────────────────────┐
│        Presentation Layer        │  ← UI, REST controllers, CLI
├──────────────────────────────────┤
│         Application Layer        │  ← Use cases, workflows
├──────────────────────────────────┤
│           Domain Layer           │  ← Business rules, entities
├──────────────────────────────────┤
│        Infrastructure Layer      │  ← DB, messaging, external APIs
└──────────────────────────────────┘
```

Each layer only calls the layer directly below it. The Presentation layer never talks directly to the Infrastructure layer.

## Why does it matter?

- **Separation of concerns**: each layer has one responsibility.
- **Replaceability**: you can swap the database without touching business logic.
- **Familiarity**: it is the most widely known and documented pattern. Most developers understand it immediately.

## How it works

### Presentation Layer

Handles input/output. For a REST API, this is the HTTP controllers. It transforms external requests into calls to the Application Layer and formats responses.

```python
# REST controller (Presentation)
class OrderController:
    def __init__(self, order_service: OrderService):
        self._service = order_service

    def post_order(self, request: HttpRequest) -> HttpResponse:
        command = PlaceOrderCommand(
            customer_id=request.body["customer_id"],
            items=request.body["items"],
        )
        order = self._service.place_order(command)
        return HttpResponse(201, order.to_dict())
```

### Application Layer

Orchestrates use cases. It coordinates domain objects but contains no business rules itself.

```python
# Application service
class OrderService:
    def place_order(self, command: PlaceOrderCommand) -> Order:
        customer = self._customer_repo.find_by_id(command.customer_id)
        order = Order.create(customer, command.items)
        self._order_repo.save(order)
        self._event_bus.publish(OrderPlaced(order.id))
        return order
```

### Domain Layer

Contains the core business rules. Entities, value objects, aggregates, domain services. No dependencies on any other layer.

```python
# Domain entity
class Order:
    @classmethod
    def create(cls, customer: Customer, items: list[Item]) -> "Order":
        if not items:
            raise ValueError("An order must have at least one item.")
        return cls(id=OrderId.generate(), customer=customer, items=items)

    def total(self) -> Money:
        return sum(item.subtotal() for item in self.items)
```

### Infrastructure Layer

Implements technical concerns: database access, external API clients, message brokers, email, caching.

```python
# Repository implementation (Infrastructure)
class PostgresOrderRepository:
    def save(self, order: Order):
        self._db.execute(
            "INSERT INTO orders (id, customer_id, total) VALUES (%s, %s, %s)",
            (order.id, order.customer.id, order.total().amount)
        )
```

## The strict vs. relaxed variant

| Variant | Rule | Trade-off |
|---|---|---|
| **Strict** | Layer N can only call layer N-1 | Safer, more decoupled |
| **Relaxed** | Any layer can call any lower layer | Less boilerplate, more coupling |

Most real projects use the relaxed variant, allowing the Presentation layer to call the Domain layer directly for read-only queries.

## When to use

- Standard CRUD applications and enterprise systems.
- Teams already familiar with the pattern.
- When you want a well-understood structure with clear responsibilities.

## When NOT to use

- When the Domain Layer ends up as a thin pass-through with no real logic — this is the "Anemic Domain Model" anti-pattern; switch to a richer domain model approach.
- When you need finer control over dependency direction — consider Hexagonal or Clean Architecture instead.
- When database-centrism bleeds upward (the DB schema drives the domain model rather than the other way around).

## References

- Fowler, Martin. *Patterns of Enterprise Application Architecture*. Addison-Wesley, 2002.
- [Microsoft — N-tier architecture style](https://learn.microsoft.com/en-us/azure/architecture/guide/architecture-styles/n-tier)
