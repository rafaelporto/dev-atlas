# Hexagonal Architecture

> Isolate the application core from the outside world through ports and adapters, so the core can be tested and used independently of any external system.

Also known as **Ports and Adapters**, coined by Alistair Cockburn in 2005.

---

## What is it?

Hexagonal Architecture divides the system into three parts:

1. **Application Core** — contains business logic; knows nothing about databases, HTTP, or messaging.
2. **Ports** — interfaces defined by the core that describe how it wants to communicate with the outside world.
3. **Adapters** — implementations of those interfaces that connect the core to real external systems (DB, HTTP, queues, etc.).

```
                    ┌─────────────────────────────────┐
  REST Controller ──► (Driving Adapter)               │
                    │                                 │
  CLI Command ──────► Port (Input)  APPLICATION       │
                    │               CORE              │
  Scheduler ────────► (Driving      (domain logic,    │
                    │  Adapter)     use cases)        │
                    │                    │            │
                    │               Port (Output)     │
                    │                    │            │
                    └────────────────────┼────────────┘
                                         │
                         ┌───────────────┼───────────────┐
                         │               │               │
                    DB Adapter    Message Adapter    Email Adapter
                    (Driven)       (Driven)          (Driven)
```

The hexagon shape is symbolic — it emphasizes that there is no "top" or "bottom", only the core and its ports.

## Ports

**Ports are interfaces**, not implementations. They are defined by the core and belong to it.

- **Driving Ports (Input Ports)** — the core exposes these for external actors to *drive* the application. Example: `PlaceOrderUseCase`.
- **Driven Ports (Output Ports)** — the core defines these and calls them when it needs external services. Example: `OrderRepository`, `NotificationSender`.

## Adapters

**Adapters implement ports**. They live outside the core.

- **Driving Adapters** — receive external requests and translate them into calls to driving ports. Examples: REST controllers, gRPC handlers, CLI commands, Kafka consumers.
- **Driven Adapters** — implement driven ports using real infrastructure. Examples: PostgreSQL repository, SMTP email sender, S3 file storage.

## Pseudo-code

```python
# ── CORE ──────────────────────────────────────────────────────

# Driving Port (Input Port) — defined by the core
class PlaceOrderUseCase(ABC):
    @abstractmethod
    def execute(self, command: PlaceOrderCommand) -> OrderId: ...


# Driven Port (Output Port) — defined by the core, implemented outside
class OrderRepository(ABC):
    @abstractmethod
    def save(self, order: Order): ...

class PaymentGateway(ABC):
    @abstractmethod
    def charge(self, amount: Money, card_token: str) -> PaymentId: ...


# Core implementation — depends only on other ports (interfaces)
class PlaceOrderService(PlaceOrderUseCase):
    def __init__(self, repo: OrderRepository, payment: PaymentGateway):
        self._repo = repo
        self._payment = payment

    def execute(self, command: PlaceOrderCommand) -> OrderId:
        order = Order.create(command.customer_id, command.items)
        payment_id = self._payment.charge(order.total(), command.card_token)
        order.confirm(payment_id)
        self._repo.save(order)
        return order.id


# ── ADAPTERS ──────────────────────────────────────────────────

# Driving Adapter — REST
class OrderController:
    def __init__(self, use_case: PlaceOrderUseCase):   # depends on port, not impl
        self._use_case = use_case

    def post(self, request: HttpRequest) -> HttpResponse:
        command = PlaceOrderCommand.from_dict(request.body)
        order_id = self._use_case.execute(command)
        return HttpResponse(201, {"order_id": str(order_id)})


# Driven Adapter — PostgreSQL
class PostgresOrderRepository(OrderRepository):
    def save(self, order: Order):
        self._db.execute("INSERT INTO orders ...", order.to_row())


# Driven Adapter — Stripe
class StripePaymentGateway(PaymentGateway):
    def charge(self, amount: Money, card_token: str) -> PaymentId:
        result = self._stripe_client.charge(amount.cents, card_token)
        return PaymentId(result["id"])


# Driven Adapter — In-Memory (for tests)
class InMemoryOrderRepository(OrderRepository):
    def __init__(self):
        self._store: dict = {}

    def save(self, order: Order):
        self._store[order.id] = order
```

### Testing without any real infrastructure

```python
def test_place_order_confirms_order():
    repo = InMemoryOrderRepository()
    payment = FakePaymentGateway(payment_id="PAY-001")
    service = PlaceOrderService(repo, payment)

    command = PlaceOrderCommand(customer_id="C1", items=[...], card_token="tok_test")
    order_id = service.execute(command)

    saved = repo.find_by_id(order_id)
    assert saved.status == "CONFIRMED"
    assert saved.payment_id == "PAY-001"
```

The core is fully tested with no database, no HTTP, no external service.

## Dependency direction

```
REST Controller ──► PlaceOrderUseCase (port) ◄── PlaceOrderService
                                                        │
                                           OrderRepository (port)
                                                        ▲
                                           PostgresOrderRepository
```

All dependencies point **inward** — toward the core. The core never imports from adapters.

## When to use

- You need to test business logic without spinning up real infrastructure.
- You want to swap technical components (e.g., change database, add a new channel) without touching the core.
- The application has complex business rules worth protecting from technical concerns.

## When NOT to use

- Simple CRUD services with minimal logic — the port/adapter overhead is not justified.
- Small scripts or prototypes where the extra structure slows development.

## References

- Cockburn, Alistair. [Hexagonal Architecture](https://alistair.cockburn.us/hexagonal-architecture/) (2005).
- [Hexagonal Architecture — Netflix Tech Blog](https://netflixtechblog.com)
- Freeman & Pryce. *Growing Object-Oriented Software, Guided by Tests*. Addison-Wesley, 2009.
