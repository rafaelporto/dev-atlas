---
type: concept
tags: []
related: []
language: null
---
# Interface Segregation Principle (ISP)

> No client should be forced to depend on methods it does not use.

---

## What is it?

If an interface bundles many unrelated methods, the types that implement it must provide all of them — even when only a subset matters to any given caller. The Interface Segregation Principle says: split the interface into smaller, role-specific ones, so each caller depends only on the methods it actually needs.

The principle came out of a concrete consulting engagement Robert C. Martin had with Xerox in the early 1990s, working on a new multifunction printer. The system had a single bloated class that grew so coupled that small changes required recompiling vast portions of the codebase. The solution was to separate the interface by *role* — and ISP was generalized from that experience.

> *"Many client-specific interfaces are better than one general-purpose interface."* — Robert C. Martin

---

## Why does it matter?

A fat interface hurts in several ways at once:

- **Forced no-ops or throws.** A type that implements only part of the interface has to fake the rest, leaking the violation into runtime errors (`throw new NotSupportedException()` is the canonical smell).
- **Coupling through unused methods.** A caller that uses `print()` ends up depending — at compile time, in imports, in test mocks — on `scan()` and `fax()` too.
- **Recompilation and rebuild cascades.** Adding a method to a wide interface touches every implementor, including ones that have nothing to do with the new feature.
- **Test setup overhead.** Mocking an interface with twelve methods to test a function that uses one of them creates ceremony without value.

ISP attacks the root cause: the interface itself was the wrong shape. The fix is to give each *role* its own interface, and let types implement exactly the roles they fulfill.

---

## How it works

Identify the **roles** an interface is playing. A role is a set of methods that a single client tends to use together. Split the interface along role boundaries.

```
Before — one wide interface:

   ┌──────────────────────────────────┐
   │      MultifunctionDevice         │
   │   ┌──────────────────────────┐   │
   │   │ print(doc)               │   │
   │   │ scan() -> doc            │   │
   │   │ fax(doc, number)         │   │
   │   └──────────────────────────┘   │
   └──────────────────────────────────┘
        ▲                ▲
        │                │
  SimplePrinter   ModernCopier   ← SimplePrinter throws on scan/fax

After — one interface per role:

   ┌──────────┐   ┌──────────┐   ┌──────────┐
   │ Printer  │   │ Scanner  │   │   Fax    │
   │ print()  │   │ scan()   │   │ fax()    │
   └──────────┘   └──────────┘   └──────────┘
        ▲             ▲ ▲            ▲
        │             │ │            │
  SimplePrinter  ModernCopier ─── implements only the roles it fulfills
```

A `SimplePrinter` implements `Printer` only. `ModernCopier` implements `Printer + Scanner + Fax`. Callers depend on the narrowest role they need: a function that only prints accepts a `Printer`, not a `MultifunctionDevice`.

### Interfaces belong to the consumer

A subtle implication of ISP, made very clear by Go: interfaces are most useful when defined where they are *used*, not where they are *implemented*. The shape of the abstraction is dictated by what the caller needs, not by what the provider offers. This naturally leads to small, focused interfaces — because each caller only needs a few methods.

---

## Examples

**Scenario.** A multifunction office device interface with `print`, `scan`, and `fax`. Two devices: a `SimplePrinter` that only prints, and a `ModernCopier` that does all three. With one fat interface, the simple printer has to throw or no-op on the methods it doesn't support.

### TypeScript

**Before.**

```typescript
interface MultifunctionDevice {
  print(doc: Document): void;
  scan(): Document;
  fax(doc: Document, number: string): void;
}

class SimplePrinter implements MultifunctionDevice {
  print(doc: Document) { /* … */ }
  scan(): Document     { throw new Error('not supported'); }
  fax(_: Document, __: string) { throw new Error('not supported'); }
}
```

**After.**

```typescript
interface Printer { print(doc: Document): void; }
interface Scanner { scan(): Document; }
interface Fax     { fax(doc: Document, number: string): void; }

class SimplePrinter implements Printer {
  print(doc: Document) { /* … */ }
}

class ModernCopier implements Printer, Scanner, Fax {
  print(doc: Document) { /* … */ }
  scan(): Document     { /* … */ return doc; }
  fax(doc: Document, number: string) { /* … */ }
}
```

### Go

Go's implicit interfaces and small-interface convention make ISP the path of least resistance. The standard library is built on one- and two-method interfaces: `io.Reader`, `io.Writer`, `io.Closer`, composed into `io.ReadWriteCloser` only when all three are actually needed by a single caller.

**Before.**

```go
type MultifunctionDevice interface {
    Print(doc Document)
    Scan() Document
    Fax(doc Document, number string)
}

type SimplePrinter struct{}
func (SimplePrinter) Print(doc Document)            { /* … */ }
func (SimplePrinter) Scan() Document                 { panic("not supported") }
func (SimplePrinter) Fax(doc Document, n string)     { panic("not supported") }
```

**After.**

```go
type Printer interface { Print(doc Document) }
type Scanner interface { Scan() Document }
type Fax     interface { Fax(doc Document, number string) }

type SimplePrinter struct{}
func (SimplePrinter) Print(doc Document) { /* … */ }

type ModernCopier struct{}
func (ModernCopier) Print(doc Document)        { /* … */ }
func (ModernCopier) Scan() Document            { /* … */ }
func (ModernCopier) Fax(doc Document, n string) { /* … */ }
```

A function that only needs to print writes `func PrintReport(p Printer, d Document)` — it accepts *anything* that prints, and never sees scan or fax.

### Swift

**Before.**

```swift
protocol MultifunctionDevice {
    func print(_ doc: Document)
    func scan() -> Document
    func fax(_ doc: Document, to number: String)
}

struct SimplePrinter: MultifunctionDevice {
    func print(_ doc: Document) { /* … */ }
    func scan() -> Document { fatalError("not supported") }
    func fax(_ doc: Document, to number: String) { fatalError("not supported") }
}
```

**After.**

```swift
protocol Printer { func print(_ doc: Document) }
protocol Scanner { func scan() -> Document }
protocol Fax     { func fax(_ doc: Document, to number: String) }

struct SimplePrinter: Printer {
    func print(_ doc: Document) { /* … */ }
}

struct ModernCopier: Printer, Scanner, Fax {
    func print(_ doc: Document) { /* … */ }
    func scan() -> Document { /* … */ }
    func fax(_ doc: Document, to number: String) { /* … */ }
}
```

Protocol composition (`Printer & Scanner`) lets callers ask for exactly the role they need.

### Dart (Flutter)

**Before.**

```dart
abstract class MultifunctionDevice {
  void print(Document doc);
  Document scan();
  void fax(Document doc, String number);
}

class SimplePrinter implements MultifunctionDevice {
  @override void print(Document doc) { /* … */ }
  @override Document scan() => throw UnsupportedError('scan');
  @override void fax(Document doc, String number) => throw UnsupportedError('fax');
}
```

**After.**

```dart
abstract class Printer { void print(Document doc); }
abstract class Scanner { Document scan(); }
abstract class Fax     { void fax(Document doc, String number); }

class SimplePrinter implements Printer {
  @override void print(Document doc) { /* … */ }
}

class ModernCopier implements Printer, Scanner, Fax {
  @override void print(Document doc) { /* … */ }
  @override Document scan() { /* … */ }
  @override void fax(Document doc, String number) { /* … */ }
}
```

### C# (.NET)

**Before.**

```csharp
public interface IMultifunctionDevice
{
    void Print(Document doc);
    Document Scan();
    void Fax(Document doc, string number);
}

public class SimplePrinter : IMultifunctionDevice
{
    public void Print(Document doc) { /* … */ }
    public Document Scan() => throw new NotSupportedException();
    public void Fax(Document doc, string number) => throw new NotSupportedException();
}
```

**After.**

```csharp
public interface IPrinter { void Print(Document doc); }
public interface IScanner { Document Scan(); }
public interface IFax     { void Fax(Document doc, string number); }

public class SimplePrinter : IPrinter
{
    public void Print(Document doc) { /* … */ }
}

public class ModernCopier : IPrinter, IScanner, IFax
{
    public void Print(Document doc) { /* … */ }
    public Document Scan() { /* … */ }
    public void Fax(Document doc, string number) { /* … */ }
}
```

---

## Beyond OOP

The principle's spirit — *depend only on what you use* — is paradigm-agnostic.

- **Functional programming** — instead of passing a giant record of capabilities to a function, pass only the functions the callee actually needs. `function send(http: HttpClient)` is segregated; `function send(env: {http: HttpClient, db: Database, logger: Logger, queue: Queue})` is not.
- **Modules and imports** — importing a whole module to use one helper is the module-level analog of an ISP violation. Tree-shakable, narrow imports keep dependency graphs small.
- **Capability-based design** — security frameworks express ISP as *capabilities*: each component is granted exactly the rights it needs and nothing more. The narrow interface is also the security boundary.
- **GraphQL field selection** — clients ask for only the fields they need; servers do not force one giant payload. ISP applied to data, not behavior.

---

## When to use

- When a single interface has more than 4–5 methods and its implementors each use a different subset.
- When implementations include `throw new NotSupported()`, `panic("not implemented")`, or empty-body overrides. These are ISP smells.
- When a mock or test double for an interface is mostly stubs with one real method — the test is telling you the interface is too wide.
- When two unrelated teams modify the same interface for unrelated reasons (this is also an [SRP](single-responsibility.md) signal, with similar fixes).
- In Go and Swift, where small interfaces / protocols compose freely — ISP is the natural style.

## When NOT to use

- For *cohesive* interfaces whose methods are genuinely used together. `Iterator` with `hasNext` and `next` is not a violation — every caller of one is a caller of the other.
- When over-splitting fragments an interface into many one-method pieces that no caller composes back together. Each interface should still correspond to a recognizable *role*, not just a single method.
- When the interface is defined externally (a standard library or a framework). You don't control its shape; usually the right answer is to wrap it locally with the narrower interface your code actually needs.
- For internal types used in one place only. The principle is about reducing *coupling*; if there is only one caller and one implementor, there is no coupling to reduce.

---

## References

- Robert C. Martin — *Agile Software Development: Principles, Patterns, and Practices* (2002), chapter 12. The Xerox-printer origin story.
- Robert C. Martin — *Clean Architecture* (2017), chapter 10.
- Martin Fowler — [RoleInterface](https://martinfowler.com/bliki/RoleInterface.html). The "role" framing of ISP.
- Go standard library — `io.Reader`, `io.Writer`, `io.Closer` ([io package docs](https://pkg.go.dev/io)). The most consistent industrial application of ISP.
- Dave Cheney — [Practical Go: Interface segregation](https://dave.cheney.net/practical-go/presentations/qcon-china.html). ISP in idiomatic Go.
