# Onion Architecture

> Organize the system as concentric rings, with the domain model at the center and infrastructure at the outermost ring. All dependencies point inward.

Introduced by Jeffrey Palermo in 2008.

---

## What is it?

Onion Architecture is a layered approach where each ring can only depend on rings closer to the center. The domain model — the purest business concept — sits at the core and depends on nothing else.

```
┌─────────────────────────────────────────────────┐
│               Infrastructure                    │  ← DB, HTTP, messaging, UI
│   ┌─────────────────────────────────────────┐   │
│   │            Application Services         │   │  ← Use cases, workflows
│   │   ┌─────────────────────────────────┐   │   │
│   │   │        Domain Services          │   │   │  ← Domain logic spanning entities
│   │   │   ┌─────────────────────────┐   │   │   │
│   │   │   │      Domain Model       │   │   │   │  ← Entities, Value Objects, Aggregates
│   │   │   │    (no dependencies)    │   │   │   │
│   │   │   └─────────────────────────┘   │   │   │
│   │   └─────────────────────────────────┘   │   │
│   └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘

          Dependencies always point inward →
```

## The rings

### Domain Model (innermost)

Pure business concepts: Entities, Value Objects, Aggregates. Zero dependencies — no framework imports, no infrastructure references.

```python
# Pure domain — no imports from outer rings
class Money:
    def __init__(self, amount: Decimal, currency: str):
        if amount < 0:
            raise ValueError("Amount cannot be negative")
        self.amount = amount
        self.currency = currency

    def add(self, other: "Money") -> "Money":
        if self.currency != other.currency:
            raise ValueError("Currency mismatch")
        return Money(self.amount + other.amount, self.currency)


class Order:
    def __init__(self, id: OrderId, customer_id: CustomerId):
        self.id = id
        self.customer_id = customer_id
        self._items: list[OrderItem] = []
        self.status = "DRAFT"

    def add_item(self, product: Product, quantity: int):
        if self.status != "DRAFT":
            raise DomainError("Cannot modify a confirmed order")
        self._items.append(OrderItem(product, quantity))

    def total(self) -> Money:
        return sum((i.subtotal() for i in self._items), Money(Decimal(0), "USD"))
```

### Domain Services

Business logic that does not naturally fit inside one entity. Still pure domain — no infrastructure.

```python
class PricingService:
    def calculate_discount(self, order: Order, customer: Customer) -> Money:
        if customer.is_premium() and order.total().amount > Decimal("100"):
            return Money(order.total().amount * Decimal("0.10"), "USD")
        return Money(Decimal("0"), "USD")
```

### Application Services

Orchestrate use cases by coordinating domain objects and calling repository interfaces (defined in this ring, implemented in the outermost ring).

```python
# Repository interface defined here — not in infrastructure
class OrderRepository(ABC):
    @abstractmethod
    def find_by_id(self, order_id: OrderId) -> Optional[Order]: ...

    @abstractmethod
    def save(self, order: Order): ...


# Application Service
class PlaceOrderApplicationService:
    def __init__(
        self,
        order_repo: OrderRepository,   # depends on interface, not DB
        pricing: PricingService,
        event_bus: EventBus,
    ):
        self._order_repo = order_repo
        self._pricing = pricing
        self._event_bus = event_bus

    def place_order(self, command: PlaceOrderCommand) -> OrderId:
        order = Order(OrderId.generate(), command.customer_id)
        for item in command.items:
            order.add_item(item.product, item.quantity)

        self._order_repo.save(order)
        self._event_bus.publish(OrderPlaced(order.id))
        return order.id
```

### Infrastructure (outermost)

Implements the interfaces defined in the inner rings. This is the only ring allowed to depend on frameworks, ORMs, HTTP libraries, and external services.

```python
# Implements the interface from Application Services ring
class PostgresOrderRepository(OrderRepository):
    def find_by_id(self, order_id: OrderId) -> Optional[Order]:
        row = self._db.query("SELECT * FROM orders WHERE id = %s", str(order_id))
        return Order.from_row(row) if row else None

    def save(self, order: Order):
        self._db.execute("INSERT INTO orders ...", order.to_row())


# HTTP adapter
class OrderController:
    def __init__(self, service: PlaceOrderApplicationService):
        self._service = service

    def post(self, request: HttpRequest) -> HttpResponse:
        command = PlaceOrderCommand.from_dict(request.body)
        order_id = self._service.place_order(command)
        return HttpResponse(201, {"order_id": str(order_id)})
```

## Onion vs Hexagonal vs Layered

| | Layered | Hexagonal | Onion |
|---|---|---|---|
| Coined by | — | Cockburn (2005) | Palermo (2008) |
| Core concept | Horizontal layers | Ports & Adapters | Concentric rings |
| Dependency rule | Top → Bottom | Outside → Core | Outside → Inside |
| Domain model isolation | Variable | Good | Explicit, strict |
| Infrastructure position | Shared bottom layer | Outer adapters | Outermost ring |

Onion is conceptually close to Hexagonal. The key difference is that Onion explicitly separates the Domain Model from Domain Services and Application Services into distinct rings, while Hexagonal focuses on the port/adapter boundary without prescribing the internal structure.

## When to use

- Complex business domains that benefit from a protected, framework-free core.
- Long-lived systems where the domain model must evolve independently of infrastructure.
- When combining with DDD — the rings map naturally to DDD layers.

## When NOT to use

- Simple CRUD services without rich domain logic.
- Small teams or projects where the ring structure adds overhead without benefit.

## References

- Palermo, Jeffrey. [The Onion Architecture](https://jeffreypalermo.com/2008/07/the-onion-architecture-part-1/) (2008).
- [Onion Architecture in Practice — Microsoft Docs](https://learn.microsoft.com/en-us/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/)
