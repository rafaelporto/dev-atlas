# Builder

> Construct complex objects step by step, separating the construction process from the final representation.

---

## What is it?

Builder lets you produce different types or configurations of an object using the same construction steps. The construction is controlled by a separate object (the builder), and an optional Director can define fixed construction sequences.

## Why does it matter?

When an object requires many constructor parameters, especially optional ones, a constructor call becomes unreadable and error-prone. Builder solves this by replacing a large constructor with a series of readable, explicit steps.

```python
# Without Builder — which argument is which?
house = House(4, 2, True, False, True, "brick", "flat", "oak")

# With Builder — intent is clear
house = HouseBuilder().rooms(4).bathrooms(2).garage().roof("flat").build()
```

## How it works

1. Extract the construction steps into a Builder interface.
2. Create concrete builders that implement those steps differently.
3. (Optional) A Director class encodes common construction sequences.
4. The client uses a builder directly or through a director.

## Pseudo-code

```python
# Product
class House:
    def __init__(self):
        self.rooms = 0
        self.bathrooms = 0
        self.has_garage = False
        self.roof = "flat"
        self.material = "brick"

    def __repr__(self):
        return (f"House(rooms={self.rooms}, bathrooms={self.bathrooms}, "
                f"garage={self.has_garage}, roof={self.roof})")


# Builder interface
class HouseBuilder:
    def __init__(self):
        self._house = House()

    def rooms(self, count: int) -> "HouseBuilder":
        self._house.rooms = count
        return self

    def bathrooms(self, count: int) -> "HouseBuilder":
        self._house.bathrooms = count
        return self

    def garage(self) -> "HouseBuilder":
        self._house.has_garage = True
        return self

    def roof(self, style: str) -> "HouseBuilder":
        self._house.roof = style
        return self

    def material(self, mat: str) -> "HouseBuilder":
        self._house.material = mat
        return self

    def build(self) -> House:
        result = self._house
        self._house = House()   # reset for next build
        return result


# Optional: Director encodes named construction sequences
class ArchitectDirector:
    def build_starter_home(self, builder: HouseBuilder) -> House:
        return builder.rooms(2).bathrooms(1).roof("flat").build()

    def build_luxury_villa(self, builder: HouseBuilder) -> House:
        return (builder
                .rooms(6)
                .bathrooms(4)
                .garage()
                .roof("gabled")
                .material("marble")
                .build())


# Usage
builder = HouseBuilder()

# Direct usage (fluent interface)
house = builder.rooms(3).bathrooms(2).garage().build()
print(house)
# → House(rooms=3, bathrooms=2, garage=True, roof=flat)

# Via director
director = ArchitectDirector()
villa = director.build_luxury_villa(HouseBuilder())
print(villa)
# → House(rooms=6, bathrooms=4, garage=True, roof=gabled)
```

## When to use

- An object requires many constructor parameters, especially optional ones.
- You need to create different representations of the same object using the same steps.
- You want to enforce a step-by-step construction where some steps are mandatory.

## When NOT to use

- When the object is simple — a plain constructor or keyword arguments are enough.
- When the steps always produce the same type without variation.

## References

- Gamma et al. *Design Patterns*. Addison-Wesley, 1994. p. 97.
- [Refactoring Guru — Builder](https://refactoring.guru/design-patterns/builder)
