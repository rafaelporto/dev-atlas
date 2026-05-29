---
type: concept
tags: []
related: []
language: null
---
# Open/Closed Principle (OCP)

> Software entities should be open for extension, but closed for modification.

---

## What is it?

A module is **open for extension** when new behavior can be added to it without rewriting its existing code, and **closed for modification** when adding that behavior does not require editing the file that holds the existing logic.

The principle was first stated by Bertrand Meyer in *Object-Oriented Software Construction* (1988), where extension was achieved through inheritance. Robert C. Martin restated it in terms of *polymorphism over abstractions* — depending on a stable interface and adding new implementations rather than modifying a closed module's source.

In modern usage, OCP rarely means "never edit this file ever again." It means: **the parts that vary should sit behind a stable abstraction, so growth happens by adding new code rather than by reopening old, tested code.**

---

## Why does it matter?

The pain OCP attacks is the `switch` (or `if-else` chain) that grows a new branch every quarter:

```
function shippingCost(method, weight) {
  switch (method) {
    case 'standard':       return weight * 1.0;
    case 'express':        return weight * 2.5;
    case 'international':  return weight * 4.0 + 20;
    // …a new case every release
  }
}
```

Every new shipping method forces a change to a tested function. Three downstream effects follow:

- **Regressions in unrelated behavior.** Touching the function to add `'overnight'` can break `'international'` if a shared helper is misused.
- **Test rework.** The test file for the function is opened *every* time, just to add another assertion.
- **Merge contention.** Two teams adding two new shipping methods edit the same lines and collide.

When the policy that varies lives behind an abstraction, none of this happens — the new behavior is a brand-new file that the old code never sees.

---

## How it works

The mechanism: identify what *varies* (the policy), depend on an abstraction that captures it, and put each variant in its own module. The dispatcher becomes a plain table lookup or a polymorphic call.

```
Before (closed to extension):

       ┌─────────────────────────┐
       │   shippingCost(...)     │
       │   ┌─────────────────┐   │
       │   │ switch(method)  │   │  ← modified for every new method
       │   │  standard  →    │   │
       │   │  express   →    │   │
       │   │  international →│   │
       │   └─────────────────┘   │
       └─────────────────────────┘

After (open to extension):

       ┌──────────────────────┐         ┌─────────────────────┐
       │   ShippingCost       │ ──────► │  ShippingMethod     │  (abstraction)
       │   (dispatcher)       │         └─────────┬───────────┘
       └──────────────────────┘                   │
                                          ┌───────┼───────────┬───────────────┐
                                          ▼       ▼           ▼               ▼
                                      Standard  Express  International   Overnight (new)
                                                                          ─ added without
                                                                            touching the
                                                                            dispatcher
```

The dispatcher is *closed*: its code does not change when new methods are added. The set of `ShippingMethod` implementations is *open*: any number of new types can plug in.

### How "closed" is closed?

Meyer's original formulation imagined modules that, once shipped, were never re-edited. In practice this is unrealistic — bug fixes happen, abstractions evolve. The pragmatic reading is **closed against likely axes of change**. Identify what is most likely to vary, isolate that, and accept that the rest of the code might still need occasional edits. Trying to be closed against *every* possible change leads to over-abstracted designs that are hard to read and almost never extended in the way the abstraction expected.

---

## Examples

**Scenario.** A shipping calculator that supports multiple methods. The "before" code uses a `switch` and must be edited for every new method. The "after" code defines a `ShippingMethod` abstraction; adding a new method means adding a new type, with the calculator untouched.

### TypeScript

**Before.**

```typescript
type Method = 'standard' | 'express' | 'international';

function shippingCost(method: Method, weightKg: number): number {
  switch (method) {
    case 'standard':      return weightKg * 1.0;
    case 'express':       return weightKg * 2.5;
    case 'international': return weightKg * 4.0 + 20;
  }
}
```

**After.**

```typescript
interface ShippingMethod {
  cost(weightKg: number): number;
}

class Standard implements ShippingMethod {
  cost(w: number) { return w * 1.0; }
}
class Express implements ShippingMethod {
  cost(w: number) { return w * 2.5; }
}
class International implements ShippingMethod {
  cost(w: number) { return w * 4.0 + 20; }
}

function shippingCost(method: ShippingMethod, weightKg: number): number {
  return method.cost(weightKg);
}
```

Adding `Overnight` is a new file. `shippingCost` is never touched.

### Go

**Before.**

```go
func ShippingCost(method string, weightKg float64) float64 {
    switch method {
    case "standard":      return weightKg * 1.0
    case "express":       return weightKg * 2.5
    case "international": return weightKg*4.0 + 20
    }
    return 0
}
```

**After.**

```go
type ShippingMethod interface {
    Cost(weightKg float64) float64
}

type Standard struct{}
func (Standard) Cost(w float64) float64 { return w * 1.0 }

type Express struct{}
func (Express) Cost(w float64) float64 { return w * 2.5 }

type International struct{}
func (International) Cost(w float64) float64 { return w*4.0 + 20 }

func ShippingCost(m ShippingMethod, weightKg float64) float64 {
    return m.Cost(weightKg)
}
```

Go's implicit interface satisfaction makes OCP especially cheap: a new struct that has a `Cost(float64) float64` method automatically *is* a `ShippingMethod`.

### Swift

**Before.**

```swift
enum Method { case standard, express, international }

func shippingCost(_ method: Method, weightKg: Double) -> Double {
    switch method {
    case .standard:      return weightKg * 1.0
    case .express:       return weightKg * 2.5
    case .international: return weightKg * 4.0 + 20
    }
}
```

**After.**

```swift
protocol ShippingMethod {
    func cost(weightKg: Double) -> Double
}

struct Standard: ShippingMethod {
    func cost(weightKg: Double) -> Double { weightKg * 1.0 }
}
struct Express: ShippingMethod {
    func cost(weightKg: Double) -> Double { weightKg * 2.5 }
}
struct International: ShippingMethod {
    func cost(weightKg: Double) -> Double { weightKg * 4.0 + 20 }
}

func shippingCost(_ method: ShippingMethod, weightKg: Double) -> Double {
    method.cost(weightKg: weightKg)
}
```

### Dart (Flutter)

**Before.**

```dart
double shippingCost(String method, double weightKg) {
  switch (method) {
    case 'standard':      return weightKg * 1.0;
    case 'express':       return weightKg * 2.5;
    case 'international': return weightKg * 4.0 + 20;
  }
  return 0;
}
```

**After.**

```dart
abstract class ShippingMethod {
  double cost(double weightKg);
}

class Standard implements ShippingMethod {
  @override double cost(double w) => w * 1.0;
}
class Express implements ShippingMethod {
  @override double cost(double w) => w * 2.5;
}
class International implements ShippingMethod {
  @override double cost(double w) => w * 4.0 + 20;
}

double shippingCost(ShippingMethod method, double weightKg) =>
    method.cost(weightKg);
```

### C# (.NET)

**Before.**

```csharp
public enum Method { Standard, Express, International }

public static double ShippingCost(Method method, double weightKg) =>
    method switch
    {
        Method.Standard      => weightKg * 1.0,
        Method.Express       => weightKg * 2.5,
        Method.International => weightKg * 4.0 + 20,
        _                    => 0
    };
```

**After.**

```csharp
public interface IShippingMethod
{
    double Cost(double weightKg);
}

public class Standard : IShippingMethod
{
    public double Cost(double w) => w * 1.0;
}
public class Express : IShippingMethod
{
    public double Cost(double w) => w * 2.5;
}
public class International : IShippingMethod
{
    public double Cost(double w) => w * 4.0 + 20;
}

public static double ShippingCost(IShippingMethod method, double weightKg) =>
    method.Cost(weightKg);
```

---

## Beyond OOP

The principle is not about polymorphism per se — it is about **dispatching on a closed set vs. an open set**. Several non-OOP mechanisms achieve the same effect:

- **Higher-order functions** — pass `(weightKg) => weightKg * 2.5` as a value. New methods are new function literals; the calculator is closed.
- **Discriminated unions with exhaustive matching** — in Rust, Haskell, or modern TypeScript, a `match` on a sealed sum type *is* closed: the compiler refuses to build until every variant is handled. This is OCP from the opposite direction — extension is *deliberately* restricted to a known set, and the win is exhaustiveness rather than open extensibility. Choose this when the set of cases is part of the domain and should not grow casually.
- **Registries** — a map from a key to a handler. Adding a new method registers a new entry; the dispatcher reads from the map.
- **Plugin systems** — the extreme case. The core is closed and shipped as a binary; extensions are added without recompiling.

The principle does not pick a mechanism. It picks a *property*: growth happens by *addition*, not by *modification*, on the axes that actually vary.

---

## When to use

- When a `switch` or `if-else` chain on a type or tag keeps growing release after release.
- When you can predict, with confidence, *which* axis of the design is going to vary — the variation point is where OCP pays off.
- When extension by third parties or other teams is a real requirement (plugin systems, payment gateways, notification channels).
- When the same conditional dispatch appears in more than one place. The duplication is a sign that the abstraction is missing.

## When NOT to use

- **Speculatively.** Building an extension point that nothing ever extends is pure cost. Wait for the second or third concrete case before extracting the abstraction — the famous "rule of three" applies.
- When the cases are part of the *domain* and should be exhaustive. A `PaymentStatus` of `Pending | Approved | Declined` should produce a compile error when a new status is added — that is the *point*. Discriminated unions with exhaustive matching are the right tool, not polymorphic dispatch.
- When the supposed "extension point" forces every implementor to also know about every other one. That is not extension, it is coupling with extra steps.
- For small programs where the `switch` is the simplest correct answer. Three cases in a 50-line script don't need an interface.

---

## References

- Bertrand Meyer — *Object-Oriented Software Construction*, 2nd edition (1997), chapter 3. Original formulation of OCP via inheritance.
- Robert C. Martin — *Clean Architecture* (2017), chapter 8. The polymorphism-over-abstractions restatement.
- Robert C. Martin — [The Open-Closed Principle](https://blog.cleancoder.com/uncle-bob/2014/05/12/TheOpenClosedPrinciple.html), 2014.
- Jon Skeet — [The Open/Closed Principle, in Review](https://codeblog.jonskeet.uk/2013/03/15/the-open-closed-principle-in-review/). Critical re-reading.
- Phil Wadler — [The Expression Problem](https://homepages.inf.ed.ac.uk/wadler/papers/expression/expression.txt). The classic framing of the trade-off between adding new *cases* and adding new *operations*.
