---
type: concept
tags: []
related: []
language: null
---
# Fail Fast

> When something is wrong, halt and report it as close to the cause as possible — don't propagate, don't paper over, don't guess a recovery.

---

## What is it?

Fail fast is a discipline: the moment a program detects an error or an invariant violation, it should stop and report the failure loudly — at the very point where the problem was detected — rather than continuing with corrupted state, swallowing the exception, or substituting a "reasonable" default the caller never asked for.

The phrase has two main sources, both from roughly the same period. Andy Hunt and David Thomas, in *The Pragmatic Programmer* (1999), title their Topic 24 *"Dead Programs Tell No Lies"* and offer Tip 32: ***Crash Early***. Their argument is blunt: *"a dead program normally does a lot less damage than a crippled one."* A few years later, Jim Shore wrote a standalone article — *Fail Fast* (IEEE Software, September/October 2004) — making the same case to a wider audience and turning the phrase into the slogan most engineers know today.

The principle is *not* about being fragile. It is about making bugs **visible** and **cheap to fix** by collapsing the distance between cause and symptom.

---

## Why does it matter?

Every defect has a cause and a symptom. The cost of fixing it is roughly proportional to the distance between them — measured in stack frames, log lines, modules crossed, services hopped, and minutes elapsed. Code that fails fast keeps that distance close to zero. Code that swallows, defaults, or recovers blindly stretches it across the whole system.

Three concrete things happen when a failure is allowed to propagate:

- **Silent data corruption.** A parse routine returns `NaN` for a malformed field; the field gets persisted; a billing report goes out a month later with the wrong totals. Nobody sees the original parse failure — the symptom is a customer complaint.
- **Debugging archaeology.** The exception lands six modules and two services away from where it started. The stack trace points to the catch block, not to the cause. Engineers spend hours reconstructing a chain of events that the original failure could have surfaced in one line.
- **False confidence.** Tests pass because the recovery code masks the bug. The system "works" in the sense that nothing crashes — but it is producing wrong answers, and there is no signal telling anyone.

The lineage of *Defensive Programming Considered Harmful* makes the same observation in stronger language: a try/catch wrapped around the whole module is not robustness; it is **hiding** the bugs you most need to see. Code that catches indiscriminately and returns a default is louder than code that crashes — except the noise is downstream, in production, far from anyone who can do anything about it.

---

## How it works

The mechanical pattern is straightforward: **at every boundary and every internal invariant, check — and if violated, halt loudly**. The discipline lives in *where* you choose to put the checks, and in *what kind of halt* you choose.

```
Failure propagated:                          Failure surfaced:

  parse  ──► caller ──► caller ──► caller     parse ──► ✗ (halt, log, alert)
    ✗ (silent NaN)
                                              cause and symptom
  symptom shows up                            are the same line
  three hops downstream,                      of the same file
  maybe in production,
  maybe under load,
  maybe in a report
  that goes to a customer
```

The mechanisms an engineer reaches for, in roughly increasing severity:

- **Type system** — the compile-time form of fail-fast. A non-nullable type makes "this is null" impossible to express; a sum type makes "this case wasn't handled" a compile error.
- **Validation at trust boundaries** — every place untrusted input meets your code (HTTP request bodies, deserialized payloads, config files, command-line arguments, external API responses) gets a parse-and-reject. Inside the trusted core, you assume the input is valid.
- **Preconditions and assertions** — at function entry, state what the function requires. If callers violate it, that is a programming bug; surface it immediately.
- **Panics / fatal exceptions** — for invariant violations inside trusted code (`fatalError`, `panic`, `unreachable!`). These are not for expected errors; they are for "this case is impossible if the program is correct".
- **Circuit breakers** — fail-fast for distributed systems. When a dependency is unhealthy, refuse calls quickly rather than holding connections open and accumulating latency.
- **Refusing to start** — a service with malformed config should fail to boot, not boot with defaults. The earliest fail-fast is *never running at all*.

Choosing the right mechanism is the substance of the principle. A `fatalError()` in a UI button handler is the wrong tool; a swallowed exception around the entire request pipeline is the wrong tool. The next two subsections cover the two most important judgement calls.

---

## Examples

**Scenario.** A backend exposes a `computeDiscount(payload)` endpoint that receives a JSON pricing payload from an upstream service. The payload contains `price` and `percentOff`. The "before" code silently coerces missing or malformed values into zero, clamps a negative price to zero, and returns a number that callers happily multiply against. The "after" code rejects malformed input at the boundary and refuses to continue if an invariant is violated in trusted code.

### TypeScript

**Before — silent coercion at the boundary, clamping in the core.**

```typescript
function computeDiscount(payload: any): number {
  const price = Number(payload?.price) || 0;          // NaN → 0, missing → 0
  const percentOff = Number(payload?.percentOff) || 0; // same
  const safePrice = price < 0 ? 0 : price;             // negative → 0
  return safePrice * (1 - percentOff / 100);
}
```

**After.**

```typescript
type PricingPayload = { price: number; percentOff: number };

function parsePricingPayload(input: unknown): PricingPayload {
  if (typeof input !== 'object' || input === null) {
    throw new TypeError('pricing payload must be an object');
  }
  const obj = input as Record<string, unknown>;
  if (typeof obj.price !== 'number' || !Number.isFinite(obj.price)) {
    throw new TypeError('price must be a finite number');
  }
  if (typeof obj.percentOff !== 'number' || !Number.isFinite(obj.percentOff)) {
    throw new TypeError('percentOff must be a finite number');
  }
  return { price: obj.price, percentOff: obj.percentOff };
}

function computeDiscount(payload: PricingPayload): number {
  // Inside the trusted core, an invariant violation is a programming bug,
  // not an external failure. Surface it.
  if (payload.price < 0) {
    throw new Error(`invariant: price must be >= 0, got ${payload.price}`);
  }
  return payload.price * (1 - payload.percentOff / 100);
}
```

### Go

**Before.**

```go
func ComputeDiscount(payload map[string]any) float64 {
    price, _ := payload["price"].(float64)
    percentOff, _ := payload["percentOff"].(float64)
    if price < 0 {
        price = 0
    }
    return price * (1 - percentOff/100)
}
```

**After.**

```go
type PricingPayload struct {
    Price      float64
    PercentOff float64
}

func ParsePricingPayload(input map[string]any) (PricingPayload, error) {
    price, ok := input["price"].(float64)
    if !ok {
        return PricingPayload{}, fmt.Errorf("price must be a number")
    }
    percentOff, ok := input["percentOff"].(float64)
    if !ok {
        return PricingPayload{}, fmt.Errorf("percentOff must be a number")
    }
    return PricingPayload{Price: price, PercentOff: percentOff}, nil
}

func ComputeDiscount(p PricingPayload) float64 {
    if p.Price < 0 {
        // Inside trusted code: invariant violation is a bug, not an input error.
        panic(fmt.Sprintf("invariant: price must be >= 0, got %v", p.Price))
    }
    return p.Price * (1 - p.PercentOff/100)
}
```

### Swift

**Before.**

```swift
func computeDiscount(payload: [String: Any]) -> Double {
    let price = (payload["price"] as? Double) ?? 0
    let percentOff = (payload["percentOff"] as? Double) ?? 0
    let safePrice = max(price, 0)
    return safePrice * (1 - percentOff / 100)
}
```

**After.**

```swift
struct PricingPayload {
    let price: Double
    let percentOff: Double
}

enum PricingError: Error {
    case missingField(String)
    case invalidNumber(String)
}

func parsePricingPayload(_ input: [String: Any]) throws -> PricingPayload {
    guard let price = input["price"] as? Double, price.isFinite else {
        throw PricingError.invalidNumber("price")
    }
    guard let percentOff = input["percentOff"] as? Double, percentOff.isFinite else {
        throw PricingError.invalidNumber("percentOff")
    }
    return PricingPayload(price: price, percentOff: percentOff)
}

func computeDiscount(_ p: PricingPayload) -> Double {
    precondition(p.price >= 0, "invariant: price must be >= 0, got \(p.price)")
    return p.price * (1 - p.percentOff / 100)
}
```

### Dart (Flutter)

**Before.**

```dart
double computeDiscount(Map<String, dynamic> payload) {
  final price = (payload['price'] as num?)?.toDouble() ?? 0;
  final percentOff = (payload['percentOff'] as num?)?.toDouble() ?? 0;
  final safePrice = price < 0 ? 0.0 : price;
  return safePrice * (1 - percentOff / 100);
}
```

**After.**

```dart
class PricingPayload {
  final double price;
  final double percentOff;
  const PricingPayload(this.price, this.percentOff);
}

PricingPayload parsePricingPayload(Map<String, dynamic> input) {
  final price = input['price'];
  final percentOff = input['percentOff'];
  if (price is! num || !price.isFinite) {
    throw FormatException('price must be a finite number');
  }
  if (percentOff is! num || !percentOff.isFinite) {
    throw FormatException('percentOff must be a finite number');
  }
  return PricingPayload(price.toDouble(), percentOff.toDouble());
}

double computeDiscount(PricingPayload p) {
  assert(p.price >= 0, 'invariant: price must be >= 0, got ${p.price}');
  return p.price * (1 - p.percentOff / 100);
}
```

### C# (.NET)

**Before.**

```csharp
public static double ComputeDiscount(IDictionary<string, object?> payload)
{
    var price = payload.TryGetValue("price", out var p) ? Convert.ToDouble(p) : 0;
    var percentOff = payload.TryGetValue("percentOff", out var o) ? Convert.ToDouble(o) : 0;
    if (price < 0) price = 0;
    return price * (1 - percentOff / 100);
}
```

**After.**

```csharp
public readonly record struct PricingPayload(double Price, double PercentOff);

public static class Pricing
{
    public static PricingPayload Parse(IDictionary<string, object?> input)
    {
        if (!input.TryGetValue("price", out var p) || p is not double price || !double.IsFinite(price))
            throw new ArgumentException("price must be a finite number");
        if (!input.TryGetValue("percentOff", out var o) || o is not double percentOff || !double.IsFinite(percentOff))
            throw new ArgumentException("percentOff must be a finite number");
        return new PricingPayload(price, percentOff);
    }

    public static double ComputeDiscount(PricingPayload p)
    {
        if (p.Price < 0)
            throw new InvalidOperationException($"invariant: price must be >= 0, got {p.Price}");
        return p.Price * (1 - p.PercentOff / 100);
    }
}
```

In each language, the same shape: a **parse** function at the boundary that *cannot* return a malformed value, and a **compute** function in the core that *asserts* invariants rather than tolerating them. The caller never has to wonder whether a returned number is real.

---

## Fail Fast vs "Let It Crash" (Erlang)

A natural objection: if every function panics on bad input, won't the whole system crash all the time?

Joe Armstrong, designing Erlang and the BEAM virtual machine, embraced exactly that and turned it into a design philosophy: ***let it crash***. Don't write defensive code inside a process — keep it small and direct, and when something goes wrong, let the process die. Supervisor processes one level up notice the death and restart, restoring a known-good state. The runtime makes failure recovery a *systems* property, not a per-line discipline.

This sounds like the opposite of fail-fast. It is actually fail-fast taken to its architectural conclusion. The reconciliation is one of altitude:

- **Fail fast** is the *unit-of-code* discipline: a function detects a problem and refuses to continue.
- **Let it crash** is the *unit-of-supervision* discipline: a process dies cleanly and is restarted by something watching it.

They compose. Fail fast inside; supervised restart outside. The function that panics is doing its job; the supervisor that restarts is doing its. The combination produces systems that are simultaneously honest about errors *and* resilient to them — without each function being responsible for both.

The same logic — drawn from a very different tradition — appears in the *Crash-Only Software* paper (Candea & Fox, HotOS 2003), which argues that systems should *only* have one failure mode (crash) and *only* one recovery mode (restart). Eliminating "graceful shutdown" and "partial recovery" code paths removes a category of bugs that exists only because the system tried to be too clever about failure.

The takeaway: defensive recovery code is rarely on the per-function level. If you need resilience, put it at a supervisory boundary — a process, a request handler, a worker pool — and keep the code inside that boundary honest.

---

## Fail Fast vs Defensive Programming

The everyday tension: should `divide(a, b)` silently return `0` when `b == 0`, or throw?

The defensive answer — return `0` — is appealing because it never breaks the caller. The fail-fast answer — throw — is appealing because the bug surfaces immediately. Neither is universally right. The judgment hinges on **where the call sits relative to a trust boundary**.

| Position | What "fail fast" looks like |
|---|---|
| **At the trust boundary** (parser, deserializer, request handler) | Reject malformed input loudly. Return a typed error or throw. *Never* coerce to a default. The boundary is the only place where a defensive check is appropriate — that is its whole purpose. |
| **Inside the trusted core** | Assume the input is valid. If an invariant is violated, that is a programming bug — `panic`, `fatalError`, `assert`. Do not wrap in try/catch. Do not return a default. |
| **At the very top** (request loop, supervisor, main) | Catch *uncaught* exceptions to log, alert, and respond appropriately. This is the *only* layer where a broad catch is right — and even there, only for unhandled cases. |

The reading: **defensive programming is correct at exactly one altitude — the trust boundary — and harmful at every other**. A swallowed exception in the middle of business logic is a bug hider. A swallowed exception at the boundary is a contract violation. A swallowed exception at the top is a logging point.

Tony Hoare's famous *Null References: The Billion Dollar Mistake* talk is the canonical case study. `null` was introduced as a defensive default: a way for a function to return "nothing went wrong, but there's no value". Sixty years and untold outages later, the lesson is that a permissive default in a language used by millions inverts fail-fast at every call site. Modern languages that replace `null` with `Option` or `Maybe` types — Rust, Swift, Kotlin's non-nullable types, TypeScript's `strictNullChecks` — are restoring fail-fast at the type level: the compiler refuses to let you ignore the missing-value case.

---

## Beyond OOP

Fail fast shows up across paradigms with different mechanisms but the same intent — *make the bug visible at the earliest possible moment*:

- **Functional programming** — `Result<T, E>` / `Either` / `Option` types are fail-fast made explicit at the type level. The failure case is *part of the return type*; the consumer cannot pretend it doesn't exist without acknowledging it (`unwrap`, pattern match, `?` operator). Compare to traditions where errors travel out-of-band via exceptions — typed errors force the conversation about failure to the surface.
- **Data and infrastructure** — schema validation at ingestion (JSON Schema, Protobuf, Avro, Zod, Pydantic) is fail-fast for data pipelines. A malformed record is rejected at the boundary, not silently transformed into bad analytics. Services that *refuse to start* with malformed config — instead of booting with defaults and running degraded — are applying the same principle at the deployment level.
- **Distributed systems** — circuit breakers (Nygard, *Release It!*), explicit timeouts on every outbound call, bulkheads that isolate failure domains. These are all forms of fail-fast for the network: when a dependency is sick, the right answer is to refuse the call quickly, not hold a connection open and accumulate latency until the whole system collapses.
- **Tests** — flaky-test tolerance is the *inverse* of fail-fast. A team that retries failing tests is training itself to ignore the signal that fail-fast is meant to send. The same logic applies to ignored warnings, suppressed lint rules, and `try: ... except: pass` blocks: each one is a deliberate decision to mute the system's attempts to tell you something is wrong.
- **Static typing** — the compile-time form of fail-fast. A type error caught by the compiler is a defect that never reaches production. Languages that allow runtime coercion (`any`, `dynamic`, implicit casts) trade compile-time loudness for runtime quiet, and pay for it later.

---

## When to use

- **Always at trust boundaries.** Input parsing, deserialization, external API responses, config loading, command-line arguments. Reject malformed input; never coerce.
- **For invariant violations in trusted code.** When the failure indicates a programming error rather than an external one, `assert`, `panic`, or `fatalError` are the right tools. Silent correction hides the bug.
- **When the alternative is guessing a default.** If the caller didn't tell you the value, don't make one up. Refuse, and let the caller make the choice deliberately.
- **In distributed systems, on every outbound call.** Explicit timeouts and circuit breakers. The default of "wait forever" is fail-slow.
- **For impossible code paths.** `unreachable!`, `default: throw`, `case _: fatalError("unhandled case")`. If the program reaches that point, something is wrong that you specifically did not plan for — and you want to know.
- **In tests.** A failing test is fail-fast doing its job. Resist the temptation to retry it into green.

## When NOT to use

- **In user-facing code paths where a graceful recovery exists.** A `fatalError()` in a UI button handler that hits a network error is the wrong tool. Show an error, offer a retry. Crash is for *programmer errors*, not domain failures.
- **For expected exceptional conditions.** A payment being declined, a file not existing on a probe, a user not being found — these are *outcomes*, not failures. Model them as values, not exceptions.
- **At the very top of a supervisor or event loop.** The whole point of that layer is to absorb and log failures from below. Inside it, a broad catch is correct. Below it, it isn't.
- **Without observability.** Fail-fast in a system with no monitoring is fail-silent-in-production: the crashes happen, but nobody sees them. Pair fail-fast with logging, metrics, and alerting before you ship.
- **In safety-critical real-time systems where a crash has worse consequences than degraded operation.** Avionics, medical devices, and similar systems have their own discipline (Ada/SPARK, MISRA C, certified runtimes, redundant hardware). The fail-fast advice in this article assumes a standard server or client application, not a system where stopping is itself a failure mode.

---

## References

- Jim Shore — [*Fail Fast*](https://martinfowler.com/ieeeSoftware/failFast.pdf), IEEE Software, September/October 2004. The canonical standalone article that turned the phrase into a slogan.
- Andrew Hunt, David Thomas — *The Pragmatic Programmer*, 20th Anniversary Edition (2019). Topic 24 *"Dead Programs Tell No Lies"* and Tip 32 *"Crash Early"*. The original framing inside the broader Pragmatic Programmer tradition that DRY also belongs to.
- Martin Fowler — [*FailFast*](https://martinfowler.com/bliki/FailFast.html). Short bliki entry that helped popularize the phrase and links to Shore's article.
- Joe Armstrong — *Making Reliable Distributed Systems in the Presence of Software Errors* (PhD thesis, 2003). The full "let it crash" doctrine, with the supervision trees that make it work.
- George Candea, Armando Fox — [*Crash-Only Software*](https://www.usenix.org/legacy/events/hotos03/tech/full_papers/candea/candea.pdf), HotOS 2003. Formal treatment of designing systems whose only failure mode is crash.
- Michael Nygard — *Release It! Design and Deploy Production-Ready Software*, 2nd ed. (2018). Circuit breakers, bulkheads, timeouts — fail-fast as production discipline for distributed systems.
- Bertrand Meyer — *Object-Oriented Software Construction*, 2nd ed. (1997). Design by Contract: preconditions, postconditions, invariants. Fail-fast made formal at the language level.
- Tony Hoare — [*Null References: The Billion Dollar Mistake*](https://www.infoq.com/presentations/Null-References-The-Billion-Dollar-Mistake-Tony-Hoare/), QCon 2009. The canonical cautionary tale on a defensive default that defeated fail-fast for sixty years.
