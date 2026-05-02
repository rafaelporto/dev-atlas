# Composite

> Compose objects into tree structures to represent part-whole hierarchies. Let clients treat individual objects and compositions uniformly.

---

## What is it?

Composite lets you build tree structures where both leaf nodes (individual objects) and branch nodes (containers of other objects) share the same interface. The client can operate on the whole tree without caring whether it is talking to a leaf or a branch.

## Why does it matter?

When a system models hierarchies — file systems, UI component trees, organizational charts, menu structures — client code usually ends up full of `if isinstance(node, Leaf)` checks. Composite eliminates this by making leaves and composites interchangeable through a common interface.

## How it works

```
         Component (interface)
        /         \
      Leaf       Composite
                /    |    \
           Leaf  Leaf  Composite
                          |
                        Leaf
```

1. Define a **Component** interface with operations all nodes share (e.g., `render()`, `price()`).
2. **Leaf** implements the interface for individual objects.
3. **Composite** implements the interface and holds a list of child Components — it delegates operations to its children.

## Pseudo-code

```python
from abc import ABC, abstractmethod

# Component interface
class FileSystemItem(ABC):
    def __init__(self, name: str):
        self.name = name

    @abstractmethod
    def size(self) -> int: ...

    @abstractmethod
    def display(self, indent: int = 0): ...


# Leaf
class File(FileSystemItem):
    def __init__(self, name: str, size_bytes: int):
        super().__init__(name)
        self._size = size_bytes

    def size(self) -> int:
        return self._size

    def display(self, indent: int = 0):
        print(" " * indent + f"📄 {self.name} ({self._size}B)")


# Composite
class Directory(FileSystemItem):
    def __init__(self, name: str):
        super().__init__(name)
        self._children: list[FileSystemItem] = []

    def add(self, item: FileSystemItem):
        self._children.append(item)

    def remove(self, item: FileSystemItem):
        self._children.remove(item)

    def size(self) -> int:
        return sum(child.size() for child in self._children)  # delegates to children

    def display(self, indent: int = 0):
        print(" " * indent + f"📁 {self.name}/")
        for child in self._children:
            child.display(indent + 2)            # recursive — works for any depth


# Usage
root = Directory("home")

docs = Directory("documents")
docs.add(File("resume.pdf", 120_000))
docs.add(File("notes.txt", 2_000))

pics = Directory("pictures")
pics.add(File("photo.jpg", 3_500_000))
pics.add(File("avatar.png", 45_000))

root.add(docs)
root.add(pics)
root.add(File(".bashrc", 800))

root.display()
# 📁 home/
#   📁 documents/
#     📄 resume.pdf (120000B)
#     📄 notes.txt (2000B)
#   📁 pictures/
#     📄 photo.jpg (3500000B)
#     📄 avatar.png (45000B)
#   📄 .bashrc (800B)

print(root.size())     # → 3667800  — client calls same method on root or any child
print(docs.size())     # → 122000
```

## When to use

- You need to represent part-whole hierarchies (trees).
- You want client code to treat individual objects and groups of objects uniformly.
- The hierarchy depth is not known at compile time.

## When NOT to use

- When the hierarchy is fixed and shallow — the abstraction adds complexity without benefit.
- When leaves and composites have fundamentally different interfaces that do not share meaningful operations.

## References

- Gamma et al. *Design Patterns*. Addison-Wesley, 1994. p. 163.
- [Refactoring Guru — Composite](https://refactoring.guru/design-patterns/composite)
