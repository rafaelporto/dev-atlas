# Event-Driven Architecture

> Components communicate by producing and consuming events asynchronously. Producers do not know about consumers; consumers do not know about each other.

---

## What is it?

Event-Driven Architecture (EDA) is a style where the flow of the system is determined by events — records that something happened. Components are loosely coupled: producers emit events without knowing who will react, and consumers subscribe to the events they care about.

```
Producer ──► [Event Bus / Message Broker] ──► Consumer A
                                         ──► Consumer B
                                         ──► Consumer C
```

## Core concepts

### Event

A record that something happened in the domain. Named in the past tense. Immutable after creation.

```python
@dataclass(frozen=True)
class OrderPlaced:
    event_id: str
    order_id: str
    customer_id: str
    total_amount: float
    occurred_at: datetime
```

### Producer (Publisher)

Emits events after something meaningful happens. Does not know who will consume the event.

```python
class OrderService:
    def place_order(self, command: PlaceOrderCommand) -> Order:
        order = Order.create(command)
        self._order_repo.save(order)

        # Produces the event — does not call Payment, Inventory, etc. directly
        self._event_bus.publish("order.placed", OrderPlaced(
            event_id=uuid(),
            order_id=str(order.id),
            customer_id=str(order.customer_id),
            total_amount=float(order.total()),
            occurred_at=datetime.utcnow(),
        ))
        return order
```

### Consumer (Subscriber)

Reacts to events it subscribes to. Multiple consumers can independently react to the same event.

```python
class InventoryService:
    @subscribe("order.placed")
    def on_order_placed(self, event: OrderPlaced):
        for item in self._get_items(event.order_id):
            self._reserve_stock(item.product_id, item.quantity)


class NotificationService:
    @subscribe("order.placed")
    def on_order_placed(self, event: OrderPlaced):
        self._email_sender.send(
            to=self._get_email(event.customer_id),
            subject="Order confirmation",
            body=f"Your order {event.order_id} has been placed.",
        )


class AnalyticsService:
    @subscribe("order.placed")
    def on_order_placed(self, event: OrderPlaced):
        self._metrics.increment("orders.placed", tags={"currency": "USD"})
```

### Event Bus / Message Broker

Infrastructure that receives events from producers and delivers them to consumers. Common tools: Apache Kafka, RabbitMQ, AWS SQS/SNS, Google Pub/Sub.

## Event types

| Type | Description | Example |
|---|---|---|
| **Domain Event** | Something meaningful happened in the domain | `OrderPlaced`, `PaymentFailed` |
| **Integration Event** | Domain event published across service boundaries | Same, but serialized for external consumers |
| **Command Event** | Instruction to perform an action (hybrid) | `SendEmailCommand` |
| **Query Event** | Request for data via async channel | Less common; prefer sync for queries |

## Delivery guarantees

| Guarantee | Meaning | Trade-off |
|---|---|---|
| **At most once** | Event delivered 0 or 1 times — may be lost | No duplicates, but data loss possible |
| **At least once** | Event delivered 1+ times — may be duplicated | No data loss, but consumers must be idempotent |
| **Exactly once** | Event delivered exactly once | Hardest to achieve; requires distributed coordination |

> Most systems use **at least once** delivery and make consumers idempotent.

### Idempotent consumer

```python
class InventoryService:
    @subscribe("order.placed")
    def on_order_placed(self, event: OrderPlaced):
        # Check if this event was already processed
        if self._processed_events.contains(event.event_id):
            return  # skip duplicate

        self._reserve_stock(event)
        self._processed_events.mark(event.event_id)
```

## Event ordering and partitioning

Kafka guarantees ordering within a partition. Events for the same entity should go to the same partition:

```python
# Use order_id as the partition key → all events for one order are ordered
self._kafka.produce(
    topic="order.events",
    key=event.order_id,      # same key → same partition → ordered
    value=serialize(event),
)
```

## Choreography vs Orchestration

### Choreography (pure EDA)

Each service reacts to events and emits its own. No central coordinator.

```
OrderService ──► order.placed
                     ├──► InventoryService ──► stock.reserved
                     │                              └──► PaymentService ──► payment.processed
                     │                                                             └──► ShippingService
                     └──► NotificationService
```

- Pro: fully decoupled, each service is simple.
- Con: the overall flow is implicit — hard to visualize and debug.

### Orchestration (hybrid)

A saga orchestrator sends commands and waits for responses.

```
SagaOrchestrator
  ├──► reserve_stock command ──► InventoryService
  ├──► charge_payment command ──► PaymentService
  └──► schedule_delivery command ──► ShippingService
```

- Pro: flow is explicit and visible in one place.
- Con: the orchestrator becomes a central coupling point.

## When to use

- Multiple services need to react to the same event independently.
- Producer and consumer can be decoupled in time (consumer can be down and catch up later).
- You need to fan out one event to many consumers.
- You want to decouple services so they can evolve independently.

## When NOT to use

- When you need an immediate, synchronous response — use REST/gRPC.
- When the system is simple and has few components — async messaging adds latency and operational overhead.
- When strict ordering across all events is required — this is hard to guarantee at scale.

## References

- Hohpe, G. & Woolf, B. *Enterprise Integration Patterns*. Addison-Wesley, 2003.
- Fowler, Martin. [What do you mean by "Event-Driven"?](https://martinfowler.com/articles/201701-event-driven.html) (2017).
- [Apache Kafka Documentation](https://kafka.apache.org/documentation/)
