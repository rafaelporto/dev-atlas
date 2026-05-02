# Decorator

> Attach additional responsibilities to an object dynamically. Decorators provide a flexible alternative to subclassing for extending functionality.

---

## What is it?

Decorator wraps an object in another object that adds behavior before and/or after delegating to the original. The wrapper implements the same interface as the wrapped object, so the client cannot tell the difference.

## Why does it matter?

Inheritance adds behavior at compile time and applies it to all instances of a class. Decorator adds behavior at runtime to specific instances, and decorators can be stacked in any combination without creating a subclass for every combination.

## How it works

```
Client → DecoratorB → DecoratorA → ConcreteComponent
```

1. Define a **Component** interface.
2. **ConcreteComponent** implements the base behavior.
3. **Decorator** implements the same interface and holds a reference to another Component.
4. Each **ConcreteDecorator** wraps a component and adds its own behavior before or after delegating.

## Pseudo-code

```python
from abc import ABC, abstractmethod

# Component interface
class TextProcessor(ABC):
    @abstractmethod
    def process(self, text: str) -> str: ...


# Concrete component
class PlainText(TextProcessor):
    def process(self, text: str) -> str:
        return text


# Base decorator — holds a reference and delegates
class TextDecorator(TextProcessor, ABC):
    def __init__(self, wrapped: TextProcessor):
        self._wrapped = wrapped

    def process(self, text: str) -> str:
        return self._wrapped.process(text)   # default: just delegate


# Concrete decorators
class UpperCaseDecorator(TextDecorator):
    def process(self, text: str) -> str:
        return super().process(text).upper()


class TrimDecorator(TextDecorator):
    def process(self, text: str) -> str:
        return super().process(text).strip()


class ExclamationDecorator(TextDecorator):
    def process(self, text: str) -> str:
        return super().process(text) + "!!!"


# Usage — stack decorators at runtime in any order
text: TextProcessor = PlainText()
text = TrimDecorator(text)
text = UpperCaseDecorator(text)
text = ExclamationDecorator(text)

result = text.process("  hello world  ")
# TrimDecorator strips:          "hello world"
# UpperCaseDecorator uppercases: "HELLO WORLD"
# ExclamationDecorator appends:  "HELLO WORLD!!!"
print(result)  # → HELLO WORLD!!!


# Different combination, different behavior
text2 = ExclamationDecorator(TrimDecorator(PlainText()))
print(text2.process("  hi  "))  # → hi!!!
```

### Real-world analogy: HTTP middleware

```python
class HTTPHandler(ABC):
    @abstractmethod
    def handle(self, request: Request) -> Response: ...


class LoggingMiddleware(HTTPHandler):
    def __init__(self, next_handler: HTTPHandler):
        self._next = next_handler

    def handle(self, request: Request) -> Response:
        print(f"→ {request.method} {request.path}")
        response = self._next.handle(request)
        print(f"← {response.status}")
        return response


class AuthMiddleware(HTTPHandler):
    def __init__(self, next_handler: HTTPHandler):
        self._next = next_handler

    def handle(self, request: Request) -> Response:
        if not request.headers.get("Authorization"):
            return Response(401, "Unauthorized")
        return self._next.handle(request)


# Stack: request passes through Auth → Logging → actual handler
handler = LoggingMiddleware(AuthMiddleware(actual_handler))
```

## When to use

- You need to add responsibilities to objects without subclassing.
- You need to combine behaviors and the combinations would cause a subclass explosion.
- Responsibilities should be added or removed at runtime.

## When NOT to use

- When the order of decorators matters and is hard to reason about.
- When you need to inspect or remove a specific decorator from the middle of the stack — this requires additional bookkeeping.
- When a simple subclass would be clearer and the behavior is always present.

## References

- Gamma et al. *Design Patterns*. Addison-Wesley, 1994. p. 175.
- [Refactoring Guru — Decorator](https://refactoring.guru/design-patterns/decorator)
