# Domain-Driven Design (DDD)

> An approach to software development that centers the design around the business domain, using a shared language between developers and domain experts.

---

## What is it?

Domain-Driven Design is a software development philosophy introduced by Eric Evans in his 2003 book *Domain-Driven Design: Tackling Complexity in the Heart of Software*. It focuses on deeply understanding the business domain and reflecting that understanding directly in the code.

DDD is divided into two complementary toolsets:

- **Strategic Design** — how to structure the system at a high level, defining boundaries and relationships between domains.
- **Tactical Design** — how to model the domain internals using specific building blocks.

---

## Why does it matter?

Most software complexity is not technical — it is domain complexity. When the code does not reflect the business reality, the gap between what the system does and what the business needs grows over time, leading to:

- Misunderstandings between developers and stakeholders
- Bugs caused by incorrect domain assumptions
- Code that is hard to change because the business rules are scattered or implicit

DDD addresses this by making the domain model the heart of the software.

---

## Strategic Design

Strategic design defines how to break a large, complex system into manageable parts.

### Ubiquitous Language

A shared vocabulary developed collaboratively between developers and domain experts. Every concept in the domain should have one name, used consistently in conversations, documentation, and code.

> If the domain expert calls it an "Order", the class must be `Order`, not `Purchase`, `Transaction`, or `Cart`.

### Bounded Context

A **Bounded Context** is an explicit boundary within which a domain model applies. Inside a boundary, terms have precise, unambiguous meanings. The same term can mean different things in different contexts.

```
┌─────────────────────┐     ┌─────────────────────┐
│   Sales Context     │     │  Shipping Context   │
│                     │     │                     │
│  Order: a sales     │     │  Order: a package   │
│  agreement with     │     │  to be delivered    │
│  a customer         │     │  to an address      │
└─────────────────────┘     └─────────────────────┘
```

### Subdomains

Not all parts of a business have the same value. DDD classifies subdomains into three types:

| Type | Description | Example |
|---|---|---|
| **Core Domain** | The competitive advantage of the business. Where most investment should go. | Recommendation engine at Netflix |
| **Supporting Domain** | Necessary but not differentiating. Can be built in-house, simply. | Internal reporting |
| **Generic Domain** | Common to many businesses. Best bought or adopted off the shelf. | Email delivery, authentication |

### Context Map

A diagram showing all Bounded Contexts and how they relate to each other. Common relationship patterns:

- **Shared Kernel** — two contexts share a subset of the domain model.
- **Customer/Supplier** — one context depends on another; the supplier should accommodate the customer's needs.
- **Conformist** — the downstream context conforms to the upstream model with no negotiation.
- **Anti-Corruption Layer (ACL)** — a translation layer that protects a context from the model of another, typically a legacy system.
- **Open Host Service** — a context exposes a well-defined protocol for others to consume.

---

## Tactical Design

Tactical design provides the building blocks for modeling the domain inside a Bounded Context.

### Entity

An object defined by its **identity**, not its attributes. Two entities with the same attributes are still different objects if their identifiers differ.

```python
class Customer:
    def __init__(self, id: CustomerId, name: str, email: str):
        self.id = id       # identity
        self.name = name
        self.email = email

# Two customers are the same only if their IDs match
```

### Value Object

An object defined entirely by its **attributes**. It has no identity and is immutable. Two value objects with the same attributes are equal. Used for prices, coordinates, date ranges, email addresses, colors, and measurements.

See [Value Object](value-object.md) for a full treatment, including immutability, self-validation, side-effect-free behavior, and replaceability.

### Aggregate

A cluster of entities and value objects treated as a single unit for data changes. One entity is designated the **Aggregate Root** — it is the only entry point for external objects to access the aggregate.

Rules:
- External objects may hold references only to the Aggregate Root.
- All invariants of the aggregate are enforced by the root.
- Changes to an aggregate are saved atomically (one transaction = one aggregate).

```
┌──────────────────────────────┐
│   Order (Aggregate Root)     │
│                              │
│   ┌──────────┐ ┌──────────┐  │
│   │OrderItem │ │OrderItem │  │
│   └──────────┘ └──────────┘  │
│                              │
│   ShippingAddress (VO)       │
└──────────────────────────────┘
```

### Domain Service

A stateless operation that belongs to the domain but does not naturally fit inside an Entity or Value Object.

```python
class TransferService:
    def transfer(self, from_account: Account, to_account: Account, amount: Money):
        from_account.debit(amount)
        to_account.credit(amount)
```

Use when: the operation involves multiple aggregates, or the concept does not belong to any single entity.

### Repository

An abstraction that provides collection-like access to aggregates, hiding the persistence mechanism.

```python
class OrderRepository(ABC):
    @abstractmethod
    def find_by_id(self, order_id: OrderId) -> Optional[Order]: ...

    @abstractmethod
    def save(self, order: Order) -> None: ...
```

The domain layer defines the interface; the infrastructure layer provides the implementation.

### Factory

Encapsulates the complex creation logic of aggregates or entities when construction requires multiple steps or involves invariants.

```python
class OrderFactory:
    def create(self, customer: Customer, items: list[CartItem]) -> Order:
        order_id = OrderId.generate()
        order_items = [OrderItem.from_cart_item(i) for i in items]
        return Order(order_id, customer.id, order_items)
```

### Domain Event

Represents something meaningful that happened in the domain. Named in the past tense. Used to communicate between aggregates or Bounded Contexts without tight coupling.

```python
@dataclass
class OrderPlaced:
    order_id: OrderId
    customer_id: CustomerId
    occurred_at: datetime
```

### Application Service

Orchestrates use cases by coordinating domain objects. Does not contain domain logic — it delegates to entities, aggregates, and domain services.

```python
class PlaceOrderUseCase:
    def execute(self, command: PlaceOrderCommand) -> None:
        customer = self.customer_repo.find_by_id(command.customer_id)
        order = self.order_factory.create(customer, command.items)
        self.order_repo.save(order)
        self.event_bus.publish(OrderPlaced(order.id, customer.id))
```

---

## Layered Architecture (typical with DDD)

```
┌─────────────────────────────────┐
│         Interfaces Layer        │  ← REST controllers, CLI, consumers
├─────────────────────────────────┤
│        Application Layer        │  ← Use cases, application services
├─────────────────────────────────┤
│          Domain Layer           │  ← Entities, VOs, aggregates, domain services
├─────────────────────────────────┤
│       Infrastructure Layer      │  ← Repositories impl, messaging, ORM
└─────────────────────────────────┘
```

The dependency rule: inner layers know nothing about outer layers. The domain layer has zero dependencies on infrastructure.

---

## When to use

- The business domain is complex and rich in rules.
- You have access to domain experts willing to collaborate.
- The system is expected to evolve over years.
- The team is comfortable with the investment in modeling upfront.

## When NOT to use

- CRUD-heavy applications with simple business rules — the overhead is not justified.
- Small or short-lived projects.
- When there are no domain experts available to build the ubiquitous language with.
- When the team lacks experience with DDD — a partial adoption often does more harm than good.

---

## References

- Evans, Eric. *Domain-Driven Design: Tackling Complexity in the Heart of Software*. Addison-Wesley, 2003.
- Vernon, Vaughn. *Implementing Domain-Driven Design*. Addison-Wesley, 2013.
- Vernon, Vaughn. *Domain-Driven Design Distilled*. Addison-Wesley, 2016.
- [DDD Community — dddcommunity.org](https://www.dddcommunity.org)
