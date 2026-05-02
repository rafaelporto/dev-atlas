# Mediator

> Define an object that encapsulates how a set of objects interact, promoting loose coupling by keeping objects from referring to each other explicitly.

---

## What is it?

Mediator centralizes complex communication between multiple objects into a single mediator object. Instead of objects referencing each other directly, they all communicate through the mediator.

## Why does it matter?

When many objects interact directly, the relationship graph becomes dense and changes ripple unpredictably. The Mediator reduces n² relationships to n relationships (each component → mediator).

```
# Without Mediator: each component knows about every other
A ↔ B, A ↔ C, A ↔ D, B ↔ C, B ↔ D, C ↔ D  (6 connections for 4 objects)

# With Mediator: each component only knows the mediator
A → M ← B
C → M ← D                                    (4 connections for 4 objects)
```

## How it works

1. Define a **Mediator** interface with a `notify(sender, event)` method.
2. **ConcreteMediator** implements the coordination logic.
3. Each **Component** holds a reference to the mediator and calls `notify()` instead of referencing other components.

## Pseudo-code

```python
from abc import ABC, abstractmethod

# Mediator interface
class DialogMediator(ABC):
    @abstractmethod
    def notify(self, sender: "UIComponent", event: str): ...


# UI Components — know only the mediator, not each other
class UIComponent:
    def __init__(self, mediator: DialogMediator = None):
        self._mediator = mediator

    def set_mediator(self, mediator: DialogMediator):
        self._mediator = mediator


class Checkbox(UIComponent):
    def __init__(self):
        super().__init__()
        self.checked = False

    def toggle(self):
        self.checked = not self.checked
        self._mediator.notify(self, "checkbox_toggled")


class TextInput(UIComponent):
    def __init__(self):
        super().__init__()
        self.enabled = True
        self.value = ""

    def set_enabled(self, enabled: bool):
        self.enabled = enabled
        status = "enabled" if enabled else "disabled"
        print(f"TextInput: {status}")


class SubmitButton(UIComponent):
    def __init__(self):
        super().__init__()
        self.enabled = False

    def set_enabled(self, enabled: bool):
        self.enabled = enabled
        status = "enabled" if enabled else "disabled"
        print(f"SubmitButton: {status}")

    def click(self):
        if self.enabled:
            self._mediator.notify(self, "submit_clicked")


# Concrete Mediator — owns the coordination logic
class RegistrationDialog(DialogMediator):
    def __init__(self):
        self.terms_checkbox = Checkbox()
        self.email_input = TextInput()
        self.submit_button = SubmitButton()

        for component in [self.terms_checkbox, self.email_input, self.submit_button]:
            component.set_mediator(self)

    def notify(self, sender: UIComponent, event: str):
        if sender is self.terms_checkbox and event == "checkbox_toggled":
            # When terms are accepted, enable email and submit
            self.email_input.set_enabled(self.terms_checkbox.checked)
            self.submit_button.set_enabled(self.terms_checkbox.checked)

        elif sender is self.submit_button and event == "submit_clicked":
            print(f"Submitting registration with email: {self.email_input.value}")


# Usage
dialog = RegistrationDialog()

dialog.submit_button.click()          # does nothing — not enabled yet

dialog.terms_checkbox.toggle()
# → TextInput: enabled
# → SubmitButton: enabled

dialog.email_input.value = "user@example.com"
dialog.submit_button.click()
# → Submitting registration with email: user@example.com
```

## Mediator vs Observer

| | Mediator | Observer |
|---|---|---|
| Direction | Components notify mediator; mediator coordinates | Subject broadcasts to observers |
| Knowledge | Components know only the mediator | Observers know the subject |
| Use when | Multiple components interact in complex ways | One-to-many notifications |

## When to use

- Multiple objects interact in complex, hard-to-maintain ways.
- A component is tightly coupled to many others, making reuse difficult.
- You want to encapsulate the coordination logic in one place.

## When NOT to use

- When only two objects interact — direct reference is simpler.
- When the mediator itself becomes a monolith knowing too much — this is the "god object" anti-pattern.

## References

- Gamma et al. *Design Patterns*. Addison-Wesley, 1994. p. 273.
- [Refactoring Guru — Mediator](https://refactoring.guru/design-patterns/mediator)
