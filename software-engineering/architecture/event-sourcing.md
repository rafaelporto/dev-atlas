# Event Sourcing

> Instead of storing the current state of an entity, store the full sequence of events that led to that state. The current state is derived by replaying the events.

---

## What is it?

In traditional persistence, you update a row in the database when state changes. The previous state is lost. Event Sourcing inverts this: every change is recorded as an immutable event in an append-only **event store**. The current state is computed by replaying all events for an entity.

```
Traditional persistence:
  Order: { status: SHIPPED, total: 99.90 }   ← only current snapshot

Event Sourcing:
  1. OrderCreated    { order_id, customer_id, items }
  2. PaymentReceived { order_id, payment_id, amount: 99.90 }
  3. OrderShipped    { order_id, tracking_number }

  Current state = replay events 1 + 2 + 3
```

## Why does it matter?

- **Full audit trail**: every state change is recorded — when, what, and why.
- **Time travel**: rebuild the state of any entity at any point in time.
- **Event replay**: rebuild read models, fix bugs by reprocessing history, add new projections retroactively.
- **Debugging**: reproduce bugs by replaying the exact sequence of events that caused them.

## Core concepts

### Event

An immutable record of something that happened. Contains enough data to reconstruct the state change.

```python
@dataclass(frozen=True)
class OrderCreated:
    event_id: str
    order_id: str
    customer_id: str
    items: list[dict]
    occurred_at: datetime


@dataclass(frozen=True)
class PaymentReceived:
    event_id: str
    order_id: str
    payment_id: str
    amount: float
    occurred_at: datetime


@dataclass(frozen=True)
class OrderShipped:
    event_id: str
    order_id: str
    tracking_number: str
    occurred_at: datetime
```

### Aggregate with event sourcing

Instead of mutating state directly, the aggregate records events and applies them.

```python
class Order:
    def __init__(self):
        self.id = None
        self.customer_id = None
        self.items = []
        self.status = None
        self.payment_id = None
        self._uncommitted_events: list = []

    # Command methods — record events, do not mutate state directly
    def create(self, order_id: str, customer_id: str, items: list):
        if self.status is not None:
            raise DomainError("Order already created")
        self._record(OrderCreated(
            event_id=uuid(),
            order_id=order_id,
            customer_id=customer_id,
            items=items,
            occurred_at=datetime.utcnow(),
        ))

    def receive_payment(self, payment_id: str, amount: float):
        if self.status != "PENDING":
            raise DomainError("Cannot receive payment in current state")
        self._record(PaymentReceived(
            event_id=uuid(),
            order_id=self.id,
            payment_id=payment_id,
            amount=amount,
            occurred_at=datetime.utcnow(),
        ))

    def ship(self, tracking_number: str):
        if self.status != "PAID":
            raise DomainError("Cannot ship an unpaid order")
        self._record(OrderShipped(
            event_id=uuid(),
            order_id=self.id,
            tracking_number=tracking_number,
            occurred_at=datetime.utcnow(),
        ))

    # Apply methods — mutate state from events (used for both new and replayed events)
    def _apply_order_created(self, event: OrderCreated):
        self.id = event.order_id
        self.customer_id = event.customer_id
        self.items = event.items
        self.status = "PENDING"

    def _apply_payment_received(self, event: PaymentReceived):
        self.payment_id = event.payment_id
        self.status = "PAID"

    def _apply_order_shipped(self, event: OrderShipped):
        self.tracking_number = event.tracking_number
        self.status = "SHIPPED"

    def _record(self, event):
        self._apply(event)
        self._uncommitted_events.append(event)

    def _apply(self, event):
        handlers = {
            OrderCreated: self._apply_order_created,
            PaymentReceived: self._apply_payment_received,
            OrderShipped: self._apply_order_shipped,
        }
        handlers[type(event)](event)

    # Reconstitute from event history
    @classmethod
    def from_history(cls, events: list) -> "Order":
        order = cls()
        for event in events:
            order._apply(event)
        return order

    def pop_uncommitted_events(self) -> list:
        events = list(self._uncommitted_events)
        self._uncommitted_events.clear()
        return events
```

### Event Store

An append-only storage for events. Events are grouped by aggregate ID (the stream).

```python
class EventStore:
    def append(self, stream_id: str, events: list, expected_version: int):
        """
        stream_id: the aggregate ID (e.g., order_id)
        events: new events to append
        expected_version: optimistic concurrency — fails if stream has advanced
        """
        current_version = self._get_version(stream_id)
        if current_version != expected_version:
            raise ConcurrencyError(f"Expected version {expected_version}, got {current_version}")

        for i, event in enumerate(events):
            self._db.insert("events", {
                "stream_id": stream_id,
                "version": current_version + i + 1,
                "event_type": type(event).__name__,
                "payload": serialize(event),
                "occurred_at": event.occurred_at,
            })

    def load(self, stream_id: str) -> list:
        rows = self._db.query(
            "SELECT event_type, payload FROM events WHERE stream_id = %s ORDER BY version",
            stream_id
        )
        return [deserialize(row["event_type"], row["payload"]) for row in rows]
```

### Repository with Event Sourcing

```python
class OrderRepository:
    def __init__(self, event_store: EventStore):
        self._store = event_store

    def find_by_id(self, order_id: str) -> Order:
        events = self._store.load(order_id)
        if not events:
            raise NotFoundError(order_id)
        return Order.from_history(events)

    def save(self, order: Order, expected_version: int):
        events = order.pop_uncommitted_events()
        self._store.append(order.id, events, expected_version)
        # Optionally publish events to the event bus for projectors
        for event in events:
            self._event_bus.publish(event)
```

## Snapshots

For aggregates with long event histories, replaying thousands of events is slow. Snapshots periodically capture the current state so replay starts from a recent snapshot.

```python
def find_by_id(self, order_id: str) -> Order:
    snapshot = self._snapshot_store.load_latest(order_id)

    if snapshot:
        events = self._store.load_after(order_id, version=snapshot.version)
        order = Order.from_snapshot(snapshot)
    else:
        events = self._store.load(order_id)
        order = Order()

    for event in events:
        order._apply(event)

    if len(events) > SNAPSHOT_THRESHOLD:
        self._snapshot_store.save(order_id, order.to_snapshot())

    return order
```

## Event Sourcing + CQRS

Event Sourcing is the natural write side for CQRS. The events published by the event store feed projectors that maintain read models.

```
Command ──► Handler ──► Aggregate ──► Events ──► Event Store
                                          │
                                    Event Bus
                                          │
                            ┌─────────────┴──────────────┐
                       Projector A                  Projector B
                       (order_summaries)             (customer_orders)
                            │                            │
                       Read Store A                 Read Store B
```

## Trade-offs

| Benefit | Cost |
|---|---|
| Complete audit log by design | Querying current state requires replay or a projection |
| Time travel and event replay | Eventually consistent read models |
| New projections from historical data | Schema evolution of old events is complex |
| Natural fit for event-driven systems | Higher operational complexity |
| Enables temporal queries ("state at time T") | Learning curve for teams unfamiliar with the pattern |

## When to use

- Audit requirements: financial systems, medical records, legal compliance.
- Systems where history matters: e-commerce order lifecycle, inventory tracking.
- When you need to rebuild or add new read models from historical data.
- Combined with CQRS in event-driven, DDD-based systems.

## When NOT to use

- Systems with no need for audit trail or history.
- Simple CRUD applications — the added complexity is unjustified.
- When the team is not familiar with eventual consistency and async projections.

## References

- Young, Greg. [Event Sourcing](https://www.youtube.com/watch?v=8JKjvY4etTY) (GOTO 2014).
- Fowler, Martin. [Event Sourcing](https://martinfowler.com/eaaDev/EventSourcing.html).
- Vernon, Vaughn. *Implementing Domain-Driven Design*. Addison-Wesley, 2013. Chapter 8.
- [EventStoreDB Documentation](https://developers.eventstore.com/server/v22.10/)
