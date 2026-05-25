# Don't Repeat Yourself (DRY)

> Every piece of knowledge in a system should have a single, unambiguous representation — but not every line of code that looks like another is repeated knowledge.

---

## What is it?

DRY was introduced by Andy Hunt and David Thomas in *The Pragmatic Programmer* (1999). The original statement is more nuanced than the four-letter slogan:

> *"Every piece of knowledge must have a single, unambiguous, authoritative representation within a system."*

The key word is **knowledge**. A business rule, an invariant, a constant, a domain calculation: each one should live in exactly one place, so that when reality changes, exactly one piece of code changes.

The popular misreading — *no two lines of code should ever look alike* — is responsible for some of the most painful over-engineering in the industry. DRY is not about visual repetition. It is about **logical duplication of meaning**.

---

## Why does it matter?

When the same knowledge is encoded in two or more places, three things follow:

- **Updates drift.** The VAT rate changes from 20% to 21%. One place gets updated; two others do not. The system now has three versions of "the VAT rate", and one of them is silently wrong.
- **Bugs reproduce.** A subtle off-by-one in date arithmetic, fixed in one copy, persists in the other.
- **The system contradicts itself.** Two parts of the application compute "active customer" with slightly different rules. Reports never agree.

The cure is to give the knowledge a *single home* and have all callers reference it. The cost of duplicating the lookup is small; the cost of duplicating the knowledge is paid forever.

---

## How it works

The mechanical pattern: identify a piece of knowledge that is encoded in more than one place, give it a name, place it in one module, and have every caller read from that module.

```
Before — knowledge duplicated:

   ┌─────────────────────────┐   ┌─────────────────────────┐
   │   InvoiceService        │   │   QuoteService          │
   │   …                     │   │   …                     │
   │   total = price *       │   │   total = price *       │
   │           (1 + 0.20)    │   │           (1 + 0.20)    │  ← same rule,
   │   …                     │   │   …                     │     two places
   └─────────────────────────┘   └─────────────────────────┘

After — single source of truth:

   ┌─────────────────────────┐   ┌─────────────────────────┐
   │   InvoiceService        │   │   QuoteService          │
   │   total = applyVAT(p)   │   │   total = applyVAT(p)   │
   └────────────┬────────────┘   └────────────┬────────────┘
                │                             │
                └─────────────┬───────────────┘
                              ▼
                ┌─────────────────────────┐
                │   VAT (knowledge)       │
                │   rate = 0.20           │
                │   applyVAT(p) = p*1.20  │
                └─────────────────────────┘
```

If the rate changes, the constant `0.20` is updated once and every consumer reflects the change.

### The hard part: deciding what counts as "the same knowledge"

This is where DRY's reputation is earned or destroyed. Two pieces of code may look identical and yet encode *different* knowledge:

- A function that formats a *shipping address* and a function that formats a *billing address* may be byte-for-byte identical today. They will not stay that way — invoicing regulations will move one but not the other.
- A validation rule for *user email* and a validation rule for *invitee email* may be the same string of characters today. The day a domain blocklist is added for users only, they diverge.

Combining these into a "shared" function makes the divergence painful: every later change has to add flags, branches, and special cases to a function that was supposed to be canonical. The "wrong abstraction" is worse than the duplication it eliminated. *See Sandi Metz's essay below for the canonical explanation.*

The disposition that works: **duplicate freely; consolidate later, when the same change has had to be made in three places for the same reason.** That is the famous *rule of three*.

---

## Examples

**Scenario.** A retail backend computes total price with VAT in two places: invoice generation and quote generation. The VAT rate appears as a literal `0.20` in both files. When the government raises VAT to 21%, both files must be edited and tested. The "before" code below shows the duplication; the "after" code centralizes the rule.

### TypeScript

**Before.**

```typescript
class InvoiceService {
  totalFor(price: number): number {
    return price * (1 + 0.20);
  }
}

class QuoteService {
  totalFor(price: number): number {
    return price * (1 + 0.20);
  }
}
```

**After.**

```typescript
// One module owns the knowledge.
export const VAT_RATE = 0.20;
export function applyVAT(price: number): number {
  return price * (1 + VAT_RATE);
}

// Callers read from it.
import { applyVAT } from './vat';

class InvoiceService {
  totalFor(price: number): number { return applyVAT(price); }
}

class QuoteService {
  totalFor(price: number): number { return applyVAT(price); }
}
```

### Go

**Before.**

```go
type InvoiceService struct{}
func (InvoiceService) TotalFor(price float64) float64 { return price * (1 + 0.20) }

type QuoteService struct{}
func (QuoteService) TotalFor(price float64) float64 { return price * (1 + 0.20) }
```

**After.**

```go
package tax

const VATRate = 0.20

func ApplyVAT(price float64) float64 { return price * (1 + VATRate) }

// ---- callers ----
type InvoiceService struct{}
func (InvoiceService) TotalFor(price float64) float64 { return tax.ApplyVAT(price) }

type QuoteService struct{}
func (QuoteService) TotalFor(price float64) float64 { return tax.ApplyVAT(price) }
```

### Swift

**Before.**

```swift
struct InvoiceService {
    func totalFor(_ price: Double) -> Double { price * (1 + 0.20) }
}

struct QuoteService {
    func totalFor(_ price: Double) -> Double { price * (1 + 0.20) }
}
```

**After.**

```swift
enum VAT {
    static let rate: Double = 0.20
    static func apply(_ price: Double) -> Double { price * (1 + rate) }
}

struct InvoiceService {
    func totalFor(_ price: Double) -> Double { VAT.apply(price) }
}

struct QuoteService {
    func totalFor(_ price: Double) -> Double { VAT.apply(price) }
}
```

### Dart (Flutter)

**Before.**

```dart
class InvoiceService {
  double totalFor(double price) => price * (1 + 0.20);
}

class QuoteService {
  double totalFor(double price) => price * (1 + 0.20);
}
```

**After.**

```dart
class Vat {
  static const double rate = 0.20;
  static double apply(double price) => price * (1 + rate);
}

class InvoiceService {
  double totalFor(double price) => Vat.apply(price);
}

class QuoteService {
  double totalFor(double price) => Vat.apply(price);
}
```

### C# (.NET)

**Before.**

```csharp
public class InvoiceService
{
    public double TotalFor(double price) => price * (1 + 0.20);
}

public class QuoteService
{
    public double TotalFor(double price) => price * (1 + 0.20);
}
```

**After.**

```csharp
public static class Vat
{
    public const double Rate = 0.20;
    public static double Apply(double price) => price * (1 + Rate);
}

public class InvoiceService
{
    public double TotalFor(double price) => Vat.Apply(price);
}

public class QuoteService
{
    public double TotalFor(double price) => Vat.Apply(price);
}
```

---

## The wrong abstraction — DRY's most expensive mistake

DRY applied to *surface* duplication, rather than *knowledge* duplication, produces an abstraction that grows worse with every change. Sandi Metz's blog post *The Wrong Abstraction* is the canonical statement; the example shape looks like this:

```typescript
// Initially: two formatters that look identical.
function formatShippingAddress(a: Address): string {
  return `${a.street}, ${a.city} ${a.zip}`;
}

function formatBillingAddress(a: Address): string {
  return `${a.street}, ${a.city} ${a.zip}`;
}

// "DRY" refactor: combine them.
function formatAddress(a: Address): string {
  return `${a.street}, ${a.city} ${a.zip}`;
}
```

A month later, billing addresses need to include the country code for international compliance. Shipping addresses still must not.

```typescript
// First scar.
function formatAddress(a: Address, opts?: { includeCountry?: boolean }): string {
  return opts?.includeCountry
    ? `${a.street}, ${a.city} ${a.zip}, ${a.country}`
    : `${a.street}, ${a.city} ${a.zip}`;
}
```

Six months and four similar requests later, the function is a forest of boolean flags. Every caller passes the flag for "their" case. New callers copy from whichever existing call looks closest. The abstraction is now slowing down every change and explaining nothing about the domain.

The right move was to leave the two functions duplicated. They look alike *now*, but they encode different knowledge: *how shipping labels are formatted* and *how billing receipts are formatted*. They were always going to drift.

> *"Prefer duplication over the wrong abstraction."* — Sandi Metz

### Recognizing the trap

Symptoms that a "shared" abstraction has become wrong:

- Boolean flag parameters proliferating (`isAdmin`, `forInvoice`, `legacyMode`).
- Callers needing to read the abstraction's source to understand what flags to pass.
- Conditional branches inside the abstraction whose conditions correspond exactly to which caller invoked it.
- Comments like `// for the X case only`.

When you see these, the cure is usually to **inline the abstraction back into each caller** and then re-extract only what is *actually* shared knowledge.

---

## Beyond OOP

DRY is paradigm-agnostic — its expression varies but the idea is the same:

- **Functional programming** — pure functions and shared constants are DRY's natural home. A `taxRate` value in a module is referenced everywhere; an algebraic data type defines a domain term in exactly one place.
- **Data and configuration** — a single source of truth for environment variables, feature flags, or schema definitions is DRY at the *operational* level. Tools like infrastructure-as-code or single-source schema generators (OpenAPI → SDK → server stubs) are DRY between systems.
- **Documentation** — when API docs and the code can drift, they will. Generating docs from the code, or asserting in tests that examples in docs compile, applies DRY across artefacts.
- **Tests** — DRY in test setup (shared fixtures, builders) reduces duplication, but the same wrong-abstraction risk applies. Two tests that look alike often test different things; sharing the setup makes both harder to read later.

---

## When to use

- When a single business rule, constant, or invariant has been encoded in two or more places and they must stay in sync.
- When *the same change has had to be made in three places* for the same reason. That is the moment to extract.
- When duplication is between a definition and its consumers (a schema and its parser, an API spec and its client) — generating one from the other prevents drift.
- When the duplication is in **data** (e.g., the VAT rate as a magic number in three files) rather than in **code shape**. Data duplication is almost always real.

## When NOT to use

- Before duplication has actually occurred twice. Premature deduplication is harder to undo than premature duplication.
- When the apparent duplication is **superficial**: two pieces of code that *look* alike but encode different rules. They will drift; let them.
- When the abstraction needs more parameters than the duplicated code had statements. The shared function is then doing nothing the inline versions weren't doing more clearly.
- When introducing a shared module would create a *cycle* in the dependency graph or force unrelated callers to depend on each other through it.
- When the duplication lives in tests. Test duplication is often *clarifying*: each test reads as a self-contained scenario.

---

## References

- Andrew Hunt, David Thomas — *The Pragmatic Programmer*, 20th Anniversary Edition (2019), Tip 15. The original DRY framing.
- Sandi Metz — [The Wrong Abstraction](https://sandimetz.com/blog/2016/1/20/the-wrong-abstraction), 2016. Mandatory reading for anyone applying DRY in practice.
- Sandi Metz — [All the Little Things](https://www.youtube.com/watch?v=8bZh5LMaSmE), RailsConf 2014. The talk that the post above expands on.
- Kent Beck — *Implementation Patterns* (2008). "Rule of three" and other guidance on when to extract.
- Martin Fowler — *Refactoring*, 2nd ed. (2018). The book-length treatment of *when* to extract, with named refactorings.
- Adam Tornhill — [Your code as a crime scene](https://pragprog.com/titles/atcrime2/your-code-as-a-crime-scene-second-edition/). Empirical lens on which kinds of duplication actually hurt over time.
