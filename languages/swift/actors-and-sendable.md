---
type: concept
tags: []
related: []
language: "swift"
---
# Actors and Sendable

> Actors isolate mutable state, `Sendable` types are safe to send across concurrency domains, and together they let the Swift 6 compiler prove your code is free of data races.

---

## What is it?

An **actor** is a reference type that protects its own mutable state. Only one task may access an actor's stored properties at a time — the runtime serializes calls. Accessing an actor's state from outside requires `await`.

`Sendable` is a marker protocol the compiler uses to reason about which types are safe to share across concurrency domains. Value types whose stored properties are all `Sendable` are themselves `Sendable`. Reference types are `Sendable` only when they manage their own internal synchronization (e.g., actors).

Together they form the data-race safety model that Swift 6 enforces by default.

---

## Why does it matter?

Data races have been the dominant source of concurrency bugs on Apple platforms for decades. GCD, locks, and dispatch queues made them avoidable but not provably absent.

Actors and `Sendable` change the situation: the compiler tracks which code runs in which isolation domain, refuses to let non-Sendable values cross those boundaries, and serializes actor access automatically. Once your code compiles under Swift 6 strict checking, certain entire classes of race conditions are gone.

---

## How it works

### Actors

```swift
actor Counter {
    private var value = 0

    func increment() {
        value += 1
    }

    func current() -> Int {
        value
    }
}

let counter = Counter()
await counter.increment()        // requires await
let n = await counter.current()
```

Inside the actor, `self` is isolated — methods don't need `await` when calling each other. Outside, every access is `await`.

### Isolation domains

```
┌────────────────────────────────┐    ┌────────────────────────────────┐
│  Actor A (isolation domain)    │    │  Actor B (isolation domain)    │
│                                │    │                                │
│  state, methods                │    │  state, methods                │
│                                │    │                                │
│  ← await crossings →           │    │  ← await crossings →           │
└────────────────────────────────┘    └────────────────────────────────┘
                       │                       │
                       └─── only Sendable ─────┘
                          values may cross
```

Crossing an isolation boundary requires `await` (because the call may suspend) and requires the values you send to be `Sendable`.

### `@MainActor` — the UI isolation domain

`@MainActor` is a global actor pinned to the main thread. Annotating a type, method, or property forces execution there:

```swift
@MainActor
final class HomeViewModel: ObservableObject {
    @Published var items: [Item] = []
    func refresh() async {
        let fetched = await api.items()   // hops off main
        items = fetched                    // back on main automatically
    }
}
```

In SwiftUI, `View.body` and `@State` mutations are already main-actor-isolated.

### `Sendable`

A type is `Sendable` if it can be safely transferred between concurrency domains. The standard library marks `Int`, `String`, `Bool`, `Array<T: Sendable>`, etc.

You opt in explicitly:

```swift
struct Snapshot: Sendable {
    let id: String
    let timestamp: Date
}
```

For value types, the compiler checks all stored properties. For reference types you need to do the work:

```swift
// Final, immutable, no shared mutable state
final class Config: Sendable {
    let timeout: TimeInterval
    let retries: Int
    init(timeout: TimeInterval, retries: Int) {
        self.timeout = timeout
        self.retries = retries
    }
}
```

If you've audited the synchronization yourself, mark it explicitly:

```swift
final class ThreadSafeCache: @unchecked Sendable {
    private let lock = NSLock()
    private var storage: [String: Data] = [:]
    // ... lock-protected accessors
}
```

`@unchecked Sendable` is an explicit escape hatch — you assert correctness; the compiler stops checking.

### `Sendable` closures

```swift
func runConcurrently(_ work: @Sendable () async -> Void) async { ... }
```

A `@Sendable` closure can only capture `Sendable` values.

### Global actors

You can define your own global actor:

```swift
@globalActor
actor DatabaseActor {
    static let shared = DatabaseActor()
}

@DatabaseActor
func writeRow(_ row: Row) { ... }
```

Useful for serializing access to shared subsystems that aren't naturally an instance.

### `nonisolated` — opt out

Some actor members don't touch isolated state and should be callable synchronously:

```swift
actor Logger {
    let label: String
    nonisolated init(label: String) { self.label = label }
    nonisolated var description: String { "Logger(\(label))" }
    func log(_ message: String) { /* isolated */ }
}
```

`nonisolated` declares that the member doesn't depend on actor state, so callers don't need `await`.

---

## Examples

### A simple cache as an actor

```swift
actor ImageCache {
    private var storage: [URL: UIImage] = [:]

    func image(for url: URL) async throws -> UIImage {
        if let cached = storage[url] { return cached }
        let data = try await URLSession.shared.data(from: url).0
        guard let image = UIImage(data: data) else { throw CacheError.invalid }
        storage[url] = image
        return image
    }
}

// Usage from anywhere:
let cache = ImageCache()
let image = try await cache.image(for: url)
```

No locks. No queue. The actor serializes access automatically.

### Pinning a UI class to the main thread

```swift
@MainActor
final class ChatViewModel: ObservableObject {
    @Published private(set) var messages: [Message] = []
    private let api: ChatAPI

    init(api: ChatAPI) { self.api = api }

    func send(_ text: String) async throws {
        let message = try await api.send(text)    // off main
        messages.append(message)                   // back on main
    }
}
```

### Sendable data passed across actors

```swift
struct PendingMessage: Sendable {
    let id: UUID
    let text: String
    let createdAt: Date
}

actor Outbox {
    private var pending: [PendingMessage] = []
    func enqueue(_ message: PendingMessage) { pending.append(message) }
    func drain() -> [PendingMessage] {
        defer { pending.removeAll() }
        return pending
    }
}
```

### Non-Sendable types and the compiler

```swift
final class Mutable {
    var value = 0
}

@MainActor func foo() async {
    let m = Mutable()
    Task.detached {
        m.value = 42         // ❌ Swift 6 error: Mutable is not Sendable
    }
}
```

The fix: model `Mutable` as an actor, make it `Sendable` with internal synchronization, or restructure so the value doesn't cross domains.

### Global actor for a subsystem

```swift
@globalActor
actor AnalyticsActor {
    static let shared = AnalyticsActor()
}

@AnalyticsActor
func track(_ event: Event) { ... }
```

Calling `track(...)` from anywhere requires `await` and runs serialized on the analytics actor.

---

## When to use

- **`actor`** for any class that owns mutable state shared across tasks: caches, queues, in-memory databases, network coordinators.
- **`@MainActor`** for view models and any code that mutates UI-bound state.
- **`Sendable` value types** for anything passed between tasks — DTOs, snapshots, events.
- **Global actors** to serialize access to a logical subsystem with multiple entry points.
- **`nonisolated`** for actor members that don't touch isolated state — particularly `init`, `description`, IDs.

---

## When NOT to use

- **`actor` for everything.** Plain value types don't need actors — value semantics already provides isolation. Reach for `actor` only when mutable state is shared.
- **`@unchecked Sendable` to silence warnings.** It removes compiler protection. Use it only when you've actually implemented synchronization, and write a comment explaining why.
- **Tons of `@MainActor` annotations to avoid thinking about isolation.** Pinning everything to main reintroduces the bottleneck async/await was meant to relieve.
- **Awaiting actor calls in hot loops.** Each crossing is a suspension point. Batch operations or move the loop inside the actor.
- **Cross-actor reentrancy that mutates invariants.** An `await` inside an actor method suspends — by the time it resumes, the actor's state may have changed. Reason about reentrancy explicitly.

---

## References

- [The Swift Programming Language — Concurrency](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/concurrency)
- [Migrating to Swift 6 — Concurrency](https://www.swift.org/migration/documentation/swift-6-concurrency-migration-guide/)
- [Protect mutable state with Swift actors — WWDC 2021](https://developer.apple.com/videos/play/wwdc2021/10133/)
- [Eliminate data races using Swift Concurrency — WWDC 2022](https://developer.apple.com/videos/play/wwdc2022/110351/)
- [SE-0306 — Actors](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0306-actors.md)
- [SE-0316 — Global Actors](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0316-global-actors.md)
- [SE-0337 — Incremental migration to concurrency checking](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0337-support-incremental-migration-to-concurrency-checking.md)
