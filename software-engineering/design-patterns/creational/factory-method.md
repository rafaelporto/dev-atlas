# Factory Method

> Define an interface for creating an object, but let subclasses decide which class to instantiate.

---

## What is it?

Factory Method delegates the responsibility of object creation to subclasses. The parent class defines *when* to create an object; the subclass defines *what* object to create.

## Why does it matter?

When a class cannot anticipate the type of object it needs to create, or when subclasses should control what gets created, hardcoding `new ConcreteClass()` creates tight coupling. Factory Method introduces a seam that allows subclasses to swap the created type without touching the parent logic.

## How it works

1. Define a `create()` method (the factory method) in the base class — it returns an interface type, not a concrete type.
2. Each subclass overrides `create()` to instantiate the specific concrete type it needs.
3. The base class calls `create()` in its workflow without knowing the concrete type.

## Pseudo-code

```python
# Product interface
class Notification:
    def send(self, message: str): ...

# Concrete products
class EmailNotification(Notification):
    def send(self, message: str):
        print(f"Email: {message}")

class SMSNotification(Notification):
    def send(self, message: str):
        print(f"SMS: {message}")

class PushNotification(Notification):
    def send(self, message: str):
        print(f"Push: {message}")


# Creator base class
class NotificationService:
    def create_notification(self) -> Notification:  # factory method
        raise NotImplementedError

    def notify(self, message: str):
        notification = self.create_notification()   # calls the factory method
        notification.send(message)


# Concrete creators — each overrides the factory method
class EmailService(NotificationService):
    def create_notification(self) -> Notification:
        return EmailNotification()

class SMSService(NotificationService):
    def create_notification(self) -> Notification:
        return SMSNotification()


# Usage
service: NotificationService = EmailService()
service.notify("Your order has shipped.")  # → Email: Your order has shipped.

service = SMSService()
service.notify("Your order has shipped.")  # → SMS: Your order has shipped.
```

## When to use

- A class cannot know in advance what kind of object it must create.
- You want subclasses to control the type of objects being created.
- You need to provide a hook for subclasses to extend base class behavior by replacing created objects.

## When NOT to use

- When there is only one concrete product and it will never vary — the indirection adds complexity for no benefit.
- When the creation logic is trivial and composition would be simpler.

## References

- Gamma et al. *Design Patterns*. Addison-Wesley, 1994. p. 107.
- [Refactoring Guru — Factory Method](https://refactoring.guru/design-patterns/factory-method)
