# Singleton

> Ensure a class has only one instance and provide a global access point to it.

---

## What is it?

Singleton restricts the instantiation of a class to a single object. Any call to create a new instance returns the same already-created object.

## Why does it matter?

Some resources must exist as exactly one instance: a configuration loader, a connection pool, a logger, a thread pool. Creating multiple instances would either waste resources or produce inconsistent state.

## How it works

1. Make the constructor private so no one can call `new` directly.
2. Store the single instance in a static field.
3. Expose a static method that returns the existing instance, creating it on first access (lazy initialization).

## Pseudo-code

```python
class ConfigManager:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._load()
        return cls._instance

    def _load(self):
        self.settings = read_file("config.yaml")

    def get(self, key):
        return self.settings[key]


# Usage
config = ConfigManager()   # creates the instance
config2 = ConfigManager()  # returns the same instance

config is config2  # → True
```

### Thread-safe variant

```python
import threading

class ConfigManager:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:          # double-checked locking
                    cls._instance = super().__new__(cls)
                    cls._instance._load()
        return cls._instance
```

## When to use

- Exactly one shared object is needed across the entire application.
- The object is expensive to create and must be reused.
- You need a single coordination point (e.g., event bus, logger).

## When NOT to use

- When the single instance makes unit testing hard — a global instance shared across tests introduces state leakage.
- When you actually need one instance *per context* (e.g., per request, per tenant) — use dependency injection instead.
- As a disguised global variable for convenience. That is an anti-pattern.

## References

- Gamma et al. *Design Patterns*. Addison-Wesley, 1994. p. 127.
- [Refactoring Guru — Singleton](https://refactoring.guru/design-patterns/singleton)
