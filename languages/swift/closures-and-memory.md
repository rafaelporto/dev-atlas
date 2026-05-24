# Closures and Memory

> Closures capture references to the values they use, and ARC manages their lifetime — together they produce most of the "retain cycle" bugs in Swift, and most of the patterns to avoid them.

---

## What is it?

A **closure** is a self-contained block of code that can be passed around and executed later. Functions in Swift are a special case of closures with a name.

**Automatic Reference Counting (ARC)** is Swift's memory model for reference types (`class`). Every reference increments a counter; when the counter drops to zero, the instance is deallocated. There is no tracing garbage collector — deallocations are deterministic.

The two interact because closures capture references to the objects they use, and those captures count toward ARC. Get the capture wrong and you get a retain cycle: two objects keeping each other alive forever.

---

## Why does it matter?

Closures are everywhere in Swift APIs: completion handlers, SwiftUI view builders, `map`/`filter` arguments, async work, observation callbacks. Understanding their capture semantics is non-negotiable.

ARC is fast and predictable, but it's not free. Misused, it leaks memory through reference cycles. With `weak` and `unowned` references and explicit capture lists, you tell ARC how to break those cycles.

---

## How it works

### Closure syntax — from full to trailing

```swift
// Full form
let add = { (a: Int, b: Int) -> Int in
    return a + b
}

// Inferred types and implicit return
let add2: (Int, Int) -> Int = { $0 + $1 }

// Trailing closure
[1, 2, 3].map { $0 * 2 }
```

### Capture semantics

By default, closures capture variables **by reference** for reference types and **by value** for value types — but mutable value types are also captured as references to the storage:

```swift
var counter = 0
let increment = { counter += 1 }
increment(); increment()
// counter == 2
```

The closure captures the *binding*, not a snapshot.

### `@escaping` and `@Sendable`

| Attribute | Meaning |
|---|---|
| `@escaping` | The closure may be stored and called after the function returns. Required for completion handlers, async work, anything held by reference. |
| `@Sendable` | The closure is safe to cross concurrency domains. Captures must themselves be `Sendable`. |

```swift
func loadAsync(_ completion: @escaping @Sendable (Data) -> Void) { ... }
```

Non-escaping closures (the default for parameters) cannot create retain cycles because the function holding them is gone by the time the closure could form a cycle.

### ARC and retain cycles

```
┌─────────────┐    closure stored as property
│  ViewModel  │ ◄─────────────────┐
│             │                   │
│  onUpdate ──┼──► { [self] in    │
│             │       self.x = … ─┘  // captures self strongly
│             │     }
└─────────────┘
```

`onUpdate` retains the closure. The closure retains `self`. Neither can be released.

### `weak` and `unowned` — breaking cycles

| Reference | Optional? | Behavior when target deallocates |
|---|---|---|
| `weak` | yes (`T?`) | becomes `nil` |
| `unowned` | no | trap on access |

```swift
class ViewModel {
    var onUpdate: (() -> Void)?

    func wire(to publisher: Publisher) {
        publisher.subscribe { [weak self] in
            self?.refresh()       // safe: self may be nil
        }
    }
}
```

Rule of thumb:

- **`weak`** when the captured object may legitimately outlive the closure caller (most cases).
- **`unowned`** when the lifetime is strictly tied (the captured object cannot outlive the closure). A crash here means you got the lifetime model wrong.

### Capture lists

```swift
let block = { [weak self, count = expensive()] in
    self?.use(count)
}
```

`count = expensive()` runs once when the closure is created — useful for snapshotting a value.

---

## Examples

### Trailing closures and `if`/`guard`

```swift
func authenticate(completion: @escaping (Result<User, Error>) -> Void) { ... }

authenticate { result in
    switch result {
    case .success(let user): print("hi \(user.name)")
    case .failure(let error): print(error)
    }
}
```

### The classic retain cycle (and the fix)

```swift
final class Downloader {
    var onFinish: (() -> Void)?

    // ❌ self ↔ onFinish cycle
    func setup() {
        onFinish = { self.cleanup() }
    }

    // ✅ break with [weak self]
    func setupCorrect() {
        onFinish = { [weak self] in
            self?.cleanup()
        }
    }

    func cleanup() { print("done") }
}
```

### `[weak self]` with `guard`

When you need self to be non-nil for the whole block:

```swift
publisher.subscribe { [weak self] value in
    guard let self else { return }
    self.update(value)
    self.notify()
}
```

Since Swift 5.7 you can use `guard let self else { return }` without `= self`.

### Capturing values explicitly

```swift
for index in 0..<3 {
    DispatchQueue.main.async { [index] in
        print(index)   // 0, 1, 2 — snapshotted
    }
}
```

Without the capture list, the closure references the same `index` binding (which would already be out of scope here).

### Closure as type

```swift
typealias Handler = (Result<Int, Error>) -> Void

struct API {
    var fetch: (String) -> Void
}
```

### `@autoclosure` for short-circuit and lazy evaluation

```swift
func assertNonEmpty(_ message: @autoclosure () -> String) {
    // message() runs only if we need it
}
```

Used by `assert`, `precondition`, and `??`.

---

## When to use

- **`weak self`** in escaping closures stored on objects that capture `self` — defaults safe choice for view models, services, subscribers.
- **`unowned`** when the captured object provably outlives the closure (initializer chains, parent-child where the child can never outlast the parent).
- **Capture lists** to snapshot values, force `weak`/`unowned`, or rename.
- **`@escaping`** when storing closures or passing them to async work.
- **`@Sendable`** when closures cross concurrency domains (passed to `Task`, actors, etc.).

---

## When NOT to use

- **`[weak self]` everywhere.** Non-escaping closures and short-lived async work (e.g., `for await` in a `Task` you cancel on deinit) don't need it. Reaching for `[weak self]` reflexively adds nil-handling for impossible cases.
- **`unowned` for "I don't want optionals".** It crashes when wrong; an Optional is the better default.
- **Long, multi-statement trailing closures.** Extract to a method when the closure exceeds a few lines.
- **Implicit captures inside reference-cycle territory.** If a closure is stored on `self`, audit its captures — every time.

---

## References

- [The Swift Programming Language — Closures](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/closures)
- [The Swift Programming Language — Automatic Reference Counting](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/automaticreferencecounting)
- [Apple Developer — Resolving Strong Reference Cycles for Closures](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/automaticreferencecounting/#Resolving-Strong-Reference-Cycles-for-Closures)
- [SE-0269 — Increase availability of implicit self in @escaping closures](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0269-implicit-self-explicit-capture.md)
- [SE-0365 — Allow implicit self for weak self captures, after self is unwrapped](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0365-implicit-self-weak-capture.md)
