# Abstract Factory

> Provide an interface for creating families of related objects without specifying their concrete classes.

---

## What is it?

Abstract Factory groups a set of related Factory Methods under one interface. Instead of creating individual objects, you create a *factory object* that produces a whole family of compatible objects.

## Why does it matter?

When a system needs to work with multiple families of products (e.g., a UI toolkit that supports both Light and Dark themes), you need a guarantee that the created objects are consistent with each other. Abstract Factory enforces this constraint at the type level.

## How it works

1. Define an abstract factory interface with one creation method per product type.
2. Implement one concrete factory per product family.
3. The client receives a factory and calls its methods — it never references concrete product classes.

## Pseudo-code

```python
# Abstract products
class Button:
    def render(self): ...

class Checkbox:
    def render(self): ...


# Concrete products — Light theme family
class LightButton(Button):
    def render(self):
        print("Render light button")

class LightCheckbox(Checkbox):
    def render(self):
        print("Render light checkbox")


# Concrete products — Dark theme family
class DarkButton(Button):
    def render(self):
        print("Render dark button")

class DarkCheckbox(Checkbox):
    def render(self):
        print("Render dark checkbox")


# Abstract factory
class UIFactory:
    def create_button(self) -> Button: ...
    def create_checkbox(self) -> Checkbox: ...


# Concrete factories
class LightThemeFactory(UIFactory):
    def create_button(self) -> Button:
        return LightButton()

    def create_checkbox(self) -> Checkbox:
        return LightCheckbox()


class DarkThemeFactory(UIFactory):
    def create_button(self) -> Button:
        return DarkButton()

    def create_checkbox(self) -> Checkbox:
        return DarkCheckbox()


# Client — works with any factory, never names concrete classes
class Application:
    def __init__(self, factory: UIFactory):
        self.button = factory.create_button()
        self.checkbox = factory.create_checkbox()

    def render(self):
        self.button.render()
        self.checkbox.render()


# Usage
factory = DarkThemeFactory()
app = Application(factory)
app.render()
# → Render dark button
# → Render dark checkbox
```

## Abstract Factory vs Factory Method

| | Factory Method | Abstract Factory |
|---|---|---|
| Creates | One product | A family of products |
| Mechanism | Subclassing | Object composition |
| Use when | One product type varies | Multiple related products must be consistent |

## When to use

- The system must be independent of how its products are created.
- You need to enforce that products from one family are always used together.
- You want to swap entire product families at runtime or configuration time.

## When NOT to use

- When you only have one product type — Factory Method is enough.
- When adding new product types is frequent — every new product type requires changing the abstract factory interface and all its concrete implementations.

## References

- Gamma et al. *Design Patterns*. Addison-Wesley, 1994. p. 87.
- [Refactoring Guru — Abstract Factory](https://refactoring.guru/design-patterns/abstract-factory)
