# Strategy

> Define a family of algorithms, encapsulate each one, and make them interchangeable. Strategy lets the algorithm vary independently from clients that use it.

---

## What is it?

Strategy extracts related algorithms into separate classes (strategies) behind a common interface. The context object is configured with a strategy and delegates the algorithm to it.

## Why does it matter?

When an algorithm has multiple variants, placing all variants inside a class leads to bloated conditionals. Strategy separates the algorithms into their own classes, making them independently testable, swappable at runtime, and extensible without modifying the context.

## How it works

```
Context ──uses──► Strategy (interface)
                      ▲
           ┌──────────┼──────────┐
      StrategyA   StrategyB  StrategyC
```

1. **Strategy** interface declares the algorithm method.
2. Each **ConcreteStrategy** implements a specific algorithm.
3. **Context** holds a reference to a strategy and calls it. The client swaps strategies.

## Pseudo-code

```python
from abc import ABC, abstractmethod

# Strategy interface
class SortStrategy(ABC):
    @abstractmethod
    def sort(self, data: list) -> list: ...


# Concrete strategies
class BubbleSortStrategy(SortStrategy):
    def sort(self, data: list) -> list:
        result = data.copy()
        n = len(result)
        for i in range(n):
            for j in range(n - i - 1):
                if result[j] > result[j + 1]:
                    result[j], result[j + 1] = result[j + 1], result[j]
        print("Sorted with BubbleSort")
        return result


class QuickSortStrategy(SortStrategy):
    def sort(self, data: list) -> list:
        if len(data) <= 1:
            return data
        pivot = data[len(data) // 2]
        left = [x for x in data if x < pivot]
        mid = [x for x in data if x == pivot]
        right = [x for x in data if x > pivot]
        print("Sorted with QuickSort")
        return self.sort(left) + mid + self.sort(right)


class NativeSortStrategy(SortStrategy):
    def sort(self, data: list) -> list:
        print("Sorted with native Timsort")
        return sorted(data)


# Context
class DataProcessor:
    def __init__(self, strategy: SortStrategy):
        self._strategy = strategy

    def set_strategy(self, strategy: SortStrategy):
        self._strategy = strategy

    def process(self, data: list) -> list:
        return self._strategy.sort(data)


# Usage
data = [5, 2, 8, 1, 9, 3]

processor = DataProcessor(NativeSortStrategy())
print(processor.process(data))
# → Sorted with native Timsort
# → [1, 2, 3, 5, 8, 9]

processor.set_strategy(QuickSortStrategy())
print(processor.process(data))
# → Sorted with QuickSort
# → [1, 2, 3, 5, 8, 9]
```

### Real-world example: payment processing

```python
class PaymentStrategy(ABC):
    @abstractmethod
    def pay(self, amount: float): ...


class CreditCardStrategy(PaymentStrategy):
    def __init__(self, card_number: str):
        self._card = card_number

    def pay(self, amount: float):
        print(f"Charged ${amount} to card ending {self._card[-4:]}")


class PixStrategy(PaymentStrategy):
    def __init__(self, key: str):
        self._key = key

    def pay(self, amount: float):
        print(f"Pix transfer of ${amount} to key {self._key}")


class Checkout:
    def __init__(self, payment: PaymentStrategy):
        self._payment = payment

    def complete(self, total: float):
        self._payment.pay(total)


# Swapped at runtime based on user choice
Checkout(CreditCardStrategy("4111111111111234")).complete(99.90)
Checkout(PixStrategy("user@example.com")).complete(99.90)
```

## Strategy vs State

Both use composition to swap behavior, but:
- **Strategy**: the client explicitly chooses the algorithm. No transition logic.
- **State**: the object transitions between states itself. States may know about each other.

## When to use

- Multiple variants of an algorithm exist and you need to switch between them.
- You want to replace conditional branches with polymorphism.
- You need to swap algorithms at runtime based on configuration or user choice.

## When NOT to use

- When there are only one or two strategies and they rarely change — a direct implementation is clearer.
- When the algorithm variants are trivial one-liners — a lambda or function reference is enough.

## References

- Gamma et al. *Design Patterns*. Addison-Wesley, 1994. p. 315.
- [Refactoring Guru — Strategy](https://refactoring.guru/design-patterns/strategy)
