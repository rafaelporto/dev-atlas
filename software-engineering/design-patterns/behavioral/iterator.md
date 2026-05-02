# Iterator

> Provide a way to sequentially access elements of a collection without exposing its underlying representation.

---

## What is it?

Iterator extracts the traversal behavior of a collection into a separate object. The client iterates over elements through the Iterator interface, without knowing whether the underlying structure is an array, tree, graph, or database cursor.

## Why does it matter?

Collections can be stored in many different ways (list, hash map, tree, stream). Without Iterator, the client must know the internal structure to traverse it. With Iterator, the traversal algorithm is separated from the collection, making both independently replaceable.

## How it works

1. **Iterator** interface: `has_next()`, `next()`.
2. **ConcreteIterator** implements the traversal logic for a specific collection.
3. **Iterable** (the collection) returns an iterator via `create_iterator()`.
4. The client uses only the Iterator interface.

## Pseudo-code

```python
from abc import ABC, abstractmethod
from typing import TypeVar, Generic, Optional

T = TypeVar("T")

# Iterator interface
class Iterator(ABC, Generic[T]):
    @abstractmethod
    def has_next(self) -> bool: ...

    @abstractmethod
    def next(self) -> T: ...


# Iterable interface
class IterableCollection(ABC, Generic[T]):
    @abstractmethod
    def create_iterator(self) -> Iterator[T]: ...


# Concrete: a tree that can be traversed in different orders
class TreeNode:
    def __init__(self, value: int):
        self.value = value
        self.left: Optional["TreeNode"] = None
        self.right: Optional["TreeNode"] = None


# In-order iterator (left, root, right)
class InOrderIterator(Iterator[int]):
    def __init__(self, root: Optional[TreeNode]):
        self._stack: list[TreeNode] = []
        self._push_left(root)

    def _push_left(self, node: Optional[TreeNode]):
        while node:
            self._stack.append(node)
            node = node.left

    def has_next(self) -> bool:
        return len(self._stack) > 0

    def next(self) -> int:
        node = self._stack.pop()
        self._push_left(node.right)
        return node.value


# Binary tree collection
class BinaryTree(IterableCollection[int]):
    def __init__(self, root: Optional[TreeNode] = None):
        self.root = root

    def create_iterator(self) -> Iterator[int]:
        return InOrderIterator(self.root)


# Usage
root = TreeNode(4)
root.left = TreeNode(2)
root.right = TreeNode(6)
root.left.left = TreeNode(1)
root.left.right = TreeNode(3)
root.right.left = TreeNode(5)
root.right.right = TreeNode(7)

tree = BinaryTree(root)
it = tree.create_iterator()

while it.has_next():
    print(it.next(), end=" ")
# → 1 2 3 4 5 6 7  (in-order)
```

### Multiple traversal strategies for the same collection

```python
# Pre-order iterator (root, left, right)
class PreOrderIterator(Iterator[int]):
    def __init__(self, root: Optional[TreeNode]):
        self._stack = [root] if root else []

    def has_next(self) -> bool:
        return len(self._stack) > 0

    def next(self) -> int:
        node = self._stack.pop()
        if node.right:
            self._stack.append(node.right)
        if node.left:
            self._stack.append(node.left)
        return node.value


# The client code is identical regardless of traversal strategy
def print_all(iterator: Iterator[int]):
    while iterator.has_next():
        print(iterator.next(), end=" ")

print_all(InOrderIterator(root))   # → 1 2 3 4 5 6 7
print_all(PreOrderIterator(root))  # → 4 2 1 3 6 5 7
```

> Most modern languages provide built-in iterator protocols (`__iter__`/`__next__` in Python, `Iterable` in Java, `Symbol.iterator` in JavaScript). The pattern is the concept behind them.

## When to use

- You need to traverse a collection without exposing its internal structure.
- You want to support multiple traversal strategies over the same collection.
- You need concurrent iteration (multiple active iterators on the same collection).

## When NOT to use

- When the collection is simple and the language already provides adequate iteration support.
- When the overhead of creating an iterator object is not worth it for a one-time traversal.

## References

- Gamma et al. *Design Patterns*. Addison-Wesley, 1994. p. 257.
- [Refactoring Guru — Iterator](https://refactoring.guru/design-patterns/iterator)
