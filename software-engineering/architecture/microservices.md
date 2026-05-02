# Microservices Architecture

> Decompose an application into a set of small, independently deployable services, each owning its own data and communicating over well-defined interfaces.

---

## What is it?

Microservices is an architectural style where a system is built as a collection of independently deployable services. Each service:

- Owns a single business capability.
- Has its own database (no shared storage).
- Communicates over the network (HTTP/gRPC or messaging).
- Is deployed and scaled independently.

```
         ┌─────────────────────────────────────────────┐
         │               API Gateway                   │
         └────────┬────────────┬───────────────┬───────┘
                  │            │               │
          ┌───────▼──┐  ┌──────▼───┐  ┌───────▼──┐
          │  Order   │  │ Payment  │  │ Shipping │
          │ Service  │  │ Service  │  │ Service  │
          └───────┬──┘  └──────┬───┘  └───────┬──┘
                  │            │               │
              ┌───▼──┐    ┌────▼──┐       ┌───▼──┐
              │ DB   │    │  DB   │       │  DB  │
              └──────┘    └───────┘       └──────┘
```

## Core principles

### Single Responsibility per Service

Each service maps to one bounded context (see [DDD](../concepts/domain-driven-design.md)). It does one thing well.

```
✓ OrderService   — manages order lifecycle
✓ PaymentService — handles payment processing
✓ UserService    — manages user accounts

✗ OrderPaymentUserService — too many responsibilities
```

### Database per Service

No service accesses another service's database directly. Data ownership is enforced at the storage level.

```
✓ Order Service reads from orders_db
✗ Payment Service reads from orders_db to check order status
  → Payment Service must call Order Service's API instead
```

### Communicate through APIs

Services communicate via:
- **Synchronous**: REST or gRPC (request/response).
- **Asynchronous**: message queues or event buses (publish/subscribe).

```python
# Synchronous call — Order Service calls Payment Service via HTTP
class PaymentClient:
    def __init__(self, base_url: str):
        self._base_url = base_url

    def charge(self, order_id: str, amount: float, card_token: str) -> PaymentResult:
        response = http.post(f"{self._base_url}/payments", {
            "order_id": order_id,
            "amount": amount,
            "card_token": card_token,
        })
        if response.status != 200:
            raise PaymentFailedError(response.body)
        return PaymentResult(response.body["payment_id"])
```

```python
# Asynchronous — Order Service publishes an event; Payment Service subscribes
class OrderService:
    def place_order(self, command: PlaceOrderCommand):
        order = Order.create(command)
        self._order_repo.save(order)
        self._event_bus.publish("order.placed", {
            "order_id": str(order.id),
            "amount": float(order.total()),
            "card_token": command.card_token,
        })


class PaymentWorker:
    def on_order_placed(self, event: dict):
        payment_id = self._payment_gateway.charge(
            event["amount"], event["card_token"]
        )
        self._event_bus.publish("payment.processed", {
            "order_id": event["order_id"],
            "payment_id": payment_id,
        })
```

## API Gateway

A single entry point for all clients. It routes requests, handles auth, rate limiting, and aggregates responses.

```
Mobile App ──► API Gateway ──► /orders     → Order Service
                           ──► /payments   → Payment Service
                           ──► /users      → User Service
```

## Service-to-service communication patterns

### Synchronous (REST/gRPC)

```
Client ──► Service A ──► Service B ──► Service C
```

- Simple to reason about.
- Tight temporal coupling — if Service C is down, the whole chain fails.
- Use for: queries, immediate confirmations.

### Asynchronous (Event-driven)

```
Service A ──► Event Bus ──► Service B
                        ──► Service C
```

- Loose temporal coupling — services can be down and process later.
- Higher complexity (idempotency, ordering, eventual consistency).
- Use for: commands where immediate response is not required.

## Data consistency

In microservices, you cannot use distributed ACID transactions. The alternatives:

### Saga Pattern

A saga is a sequence of local transactions. If one fails, compensating transactions roll back previous steps.

```
PlaceOrder Saga:
1. OrderService.create_order()        → publishes OrderCreated
2. PaymentService.charge()            → publishes PaymentProcessed (or PaymentFailed)
3. ShippingService.schedule_delivery()→ publishes DeliveryScheduled

On PaymentFailed:
  OrderService.cancel_order()         ← compensating transaction
```

### Eventual Consistency

Accept that data will be consistent eventually, not immediately. Each service is consistent internally; cross-service consistency happens over time through events.

## Trade-offs

| Benefit | Cost |
|---|---|
| Independent deployments | Network latency between services |
| Independent scaling per service | Distributed system complexity |
| Technology freedom per service | Harder to trace requests (need distributed tracing) |
| Fault isolation | Data consistency requires Saga / eventual consistency |
| Smaller codebases per team | More infrastructure (service registry, gateway, CI per service) |

## When to use

- Large teams that need to deploy independently without coordinating releases.
- Services with genuinely different scaling requirements (e.g., Payment needs 5× more throughput than Shipping).
- When different parts of the system benefit from different technology stacks.

## When NOT to use

- Small teams — microservices multiply operational overhead faster than they deliver value.
- Early-stage products with rapidly changing boundaries — split after boundaries are stable.
- When the network boundary would cut through what is logically a single transaction — you will fight consistency problems constantly.

> Start as a monolith. Extract services when you have evidence of where the boundaries belong.

## References

- Newman, Sam. *Building Microservices*. O'Reilly, 2nd ed., 2021.
- Fowler, Martin. [Microservices](https://martinfowler.com/articles/microservices.html) (2014).
- Richardson, Chris. [Microservices Patterns](https://microservices.io/patterns/index.html).
