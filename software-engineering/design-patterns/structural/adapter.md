# Adapter

> Convert the interface of a class into another interface that clients expect.

---

## What is it?

Adapter (also called Wrapper) bridges two incompatible interfaces. It wraps an existing class and translates calls from the expected interface into calls the wrapped class understands.

## Why does it matter?

When integrating third-party libraries, legacy code, or external services, you often cannot change the source. The Adapter lets you use that code without modifying it, keeping your system decoupled from the foreign interface.

## How it works

```
Client → [Target Interface] → Adapter → [Adaptee (incompatible)]
```

1. The client expects a specific interface (Target).
2. The Adaptee exists but has a different, incompatible interface.
3. The Adapter implements the Target interface and delegates calls to the Adaptee, translating as needed.

There are two forms:
- **Object Adapter** — wraps an instance of the Adaptee (composition). More flexible, works across class hierarchies.
- **Class Adapter** — inherits from both Target and Adaptee (multiple inheritance). Tighter coupling.

## Pseudo-code

```python
# Target interface — what the client expects
class PaymentProcessor:
    def pay(self, amount: float, currency: str): ...


# Adaptee — a third-party library with a different interface
class StripeAPI:
    def charge(self, amount_cents: int, currency_code: str, metadata: dict):
        print(f"Stripe: charging {amount_cents} {currency_code}")


# Object Adapter — wraps StripeAPI, exposes PaymentProcessor interface
class StripeAdapter(PaymentProcessor):
    def __init__(self, stripe: StripeAPI):
        self._stripe = stripe

    def pay(self, amount: float, currency: str):
        amount_cents = int(amount * 100)          # translate: float → cents
        self._stripe.charge(amount_cents, currency.upper(), metadata={})


# Another adaptee — a different payment provider
class PayPalSDK:
    def send_payment(self, value: str, currency: str):
        print(f"PayPal: sending {value} {currency}")


class PayPalAdapter(PaymentProcessor):
    def __init__(self, paypal: PayPalSDK):
        self._paypal = paypal

    def pay(self, amount: float, currency: str):
        self._paypal.send_payment(str(amount), currency)


# Client — only knows PaymentProcessor, never StripeAPI or PayPalSDK
def checkout(processor: PaymentProcessor, total: float):
    processor.pay(total, "USD")


# Usage
checkout(StripeAdapter(StripeAPI()), 49.99)
# → Stripe: charging 4999 USD

checkout(PayPalAdapter(PayPalSDK()), 49.99)
# → PayPal: sending 49.99 USD
```

## When to use

- You want to use an existing class but its interface does not match what you need.
- You are integrating a third-party library or legacy component you cannot modify.
- You want to create a reusable class that cooperates with classes that have unrelated interfaces.

## When NOT to use

- When you can modify the Adaptee's interface directly — adapting code you own adds unnecessary indirection.
- When many layers of adapters stack up — this signals a deeper design mismatch that should be addressed.

## References

- Gamma et al. *Design Patterns*. Addison-Wesley, 1994. p. 139.
- [Refactoring Guru — Adapter](https://refactoring.guru/design-patterns/adapter)
