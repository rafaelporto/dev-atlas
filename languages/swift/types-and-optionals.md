---
type: concept
tags:
  - language
  - swift
  - mobile
  - null-safety
related: []
language: "swift"
---
# Types and Optionals

> Swift's type system is built around value types, optionals as first-class citizens, and a strict distinction between absence and emptiness.

---

## What is it?

Swift has three primary user-defined types:

- **`struct`** — value type, copied on assignment, ideal for data and most domain models
- **`class`** — reference type, passed by reference, identity matters, supports inheritance
- **`enum`** — value type with named cases, optionally with associated values

It also has a built-in **`Optional<T>`** (spelled `T?`) used to represent the presence or absence of a value. There is no `null` in Swift.

---

## Why does it matter?

Two design decisions shape almost all idiomatic Swift code:

1. **Value vs reference is explicit.** When you copy a `struct`, you get an independent value. When you assign a `class` instance, you share the reference. Code reasons about mutation differently in each case.
2. **Absence is part of the type.** A function returning `User?` cannot be used as if it returned `User`. The compiler forces you to unwrap, with one of several syntactic options — and force-unwrapping is intentionally noisy (`!`).

Together these eliminate entire categories of bugs that haunt Objective-C, Java, and most C-family languages: null pointer dereferences, aliasing surprises, and accidentally shared mutable state.

---

## How it works

### Value vs reference

```
struct User {                class User {
    var name: String             var name: String
}                                init(name: String) { self.name = name }
                             }
let a = User(name: "Ada")    let a = User(name: "Ada")
var b = a                    let b = a
b.name = "Bob"               b.name = "Bob"  // also mutates a's view
// a.name == "Ada"           // a.name == "Bob"
```

### The Optional type

`Optional<T>` is an enum in the standard library:

```swift
enum Optional<Wrapped> {
    case none
    case some(Wrapped)
}
```

`T?` is syntactic sugar for `Optional<T>`. `nil` is the literal for `.none`.

Unwrapping options:

| Syntax | Behavior |
|---|---|
| `if let x = opt { ... }` | Run block only if non-nil, bind to `x` |
| `guard let x = opt else { return }` | Early-exit if nil, otherwise `x` is in scope for the rest of the function |
| `opt ?? default` | Nil-coalescing — provide a fallback |
| `opt?.method()` | Optional chaining — returns nil if `opt` is nil |
| `opt!` | Force-unwrap — traps if nil |
| `try? expr` | Convert a throwing expression into an optional |

---

## Examples

### Structs and value semantics

```swift
struct Point: Equatable {
    var x: Double
    var y: Double
}

var p1 = Point(x: 1, y: 2)
var p2 = p1        // independent copy
p2.x = 99
print(p1.x)        // 1
```

### Classes for identity

```swift
final class FileHandle {
    let path: String
    init(path: String) { self.path = path }
    deinit { print("closing \(path)") }
}

let h = FileHandle(path: "/tmp/log")
let alias = h    // same instance, shared lifetime
```

Use `final` by default on classes — it disables inheritance and enables the compiler to devirtualize method calls.

### Enums with associated values

```swift
enum NetworkResult {
    case success(data: Data, status: Int)
    case failure(Error)
    case cancelled
}

func handle(_ result: NetworkResult) {
    switch result {
    case .success(let data, let status):
        print("got \(data.count) bytes, status \(status)")
    case .failure(let error):
        print("error: \(error)")
    case .cancelled:
        print("user cancelled")
    }
}
```

Switches over enums are exhaustive — the compiler errors if you miss a case.

### Optionals — the four idiomatic unwraps

```swift
let raw: String? = readLine()

// 1. if let
if let line = raw, !line.isEmpty {
    print("got: \(line)")
}

// 2. guard let
func process(_ input: String?) {
    guard let line = input, !line.isEmpty else { return }
    // line is non-nil and non-empty for the rest of the function
    print(line.uppercased())
}

// 3. Nil coalescing
let safe = raw ?? "default"

// 4. Optional chaining
let length = raw?.count    // Int?
```

### Shorthand `if let` (Swift 5.7+)

```swift
let name: String? = "Ada"
if let name {            // same as: if let name = name
    print(name)
}
```

### When you really do need force-unwrap

```swift
let url = URL(string: "https://swift.org")!  // string is a known-good literal
```

Reserve `!` for cases where nil truly is impossible, and where a crash is a better outcome than a silent fallback (typically: programmer-error invariants).

---

## When to use

**`struct`** — almost always. Data models, configuration, value objects, view state.

**`class`** — when identity matters: caches, file handles, view controllers, services with long-lived state, anything bridging Objective-C frameworks.

**`enum`** — for closed sets of states (e.g., result types, navigation destinations, loading states) and for sum types where each case carries its own payload.

**Optionals** — wherever absence is a legitimate state. Return `T?` from lookups, parses, and partial functions.

---

## When NOT to use

- **Force-unwrap (`!`) for "I know it's there".** If you know it's there, the compiler often can too. Use `guard`/`if let` instead — or `assert`/`precondition` if you want to encode the invariant explicitly.
- **Optional-of-optional (`T??`).** Almost always a sign you should flatten via `flatMap` or restructure the type.
- **Empty string / zero / sentinel values as a stand-in for nil.** The whole point of `Optional` is that you don't need sentinels.
- **`class` because the type is "big".** Swift uses copy-on-write for collections and inlines small structs efficiently. Profile before reaching for reference types.
- **Inheritance to share code between structs.** You can't — structs don't inherit. Use protocols with extensions.

---

## References

- [The Swift Programming Language — Structures and Classes](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/structuresandclasses)
- [The Swift Programming Language — Enumerations](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/enumerations)
- [The Swift Programming Language — Optional Chaining](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/optionalchaining)
- [Choosing Between Structures and Classes — Apple Developer](https://developer.apple.com/documentation/swift/choosing-between-structures-and-classes)
- [Optional — Swift Standard Library](https://developer.apple.com/documentation/swift/optional)
