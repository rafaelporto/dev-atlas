---
type: concept
tags: []
related: []
language: null
---
# Dependency Inversion Principle (DIP)

> High-level policy and low-level details should both depend on the same abstraction — and that abstraction belongs to the policy.

---

## What is it?

The Dependency Inversion Principle has two parts:

1. **High-level modules should not depend on low-level modules. Both should depend on abstractions.**
2. **Abstractions should not depend on details. Details should depend on abstractions.**

The "inversion" in the name is literal. In a naive layered design, the direction of source-code dependency follows the direction of *control flow*: the business logic calls the database driver, so the business logic imports the database driver. DIP reverses the *source-code* direction by inserting an abstraction in the middle that both sides depend on. Control flow still goes the same way; the import graph no longer does.

```
Naive layering (high-level depends on low-level):

   ┌──────────────────────┐         ┌────────────────────┐
   │   OrderService       │  ────►  │  SendgridEmailer   │
   │   (business logic)   │         │  (vendor SDK)      │
   └──────────────────────┘         └────────────────────┘
              ▲
   imports points outward — business logic now depends on Sendgrid

With DIP (both depend on an abstraction owned by the policy):

   ┌──────────────────────┐         ┌────────────────────┐
   │   OrderService       │         │  SendgridEmailer   │
   │   (business logic)   │         │  (vendor SDK)      │
   └────────────┬─────────┘         └─────────┬──────────┘
                │                             │
                ▼                             ▼
              ┌───────────────────────────────┐
              │   EmailSender (interface)     │   ← owned by the policy
              └───────────────────────────────┘
```

The interface is *defined by the high-level module*. The low-level module *adapts itself to it*. That ownership detail is the heart of DIP.

---

## Why does it matter?

When a high-level module imports a concrete low-level dependency, three things happen:

- **The business logic cannot be tested in isolation.** Every unit test of `OrderService` boots a real Sendgrid client.
- **The business logic cannot be reused or replaced behind a different provider.** Switching email vendors means rewriting the business logic, not just adding a new adapter.
- **The business logic accumulates the low-level module's concerns** — retry policies, API keys, vendor exceptions — that have nothing to do with placing orders.

DIP isolates the *what* (place an order, send a confirmation) from the *how* (over SMTP via Sendgrid, over a queue, into a test inbox). The *what* is the part that should be stable; the *how* is the part that legitimately changes.

---

## DIP vs DI vs IoC

These three terms are routinely confused.

| Term | What it is |
|---|---|
| **DIP** — Dependency *Inversion* Principle | A *design principle*: the import direction between policy and detail should be reversed via an abstraction. |
| **DI** — Dependency *Injection* | A *technique*: a class receives its collaborators (constructor argument, setter, function parameter) instead of constructing them. |
| **IoC** — *Inversion of Control* | A *broader pattern*: the framework calls your code, not the other way around (e.g., callbacks, event handlers, container-managed lifecycles). |

You can use DI without DIP (injecting a *concrete* dependency provides flexibility for tests, but the policy still depends on a concrete type). You can apply DIP without a DI container (manual constructor wiring is the simplest form). DI is the most common implementation mechanism for DIP, but the two are not synonyms.

A useful summary: **DIP is the goal; DI is one way to reach it; IoC is a generalization to flow of control, not just dependencies.**

---

## How it works

The mechanical refactor is small:

1. Find the import in the high-level module that points to a low-level concrete type.
2. Define an abstraction (interface, protocol, trait) *next to the high-level module*. Its name should describe what the policy needs, not what the provider offers — `EmailSender`, not `SendgridClient`.
3. Make the low-level module implement that abstraction. Move any vendor-specific logic into the implementation.
4. Inject the abstraction into the high-level module (constructor argument or parameter). The high-level module no longer imports the low-level one.

The new architecture has two important properties:

- **Source-code dependencies cross the boundary in one direction only** — toward the policy.
- **Runtime control flow still goes both ways** — the policy calls into the implementation through the interface, as before.

This is how Clean Architecture, Hexagonal Architecture, and Onion Architecture all describe "the dependency rule": **source dependencies point inward toward higher-level policy**.

---

## Examples

**Scenario.** An `OrderService` that needs to send a confirmation email when an order is placed. The "before" code imports a Sendgrid client directly; the "after" code defines an `EmailSender` abstraction that lives next to `OrderService`, and ships a `SendgridEmailSender` adapter as a separate module.

### TypeScript

**Before.**

```typescript
import { SendgridClient } from 'sendgrid-sdk';

export class OrderService {
  private email = new SendgridClient(process.env.SENDGRID_API_KEY!);

  placeOrder(order: Order) {
    // …business logic…
    this.email.send({ to: order.customerEmail, subject: 'Order confirmed' });
  }
}
```

**After.**

```typescript
// In the same module as OrderService — owned by the policy.
export interface EmailSender {
  send(message: { to: string; subject: string; body?: string }): Promise<void>;
}

export class OrderService {
  constructor(private email: EmailSender) {}

  async placeOrder(order: Order) {
    // …business logic…
    await this.email.send({ to: order.customerEmail, subject: 'Order confirmed' });
  }
}

// In a separate adapter module — depends on EmailSender, not the other way.
import { SendgridClient } from 'sendgrid-sdk';
import type { EmailSender } from '../core/order-service';

export class SendgridEmailSender implements EmailSender {
  private client = new SendgridClient(process.env.SENDGRID_API_KEY!);
  async send(m: { to: string; subject: string; body?: string }) {
    await this.client.send(m);
  }
}
```

### Go

Go's idiom — *the consumer defines the interface* — lines up exactly with DIP. The interface lives next to `OrderService`, and `SendgridEmailSender` satisfies it implicitly.

**Before.**

```go
package order

import "third_party/sendgrid"

type Service struct {
    email *sendgrid.Client
}

func (s *Service) PlaceOrder(o Order) error {
    // …business logic…
    return s.email.Send(o.CustomerEmail, "Order confirmed", "")
}
```

**After.**

```go
package order

type EmailSender interface {
    Send(to, subject, body string) error
}

type Service struct {
    email EmailSender
}

func NewService(email EmailSender) *Service { return &Service{email: email} }

func (s *Service) PlaceOrder(o Order) error {
    // …business logic…
    return s.email.Send(o.CustomerEmail, "Order confirmed", "")
}

// In a separate adapter package:
package sendgridadapter

import (
    "third_party/sendgrid"
    "yourapp/order"
)

type Adapter struct{ client *sendgrid.Client }

func (a Adapter) Send(to, subject, body string) error {
    return a.client.Send(to, subject, body)
}

var _ order.EmailSender = Adapter{} // compile-time check
```

### Swift

**Before.**

```swift
import SendgridSDK

final class OrderService {
    private let email = SendgridClient(apiKey: ProcessInfo.processInfo.environment["SENDGRID_API_KEY"]!)

    func placeOrder(_ order: Order) async throws {
        // …business logic…
        try await email.send(to: order.customerEmail, subject: "Order confirmed")
    }
}
```

**After.**

```swift
// Owned by the policy.
protocol EmailSender {
    func send(to: String, subject: String, body: String?) async throws
}

final class OrderService {
    private let email: EmailSender
    init(email: EmailSender) { self.email = email }

    func placeOrder(_ order: Order) async throws {
        // …business logic…
        try await email.send(to: order.customerEmail, subject: "Order confirmed", body: nil)
    }
}

// Separate adapter module.
import SendgridSDK

struct SendgridEmailSender: EmailSender {
    let client: SendgridClient
    func send(to: String, subject: String, body: String?) async throws {
        try await client.send(to: to, subject: subject, body: body ?? "")
    }
}
```

### Dart (Flutter)

**Before.**

```dart
import 'package:sendgrid_sdk/sendgrid_sdk.dart';

class OrderService {
  final _email = SendgridClient(apiKey: const String.fromEnvironment('SENDGRID_API_KEY'));

  Future<void> placeOrder(Order order) async {
    // …business logic…
    await _email.send(to: order.customerEmail, subject: 'Order confirmed');
  }
}
```

**After.**

```dart
// Owned by the policy.
abstract class EmailSender {
  Future<void> send({required String to, required String subject, String? body});
}

class OrderService {
  final EmailSender email;
  OrderService(this.email);

  Future<void> placeOrder(Order order) async {
    // …business logic…
    await email.send(to: order.customerEmail, subject: 'Order confirmed');
  }
}

// Separate adapter file.
import 'package:sendgrid_sdk/sendgrid_sdk.dart';

class SendgridEmailSender implements EmailSender {
  final SendgridClient client;
  SendgridEmailSender(this.client);

  @override
  Future<void> send({required String to, required String subject, String? body}) {
    return client.send(to: to, subject: subject, body: body ?? '');
  }
}
```

### C# (.NET)

**Before.**

```csharp
using SendGrid;

public class OrderService
{
    private readonly SendGridClient _email = new(Environment.GetEnvironmentVariable("SENDGRID_API_KEY"));

    public async Task PlaceOrder(Order order)
    {
        // …business logic…
        await _email.SendEmailAsync(order.CustomerEmail, "Order confirmed", "");
    }
}
```

**After.**

```csharp
// Owned by the policy.
public interface IEmailSender
{
    Task SendAsync(string to, string subject, string? body);
}

public class OrderService
{
    private readonly IEmailSender _email;
    public OrderService(IEmailSender email) => _email = email;

    public async Task PlaceOrder(Order order)
    {
        // …business logic…
        await _email.SendAsync(order.CustomerEmail, "Order confirmed", null);
    }
}

// Separate adapter project.
using SendGrid;

public class SendgridEmailSender : IEmailSender
{
    private readonly SendGridClient _client;
    public SendgridEmailSender(SendGridClient client) => _client = client;

    public Task SendAsync(string to, string subject, string? body) =>
        _client.SendEmailAsync(to, subject, body ?? "");
}
```

---

## Beyond OOP

DIP is a structural property — *which way do imports point* — and it is independent of language features:

- **Functional programming** — pass functions as arguments instead of importing modules that perform side effects. `placeOrder(order, sendEmail)` is the function-level expression of DIP. Reader monads and effect systems (ZIO, Cats Effect) generalize this to whole programs.
- **Hexagonal / Ports and Adapters architecture** — the *port* is the abstraction the policy owns; the *adapter* is the concrete implementation. The two terms map directly onto DIP. See [Hexagonal Architecture](../../architecture/hexagonal.md), [Clean Architecture](../../architecture/clean.md), [Onion Architecture](../../architecture/onion.md).
- **Plugin systems** — the host defines the plugin API; plugins implement it. The host never depends on a specific plugin, and yet plugins call back into the host through the API. DIP at the boundary of two codebases.
- **Microservices** — a service publishes an OpenAPI/gRPC contract (the abstraction). Callers depend on the contract, not on the service's internals. Contract-first design is DIP between processes.

---

## When to use

- At every architectural boundary that crosses from policy to detail: business logic → database, business logic → HTTP API, business logic → file system, business logic → external SDK.
- When you find your business logic importing a vendor SDK, a framework, or any module whose lifetime is shorter than the policy's.
- When you want a piece of code to remain testable without standing up its real dependencies.
- When two implementations of the same capability are plausible (a real one and a fake; a vendor A and a vendor B), DIP lets both plug in without touching the policy.

## When NOT to use

- For trivial scripts and short-lived code. A 50-line CLI does not need an interface for its file reader.
- When the "abstraction" has only one implementation that will ever exist and adds no testing benefit. The interface is then noise.
- When the abstraction leaks the concrete implementation through it (an "interface" whose method signatures are taken directly from a vendor SDK is not an abstraction — it is the SDK with extra ceremony). The abstraction must speak the policy's language, not the vendor's.
- For value types and pure data. Wrapping `string`, `Date`, or a primitive record behind an interface gives nothing.

---

## References

- Robert C. Martin — *Clean Architecture* (2017), chapter 11. The most thorough treatment, including the *Dependency Rule*.
- Robert C. Martin — [The Dependency Inversion Principle](https://drive.google.com/file/d/0BwhCYaYDn8EgMjdlMWIzNGUtZTQ0NC00ZjQ5LTkwYzQtZjRhMDRlNTQ3ZGMz/view), original 1996 article in *C++ Report*.
- Martin Fowler — [Inversion of Control Containers and the Dependency Injection pattern](https://martinfowler.com/articles/injection.html). The canonical clarification of DI vs IoC vs DIP.
- Alistair Cockburn — [Hexagonal Architecture](https://alistair.cockburn.us/hexagonal-architecture/). The architectural pattern that takes DIP to the system level.
- Mark Seemann — *Dependency Injection Principles, Practices, and Patterns* (2019). A book-length treatment of DI through the lens of DIP, with C# examples.
