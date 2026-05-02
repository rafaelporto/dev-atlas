# Flyweight

> Use sharing to support a large number of fine-grained objects efficiently.

---

## What is it?

Flyweight minimizes memory usage by sharing as much data as possible with similar objects. It separates object state into **intrinsic state** (shared, immutable, stored in the flyweight) and **extrinsic state** (context-specific, passed in at runtime).

## Why does it matter?

When a system creates hundreds of thousands of similar objects (e.g., characters in a text editor, particles in a game, pins on a map), the memory cost becomes prohibitive if each object stores all its data. Flyweight externalizes the state that varies per instance, allowing the shared portion to be reused.

## How it works

```
Intrinsic state: shared, immutable, stored in the flyweight object
Extrinsic state: unique per context, passed as arguments when needed

FlyweightFactory ──► Flyweight (shared)
                         ▲
                  [cache/pool]
```

1. Identify the state that is the same across many objects (intrinsic).
2. Store intrinsic state in a shared Flyweight object.
3. Pass extrinsic state as parameters to the flyweight's methods.
4. Use a Factory to manage the pool of flyweights (return existing if already created).

## Pseudo-code

```python
# Intrinsic state — shared, immutable
class TreeType:
    def __init__(self, name: str, color: str, texture: str):
        self.name = name         # e.g., "Oak"
        self.color = color       # e.g., "green"
        self.texture = texture   # e.g., loaded texture data (heavy)

    def draw(self, x: float, y: float):
        # x, y are extrinsic — passed in, not stored
        print(f"Drawing {self.name} at ({x}, {y}) color={self.color}")


# Flyweight factory — ensures sharing
class TreeTypeFactory:
    _cache: dict[str, TreeType] = {}

    @classmethod
    def get(cls, name: str, color: str, texture: str) -> TreeType:
        key = f"{name}-{color}-{texture}"
        if key not in cls._cache:
            cls._cache[key] = TreeType(name, color, texture)
            print(f"Created new TreeType: {key}")
        return cls._cache[key]


# Context — holds extrinsic state + reference to shared flyweight
class Tree:
    def __init__(self, x: float, y: float, tree_type: TreeType):
        self.x = x                      # extrinsic
        self.y = y                      # extrinsic
        self._type = tree_type          # shared flyweight

    def draw(self):
        self._type.draw(self.x, self.y)


# Usage
forest: list[Tree] = []

for i in range(1000):
    tree_type = TreeTypeFactory.get("Oak", "green", "oak_texture")  # reused 1000 times
    forest.append(Tree(x=i * 1.5, y=i * 2.0, tree_type=tree_type))

for i in range(500):
    tree_type = TreeTypeFactory.get("Pine", "dark-green", "pine_texture")  # reused 500 times
    forest.append(Tree(x=i * 3.0, y=i * 1.0, tree_type=tree_type))

# Only 2 TreeType objects created, shared across 1500 Tree instances
print(f"Unique tree types: {len(TreeTypeFactory._cache)}")  # → 2
print(f"Total trees: {len(forest)}")                        # → 1500
```

### Memory impact

Without Flyweight: 1500 trees × full texture data per tree = massive duplication.
With Flyweight: 1500 trees × (x, y, pointer) + 2 shared textures = minimal footprint.

## When to use

- The application creates a very large number of similar objects.
- Object state can be clearly separated into intrinsic (shared) and extrinsic (contextual).
- Memory cost is a real bottleneck.

## When NOT to use

- When the number of objects is small — the added complexity is not worth it.
- When objects have very little shared state — there is nothing to externalize.
- When CPU trade-off is unfavorable — computing extrinsic state at call time may cost more than saving memory.

## References

- Gamma et al. *Design Patterns*. Addison-Wesley, 1994. p. 195.
- [Refactoring Guru — Flyweight](https://refactoring.guru/design-patterns/flyweight)
