# Prototype

> Create new objects by copying an existing object (the prototype).

---

## What is it?

Prototype lets you copy existing objects without depending on their concrete classes. The object itself knows how to clone itself, and the client just calls `clone()`.

## Why does it matter?

Sometimes creating an object from scratch is expensive (e.g., loading data from a database, running a long computation). If you need many similar objects, it is cheaper to copy a pre-built prototype and tweak only what differs. It also avoids coupling the client to the concrete class being copied.

## How it works

1. Define a `clone()` method in a common interface.
2. Each concrete class implements `clone()` — typically a copy of itself.
3. The client calls `clone()` on a prototype instance instead of `new ConcreteClass()`.

There are two levels of copy:
- **Shallow copy** — copies primitive fields directly; nested objects are shared by reference.
- **Deep copy** — recursively copies all nested objects; the clone is fully independent.

## Pseudo-code

```python
import copy

# Prototype interface
class Shape:
    def __init__(self, color: str):
        self.color = color

    def clone(self) -> "Shape":
        return copy.deepcopy(self)

    def draw(self): ...


# Concrete prototypes
class Circle(Shape):
    def __init__(self, color: str, radius: float):
        super().__init__(color)
        self.radius = radius

    def draw(self):
        print(f"Circle(color={self.color}, radius={self.radius})")


class Rectangle(Shape):
    def __init__(self, color: str, width: float, height: float):
        super().__init__(color)
        self.width = width
        self.height = height

    def draw(self):
        print(f"Rectangle(color={self.color}, {self.width}x{self.height})")


# Prototype registry — store and retrieve named prototypes
class ShapeRegistry:
    def __init__(self):
        self._prototypes: dict[str, Shape] = {}

    def register(self, name: str, prototype: Shape):
        self._prototypes[name] = prototype

    def get(self, name: str) -> Shape:
        return self._prototypes[name].clone()  # always returns a fresh copy


# Usage
registry = ShapeRegistry()
registry.register("small-red-circle", Circle("red", radius=5))
registry.register("blue-square", Rectangle("blue", 10, 10))

# Clone and customize
circle1 = registry.get("small-red-circle")
circle1.color = "green"         # only this clone changes

circle2 = registry.get("small-red-circle")
circle2.draw()  # → Circle(color=red, radius=5)  — original prototype intact

circle1.draw()  # → Circle(color=green, radius=5)
```

### Shallow vs Deep copy

```python
class Config:
    def __init__(self):
        self.timeout = 30
        self.headers = {"Accept": "application/json"}

    def shallow_clone(self):
        return copy.copy(self)      # headers dict is shared

    def deep_clone(self):
        return copy.deepcopy(self)  # headers dict is fully independent


original = Config()
shallow = original.shallow_clone()
shallow.headers["X-Token"] = "abc"  # mutates original.headers too!

deep = original.deep_clone()
deep.headers["X-Token"] = "abc"     # original is safe
```

## When to use

- Object creation is expensive and similar objects are needed repeatedly.
- You want to avoid building a class hierarchy of factories mirroring a class hierarchy of products.
- The class to instantiate is specified at runtime (e.g., loaded from config or registry).

## When NOT to use

- When objects have circular references — deep copy becomes complex and can cause infinite loops.
- When creating the object from scratch is cheap and straightforward.

## References

- Gamma et al. *Design Patterns*. Addison-Wesley, 1994. p. 117.
- [Refactoring Guru — Prototype](https://refactoring.guru/design-patterns/prototype)
