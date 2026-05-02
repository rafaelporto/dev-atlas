# Template Method

> Define the skeleton of an algorithm in a base class, deferring some steps to subclasses. Template Method lets subclasses redefine certain steps without changing the algorithm's structure.

---

## What is it?

Template Method defines the high-level steps of an algorithm in a base class method (the template method). Each step is either implemented in the base class or declared abstract, letting subclasses provide their own implementation.

## Why does it matter?

When multiple classes share the same algorithm structure but differ in specific steps, each class duplicates the orchestration logic. Template Method eliminates this by centralizing the invariant part and delegating only the variant parts to subclasses.

## How it works

```
BaseClass
  └── template_method()        ← final: defines the algorithm order
        ├── step_one()         ← concrete: shared behavior
        ├── step_two()         ← abstract: subclass must implement
        ├── step_three()       ← concrete: shared behavior
        └── hook()             ← optional hook: subclass may override
```

1. The **template method** in the base class calls steps in a fixed order.
2. **Abstract steps** are declared in the base class; subclasses must implement them.
3. **Hooks** are concrete steps with default (often empty) implementations that subclasses may override optionally.

## Pseudo-code

```python
from abc import ABC, abstractmethod

# Base class — defines the algorithm skeleton
class DataMigration(ABC):

    def run(self):              # template method — do not override this
        self._connect()
        data = self._extract()
        transformed = self._transform(data)
        self._load(transformed)
        self._notify()          # hook — optional
        self._disconnect()

    def _connect(self):
        print("Connecting to source database...")

    @abstractmethod
    def _extract(self) -> list: ...

    @abstractmethod
    def _transform(self, data: list) -> list: ...

    @abstractmethod
    def _load(self, data: list): ...

    def _notify(self):          # hook — default does nothing
        pass

    def _disconnect(self):
        print("Disconnecting.")


# Concrete subclass — fills in the variant steps
class UserMigration(DataMigration):
    def _extract(self) -> list:
        print("Extracting users from MySQL...")
        return [{"id": 1, "name": "Alice"}, {"id": 2, "name": "Bob"}]

    def _transform(self, data: list) -> list:
        print("Normalizing user records...")
        return [{"user_id": u["id"], "username": u["name"].lower()} for u in data]

    def _load(self, data: list):
        print(f"Loading {len(data)} users into PostgreSQL...")

    def _notify(self):          # overrides the hook
        print("Slack notification: User migration complete.")


class ProductMigration(DataMigration):
    def _extract(self) -> list:
        print("Extracting products from CSV...")
        return [{"sku": "A001", "price": 9.99}]

    def _transform(self, data: list) -> list:
        print("Enriching product catalog...")
        return [{"sku": p["sku"], "price_cents": int(p["price"] * 100)} for p in data]

    def _load(self, data: list):
        print(f"Loading {len(data)} products into catalog service...")


# Usage
print("=== User Migration ===")
UserMigration().run()
# Connecting to source database...
# Extracting users from MySQL...
# Normalizing user records...
# Loading 2 users into PostgreSQL...
# Slack notification: User migration complete.
# Disconnecting.

print("\n=== Product Migration ===")
ProductMigration().run()
# Connecting to source database...
# Extracting products from CSV...
# Enriching product catalog...
# Loading 1 products into catalog service...
# Disconnecting.
```

## Template Method vs Strategy

| | Template Method | Strategy |
|---|---|---|
| Mechanism | Inheritance | Composition |
| Varies | Steps within one algorithm | The entire algorithm |
| Extension point | Override methods in a subclass | Swap a strategy object |
| Coupling | Subclass is coupled to base class | Context is decoupled from strategy |

> Prefer Strategy when you want to swap behavior at runtime. Use Template Method when you want to lock the overall algorithm and let subclasses fill in specific steps.

## When to use

- Multiple classes share the same algorithm structure but differ in some steps.
- You want to control which parts of an algorithm subclasses can change.
- You have duplicate code across subclasses that can be factored into a base class.

## When NOT to use

- When the algorithm structure itself needs to vary — use Strategy instead.
- When subclasses only override one trivial step — a simple callback or lambda is more readable.
- When deep inheritance hierarchies are already a problem — Template Method deepens them further.

## References

- Gamma et al. *Design Patterns*. Addison-Wesley, 1994. p. 325.
- [Refactoring Guru — Template Method](https://refactoring.guru/design-patterns/template-method)
