---
type: concept
tags: []
related: []
language: "swift"
---
# Concurrency

> Swift's modern concurrency model is built on `async`/`await`, structured tasks, and a strict separation between concurrent and isolated state.

---

## What is it?

Since Swift 5.5, Swift has a first-class concurrency model in the language:

- **`async`/`await`** — mark functions that may suspend and resume.
- **`Task` and `TaskGroup`** — structured units of concurrent work with explicit lifetime and cancellation.
- **Actors** — isolate mutable state so it can only be accessed from one task at a time (covered in detail in [Actors and Sendable](actors-and-sendable.md)).
- **`Sendable`** — a marker protocol the compiler uses to enforce data-race safety.

Swift 6 turns on **strict concurrency checking** by default — data races are compile-time errors, not runtime surprises.

---

## Why does it matter?

Before async/await, concurrent code on Apple platforms meant nested completion handlers, Grand Central Dispatch (GCD) queues, and manual synchronization. The result was correctness by convention, leaks from missed callback paths, and "callback hell".

Swift Concurrency replaces those patterns with:

- Linear, top-down code that suspends naturally
- Explicit cancellation that propagates through task trees
- Compiler-enforced isolation that catches data races before they ship

This is the single most important shift in modern Swift. Targeting Swift 6 means writing code that the compiler can prove is race-free.

---

## How it works

### `async` and `await`

An `async` function may suspend. Calling one requires `await` at the call site, and only from another `async` context (or a `Task`).

```swift
func loadUser(id: String) async throws -> User {
    let (data, _) = try await URLSession.shared.data(from: url(id))
    return try JSONDecoder().decode(User.self, from: data)
}

// From async context
let user = try await loadUser(id: "u1")
```

Each `await` is a **suspension point**. The thread is free to run other work while the function is suspended.

### Tasks — the unit of work

A `Task` is the basic concurrency primitive. Two flavors:

| Form | Use |
|---|---|
| **Unstructured `Task { ... }`** | Detached top-level work — runs concurrently, must be awaited or cancelled explicitly |
| **Structured (`async let`, `TaskGroup`)** | Child tasks tied to the lifetime of the parent — cancellation propagates automatically |

```swift
// Unstructured — used to bridge sync → async
Task {
    let user = try await loadUser(id: "u1")
    await MainActor.run { view.show(user) }
}
```

### Structured concurrency with `async let`

```swift
func loadDashboard() async throws -> Dashboard {
    async let user    = loadUser(id: "u1")
    async let posts   = loadPosts()
    async let friends = loadFriends()
    return Dashboard(
        user:    try await user,
        posts:   try await posts,
        friends: try await friends
    )
}
```

All three loads run concurrently. The function won't return until all child tasks complete or the parent is cancelled.

### `TaskGroup` for dynamic fan-out

```swift
func loadAllThumbnails(for ids: [String]) async throws -> [Image] {
    try await withThrowingTaskGroup(of: Image.self) { group in
        for id in ids {
            group.addTask { try await loadThumbnail(id) }
        }
        var images: [Image] = []
        for try await image in group {
            images.append(image)
        }
        return images
    }
}
```

When you need a variable number of concurrent operations, use a group.

### Cancellation

Cancellation in Swift is **cooperative** — tasks observe it and decide how to respond.

```swift
func longRunningWork() async throws {
    for chunk in chunks {
        try Task.checkCancellation()   // throws if cancelled
        process(chunk)
    }
}
```

`try await` calls inherit cancellation automatically — most APIs in the standard library and Foundation throw `CancellationError` on cancel. Cancelling a parent cancels all child tasks.

### `@MainActor` — UI updates without queues

Annotate a function or property to require execution on the main actor:

```swift
@MainActor
func updateUI(with user: User) {
    label.text = user.name
}

// From any context:
await updateUI(with: user)
```

In SwiftUI, view bodies and `@State` mutations are already main-actor-isolated by default.

### Bridging GCD or completion-handler APIs

Use `withCheckedContinuation` (or `withCheckedThrowingContinuation`) to wrap a callback-based API as async:

```swift
func legacyLoad() async throws -> Data {
    try await withCheckedThrowingContinuation { continuation in
        legacyLoad { result in
            continuation.resume(with: result)
        }
    }
}
```

You must call `resume` exactly once. The "checked" variant traps on misuse — switch to `withUnsafeContinuation` only in performance-critical code where you've audited the contract.

---

## Examples

### Parallel fetches with `async let`

```swift
struct ProfileScreen {
    func load() async throws -> Profile {
        async let user   = api.user()
        async let avatar = api.avatar()
        async let stats  = api.stats()
        return Profile(user: try await user, avatar: try await avatar, stats: try await stats)
    }
}
```

### Dynamic concurrency with `TaskGroup`

```swift
func processAll(_ ids: [String]) async throws -> [Result] {
    try await withThrowingTaskGroup(of: Result.self) { group in
        for id in ids {
            group.addTask { try await process(id) }
        }
        return try await group.reduce(into: []) { $0.append($1) }
    }
}
```

### Cancellation in a long task

```swift
let task = Task {
    while !Task.isCancelled {
        try await tick()
    }
}

// Later:
task.cancel()
```

### Sleeping

```swift
try await Task.sleep(for: .seconds(0.5))   // Swift 5.8+
```

### Pinning to the main actor

```swift
@MainActor
final class HomeViewModel: ObservableObject {
    @Published var items: [Item] = []

    func refresh() async {
        let fetched = await api.items()    // background work
        items = fetched                     // back on main, automatically
    }
}
```

### Bridging an Objective-C completion handler

```swift
extension CLLocationManager {
    func location() async -> CLLocation? {
        await withCheckedContinuation { continuation in
            requestLocation { location, _ in
                continuation.resume(returning: location)
            }
        }
    }
}
```

---

## When to use

- **Any I/O**: networking, disk, IPC. Wrap with `async`.
- **Multiple independent loads** in one screen → `async let` or a `TaskGroup`.
- **Long-running work** that should respond to user cancellation → check `Task.isCancelled` or rely on `try await`.
- **State that should always run on main thread** → `@MainActor`.
- **Bridging legacy APIs** → `withCheckedContinuation`.

---

## When NOT to use

- **Pure CPU-bound parallelism over collections.** `TaskGroup` works but has overhead. For uniform compute work, `DispatchQueue.concurrentPerform` or the `Accelerate` framework is often faster.
- **Detached `Task { ... }` to "fire and forget".** Unstructured tasks escape cancellation and lifetime management. Prefer structured tasks; use `Task.detached` only when you truly want a context-free task.
- **`await` inside tight loops without need.** Each `await` is a suspension point. If a function isn't actually async, don't make it async.
- **Sharing mutable reference types across tasks.** That's a data race waiting to happen — use an `actor` or make the value type `Sendable`.

---

## References

- [The Swift Programming Language — Concurrency](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/concurrency)
- [Migrating to Swift 6 — Apple Developer](https://www.swift.org/migration/documentation/migrationguide/)
- [Meet async/await in Swift — WWDC 2021](https://developer.apple.com/videos/play/wwdc2021/10132/)
- [Explore structured concurrency in Swift — WWDC 2021](https://developer.apple.com/videos/play/wwdc2021/10134/)
- [Beyond the basics of structured concurrency — WWDC 2023](https://developer.apple.com/videos/play/wwdc2023/10170/)
- [SE-0296 — async/await](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0296-async-await.md)
- [SE-0304 — Structured Concurrency](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0304-structured-concurrency.md)
