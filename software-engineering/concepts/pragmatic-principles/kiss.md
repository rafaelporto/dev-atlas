# Keep It Simple, Stupid (KISS)

> Of two designs that meet today's requirements, the simpler one is almost always the better one.

---

## What is it?

KISS is a design principle that says: prefer the simplest design that solves the problem at hand. Complexity should appear only when it is *required* — by the problem, not by the designer.

The slogan is attributed to Kelly Johnson, lead engineer at Lockheed's Skunk Works, in the 1960s. Johnson's original framing was concrete: a jet fighter had to be repairable in a combat zone by an average mechanic with basic tools. Designs that were elegant in the lab but unmaintainable in the field were unacceptable.

The same constraint applies to software, with the field being the future engineer reading the code at 2 a.m. trying to diagnose a production incident. KISS asks: *will that engineer be able to understand and change this with the tools at hand?*

A more careful modern restatement, drawn from Rich Hickey's *Simple Made Easy* talk, is essential: **simple is not the same as easy**. Simple means *un-braided*: few moving parts, each with a single concern, that compose without surprising interactions. Easy means *familiar* or *quick to write*. These properties often align, but not always — sometimes a "complicated" abstraction is what is easy because it looks like what we already know, while the genuinely simple solution requires careful thought.

---

## Why does it matter?

The cost of complexity compounds. Every additional indirection, every additional configuration knob, every additional abstraction layer, makes the system:

- **Harder to read.** Following the path of an execution through six well-named files is slower than reading one straightforward function.
- **Harder to change.** A change that touches one concern in a simple design touches several layers in a complex one — each layer adding the risk of unintended interaction.
- **Harder to debug.** Stack traces grow longer. Dynamic dispatch obscures which implementation actually ran. Configuration replaces code, moving bugs from a place a debugger can reach to a place it cannot.
- **More expensive to onboard onto.** A new engineer can read a 200-line straightforward module on day one. A "flexible" framework with the same behavior takes weeks to internalize.

The principle is not "do less work" — it is **do exactly the work the problem requires, and no more**. The work that is *not* required is the most expensive work in the system, because nobody ever decides to remove it.

---

## How it works

KISS is more about a *disposition* than a mechanical procedure. The discipline is to ask, at every decision point:

1. **What is the smallest design that handles the requirements I have today?**
2. **What complexity is unavoidable because the problem itself is complex?** (essential complexity, in Brooks's sense)
3. **What complexity am I adding because I think it might be needed?** (accidental complexity — almost always cuttable)

```
┌───────────────────────────────────────────────────────────────┐
│  Brooks: complexity comes in two flavors                      │
│                                                               │
│    ESSENTIAL  — built into the problem itself.                │
│                  Concurrency, distributed state, the          │
│                  intrinsic shape of a tax code.               │
│                  Cannot be removed; must be modelled.         │
│                                                               │
│    ACCIDENTAL — built into the solution, not the problem.     │
│                  Frameworks, indirection, configuration,      │
│                  clever metaprogramming. Can almost always    │
│                  be reduced.                                  │
└───────────────────────────────────────────────────────────────┘
```

KISS is at its core a war on accidental complexity. Essential complexity is the problem you were paid to solve.

### Gall's Law

A separate but reinforcing observation, from John Gall (1975):

> *"A complex system that works is invariably found to have evolved from a simple system that worked. The inverse proposition also appears to be true: A complex system designed from scratch never works."*

The implication for KISS: starting simple is not a compromise; it is the *only* path that empirically produces complex systems that function. Begin with the smallest thing that solves today's problem. Let the system earn its complexity, one demonstrated need at a time.

---

## Examples

**Scenario.** A SaaS application needs to send a welcome email when a user signs up. There is exactly one notification channel (email), one template, and one trigger. The KISS-violating design imagines a future with SMS, push, and webhooks, and builds a "notification platform". The KISS design sends an email.

### TypeScript

**Before — over-built for needs that don't exist.**

```typescript
interface NotificationChannel {
  send(recipient: string, message: Message): Promise<void>;
}

interface NotificationStrategy {
  channels: NotificationChannel[];
  build(event: DomainEvent): Message;
}

class WelcomeEmailStrategy implements NotificationStrategy {
  constructor(public channels: NotificationChannel[]) {}
  build(event: DomainEvent): Message {
    return { subject: 'Welcome!', body: `Hi ${event.payload.name}` };
  }
}

class NotificationDispatcher {
  private strategies = new Map<string, NotificationStrategy>();
  register(eventType: string, s: NotificationStrategy) { this.strategies.set(eventType, s); }
  async dispatch(event: DomainEvent) {
    const s = this.strategies.get(event.type);
    if (!s) return;
    const message = s.build(event);
    await Promise.all(s.channels.map(c => c.send(event.payload.email, message)));
  }
}
```

**After.**

```typescript
async function sendWelcomeEmail(user: { name: string; email: string }) {
  await emailClient.send({
    to: user.email,
    subject: 'Welcome!',
    body: `Hi ${user.name}`,
  });
}
```

The day SMS is genuinely required, refactor then — informed by the *real* requirements, not the imagined ones.

### Go

**Before.**

```go
type NotificationChannel interface {
    Send(recipient string, msg Message) error
}

type NotificationStrategy interface {
    Channels() []NotificationChannel
    Build(event DomainEvent) Message
}

type Dispatcher struct {
    strategies map[string]NotificationStrategy
}

func (d *Dispatcher) Register(eventType string, s NotificationStrategy) {
    d.strategies[eventType] = s
}

func (d *Dispatcher) Dispatch(event DomainEvent) error {
    s, ok := d.strategies[event.Type]
    if !ok { return nil }
    msg := s.Build(event)
    for _, c := range s.Channels() {
        if err := c.Send(event.Payload.Email, msg); err != nil { return err }
    }
    return nil
}
```

**After.**

```go
func SendWelcomeEmail(user User, email EmailClient) error {
    return email.Send(user.Email, "Welcome!", fmt.Sprintf("Hi %s", user.Name))
}
```

### Swift

**Before.**

```swift
protocol NotificationChannel {
    func send(to recipient: String, message: Message) async throws
}

protocol NotificationStrategy {
    var channels: [NotificationChannel] { get }
    func build(_ event: DomainEvent) -> Message
}

final class NotificationDispatcher {
    private var strategies: [String: NotificationStrategy] = [:]
    func register(eventType: String, strategy: NotificationStrategy) {
        strategies[eventType] = strategy
    }
    func dispatch(_ event: DomainEvent) async throws {
        guard let s = strategies[event.type] else { return }
        let message = s.build(event)
        for c in s.channels {
            try await c.send(to: event.payload.email, message: message)
        }
    }
}
```

**After.**

```swift
func sendWelcomeEmail(to user: User, using email: EmailClient) async throws {
    try await email.send(to: user.email,
                         subject: "Welcome!",
                         body: "Hi \(user.name)")
}
```

### Dart (Flutter)

**Before.**

```dart
abstract class NotificationChannel {
  Future<void> send(String recipient, Message message);
}

abstract class NotificationStrategy {
  List<NotificationChannel> get channels;
  Message build(DomainEvent event);
}

class NotificationDispatcher {
  final _strategies = <String, NotificationStrategy>{};
  void register(String type, NotificationStrategy s) => _strategies[type] = s;
  Future<void> dispatch(DomainEvent event) async {
    final s = _strategies[event.type];
    if (s == null) return;
    final msg = s.build(event);
    for (final c in s.channels) {
      await c.send(event.payload.email, msg);
    }
  }
}
```

**After.**

```dart
Future<void> sendWelcomeEmail(User user, EmailClient email) {
  return email.send(to: user.email, subject: 'Welcome!', body: 'Hi ${user.name}');
}
```

### C# (.NET)

**Before.**

```csharp
public interface INotificationChannel
{
    Task SendAsync(string recipient, Message message);
}

public interface INotificationStrategy
{
    IEnumerable<INotificationChannel> Channels { get; }
    Message Build(DomainEvent @event);
}

public class NotificationDispatcher
{
    private readonly Dictionary<string, INotificationStrategy> _strategies = new();
    public void Register(string type, INotificationStrategy s) => _strategies[type] = s;
    public async Task DispatchAsync(DomainEvent @event)
    {
        if (!_strategies.TryGetValue(@event.Type, out var s)) return;
        var msg = s.Build(@event);
        foreach (var c in s.Channels)
            await c.SendAsync(@event.Payload.Email, msg);
    }
}
```

**After.**

```csharp
public static class WelcomeEmail
{
    public static Task SendAsync(User user, IEmailClient email) =>
        email.SendAsync(user.Email, "Welcome!", $"Hi {user.Name}");
}
```

---

## Simple vs Easy

Rich Hickey's distinction is worth internalizing because *easy* is regularly mistaken for *simple* in everyday discussion.

| Property | Meaning | Example |
|---|---|---|
| **Simple** | Few moving parts, each with one concern, composing without surprises | Pure functions; immutable values; explicit dependencies |
| **Easy** | Familiar, near at hand, quick to write | Whatever the language / framework / team already uses |

A widely used framework can be **easy** (everyone knows it) but **not simple** (lots of moving parts, magic, configuration). A purely functional core can be **simple** (no shared state, no implicit context) but **not easy** for an engineer who has never written in that style.

KISS, taken seriously, is a vote for *simple* over *easy*. The two often agree for small problems; on large ones, easy keeps adding layers while simple keeps reducing them.

---

## Beyond OOP

KISS expresses itself across paradigms, with each style having its own characteristic over-complications to watch for:

- **OOP** — premature class hierarchies, abstract factories, strategy patterns deployed for two cases, dependency injection containers configuring trivial dependencies.
- **Functional programming** — point-free style taken past readability, monad transformer stacks for programs that have one effect, type-level computation where a value would do.
- **Data and infrastructure** — Kubernetes for a single-server workload, microservices where a monolith would do, event sourcing for CRUD. Often the simplest *technology* is also the simplest *design*.
- **Configuration** — *don't make it configurable*. Hardcoded values are simpler than configuration files, which are simpler than configurable runtime systems. Pull a value out into config only when it has actually had to vary.

A useful instinct: **the smallest change that makes the test pass**. The same instinct underpins [Test-Driven Development](../tdd.md) and is one of the more reliable ways to keep accidental complexity out.

---

## When to use

- Always, as a default. KISS is the principle most engineers regret *not* applying.
- When two designs both meet the requirements and one has fewer moving parts, choose the smaller one.
- When inheriting unfamiliar code: trace the simplest path through it before adding anything. Often the right next change is to *delete*, not to add.
- When estimating: a simpler design is almost always faster to deliver and easier to estimate, because there is less to be wrong about.
- During design reviews, ask *"what does this design need to be in order to do less?"*

## When NOT to use

- As a license to ignore essential complexity. Distributed consensus, concurrency, security boundaries — these *are* complex and pretending they aren't is how outages happen.
- As an excuse to skip modelling the domain. A "simple" CRUD model of a domain that actually has rules and invariants pushes complexity into the callers; it doesn't eliminate it.
- For problems that already have well-understood, harder shapes. A bank ledger is not *simple*; pretending it is means you'll discover the complexity in production.
- When "simpler for me to write" is conflated with "simpler in the system". KISS is about the simplicity of the *resulting design*, not the convenience of the author.

---

## References

- Frederick P. Brooks Jr. — *No Silver Bullet: Essence and Accidents of Software Engineering* (1986). The essential-vs-accidental complexity framing.
- Frederick P. Brooks Jr. — *The Mythical Man-Month*, 20th Anniversary Edition (1995). The longer treatment.
- Rich Hickey — [Simple Made Easy](https://www.infoq.com/presentations/Simple-Made-Easy/), Strange Loop 2011. The talk that establishes *simple ≠ easy*.
- John Gall — *Systemantics: The Underground Text of Systems Lore* (1975). Origin of Gall's Law.
- Edsger W. Dijkstra — [The Humble Programmer](https://www.cs.utexas.edu/users/EWD/transcriptions/EWD03xx/EWD340.html), 1972 Turing Award lecture. An early and beautiful statement that mastering complexity is the programmer's central task.
- Tony Hoare — *The Emperor's Old Clothes*, 1980 Turing Award lecture: *"There are two ways of constructing a software design: one is to make it so simple that there are obviously no deficiencies; the other is to make it so complicated that there are no obvious deficiencies."*
- Eric Raymond — *The Art of Unix Programming* (2003), particularly the chapters on the Rule of Simplicity and the Rule of Composition.
