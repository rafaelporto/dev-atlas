# Best Practices

> A working set of rules drawn from Apple's API Design Guidelines and the conventions that dominate the Swift open-source ecosystem.

---

## What is it?

A consolidated reference for writing idiomatic Swift on Apple platforms. Everything here is either:

- Stated directly in the [Swift API Design Guidelines](https://www.swift.org/documentation/api-design-guidelines/)
- A consensus convention in Apple's frameworks (Foundation, SwiftUI, SwiftData)
- A practice the community has converged on (point-free, Apple's swift-collections, etc.)

This article is not exhaustive — it captures the rules that come up most often in code review.

---

## Why does it matter?

Swift's expressiveness gives you many ways to do the same thing. Following these guidelines makes:

- **Code reviews shorter** — fewer style debates
- **APIs read like English** — call sites mirror sentences
- **Refactors safer** — value semantics + immutability shrink the radius of any change
- **Onboarding faster** — new readers see familiar shapes

---

## Core guidelines

### Naming

**Clarity at the use site beats brevity at the definition site.**

```swift
// ❌
a.removeAll(15)     // What does 15 mean?

// ✅
a.removeAll(where: { $0 == 15 })
a.remove(at: index)
```

Argument labels become part of the function name. Read the call site aloud.

**Strip needless words.** If the type is in the parameter, don't repeat it:

```swift
// ❌
func add(string str: String, toList list: [String])

// ✅
func add(_ string: String, to list: [String])
```

**Use verbs for mutations, nouns for non-mutating operations.**

```swift
extension Array {
    mutating func sort() { ... }    // verb — in place
    func sorted() -> Array { ... }  // noun-like — returns a copy
}
```

Apple's convention: `sort` mutates, `sorted` returns a new value. Same for `reverse`/`reversed`, `append`/`appending`, etc.

**Boolean methods read as assertions.**

```swift
view.isHidden       // not view.hidden
array.isEmpty       // not array.empty
```

**Protocols describing what something *is* read as nouns: `Collection`, `Sequence`, `Identifiable`. Protocols describing a capability use `-able`/`-ible`: `Comparable`, `Decodable`, `Equatable`.**

### Prefer value types

Default to `struct` and `enum`. Choose `class` only when:

- You need reference semantics (shared mutable state, identity)
- You need `deinit`
- You're bridging to Objective-C frameworks that require it

```swift
// ✅
struct User { let id: String; var name: String }

// ✅ if identity matters
final class FileHandle { ... }
```

### Make types `final` by default

```swift
final class HomeViewModel { ... }
```

Non-final classes incur dynamic dispatch and invite accidental inheritance. Drop `final` only when subclassing is part of the contract.

### Prefer immutability — `let` over `var`

```swift
// ✅
let formatted = items.map { format($0) }
let total = items.reduce(0) { $0 + $1.price }

// ❌ when not needed
var formatted = [String]()
for item in items {
    formatted.append(format(item))
}
```

The compiler can warn when a `var` is never reassigned — heed it.

### Use optionals, not sentinels

```swift
// ❌
func find(_ name: String) -> User { /* returns User(id: "", name: "") if missing */ }

// ✅
func find(_ name: String) -> User?
```

### `guard` for early exits

```swift
func process(_ input: String?) {
    guard let input, !input.isEmpty else { return }
    // input is non-nil, non-empty for the rest of the function
    work(with: input)
}
```

Keep the happy path at the top level. Use `guard` to bail on every failure mode.

### Throw, don't return `false`/`-1`

```swift
// ✅
func parse(_ raw: String) throws -> Int

// ❌
func parse(_ raw: String) -> Int     // returns -1 on error
```

### Acronyms: lowercase-the-leading-character at use site

```swift
// ✅
var urlSession: URLSession
let html = "..."
let userID: String

// ❌
var URLSession: URLSession
let HTML = "..."
let userId: String   // Apple uses ID, not Id
```

The Apple convention: full uppercase for acronyms (`URL`, `HTML`, `ID`, `JSON`), camelCase at boundaries (`urlSession`, `htmlEncoder`, `userID`).

### Document with comments — but only when the *why* isn't obvious

Use `///` for public API documentation; the compiler surfaces it in Xcode quick-help:

```swift
/// Fetches a user by ID.
///
/// - Parameter id: The user's stable identifier.
/// - Returns: The decoded user.
/// - Throws: `NetworkError.offline` if no connection.
func fetchUser(id: String) async throws -> User { ... }
```

Don't comment what the code already says.

### Don't catch what you can't handle

```swift
// ❌
do { try work() }
catch { print(error) }   // and then proceed as if nothing happened

// ✅
do { try work() }
catch { presentError(error) }   // or rethrow, or recover meaningfully
```

### Avoid `try!` and `as!` in production code

Reserve for literal values you control:

```swift
let url = URL(string: "https://swift.org")!   // ok — known-good literal
let parsed = try! JSONDecoder().decode(...)   // ❌ never on runtime data
```

### Use access control to make APIs small

Default access in Swift is `internal`. Be explicit about `private`, `fileprivate`, and `public`:

```swift
public struct PaymentClient {
    private let baseURL: URL
    private(set) var lastError: Error?
    public init(baseURL: URL) { self.baseURL = baseURL }
    public func pay(_ amount: Money) async throws -> Receipt { ... }
}
```

`private(set)` is especially useful — read public, write private.

### Prefer `Codable` for serialization

```swift
struct User: Codable {
    let id: String
    let name: String
    let createdAt: Date
}
```

Customize via `CodingKeys` only when needed. Reach for custom `init(from:)` / `encode(to:)` only when the structure of the JSON diverges meaningfully from the model.

### Embrace structured concurrency

```swift
// ❌
DispatchQueue.global().async {
    let result = work()
    DispatchQueue.main.async { self.update(result) }
}

// ✅
Task {
    let result = await work()
    await MainActor.run { update(result) }
}
```

### Sendable everything that crosses tasks

```swift
struct UserSnapshot: Sendable {
    let id: String
    let name: String
    let lastActiveAt: Date
}
```

Don't reach for `@unchecked Sendable` to silence the compiler — fix the model.

---

## API design checklist

Before merging a public type or function, ask:

- Does the call site read naturally as English?
- Are arguments named where their role wouldn't be obvious from the type alone?
- Did you use the noun/verb convention (`sort`/`sorted`)?
- Are boolean accessors named as assertions (`isFoo`, `hasBar`)?
- Are errors thrown rather than returned as `nil` / sentinels?
- Are types `final` unless inheritance is intended?
- Are mutable properties truly mutable, or could they be `let`?
- Is the public surface as small as it needs to be (`internal`, `private(set)`)?

---

## When to deviate

These guidelines aren't laws. Deviate when:

- **Interop forces it** — bridging Objective-C, C, or legacy code may require non-idiomatic shapes.
- **Performance demands it** — `class` for cache coherence, `[UInt8]` over `String`, unchecked Sendable with careful synchronization.
- **Domain language conflicts** — if "Sort" is a proper noun in your domain (e.g., a config object), don't force `sorted` semantics on it.

Document the deviation. A short comment explaining why you broke convention saves future readers a guessing game.

---

## When NOT to bend

- **`try!`/`as!` on dynamic input.** A crash isn't error handling.
- **Singletons everywhere.** They're a habit, not a design.
- **Inheritance to share helpers.** Protocols + extensions.
- **`Any` to dodge a generics problem.** Lean into generics — the constraint you need almost always exists.

---

## References

- [Swift API Design Guidelines](https://www.swift.org/documentation/api-design-guidelines/) — Apple's canonical reference
- [The Swift Programming Language](https://docs.swift.org/swift-book/) — official book
- [Swift Forums — best practices threads](https://forums.swift.org/)
- [WWDC 2016 — Swift API Design Guidelines](https://developer.apple.com/videos/play/wwdc2016/403/)
- [Choosing Between Structures and Classes](https://developer.apple.com/documentation/swift/choosing-between-structures-and-classes)
- [What's new in Swift — annual WWDC sessions](https://developer.apple.com/videos/all-videos/?q=what's%20new%20in%20swift)
- [Documenting Code with DocC](https://www.swift.org/documentation/docc/)
