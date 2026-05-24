# Generics

> Generics let you write code that works for any type while preserving full type safety — the foundation of Swift's standard library and most of its idioms.

---

## What is it?

A generic is a function or type parameterized by one or more type variables. The Swift standard library is built almost entirely from generics: `Array<Element>`, `Dictionary<Key, Value>`, `Optional<Wrapped>`, `Result<Success, Failure>`.

Swift generics are **resolved at compile time**, not at runtime. The compiler specializes generic code for each concrete type that uses it, producing static-dispatch native code with no boxing overhead.

---

## Why does it matter?

Without generics you either lose type safety (use `Any`, cast everywhere) or duplicate code (`IntStack`, `StringStack`, `UserStack`).

With generics you write the algorithm once, and the compiler enforces type correctness at every call site. Combined with **protocol constraints**, you can express requirements like "any sequence of comparable elements" or "any container whose item is hashable" — and the compiler will reject anything else before the code even runs.

---

## How it works

### Generic function

```swift
func firstNonNil<T>(_ values: [T?]) -> T? {
    for v in values {
        if let v { return v }
    }
    return nil
}
```

`T` is a type parameter. At the call site the compiler infers it.

### Generic type

```swift
struct Stack<Element> {
    private var items: [Element] = []
    mutating func push(_ item: Element) { items.append(item) }
    mutating func pop() -> Element? { items.popLast() }
}
```

### Constraints with `where`

```swift
func allEqual<T: Equatable>(_ items: [T]) -> Bool {
    guard let first = items.first else { return true }
    return items.allSatisfy { $0 == first }
}
```

Multiple constraints:

```swift
func process<T>(_ value: T) where T: Codable, T: Sendable { ... }
```

### Associated types in protocols

A protocol with an `associatedtype` is itself generic-shaped:

```swift
protocol Container {
    associatedtype Item
    var count: Int { get }
    subscript(i: Int) -> Item { get }
}
```

You can constrain associated types in extensions or generic functions:

```swift
extension Container where Item: Equatable {
    func contains(_ target: Item) -> Bool {
        for i in 0..<count where self[i] == target { return true }
        return false
    }
}
```

### Opaque types (`some`)

`some P` returns "a specific type that conforms to `P`, hidden behind the protocol":

```swift
func makeSequence() -> some Sequence {
    [1, 2, 3]
}
```

The caller knows it's a `Sequence` but not whether it's an `Array`, `Range`, etc. The concrete type is fixed for each call site — no runtime dispatch.

### Existential types (`any`)

`any P` is a runtime box around any conforming type:

```swift
let shapes: [any Shape] = [Circle(), Rectangle()]
```

`any` has indirection cost and limits some protocol operations (Self requirements, associated types) historically — though Swift 5.7+ has relaxed many of these via implicit opening.

### Type erasure

Sometimes you need to expose a protocol with associated types as a value (e.g., for collections, return values). Wrap it in a generic struct that erases the associated type:

```swift
struct AnyContainer<Item>: Container {
    private let _count: () -> Int
    private let _subscript: (Int) -> Item

    init<C: Container>(_ base: C) where C.Item == Item {
        _count = { base.count }
        _subscript = { base[$0] }
    }

    var count: Int { _count() }
    subscript(i: Int) -> Item { _subscript(i) }
}
```

The standard library's `AnySequence`, `AnyHashable`, `AnyCollection` follow this pattern.

### Specialization

When the compiler sees a generic function called with a concrete type, it can **specialize** — generate a dedicated version with the type substituted. With whole-module optimization, this turns generic code into the same machine code you'd write by hand.

```swift
// Source
func swap<T>(_ a: inout T, _ b: inout T) { ... }

// After specialization for Int:
func swap_Int(_ a: inout Int, _ b: inout Int) { ... }
```

---

## Examples

### Generic algorithm with constraints

```swift
func median<T: Comparable>(_ values: [T]) -> T? {
    guard !values.isEmpty else { return nil }
    let sorted = values.sorted()
    return sorted[sorted.count / 2]
}

median([3, 1, 4, 1, 5])  // 3
median(["b", "a", "c"])  // "b"
```

### Generic type with conditional conformance

```swift
struct Pair<First, Second> {
    let first: First
    let second: Second
}

extension Pair: Equatable where First: Equatable, Second: Equatable {}
extension Pair: Hashable where First: Hashable, Second: Hashable {}
```

### Associated types + opaque return

```swift
protocol Builder {
    associatedtype Output
    func build() -> Output
}

struct StringBuilder: Builder {
    func build() -> String { "result" }
}

func makeBuilder() -> some Builder {
    StringBuilder()
}
```

### Type erasure with `any`

Since Swift 5.7, you can often skip writing a manual `AnyP` wrapper and use `any P` directly:

```swift
protocol Animal { func speak() }
let animals: [any Animal] = [Dog(), Cat(), Bird()]
animals.forEach { $0.speak() }
```

For protocols with associated types, type erasure is still useful when you need a uniform value type.

### `some` vs `any` — a side-by-side

```swift
// Single concrete type, decided at compile time
func makeOne() -> some Shape { Circle() }

// Many concrete types, decided at runtime
func loadFromDisk() -> any Shape { /* JSON-decoded shape */ }
```

If you don't need runtime variation, `some` is faster and clearer.

---

## When to use

- **Library code** that should work over many types — collections, algorithms, utilities, networking.
- **API boundaries** where you want to expose "any type that satisfies these requirements" without leaking implementation.
- **Removing duplication** between near-identical functions that differ only in type.
- **Encoding invariants in the type system** — e.g., `Result<Success, Failure>` separates two channels of value.

---

## When NOT to use

- **Single concrete use case.** Generics add cognitive cost. If you only ever call it with one type, just write the concrete version.
- **`any` everywhere out of habit.** It erases information the compiler could use, and adds indirection.
- **Overconstraining with `where`.** Constraints should describe what your function actually needs. Adding `where T: Hashable` when you only need equality narrows your API for no reason.
- **Generic over runtime values.** Generics parameterize over *types*, not values. If the variation is by value, use a regular parameter.

---

## References

- [The Swift Programming Language — Generics](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/generics)
- [The Swift Programming Language — Opaque and Boxed Protocol Types](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/opaquetypes)
- [SE-0244 — Opaque result types](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0244-opaque-result-types.md)
- [SE-0309 — Unlock existentials for all protocols](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0309-unlock-existential-types-for-all-protocols.md)
- [SE-0335 — Introduce `any`](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0335-existential-any.md)
- [Embrace Swift generics — WWDC 2022](https://developer.apple.com/videos/play/wwdc2022/110352/)
- [Design protocol interfaces in Swift — WWDC 2022](https://developer.apple.com/videos/play/wwdc2022/110353/)
