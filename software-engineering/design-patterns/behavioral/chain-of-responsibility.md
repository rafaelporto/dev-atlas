# Chain of Responsibility

> Pass a request along a chain of handlers. Each handler decides to process the request or pass it to the next handler in the chain.

---

## What is it?

Chain of Responsibility decouples the sender of a request from its receiver by giving multiple objects a chance to handle the request. The objects are linked into a chain, and the request travels along the chain until one handler processes it (or the chain ends).

## Why does it matter?

When the handler for a request is not known at compile time, or when multiple objects might handle a request, hardcoding the dispatch logic creates brittle coupling. The chain allows handlers to be composed and reordered at runtime without touching the sender.

## How it works

```
Sender → Handler1 → Handler2 → Handler3 → (no handler / end)
```

1. Define a **Handler** interface with a `handle(request)` method and a `set_next(handler)` method.
2. Each **Concrete Handler** processes the request if it can, or forwards it to `next`.
3. The sender calls the first handler in the chain without knowing which one will process it.

## Pseudo-code

```python
from abc import ABC, abstractmethod
from typing import Optional

# Handler interface
class SupportHandler(ABC):
    def __init__(self):
        self._next: Optional["SupportHandler"] = None

    def set_next(self, handler: "SupportHandler") -> "SupportHandler":
        self._next = handler
        return handler  # allows fluent chaining: h1.set_next(h2).set_next(h3)

    @abstractmethod
    def handle(self, issue_level: int, description: str): ...


# Concrete handlers
class Level1Support(SupportHandler):
    def handle(self, issue_level: int, description: str):
        if issue_level <= 1:
            print(f"Level1Support: handling '{description}'")
        elif self._next:
            self._next.handle(issue_level, description)
        else:
            print(f"No handler found for level {issue_level}")


class Level2Support(SupportHandler):
    def handle(self, issue_level: int, description: str):
        if issue_level <= 2:
            print(f"Level2Support: handling '{description}'")
        elif self._next:
            self._next.handle(issue_level, description)
        else:
            print(f"No handler found for level {issue_level}")


class EngineerSupport(SupportHandler):
    def handle(self, issue_level: int, description: str):
        print(f"Engineer: handling critical issue '{description}'")


# Build the chain
l1 = Level1Support()
l2 = Level2Support()
eng = EngineerSupport()

l1.set_next(l2).set_next(eng)

# Send requests
l1.handle(1, "password reset")      # → Level1Support: handling 'password reset'
l1.handle(2, "billing error")       # → Level2Support: handling 'billing error'
l1.handle(3, "data corruption")     # → Engineer: handling critical issue 'data corruption'
```

### Middleware pipeline variant

```python
class Middleware(ABC):
    @abstractmethod
    def process(self, request: Request, next_handler) -> Response: ...


class AuthMiddleware(Middleware):
    def process(self, request: Request, next_handler) -> Response:
        if not request.token:
            return Response(401, "Unauthorized")
        return next_handler(request)


class RateLimitMiddleware(Middleware):
    def process(self, request: Request, next_handler) -> Response:
        if self._is_throttled(request.ip):
            return Response(429, "Too Many Requests")
        return next_handler(request)
```

## When to use

- More than one object may handle a request, and the handler is not known a priori.
- You want to issue a request to one of several objects without specifying the receiver explicitly.
- The set of objects that can handle a request should be specified dynamically.

## When NOT to use

- When every request must be guaranteed to be handled — an unhandled request silently falling through the chain is a bug risk.
- When the chain becomes so long it is hard to trace which handler actually handled a request.

## References

- Gamma et al. *Design Patterns*. Addison-Wesley, 1994. p. 223.
- [Refactoring Guru — Chain of Responsibility](https://refactoring.guru/design-patterns/chain-of-responsibility)
