# Swift Patterns

> GoF design patterns adapted to Swift, plus the idioms that emerge naturally from value types, protocols, and modern concurrency.

---

## What is it?

This article catalogues recurring patterns in Swift code, organized by frequency of real-world use. It covers:

- **GoF patterns as they actually appear in Swift** — many look very different in a protocol-oriented, value-typed language
- **Swift-native idioms** — patterns that emerged from the language itself: Protocol Witness, Result Builders, Property Wrappers, Type Erasure
- **Anti-patterns** — patterns from other languages that don't fit Swift and the idiomatic alternatives

For deeper background on the GoF patterns themselves, see [`software-engineering/design-patterns/`](../../software-engineering/design-patterns/README.md).

---

## Why does it matter?

Reading a pattern straight from *Design Patterns* (Gamma et al., 1994) into Swift produces awkward code: factories that are really protocol methods, decorators that are really extensions, singletons that are really `actor`s. Swift's feature set rearranges the cost/benefit of each pattern.

Knowing **which patterns are common, which are rare, and which are unnecessary** keeps your Swift idiomatic.

---

## Frequency guide

| Pattern | Frequency in Swift | Why |
|---|---|---|
| Strategy | Very common | A protocol *is* a strategy interface |
| Adapter | Very common | Extensions adapt types non-intrusively |
| Decorator | Common | Composable wrapper types are easy with `struct` + protocols |
| Observer | Common | Combine, `Observation` framework, `AsyncSequence`, `NotificationCenter` |
| Iterator | Common (mostly invisible) | Built into `Sequence` and `AsyncSequence` |
| Builder | Common | Especially via result builders for DSLs |
| Factory Method | Common | Static methods and initializers fill this role |
| Singleton | Common (with care) | `static let shared`, often an `actor` |
| Composite | Common | Tree structures via enums with indirect cases |
| State | Occasional | Often replaced by enums with associated values |
| Command | Occasional | Closures often replace formal command objects |
| Template Method | Occasional | Protocol extensions with required overrides |
| Chain of Responsibility | Occasional | Pipeline of functions or middleware |
| Facade | Occasional | A single struct wrapping a subsystem |
| Mediator | Occasional | View models, coordinators |
| Visitor | Rare | Enums + switch handle most cases more cleanly |
| Bridge | Rare | Protocols already decouple abstraction from implementation |
| Flyweight | Rare | Copy-on-write makes most cases unnecessary |
| Proxy | Rare | Property wrappers cover most use cases |
| Memento | Rare | Value semantics + `Codable` cover snapshotting |
| Prototype | Very rare | Value types are already copyable |
| Abstract Factory | Very rare | Protocols with associated types do this directly |
| Interpreter | Very rare | Result builders for DSLs are the modern path |

---

## Swift-native patterns

These don't come from GoF — they emerged from the language.

### Protocol Witness

Instead of defining a protocol that types conform to, you pass a *struct of closures* that implements the same interface. This decouples the implementation from the type system and produces effortless mocks.

```swift
struct AnalyticsClient {
    var track: (Event) -> Void
    var flush: () async -> Void
}

extension AnalyticsClient {
    static let live = AnalyticsClient(
        track: { event in /* send to backend */ },
        flush: { /* ... */ }
    )

    static let noop = AnalyticsClient(track: { _ in }, flush: { })

    static func test(captured: ActorRef<[Event]>) -> AnalyticsClient {
        AnalyticsClient(
            track: { event in Task { await captured.append(event) } },
            flush: { }
        )
    }
}
```

Popularized by [Point-Free](https://www.pointfree.co/collections/dependencies). Used heavily by [swift-dependencies](https://github.com/pointfreeco/swift-dependencies).

### Type Erasure

When you need to expose a protocol with associated types as a concrete value (e.g., for collections or returns), wrap it in a generic struct that holds closures:

```swift
struct AnyContainer<Item>: Container {
    private let _count: () -> Int
    private let _get: (Int) -> Item

    init<C: Container>(_ base: C) where C.Item == Item {
        _count = { base.count }
        _get = { base[$0] }
    }

    var count: Int { _count() }
    subscript(i: Int) -> Item { _get(i) }
}
```

Since Swift 5.7's improvements to `any`, manual type erasure is less common — but still valuable for performance-sensitive APIs or when you want to enforce a specific runtime cost.

### Result Builders (DSLs)

Result builders construct a value from a sequence of statements. They power SwiftUI:

```swift
VStack {
    Text("Hello")
    Image(systemName: "star")
    if showButton {
        Button("Tap") { ... }
    }
}
```

See [Property Wrappers and Result Builders](property-wrappers-and-result-builders.md) for full coverage.

### Property Wrappers

Encapsulate accessor logic in a type that wraps a stored property:

```swift
@UserDefault("theme", default: .light)
var theme: Theme
```

The wrapper transparently reads/writes `UserDefaults`. Also covered in [Property Wrappers and Result Builders](property-wrappers-and-result-builders.md).

### Phantom Types

Use unused generic parameters to encode constraints at compile time:

```swift
struct Tagged<Tag, Value> {
    let value: Value
}

enum UserTag {}
enum PostTag {}

typealias UserID = Tagged<UserTag, String>
typealias PostID = Tagged<PostTag, String>

// userID == postID is a compile error, even though both wrap String
```

---

## GoF patterns as they appear in Swift

### Strategy → protocol parameter

```swift
protocol SortStrategy {
    func sort<T: Comparable>(_ items: [T]) -> [T]
}

struct QuickSort: SortStrategy { /* ... */ }
struct InsertionSort: SortStrategy { /* ... */ }

func sorted<T: Comparable>(_ items: [T], using strategy: some SortStrategy) -> [T] {
    strategy.sort(items)
}
```

Or via closure parameter when the strategy is trivial:

```swift
items.sorted(by: <)
```

### Adapter → extension

```swift
extension URL {
    var thumbnailURL: URL { /* derived */ }
}
```

No wrapper class needed — Swift adapts in place.

### Decorator → wrapper struct

```swift
protocol Renderer {
    func render() -> String
}

struct CachingRenderer<Base: Renderer>: Renderer {
    let base: Base
    private let cache = NSCache<NSString, NSString>()

    func render() -> String {
        let key = "\(ObjectIdentifier(self))" as NSString
        if let cached = cache.object(forKey: key) as String? { return cached }
        let result = base.render()
        cache.setObject(result as NSString, forKey: key)
        return result
    }
}
```

### Observer → Combine / Observation / AsyncSequence

Three modern options:

| Mechanism | Best for |
|---|---|
| **`@Observable` (Observation framework)** | SwiftUI view state |
| **Combine** | Operator-heavy reactive pipelines, especially pre-`@Observable` |
| **`AsyncSequence` / `AsyncStream`** | Native async streams, callbacks, event sources |
| **`NotificationCenter`** | System events, broad pub/sub |

### Singleton → `static let shared` (usually an actor)

```swift
actor SessionStore {
    static let shared = SessionStore()
    private var token: String?
    func set(_ token: String) { self.token = token }
    func current() -> String? { token }
}
```

For most "singletons" the better answer is **dependency injection** of an instance, with the shared instance reserved for true app-wide state.

### Factory Method → static or `init`

```swift
extension URLRequest {
    static func get(_ url: URL) -> URLRequest {
        var r = URLRequest(url: url)
        r.httpMethod = "GET"
        return r
    }
}
```

Or via failable initializers when construction may fail.

### State → enum with associated values

```swift
enum LoadState<Value> {
    case idle
    case loading
    case loaded(Value)
    case failed(Error)
}
```

The classic State pattern (class per state, transitions via method calls) is overkill — pattern-match the enum.

### Composite → indirect enum

```swift
indirect enum Expression {
    case literal(Int)
    case add(Expression, Expression)
    case multiply(Expression, Expression)
}
```

`indirect` lets a case hold a value of the enum's own type — perfect for trees.

### Iterator → conform to `Sequence`

```swift
struct CountDown: Sequence {
    let from: Int
    func makeIterator() -> AnyIterator<Int> {
        var current = from
        return AnyIterator {
            guard current > 0 else { return nil }
            defer { current -= 1 }
            return current
        }
    }
}
```

For async, conform to `AsyncSequence`.

### Builder → result builder or fluent struct

For DSLs use result builders. For configuration objects:

```swift
let request = URLRequest.builder
    .url(url)
    .method(.post)
    .body(data)
    .header("Content-Type", "application/json")
    .build()
```

But often simpler: pass a closure that mutates a `var` request — no Builder class required.

---

## Anti-patterns

- **Inheritance-heavy class hierarchies.** Protocol + extensions almost always win.
- **`AnyObject` everywhere just to allow `weak`.** Constrain protocols to `AnyObject` only when reference semantics is actually required.
- **NSObject subclasses for no reason.** Pure Swift doesn't need it. Subclass `NSObject` only when bridging to KVO, KVC, or Objective-C APIs that require it.
- **Manual Observer with `addListener`/`removeListener`.** Use Combine, `@Observable`, or `AsyncStream` instead.
- **Global singletons accessed everywhere as `MySingleton.shared.method()`.** Pass dependencies in. Use `swift-dependencies` or constructor injection.

---

## When to use a formal pattern

- **The shape repeats in three or more places** — the pattern is documenting an actual structure, not anticipating one.
- **The abstraction has cost** but a clear name (e.g., "Repository", "Coordinator", "ViewModel") helps the next reader.
- **You're crossing a boundary** — protocol-driven patterns shine at module borders where you want to swap implementations.

---

## When NOT to

- **The first time you see the shape.** Three repetitions before extracting.
- **The pattern fights the language.** If your Visitor or Abstract Factory feels heavy, the language is telling you to use the native idiom (enum + switch, generic protocol).
- **You're adding a class hierarchy "just in case".** Future-proofing through inheritance is mostly future damage.

---

## References

- [Design Patterns: Elements of Reusable Object-Oriented Software](https://en.wikipedia.org/wiki/Design_Patterns) — Gamma, Helm, Johnson, Vlissides (1994)
- [Swift Standard Library — Sequence](https://developer.apple.com/documentation/swift/sequence)
- [Point-Free — Protocol Witnesses](https://www.pointfree.co/collections/protocol-witnesses)
- [Swift Dependencies](https://github.com/pointfreeco/swift-dependencies)
- [Composing Swift: Functional Patterns](https://www.objc.io/books/functional-swift/) — Eidhof, Kugler, Swierstra
- [`software-engineering/design-patterns/`](../../software-engineering/design-patterns/README.md) — pattern-by-pattern reference in this wiki
- [Mobile Architecture — Comparison and Decision Matrix](../../software-engineering/architecture/mobile/comparison.md) — when to choose MVVM, MVI, VIPER, Clean, etc. for an iOS app
