---
type: concept
tags: []
related: []
language: "swift"
---
# Protocols and Extensions

> Protocols define contracts, extensions add behavior, and together they are the backbone of Swift's preferred style: protocol-oriented programming.

---

## What is it?

A **protocol** is a contract: a list of properties, methods, and associated types that a conforming type must provide. An **extension** adds members to an existing type — including protocols themselves.

Together they enable Swift's signature pattern: define behavior in a protocol, provide default implementations in an extension on that protocol, and let any type adopt it — including the standard library's own types.

---

## Why does it matter?

In class-oriented languages, code reuse usually means inheritance. Inheritance forces a rigid hierarchy and a single base class. Swift bypasses this by letting **any** type — `struct`, `enum`, or `class` — conform to **any** number of protocols, and by allowing those protocols to ship default implementations.

This produces three concrete benefits:

1. **Value types get full polymorphism.** `struct` and `enum` participate in protocol-based abstractions without needing reference semantics.
2. **Behavior composes.** A type adopts the protocols it needs, no more.
3. **Retroactive conformance.** You can make a third-party type conform to your own protocol via an extension you write yourself.

---

## How it works

```
┌────────────────────────────────────┐
│  protocol Shape                    │
│    var area: Double { get }        │
│    func describe() -> String       │
└──────────────┬─────────────────────┘
               │ default implementation in extension
               ▼
┌────────────────────────────────────┐
│  extension Shape {                 │
│    func describe() -> String {     │
│      "Shape with area \(area)"     │
│    }                               │
│  }                                 │
└──────────────┬─────────────────────┘
               │ adopted by
   ┌───────────┼───────────┐
   ▼           ▼           ▼
 Circle    Rectangle    Triangle
 (struct)  (struct)     (struct)
```

Conforming types provide only what's missing from the defaults.

### Existential vs generic conformance: `any` vs `some`

Swift distinguishes two ways to use a protocol as a type:

- **`some P`** — opaque type. Concrete type is known to the compiler, but hidden from the caller. Zero overhead, full generic dispatch.
- **`any P`** — existential type. A box that can hold any conforming type, decided at runtime. Has indirection cost.

```swift
func makeShape() -> some Shape { Circle(radius: 1) }  // opaque
func loadShape() -> any Shape { Circle(radius: 1) }   // existential
```

Rule of thumb: use `some` for return types, `any` only when you genuinely need heterogeneous collections or runtime polymorphism.

### Conditional conformance

You can make a generic type conform to a protocol only when its type parameter does:

```swift
extension Array: Equatable where Element: Equatable { ... }
```

This means `[Int]` is `Equatable` but `[(Int) -> Int]` is not.

---

## Examples

### A protocol with default implementations

```swift
protocol Shape {
    var area: Double { get }
}

extension Shape {
    func describe() -> String {
        "Shape with area \(area)"
    }
}

struct Circle: Shape {
    let radius: Double
    var area: Double { .pi * radius * radius }
}

struct Rectangle: Shape {
    let width, height: Double
    var area: Double { width * height }
}

print(Circle(radius: 2).describe())     // Shape with area 12.566...
print(Rectangle(width: 3, height: 4).describe())  // Shape with area 12.0
```

### Protocol composition

```swift
protocol Identifiable { var id: String { get } }
protocol Timestamped  { var createdAt: Date { get } }

// Combine on the fly
func log(_ value: some Identifiable & Timestamped) {
    print("\(value.id) at \(value.createdAt)")
}
```

### Conditional conformance

```swift
struct Box<Item> {
    let item: Item
}

extension Box: Equatable where Item: Equatable {
    static func == (lhs: Box, rhs: Box) -> Bool {
        lhs.item == rhs.item
    }
}

// Box(item: 1) == Box(item: 1)    ✅
// Box(item: { $0 }) == ...         ❌ compiler error — closures aren't Equatable
```

### Retroactive conformance — extending a stdlib type

```swift
extension String: Error {}
// now you can do: throw "something went wrong"
```

Apple recommends doing this only on types you own; for third-party or stdlib types, prefer a wrapper. Swift 6 emits warnings on retroactive conformance to external protocols (`extension Foo: Codable where Foo` is external) — silence them explicitly with `@retroactive` when intentional.

### `some` vs `any` in practice

```swift
protocol Animal { func speak() }

struct Dog: Animal { func speak() { print("woof") } }
struct Cat: Animal { func speak() { print("meow") } }

// some — single concrete type, hidden
func pickOne() -> some Animal { Dog() }

// any — heterogeneous collection
let zoo: [any Animal] = [Dog(), Cat(), Dog()]
zoo.forEach { $0.speak() }
```

### Associated types

```swift
protocol Container {
    associatedtype Item
    mutating func append(_ item: Item)
    var count: Int { get }
}

struct Stack<Element>: Container {
    private var items: [Element] = []
    mutating func append(_ item: Element) { items.append(item) }
    var count: Int { items.count }
}
```

---

## When to use

- **Defining capabilities** — anything that several unrelated types should share (e.g., `Cacheable`, `Validatable`, `Drawable`).
- **Decoupling for tests** — depend on a protocol, inject the real or fake implementation.
- **Adding behavior to existing types** — use `extension` for both your own and stdlib types.
- **Modeling closed sets of behavior** — protocols + value types replace many uses of class inheritance.
- **Retrofitting conformance** — make a third-party type conform to a protocol you control.

---

## When NOT to use

- **A protocol with a single conformance and no test substitute.** Adds indirection without payoff — use the concrete type.
- **`any P` collections everywhere.** Existentials erase static type information and add runtime cost. Often a `some P` return type or a generic parameter is what you actually want.
- **Inheritance dressed as protocol composition.** A protocol chain that mirrors a class hierarchy 1-to-1 is just inheritance with extra steps. Composition should branch, not stack.
- **Default implementations that hide important behavior.** If conforming types frequently need to override a default, the contract is wrong — make the requirement non-defaulted.

---

## References

- [The Swift Programming Language — Protocols](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/protocols)
- [The Swift Programming Language — Extensions](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/extensions)
- [The Swift Programming Language — Opaque and Boxed Protocol Types](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/opaquetypes)
- [SE-0309 — Unlock existentials for all protocols (`any`)](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0309-unlock-existential-types-for-all-protocols.md)
- [SE-0244 — Opaque result types (`some`)](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0244-opaque-result-types.md)
- [Protocol-Oriented Programming in Swift — WWDC 2015](https://developer.apple.com/videos/play/wwdc2015/408/)
- [Embrace Swift generics — WWDC 2022](https://developer.apple.com/videos/play/wwdc2022/110352/)
