# CQRS — Command Query Responsibility Segregation

> Separate the model used to update data (Commands) from the model used to read data (Queries). Each side is optimized for its own purpose.

Originated from CQS (Command Query Separation) by Bertrand Meyer; the architectural pattern was formalized by Greg Young.

---

## What is it?

CQRS splits a system's operations into two distinct sides:

- **Command Side** — handles writes: create, update, delete. Returns no data (or just an ID). Enforces business rules through the domain model.
- **Query Side** — handles reads: returns data shaped for the UI or API consumer. Bypasses the domain model entirely.

```
         ┌─────────────┐           ┌─────────────┐
         │   Command   │           │    Query    │
         │    Side     │           │    Side     │
         │             │           │             │
  Write ─► Domain      │           │  Read Model │◄─ Read
  Ops    │ Model       │           │  (optimized │
         │             │           │   for UI)   │
         │ Write DB ◄──┤           ├──► Read DB  │
         └─────────────┘           └─────────────┘
                  │                       ▲
                  └── sync via events ────┘
```

## Why does it matter?

In most systems, reads outnumber writes by orders of magnitude. A single model that handles both is a compromise:
- The domain model is normalized (good for writes), but querying it requires many joins (bad for reads).
- The read model can be a flat, denormalized projection (fast reads), but that structure is wrong for enforcing invariants.

CQRS lets each side be optimal for its purpose.

## The Command Side

Commands express intent. They are imperative and named in the present tense: `PlaceOrder`, `CancelOrder`, `UpdateShippingAddress`.

```python
# Command — a request to change state
@dataclass
class PlaceOrderCommand:
    customer_id: str
    items: list[OrderItem]
    card_token: str


# Command Handler — validates, applies domain logic, persists
class PlaceOrderHandler:
    def __init__(self, order_repo: OrderRepository, payment: PaymentGateway):
        self._order_repo = order_repo
        self._payment = payment

    def handle(self, command: PlaceOrderCommand) -> str:
        customer = self._customer_repo.find(command.customer_id)
        order = Order.create(customer, command.items)

        payment_id = self._payment.charge(order.total(), command.card_token)
        order.confirm(payment_id)

        self._order_repo.save(order)
        return str(order.id)
```

Commands return nothing (or just a resource ID). No data is read back through the command side.

## The Query Side

Queries express data requests. They are named in the present tense as questions: `GetOrderById`, `ListOrdersByCustomer`.

```python
# Query — a request for data, no side effects
@dataclass
class GetOrderByIdQuery:
    order_id: str


# Query result — a flat DTO shaped for the consumer
@dataclass
class OrderSummaryDto:
    order_id: str
    customer_name: str
    status: str
    total: float
    items: list[dict]
    placed_at: str


# Query Handler — reads directly from the optimized read store
class GetOrderByIdHandler:
    def __init__(self, read_db: ReadDatabase):
        self._db = read_db

    def handle(self, query: GetOrderByIdQuery) -> OrderSummaryDto:
        row = self._db.query_one("""
            SELECT o.id, u.name, o.status, o.total, o.placed_at,
                   json_agg(i.*) as items
            FROM orders o
            JOIN users u ON u.id = o.customer_id
            JOIN order_items i ON i.order_id = o.id
            WHERE o.id = %s
            GROUP BY o.id, u.name, o.status, o.total, o.placed_at
        """, query.order_id)

        return OrderSummaryDto(**row)
```

The query handler does not use the domain model at all — it queries the database directly and returns a DTO.

## Synchronizing read and write models

### Single database (simple CQRS)

Both sides use the same database. The query side reads directly with optimized queries.

```
Write side ──► DB ◄── Read side (denormalized views or direct queries)
```

- Simple to implement.
- No eventual consistency.
- Read queries may still be slower than a dedicated read model.

### Separate read store (full CQRS)

The write side publishes events. The read side consumes them and maintains its own read-optimized store (e.g., a pre-computed projection in Redis or a read replica with materialized views).

```
Write side ──► Write DB ──► events ──► Projector ──► Read DB
                                                       ▲
                                                  Query side reads
```

```python
class OrderProjector:
    @subscribe("order.placed")
    def on_order_placed(self, event: OrderPlaced):
        self._read_db.upsert("order_summaries", {
            "order_id": event.order_id,
            "customer_name": self._fetch_customer_name(event.customer_id),
            "status": "PLACED",
            "total": event.total_amount,
            "placed_at": event.occurred_at.isoformat(),
        })

    @subscribe("order.shipped")
    def on_order_shipped(self, event: OrderShipped):
        self._read_db.update("order_summaries",
            where={"order_id": event.order_id},
            set={"status": "SHIPPED"},
        )
```

## CQRS + Event Sourcing

CQRS and [Event Sourcing](event-sourcing.md) are independent patterns but are often combined. Event Sourcing stores the write side as events; those same events feed the projectors that build the read model.

```
Command ──► Domain ──► Events ──► Event Store
                                       │
                               ┌───────┼───────┐
                           Projector A  B   C
                               │       │   │
                           Read Store (per projection)
```

## Trade-offs

| Benefit | Cost |
|---|---|
| Read model optimized for queries | Two models to maintain |
| Write model enforces invariants cleanly | Eventual consistency between write and read (async sync) |
| Read and write sides scale independently | More infrastructure when using separate stores |
| New projections can be built from event history | Added complexity for simple CRUD cases |

## When to use

- Read and write workloads have very different shapes (e.g., complex aggregation queries vs. transactional writes).
- You need different scaling strategies for reads and writes.
- You are already using DDD and want clean separation between use cases and queries.
- Combined with Event Sourcing for audit/replay capabilities.

## When NOT to use

- Simple CRUD applications — two models double the code with no benefit.
- When eventual consistency between read and write is unacceptable for the use case.
- Small teams where the added complexity outweighs the benefits.

## References

- Young, Greg. [CQRS Documents](https://cqrs.files.wordpress.com/2010/11/cqrs_documents.pdf) (2010).
- Fowler, Martin. [CQRS](https://martinfowler.com/bliki/CQRS.html) (2011).
- Vernon, Vaughn. *Implementing Domain-Driven Design*. Addison-Wesley, 2013. Chapter 4.
