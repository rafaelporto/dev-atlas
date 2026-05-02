# State

> Allow an object to alter its behavior when its internal state changes. The object will appear to change its class.

---

## What is it?

State extracts state-specific behavior into separate classes. The context object holds a reference to the current state object and delegates behavior to it. When state changes, the reference is swapped — no conditionals needed.

## Why does it matter?

Without State, objects with complex lifecycles accumulate large `if/elif` or `switch` blocks that check the current state before every operation. Adding a new state means modifying every such block. State isolates each state's behavior into its own class, making new states addable without touching existing ones.

## How it works

```
Context ──holds──► State (interface)
                       ▲
            ┌──────────┴──────────┐
         StateA               StateB
  (transitions to B)    (transitions to A)
```

1. **State** interface declares methods for all state-specific behavior.
2. **ConcreteState** implements the behavior for one state; it may trigger transitions by replacing the context's state.
3. **Context** delegates behavior to the current state object.

## Pseudo-code

```python
from abc import ABC, abstractmethod

# State interface
class OrderState(ABC):
    @abstractmethod
    def pay(self, order: "Order"): ...

    @abstractmethod
    def ship(self, order: "Order"): ...

    @abstractmethod
    def cancel(self, order: "Order"): ...

    @abstractmethod
    def status(self) -> str: ...


# Concrete states
class PendingState(OrderState):
    def pay(self, order: "Order"):
        print("Payment received.")
        order.set_state(PaidState())

    def ship(self, order: "Order"):
        print("Cannot ship: order not paid yet.")

    def cancel(self, order: "Order"):
        print("Order cancelled.")
        order.set_state(CancelledState())

    def status(self) -> str:
        return "PENDING"


class PaidState(OrderState):
    def pay(self, order: "Order"):
        print("Order is already paid.")

    def ship(self, order: "Order"):
        print("Order shipped.")
        order.set_state(ShippedState())

    def cancel(self, order: "Order"):
        print("Order cancelled. Refund initiated.")
        order.set_state(CancelledState())

    def status(self) -> str:
        return "PAID"


class ShippedState(OrderState):
    def pay(self, order: "Order"):
        print("Order is already paid.")

    def ship(self, order: "Order"):
        print("Order is already shipped.")

    def cancel(self, order: "Order"):
        print("Cannot cancel: order already shipped.")

    def status(self) -> str:
        return "SHIPPED"


class CancelledState(OrderState):
    def pay(self, order: "Order"):
        print("Cannot pay: order is cancelled.")

    def ship(self, order: "Order"):
        print("Cannot ship: order is cancelled.")

    def cancel(self, order: "Order"):
        print("Order is already cancelled.")

    def status(self) -> str:
        return "CANCELLED"


# Context
class Order:
    def __init__(self, order_id: str):
        self.order_id = order_id
        self._state: OrderState = PendingState()

    def set_state(self, state: OrderState):
        self._state = state

    def pay(self):
        self._state.pay(self)

    def ship(self):
        self._state.ship(self)

    def cancel(self):
        self._state.cancel(self)

    def status(self) -> str:
        return self._state.status()


# Usage
order = Order("ORD-001")
print(order.status())   # → PENDING

order.ship()            # → Cannot ship: order not paid yet.
order.pay()             # → Payment received.
print(order.status())   # → PAID

order.ship()            # → Order shipped.
print(order.status())   # → SHIPPED

order.cancel()          # → Cannot cancel: order already shipped.
```

## State vs Strategy

| | State | Strategy |
|---|---|---|
| States know about transitions | Yes — states can switch themselves | No |
| Client swaps the behavior | Usually not | Yes — client picks the algorithm |
| Represents | Lifecycle stages | Interchangeable algorithms |

## When to use

- An object changes its behavior based on its state and has many conditional branches.
- State transitions are well-defined and need to be enforced.
- Adding new states should not require modifying existing state behavior.

## When NOT to use

- When there are only 2-3 states with minimal behavior — a simple flag is more readable.
- When state transitions are purely external and do not involve business logic.

## References

- Gamma et al. *Design Patterns*. Addison-Wesley, 1994. p. 305.
- [Refactoring Guru — State](https://refactoring.guru/design-patterns/state)
