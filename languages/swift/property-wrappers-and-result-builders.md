---
type: concept
tags:
  - language
  - swift
  - mobile
related: []
language: "swift"
---
# Property Wrappers and Result Builders

> Two Swift-native metaprogramming features that power SwiftUI, SwiftData, and most modern declarative APIs on Apple platforms.

---

## What is it?

- **Property wrappers** (`@propertyWrapper`) attach reusable accessor logic to a stored property. The wrapper type defines `wrappedValue` and the compiler synthesizes the getter and setter.
- **Result builders** (`@resultBuilder`) construct a single value from a sequence of expressions. They turn syntactic blocks into method-call chains, enabling Swift DSLs.

Both exist to let library authors give users new-looking syntax without changing the language.

---

## Why does it matter?

Without them, Swift would look very different. SwiftUI's view builder, Combine's `@Published`, SwiftData's `@Model`, SwiftUI's `@State`/`@Binding`/`@Environment` — none would be possible.

Understanding both lets you:

1. **Read modern Swift code** confidently — `@`-prefixed declarations are everywhere
2. **Build your own DSLs** when a problem genuinely benefits from one
3. **Write small wrappers** to remove repeated `UserDefaults`, validation, or threading boilerplate

---

## How it works

### Property wrappers

A property wrapper is a type marked `@propertyWrapper` with a `wrappedValue`:

```swift
@propertyWrapper
struct Clamped<Value: Comparable> {
    private var value: Value
    let range: ClosedRange<Value>

    init(wrappedValue: Value, _ range: ClosedRange<Value>) {
        self.range = range
        self.value = min(max(wrappedValue, range.lowerBound), range.upperBound)
    }

    var wrappedValue: Value {
        get { value }
        set { value = min(max(newValue, range.lowerBound), range.upperBound) }
    }
}

struct Audio {
    @Clamped(0...100) var volume = 50
}

var a = Audio()
a.volume = 250
print(a.volume)   // 100
```

### Projected values (`$`)

A property wrapper can expose a *secondary* value via `projectedValue`. SwiftUI uses this for `Binding`:

```swift
@propertyWrapper
struct Logged<Value> {
    var wrappedValue: Value {
        didSet { print("changed: \(wrappedValue)") }
    }
    var projectedValue: Logged { self }
}

struct Counter {
    @Logged var count = 0
}

var c = Counter()
print(c.$count)   // accesses the wrapper itself
```

### Composing wrappers

```swift
@Logged @Clamped(0...10) var value = 5
```

Wrappers compose from the inside out — `value` first goes through `Clamped`, then through `Logged`.

### Result builders

A result builder is a type marked `@resultBuilder` with static `buildBlock(_:)` and optional helpers:

```swift
@resultBuilder
struct StringBuilder {
    static func buildBlock(_ components: String...) -> String {
        components.joined(separator: " ")
    }
}

func sentence(@StringBuilder _ build: () -> String) -> String {
    build()
}

let s = sentence {
    "Hello"
    "world"
    "from"
    "Swift"
}
// "Hello world from Swift"
```

Inside the closure, each statement is collected as an argument to `buildBlock`.

### Result builder vocabulary

| Method | Enables |
|---|---|
| `buildBlock(_:)` | Sequential statements |
| `buildOptional(_:)` | `if` without `else` |
| `buildEither(first:)` / `buildEither(second:)` | `if`/`else`, `switch` |
| `buildArray(_:)` | `for` loops |
| `buildExpression(_:)` | Pre-process individual expressions |
| `buildFinalResult(_:)` | Post-process the final value |
| `buildLimitedAvailability(_:)` | `if #available` |

SwiftUI's `ViewBuilder` implements all of these — which is why view bodies accept `if`, `switch`, `for`, and `if #available` directly.

---

## Examples

### A `UserDefault` wrapper

```swift
@propertyWrapper
struct UserDefault<Value> {
    let key: String
    let defaultValue: Value
    var storage: UserDefaults = .standard

    var wrappedValue: Value {
        get { storage.object(forKey: key) as? Value ?? defaultValue }
        set { storage.set(newValue, forKey: key) }
    }
}

struct Settings {
    @UserDefault(key: "theme.dark", defaultValue: false)
    var isDarkMode: Bool
}
```

### SwiftUI's `@State` and `@Binding` (sketch)

```swift
struct EditView: View {
    @State private var name = ""

    var body: some View {
        VStack {
            TextField("Name", text: $name)      // $name is Binding<String>
            Text("Hello, \(name)")
        }
    }
}
```

`$name` is the projected value — a `Binding<String>` the wrapper hands to children.

### A simple `Atomic` wrapper

```swift
@propertyWrapper
final class Atomic<Value> {
    private let lock = NSLock()
    private var stored: Value

    init(wrappedValue: Value) { stored = wrappedValue }

    var wrappedValue: Value {
        get { lock.withLock { stored } }
        set { lock.withLock { stored = newValue } }
    }
}
```

For Swift 6, prefer `actor` for shared mutable state. This style is mostly useful in legacy Objective-C-adjacent code.

### A tiny HTML DSL

```swift
@resultBuilder
struct HTMLBuilder {
    static func buildBlock(_ parts: String...) -> String { parts.joined() }
    static func buildOptional(_ part: String?) -> String { part ?? "" }
    static func buildEither(first: String) -> String { first }
    static func buildEither(second: String) -> String { second }
    static func buildArray(_ parts: [String]) -> String { parts.joined() }
}

func tag(_ name: String, @HTMLBuilder _ build: () -> String) -> String {
    "<\(name)>\(build())</\(name)>"
}

let html = tag("ul") {
    for fruit in ["apple", "banana", "cherry"] {
        tag("li") { fruit }
    }
}
// <ul><li>apple</li><li>banana</li><li>cherry</li></ul>
```

### `@ViewBuilder` in your own functions

You don't need to write a builder from scratch — most of the time you reuse SwiftUI's:

```swift
@ViewBuilder
func sectionContent(loading: Bool) -> some View {
    if loading {
        ProgressView()
    } else {
        ContentView()
    }
}
```

---

## When to use

### Property wrappers

- **Repeated accessor logic** — `UserDefaults`, persisted state, validation, clamping, atomic access.
- **Cross-cutting concerns** — threading, logging, analytics — applied per property.
- **SwiftUI / SwiftData integration** — `@State`, `@Binding`, `@Observable`, `@Model`, `@Environment`.

### Result builders

- **A composition syntax is genuinely clearer** than building a value imperatively (SwiftUI views, regex composition, HTML/SQL DSLs, test assertions).
- **You control both producer and consumer** — DSLs work best inside a library.

---

## When NOT to use

### Property wrappers

- **A one-off computation.** Just write `var foo: Bar { ... }`.
- **Wrapper-of-wrapper towers** that obscure where a value is stored. Two layers is usually the limit before readers get lost.
- **Hidden side effects.** A wrapper that does I/O on read is a debugging trap.
- **Initialization gymnastics.** Wrappers with required arguments and `projectedValue` can interact badly with `init` — flag complexity early.

### Result builders

- **Replacing a regular function call** that wasn't bothering anyone.
- **Building data the user could just write as an array literal.** `[1, 2, 3]` doesn't need a builder.
- **Heavy compile-time cost.** Result builders synthesize a lot of code; deeply nested ones can slow type-checking dramatically. Watch your build times.
- **Hiding control flow** behind unusual constructs the standard library doesn't already handle (`if let`, custom keywords).

---

## References

- [The Swift Programming Language — Properties (Property Wrappers)](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/properties/#Property-Wrappers)
- [The Swift Programming Language — Advanced Operators (Result Builders)](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/advancedoperators/#Result-Builders)
- [SE-0258 — Property Wrappers](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0258-property-wrappers.md)
- [SE-0289 — Result Builders](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0289-result-builders.md)
- [What's new in Swift — WWDC 2020 (Result Builders)](https://developer.apple.com/videos/play/wwdc2020/10170/)
- [Demystify SwiftUI — WWDC 2021](https://developer.apple.com/videos/play/wwdc2021/10022/)
