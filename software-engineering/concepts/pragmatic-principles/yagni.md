---
type: concept
tags: []
related: []
language: null
---
# You Aren't Gonna Need It (YAGNI)

> Don't build a feature, an abstraction, or an extension point until a present requirement demands it.

---

## What is it?

YAGNI is the discipline of not implementing functionality on the basis that *it might be needed later*. It applies to features, abstractions, configuration knobs, generality, and any other code whose justification is speculative.

The principle came out of Extreme Programming in the late 1990s, articulated by Ron Jeffries and Kent Beck. The original target was the common pattern of "we'll need to swap this out one day, so let's design for it now" — code added against a *hypothetical* future that, in practice, almost never arrived in the form anticipated.

Martin Fowler's 2015 essay [*Yagni*](https://martinfowler.com/bliki/Yagni.html) sharpens the principle by distinguishing **presumptive features** (built because they *might* be needed) from **incremental features** (added when actually needed). YAGNI is a rule against the former, not against thoughtful design.

---

## Why does it matter?

Code that exists "just in case" is expensive even when it works. Fowler identifies four distinct costs of presumptive features:

```
┌────────────────────────────────────────────────────────────┐
│  Four costs of building things you don't yet need          │
│                                                            │
│   Cost of build   — time and effort spent now              │
│   Cost of delay   — what got pushed back to make room      │
│   Cost of carry  — ongoing maintenance, complexity tax     │
│   Cost of repair  — rework when the future arrives in a    │
│                     different shape than was assumed       │
└────────────────────────────────────────────────────────────┘
```

The first two are visible immediately. The third is visible within months — the speculative code has to be read, tested, kept compatible, kept compiling. The fourth is the killer: when the future *does* arrive, it almost always arrives in a shape different from what the speculative abstraction anticipated, and the existing scaffolding gets in the way.

There is also a hidden cost: speculative features *crowd out* the real ones. Time spent on what might be needed is time not spent on what is.

---

## How it works

The rule is procedural: **for each piece of code you are about to write, ask whether a current, real requirement demands it**. Not "is this elegant"; not "would this be cleaner". Demand: *can I delete this and still satisfy the requirements I have today?*

If the answer is yes, the code is presumptive. Leave it out. When the genuine need appears, write it then — informed by the *actual* shape of the new requirement, not by what you imagined it would be.

### The shape YAGNI agrees with

YAGNI does not say "never design". It says: **design for what you know**, and design *small enough to change* when you learn more. The compromise with [Open/Closed (OCP)](../solid/open-closed.md) and [Dependency Inversion (DIP)](../solid/dependency-inversion.md) is the famous *rule of three*:

- One occurrence: write the code straightforwardly.
- Two occurrences: notice the similarity, but tolerate the duplication.
- Three occurrences: extract the abstraction, now informed by three concrete shapes instead of one and a guess.

This is YAGNI's accommodation to design — extract abstractions from *examples*, not from speculation.

---

## Examples

**Scenario.** A team is building checkout. Today's requirement: charge a credit card via Stripe. There is no current requirement for any other payment provider. The presumptive design builds an abstract `PaymentProvider` interface, a registry, configuration, and one implementation (Stripe). The YAGNI design calls Stripe directly. If PayPal or another provider is genuinely added later, the abstraction is extracted then, using *two* real implementations as evidence of what should and should not be shared.

This example deliberately tensions YAGNI against [DIP](../solid/dependency-inversion.md). DIP says "depend on abstractions"; YAGNI says "don't build the abstraction before you need it". Both views have weight. The pragmatic reading: introduce the abstraction when you have *two* real consumers, not one real and one imagined.

### TypeScript

**Before — presumptive abstraction for a single provider.**

```typescript
interface PaymentProvider {
  charge(amount: number, currency: string, source: PaymentSource): Promise<Receipt>;
}

class StripeProvider implements PaymentProvider {
  async charge(amount: number, currency: string, source: PaymentSource) {
    return stripe.charges.create({ amount, currency, source: source.token });
  }
}

class PaymentProviderRegistry {
  private providers = new Map<string, PaymentProvider>();
  register(name: string, p: PaymentProvider) { this.providers.set(name, p); }
  get(name: string): PaymentProvider {
    const p = this.providers.get(name);
    if (!p) throw new Error(`Unknown provider: ${name}`);
    return p;
  }
}

// Usage at every call site:
const registry = new PaymentProviderRegistry();
registry.register('stripe', new StripeProvider());
await registry.get('stripe').charge(1999, 'USD', source);
```

**After.**

```typescript
async function chargeCard(amount: number, currency: string, source: PaymentSource) {
  return stripe.charges.create({ amount, currency, source: source.token });
}

// Usage:
await chargeCard(1999, 'USD', source);
```

The day PayPal becomes a real requirement, extract the abstraction *then* — its shape will be informed by the actual differences between Stripe and PayPal, not by guesses.

### Go

**Before.**

```go
type PaymentProvider interface {
    Charge(amount int, currency string, source PaymentSource) (Receipt, error)
}

type StripeProvider struct{ Client *stripe.Client }
func (s StripeProvider) Charge(amount int, currency string, source PaymentSource) (Receipt, error) {
    return s.Client.Charges.Create(amount, currency, source.Token)
}

type Registry struct{ providers map[string]PaymentProvider }
func (r *Registry) Register(name string, p PaymentProvider) { r.providers[name] = p }
func (r *Registry) Get(name string) (PaymentProvider, error) {
    p, ok := r.providers[name]
    if !ok { return nil, fmt.Errorf("unknown provider %s", name) }
    return p, nil
}
```

**After.**

```go
func ChargeCard(client *stripe.Client, amount int, currency string, source PaymentSource) (Receipt, error) {
    return client.Charges.Create(amount, currency, source.Token)
}
```

### Swift

**Before.**

```swift
protocol PaymentProvider {
    func charge(amount: Int, currency: String, source: PaymentSource) async throws -> Receipt
}

struct StripeProvider: PaymentProvider {
    let client: StripeClient
    func charge(amount: Int, currency: String, source: PaymentSource) async throws -> Receipt {
        try await client.charges.create(amount: amount, currency: currency, source: source.token)
    }
}

final class PaymentProviderRegistry {
    private var providers: [String: PaymentProvider] = [:]
    func register(_ name: String, _ provider: PaymentProvider) { providers[name] = provider }
    func get(_ name: String) throws -> PaymentProvider {
        guard let p = providers[name] else { throw PaymentError.unknownProvider(name) }
        return p
    }
}
```

**After.**

```swift
func chargeCard(amount: Int, currency: String, source: PaymentSource,
                using client: StripeClient) async throws -> Receipt {
    try await client.charges.create(amount: amount, currency: currency, source: source.token)
}
```

### Dart (Flutter)

**Before.**

```dart
abstract class PaymentProvider {
  Future<Receipt> charge(int amount, String currency, PaymentSource source);
}

class StripeProvider implements PaymentProvider {
  final StripeClient client;
  StripeProvider(this.client);

  @override
  Future<Receipt> charge(int amount, String currency, PaymentSource source) {
    return client.charges.create(amount: amount, currency: currency, source: source.token);
  }
}

class PaymentProviderRegistry {
  final _providers = <String, PaymentProvider>{};
  void register(String name, PaymentProvider p) => _providers[name] = p;
  PaymentProvider get(String name) {
    final p = _providers[name];
    if (p == null) throw StateError('Unknown provider: $name');
    return p;
  }
}
```

**After.**

```dart
Future<Receipt> chargeCard(StripeClient client, int amount, String currency, PaymentSource source) {
  return client.charges.create(amount: amount, currency: currency, source: source.token);
}
```

### C# (.NET)

**Before.**

```csharp
public interface IPaymentProvider
{
    Task<Receipt> ChargeAsync(int amount, string currency, PaymentSource source);
}

public class StripeProvider : IPaymentProvider
{
    private readonly StripeClient _client;
    public StripeProvider(StripeClient client) => _client = client;

    public Task<Receipt> ChargeAsync(int amount, string currency, PaymentSource source) =>
        _client.Charges.CreateAsync(amount, currency, source.Token);
}

public class PaymentProviderRegistry
{
    private readonly Dictionary<string, IPaymentProvider> _providers = new();
    public void Register(string name, IPaymentProvider p) => _providers[name] = p;
    public IPaymentProvider Get(string name) =>
        _providers.TryGetValue(name, out var p)
            ? p
            : throw new InvalidOperationException($"Unknown provider: {name}");
}
```

**After.**

```csharp
public static class Payments
{
    public static Task<Receipt> ChargeCardAsync(StripeClient client, int amount, string currency, PaymentSource source) =>
        client.Charges.CreateAsync(amount, currency, source.Token);
}
```

---

## When YAGNI legitimately does NOT apply

YAGNI is a rule against *speculative work*, not a rule against *all forethought*. There is a category of decisions that are radically cheaper to make early than late — for these, "we'll add it when we need it" is the wrong answer.

- **Security and authorization.** Adding authentication to a deployed service after the fact is dangerous and expensive. So is retrofitting input validation, encryption, or audit logging. Bake them in from the start.
- **Persisted data shapes.** Database schemas, event payloads, and message formats are very expensive to change once data exists in production. Spending time on the shape of a column is *not* YAGNI; the cost of repair is enormous.
- **Public API contracts.** Once external clients depend on a published API, breaking it requires versioning, deprecation cycles, and migration support. Designing the API thoughtfully on day one is not speculation — it is paying down a future cost.
- **Observability.** Logging, metrics, and tracing added after an outage are added blind. Adding them early — even minimally — pays compound interest the first time something goes wrong.
- **Backward compatibility hooks.** When a system already has external consumers, sometimes the right move is to *keep* a presumptive abstraction precisely because removing it would break those consumers. YAGNI is about *adding* speculatively, not about *removing* what already exists and is in use.
- **Concurrency and idempotency primitives.** Making an operation safe to retry, or correct under concurrent access, is much harder to retrofit than to design in.

The distinguishing factor in all of these: the **cost of repair** is dramatically higher than the **cost of build**. YAGNI weighs the four costs above and concludes that for most features, build > delay > carry > repair. The categories listed here invert that: repair is so expensive that the up-front cost is justified even when the need is partly anticipated.

---

## Beyond OOP

YAGNI's targets shift by paradigm but the principle is the same — *don't write what isn't required now*:

- **Functional programming** — premature generalization (parametrizing functions over type classes or effect systems for needs that haven't materialized) is FP's most common form of presumptive feature.
- **Configuration and feature flags** — every flag is presumptive infrastructure for a behavior that *might* be turned on. Add flags for variations that have a real, current consumer; resist them as a substitute for decisions.
- **Microservices** — splitting a monolith into services on the speculation of future scale is one of the most expensive YAGNI violations in modern practice. The simpler architecture earns its complexity.
- **Schema design** — adding nullable columns "in case" they are populated later, supporting multiple versions of an event payload that has only ever had one shape. These are presumptive in data, not in code.

---

## When to use

- Every time you find yourself adding a parameter, configuration option, or abstraction whose justification is "we might need it for X later".
- During code review, when a change introduces flexibility without a present consumer.
- When choosing between two designs, prefer the one with fewer extension points.
- When estimating: removing presumptive features from a proposed scope is one of the most reliable ways to ship sooner with less risk.
- After a feature lands: ask whether anything you added "for the future" can already be removed.

## When NOT to use

- For the categories listed above (security, persisted data, public APIs, observability, concurrency safety). The cost of repair is too high.
- As a slogan to shut down design discussion. "YAGNI" is not a counter-argument to a real upcoming requirement — only to a hypothetical one.
- When the abstraction is *already there* and removing it would cost more than carrying it. YAGNI restrains what you *add*; it is not an instruction to aggressively prune existing structure.
- For library or framework code intended to serve diverse consumers. Library authors must anticipate uses they cannot observe; YAGNI applies less sharply at that altitude.

---

## References

- Kent Beck — *Extreme Programming Explained: Embrace Change*, 2nd Edition (2004). YAGNI in its original context.
- Martin Fowler — [Yagni](https://martinfowler.com/bliki/Yagni.html), 2015. The clearest modern treatment, including the four-costs analysis and the presumptive vs incremental distinction.
- Ron Jeffries — [You're NOT gonna need it!](https://ronjeffries.com/xprog/articles/practices/pracnotneed/), 2014. From one of XP's original practitioners.
- Greg Young — [The Art of Destroying Software](https://www.youtube.com/watch?v=8lTfJ2zhA0g), 2015. A complementary view: design code that is *easy to delete* rather than code that anticipates every future need.
- Robert C. Martin — [The Scary Truth About Software Design](https://blog.cleancoder.com/uncle-bob/2017/03/27/TheScaryTruthAboutSoftwareDesign.html). Uncle Bob's reconciliation of YAGNI with [SOLID](../solid/README.md).
- Sandi Metz — *Practical Object-Oriented Design in Ruby* (POODR), 2nd ed. Chapter on dependency, with strong YAGNI overtones in the discussion of premature design.
