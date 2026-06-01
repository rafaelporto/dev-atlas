---
type: concept
tags:
  - principle
related: []
language: null
---
# Liskov Substitution Principle (LSP)

> A subtype must be usable anywhere its supertype is expected, without surprising the caller.

---

## What is it?

If `S` is a subtype of `T`, then objects of type `T` in a program may be replaced with objects of type `S` without changing any of the desirable properties of that program. In plain language: the substitute must honor every promise the original made.

The principle was stated by Barbara Liskov in 1987 and formalized with Jeannette Wing in 1994 as the **behavioral notion of subtyping**. It is the strongest principle in SOLID, because it is not a heuristic — it is a logical constraint that, when violated, causes provable defects.

> *"Let `q(x)` be a property provable about objects `x` of type `T`. Then `q(y)` should be provable for objects `y` of type `S` where `S` is a subtype of `T`."* — Liskov & Wing, 1994

In practice, LSP is about **contracts**: the preconditions a method demands of its caller, the postconditions it promises in return, and the invariants the type maintains. A subtype is allowed to *strengthen* what it promises and *weaken* what it demands — but never the reverse.

---

## Why does it matter?

When LSP is violated, code that compiles cleanly and looks correct *fails at runtime*, and the failures are particularly nasty:

- **Polymorphic call sites lie.** A function that accepts a base type can no longer assume the base type's behavior, because some subclass may have broken it.
- **Defensive code spreads.** Callers begin to type-check (`if (shape instanceof Square)`) to handle the misbehavior, which defeats the entire purpose of polymorphism.
- **Tests for the base type pass; integrations fail.** The substitute satisfies the *interface* but not the *behavior*.

LSP is what makes polymorphism *trustworthy*. Without it, an interface is a syntactic agreement that says nothing about what the program will actually do.

---

## How it works

Every method on a type has an implicit contract:

```
┌─────────────────────────────────────────────────────────┐
│                  Contract of a method                   │
│                                                         │
│  Preconditions  — what the method requires of caller    │
│  Postconditions — what the method promises on return    │
│  Invariants     — what the type maintains, always       │
└─────────────────────────────────────────────────────────┘
```

A subtype `S` of `T` may, in its overrides:

- **Weaken preconditions** — accept *more* inputs than `T` did. (Caller is never surprised: anything `T` accepts, `S` also accepts.)
- **Strengthen postconditions** — guarantee *more* about the result. (Caller is never surprised: whatever `T` promised, `S` promises at least that.)
- **Preserve invariants** — never break what `T` claimed would always hold.

The subtype may *not*:

- Demand *additional* preconditions the caller did not know about.
- Provide *weaker* postconditions, returning less than was promised.
- Throw exceptions the supertype did not declare.
- Modify state in ways the supertype's contract disallows.

### A useful test: the "no instanceof" rule

If callers of `T` ever have to write `if (x instanceof S1) ... else if (x instanceof S2)`, the hierarchy is leaking. The subtype is not substitutable, so the caller is compensating manually. That is the signature of an LSP violation.

---

## Examples

**Scenario.** The canonical LSP violation: a `Rectangle` class with width and height, and a `Square` that "is a" rectangle and so inherits from it. Mathematically a square *is* a rectangle, but in code with mutable width and height, the substitution breaks: any function that enlarges a rectangle independently along each axis will misbehave when passed a square.

The fix is not to "patch" the override — it is to recognize that `Square` is not a behavioral subtype of `Rectangle` and remodel the hierarchy.

### TypeScript

**Before — violates LSP.**

```typescript
class Rectangle {
  constructor(protected w: number, protected h: number) {}
  setWidth(w: number)  { this.w = w; }
  setHeight(h: number) { this.h = h; }
  area(): number       { return this.w * this.h; }
}

class Square extends Rectangle {
  override setWidth(w: number)  { this.w = w; this.h = w; }
  override setHeight(h: number) { this.w = h; this.h = h; }
}

function enlarge(r: Rectangle) {
  r.setWidth(5);
  r.setHeight(10);
  // For Rectangle, area = 50. For Square, area = 100. LSP violated.
}
```

**After — separate abstractions, no false subtyping.**

```typescript
interface Shape { area(): number; }

class Rectangle implements Shape {
  constructor(private w: number, private h: number) {}
  area(): number { return this.w * this.h; }
}

class Square implements Shape {
  constructor(private side: number) {}
  area(): number { return this.side * this.side; }
}
```

`Rectangle` and `Square` are sibling implementations of `Shape`. Neither pretends to be the other.

### Go

Go has no inheritance, so the same violation surfaces through interfaces. Adding `SetWidth`/`SetHeight` to a shared interface and letting a `Square` "satisfy" it produces the same problem.

**Before.**

```go
type Resizable interface {
    SetWidth(w float64)
    SetHeight(h float64)
    Area() float64
}

type Rectangle struct{ W, H float64 }
func (r *Rectangle) SetWidth(w float64)  { r.W = w }
func (r *Rectangle) SetHeight(h float64) { r.H = h }
func (r Rectangle) Area() float64        { return r.W * r.H }

type Square struct{ Side float64 }
func (s *Square) SetWidth(w float64)  { s.Side = w }       // also forces height
func (s *Square) SetHeight(h float64) { s.Side = h }       // also forces width
func (s Square) Area() float64        { return s.Side * s.Side }
// Square is a Resizable in name only.
```

**After.**

```go
type Shape interface {
    Area() float64
}

type Rectangle struct{ W, H float64 }
func (r Rectangle) Area() float64 { return r.W * r.H }

type Square struct{ Side float64 }
func (s Square) Area() float64 { return s.Side * s.Side }
```

### Swift

**Before.**

```swift
class Rectangle {
    var width: Double
    var height: Double
    init(width: Double, height: Double) { self.width = width; self.height = height }
    func area() -> Double { width * height }
}

class Square: Rectangle {
    override var width: Double  { didSet { super.height = width } }
    override var height: Double { didSet { super.width = height } }
}
```

**After.**

```swift
protocol Shape {
    func area() -> Double
}

struct Rectangle: Shape {
    let width: Double
    let height: Double
    func area() -> Double { width * height }
}

struct Square: Shape {
    let side: Double
    func area() -> Double { side * side }
}
```

### Dart (Flutter)

**Before.**

```dart
class Rectangle {
  double width, height;
  Rectangle(this.width, this.height);
  void setWidth(double w)  { width = w; }
  void setHeight(double h) { height = h; }
  double area() => width * height;
}

class Square extends Rectangle {
  Square(double side) : super(side, side);
  @override void setWidth(double w)  { width = w; height = w; }
  @override void setHeight(double h) { width = h; height = h; }
}
```

**After.**

```dart
abstract class Shape {
  double area();
}

class Rectangle implements Shape {
  final double width, height;
  Rectangle(this.width, this.height);
  @override double area() => width * height;
}

class Square implements Shape {
  final double side;
  Square(this.side);
  @override double area() => side * side;
}
```

### C# (.NET)

**Before.**

```csharp
public class Rectangle
{
    public virtual double Width  { get; set; }
    public virtual double Height { get; set; }
    public double Area() => Width * Height;
}

public class Square : Rectangle
{
    public override double Width
    {
        get => base.Width;
        set { base.Width = value; base.Height = value; }
    }
    public override double Height
    {
        get => base.Height;
        set { base.Width = value; base.Height = value; }
    }
}
```

**After.**

```csharp
public interface IShape { double Area(); }

public class Rectangle : IShape
{
    public double Width  { get; init; }
    public double Height { get; init; }
    public double Area() => Width * Height;
}

public class Square : IShape
{
    public double Side { get; init; }
    public double Area() => Side * Side;
}
```

---

## Beyond OOP

LSP is *not* about inheritance keywords. It is about substitutability. The same constraints apply wherever an abstraction has multiple implementations:

- **Go interfaces** — any type satisfying `io.Reader` must behave like a reader. Returning an error code for `n` that violates the documented contract is an LSP violation.
- **Rust traits, Haskell type classes, Swift protocols** — instances of `Monad` that don't satisfy the monad laws break code that depends on those laws. The compiler accepts them; the program misbehaves.
- **Duck typing** — Python's "if it walks like a duck" is exactly LSP: substitutability is checked by behavior, not by declared parents. A class that *looks* like a file but `read()` returns bytes when callers expect a string is a runtime LSP violation.
- **Function signatures** — passing a callback that ignores its arguments or returns the wrong type is the simplest possible LSP violation: a function value whose actual behavior diverges from its declared contract.

---

## When to use

- Whenever a class extends another or implements an interface with multiple existing implementations: stop and verify *every* method of the parent contract holds in the child.
- When designing an inheritance hierarchy: prefer `IS-A behavior` over `IS-A noun`. A `Square` *is a* rectangle in geometry, but not in mutable code; the noun-level intuition is wrong.
- When reviewing code that uses `instanceof`, `is`, type switches, or runtime tag checks on polymorphic types — these are LSP smells.
- When implementing the [Open/Closed Principle](open-closed.md): OCP without LSP gives you extension points that callers can no longer trust.

## When NOT to use

LSP is not a "use it or don't" principle — violations are always defects. But it can be over-applied in the following ways:

- **Refusing to use inheritance at all** because "any subclass could violate LSP". Inheritance is a legitimate tool when the subtype really does honor the contract.
- **Inventing contracts that were never promised.** A method documented to throw `NotFound` is *not* violating LSP by throwing it — that is its declared behavior.
- **Treating LSP as a rule about *types* rather than about *behavior*.** A class that satisfies LSP by accident (because no caller relies on the violated method) is still wrong; one that "violates LSP" on paper but where the broader contract was always weaker is fine.

---

## References

- Barbara Liskov, Jeannette Wing — [A Behavioral Notion of Subtyping](https://www.cs.cmu.edu/~wing/publications/LiskovWing94.pdf), ACM TOPLAS, 1994. The formal statement.
- Barbara Liskov — *Data Abstraction and Hierarchy*, OOPSLA 1987. The original talk where the idea was introduced.
- Robert C. Martin — *Clean Architecture* (2017), chapter 9.
- Robert C. Martin — [The Liskov Substitution Principle](https://blog.cleancoder.com/uncle-bob/2014/05/12/TheOpenClosedPrinciple.html). Discussion of the Rectangle/Square example.
- Bertrand Meyer — *Object-Oriented Software Construction*, 2nd edition (1997), chapter on Design by Contract. The framework of pre/postconditions and invariants that gives LSP its teeth.
