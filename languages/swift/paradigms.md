---
type: concept
tags:
  - language
  - swift
  - mobile
related: []
language: "swift"
---
# Swift Paradigms

> Swift is a multi-paradigm language built around protocol-oriented programming, value semantics, and first-class support for both OOP and functional styles.

---

## What is it?

A paradigm is a way of structuring code. Swift does not commit to a single one — it provides the primitives for several and lets you mix them deliberately.

The four paradigms that matter most in idiomatic Swift are:

- **Protocol-Oriented Programming (POP)** — composition through protocols with default implementations
- **Object-Oriented Programming (OOP)** — classes, inheritance, and reference semantics where identity matters
- **Functional programming** — first-class functions, immutability, and higher-order operations on collections
- **Value-oriented programming** — `struct` and `enum` as the default modeling tools, with copy-on-write where needed

---

## Why does it matter?

Most languages bias toward one paradigm and tolerate the others. Swift's standard library and Apple's frameworks are designed with all four working together — and choosing the right one for each problem is what separates fluent Swift from "Objective-C with new syntax" or "Java with `let`".

The two principles that thread through every paradigm in Swift:

1. **Prefer value semantics.** Use `struct` and `enum` unless you need identity or shared mutable state.
2. **Prefer composition over inheritance.** Protocols + extensions almost always beat class hierarchies.

---

## How it works

### 1. Protocol-Oriented Programming

Apple introduced POP at [WWDC 2015](https://developer.apple.com/videos/play/wwdc2015/408/). The core idea: define behavior in protocols, provide defaults in protocol extensions, and apply that behavior to value types.

```
┌────────────────────────────┐
│   Protocol (contract)      │
│   + default implementation │
└──────────────┬─────────────┘
               │ adopted by
   ┌───────────┼───────────┐
   ▼           ▼           ▼
 struct      struct       enum
```

No inheritance hierarchy. No "diamond problem". Behavior is composed by adopting multiple protocols.

### 2. Object-Oriented Programming

`class` brings reference semantics, inheritance, and identity. Use it when:

- You need to share mutable state between owners
- You're bridging with Objective-C frameworks (UIKit, AppKit)
- The object has lifecycle that matters (`deinit`)

Single inheritance, all classes implicitly inherit from nothing — there is no `NSObject` root in pure Swift.

### 3. Functional programming

Swift treats functions as values. Higher-order operations on collections (`map`, `filter`, `reduce`, `compactMap`) are idiomatic. Combined with `let`-bound immutability and value types, you can write effectively functional Swift.

What Swift does **not** provide out of the box: persistent data structures (use the [swift-collections](https://github.com/apple/swift-collections) package), or tail-call optimization guarantees.

### 4. Value-oriented programming

`struct` and `enum` are the default modeling tools. The standard library uses copy-on-write for `Array`, `Dictionary`, `Set`, and `String`, so passing them around is cheap until you mutate.

---

## Examples

### Protocol-Oriented Programming

```swift
protocol Identifiable {
    var id: String { get }
}

protocol Describable {
    func describe() -> String
}

// Default implementation
extension Describable where Self: Identifiable {
    func describe() -> String { "Item(\(id))" }
}

struct User: Identifiable, Describable {
    let id: String
    let name: String
}

print(User(id: "u1", name: "Ada").describe()) // "Item(u1)"
```

Note that `User` is a `struct` and adopts two protocols. There is no base class.

### Functional style on collections

```swift
let numbers = [1, 2, 3, 4, 5]

let doubledEvens = numbers
    .filter { $0.isMultiple(of: 2) }
    .map { $0 * 2 }
    .reduce(0, +)

print(doubledEvens) // 12
```

### Value semantics in action

```swift
struct Point {
    var x: Int
    var y: Int
}

var a = Point(x: 1, y: 2)
var b = a       // copy
b.x = 99
print(a.x)      // 1  — unchanged
print(b.x)      // 99
```

### OOP when identity matters

```swift
final class ImageCache {
    private var storage: [URL: Data] = [:]

    func data(for url: URL) -> Data? { storage[url] }
    func store(_ data: Data, for url: URL) { storage[url] = data }
}

// Two references, one shared cache
let cache = ImageCache()
let alsoCache = cache
```

---

## When to use which

| Paradigm | Use it for |
|---|---|
| **Protocol-Oriented** | Most abstractions in your domain — services, repositories, view models, capabilities |
| **OOP (classes)** | Identity matters, you need `deinit`, you're bridging Objective-C, or you need shared mutable state |
| **Functional (on collections)** | Transformations over sequences, anywhere a pipeline of `map`/`filter`/`reduce` is clearer than a loop |
| **Value types (struct/enum)** | Data models, configuration, immutable snapshots, anything that benefits from copy-on-write |

---

## When NOT to use

- **Inheritance for code reuse.** If two types share behavior, give them a protocol with a default implementation — not a base class.
- **`class` because "it's an object".** A `struct` is also an object in any reasonable sense. Pick `class` only when reference semantics are a feature, not a habit.
- **Functional purism.** Swift is not Haskell. Loops, mutation, and side effects are fine when they read more clearly than a chained pipeline. Don't twist code to avoid `for` loops.
- **Massive enums.** Enums with associated values are powerful, but a 30-case enum with payloads on each is usually crying out for protocol-based dispatch.

---

## References

- [Protocol-Oriented Programming in Swift — WWDC 2015](https://developer.apple.com/videos/play/wwdc2015/408/)
- [The Swift Programming Language — Protocols](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/protocols)
- [The Swift Programming Language — Structures and Classes](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/structuresandclasses)
- [Swift API Design Guidelines](https://www.swift.org/documentation/api-design-guidelines/)
- [Choosing Between Structures and Classes](https://developer.apple.com/documentation/swift/choosing-between-structures-and-classes) — Apple Developer
