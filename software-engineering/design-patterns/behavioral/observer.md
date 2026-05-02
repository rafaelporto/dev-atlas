# Observer

> Define a one-to-many dependency between objects so that when one object changes state, all its dependents are notified and updated automatically.

---

## What is it?

Observer (also called Publish-Subscribe or Event Listener) lets an object (the Subject/Publisher) maintain a list of dependents (Observers/Subscribers) and notify them automatically of any state change.

## Why does it matter?

When multiple parts of a system need to react to changes in one object, wiring them together directly creates tight coupling. Observer decouples the publisher from its subscribers: the publisher does not need to know who is listening or how many there are.

## How it works

```
Subject (Publisher)
  ├── attach(observer)
  ├── detach(observer)
  └── notify()  →  observer.update()  [for each observer]
```

1. **Subject** maintains a list of observers and calls `update()` on each when state changes.
2. **Observer** interface declares the `update()` method.
3. **ConcreteObserver** reacts to the notification.

## Pseudo-code

```python
from abc import ABC, abstractmethod

# Observer interface
class Observer(ABC):
    @abstractmethod
    def update(self, event: str, data: dict): ...


# Subject (Publisher)
class EventEmitter:
    def __init__(self):
        self._observers: dict[str, list[Observer]] = {}

    def subscribe(self, event: str, observer: Observer):
        self._observers.setdefault(event, []).append(observer)

    def unsubscribe(self, event: str, observer: Observer):
        if event in self._observers:
            self._observers[event].remove(observer)

    def emit(self, event: str, data: dict = None):
        for observer in self._observers.get(event, []):
            observer.update(event, data or {})


# Concrete subject
class OrderService(EventEmitter):
    def place_order(self, order_id: str, customer_email: str, total: float):
        print(f"Order {order_id} placed.")
        self.emit("order_placed", {
            "order_id": order_id,
            "email": customer_email,
            "total": total,
        })

    def ship_order(self, order_id: str):
        print(f"Order {order_id} shipped.")
        self.emit("order_shipped", {"order_id": order_id})


# Concrete observers
class EmailNotifier(Observer):
    def update(self, event: str, data: dict):
        if event == "order_placed":
            print(f"Email → {data['email']}: Your order {data['order_id']} is confirmed.")
        elif event == "order_shipped":
            print(f"Email: Order {data['order_id']} is on the way!")


class InventoryService(Observer):
    def update(self, event: str, data: dict):
        if event == "order_placed":
            print(f"Inventory: reserving stock for order {data['order_id']}")


class AnalyticsService(Observer):
    def update(self, event: str, data: dict):
        print(f"Analytics: tracking '{event}' event — data={data}")


# Usage
service = OrderService()

email = EmailNotifier()
inventory = InventoryService()
analytics = AnalyticsService()

service.subscribe("order_placed", email)
service.subscribe("order_placed", inventory)
service.subscribe("order_placed", analytics)
service.subscribe("order_shipped", email)

service.place_order("ORD-001", "user@example.com", 149.90)
# Order ORD-001 placed.
# Email → user@example.com: Your order ORD-001 is confirmed.
# Inventory: reserving stock for order ORD-001
# Analytics: tracking 'order_placed' event — ...

service.unsubscribe("order_placed", analytics)   # analytics stops listening

service.ship_order("ORD-001")
# Order ORD-001 shipped.
# Email: Order ORD-001 is on the way!
```

### Push vs Pull model

```python
# Push — subject sends data in the notification (shown above)
observer.update(event, data)

# Pull — subject sends a reference to itself; observer fetches what it needs
class Observer(ABC):
    def update(self, subject: "Subject"): ...

class ConcreteObserver(Observer):
    def update(self, subject: "Subject"):
        value = subject.get_state()   # observer pulls only what it needs
```

## When to use

- A change in one object requires updating others, and you do not know in advance how many or who they are.
- An object should be able to notify other objects without making assumptions about them.
- You want to decouple publishers from subscribers.

## When NOT to use

- When the notification chain is deep or unpredictable — observers triggering other observers can produce hard-to-trace cascades.
- When strong ordering guarantees are needed — notification order is usually unspecified.

## References

- Gamma et al. *Design Patterns*. Addison-Wesley, 1994. p. 293.
- [Refactoring Guru — Observer](https://refactoring.guru/design-patterns/observer)
