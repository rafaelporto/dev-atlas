---
type: concept
tags:
  - language
  - swift
  - mobile
  - error-handling
related: []
language: "swift"
---
# Error Handling

> Swift handles errors through `throws`/`try`/`catch` with typed `Error` values, and complements them with `Result` and — in Swift 6 — typed throws for compile-time precision.

---

## What is it?

Swift's error model has three layers:

1. **`throws` / `try` / `catch`** — synchronous (or `async`) error propagation. Any type conforming to the empty `Error` protocol can be thrown.
2. **`Result<Success, Failure>`** — an enum that reifies success-or-failure into a value, useful when you need to store, pass, or transform errors as data.
3. **Typed throws (Swift 6)** — `throws(SomeErrorType)` declares exactly which error type a function can throw, giving you precise compile-time checking.

Errors in Swift are **not exceptions** in the C++/Java sense. There is no implicit propagation, no stack unwinding semantics beyond Swift's own, and every throwing call site is marked.

---

## Why does it matter?

- **Errors are visible.** Every call to a throwing function carries `try`, `try?`, or `try!` — you cannot miss one.
- **Errors are values.** `Error` is a protocol, and any `enum` with `Error` conformance becomes a typed catalog of failure modes.
- **Errors compose.** `Result.map`, `Result.flatMap`, and `Result.init(catching:)` let you treat error handling as data transformation.

This produces code where the "happy path" reads cleanly with `try` markers, and the recovery path is one well-defined `catch`.

---

## How it works

### The `Error` protocol

```swift
public protocol Error: Sendable { }   // simplified
```

Any type — usually an `enum` — can conform.

### Throwing functions

```swift
enum ParseError: Error {
    case empty
    case invalidNumber(String)
}

func parse(_ raw: String) throws -> Int {
    guard !raw.isEmpty else { throw ParseError.empty }
    guard let n = Int(raw) else { throw ParseError.invalidNumber(raw) }
    return n
}
```

### Calling — three variants of `try`

| Syntax | Semantics |
|---|---|
| `try expr` | Propagate the error; only valid inside `throws` context |
| `try? expr` | Convert to `Optional` — nil on error |
| `try! expr` | Trap on error — use only when error is impossible |

### Catching

```swift
do {
    let n = try parse(raw)
    use(n)
} catch ParseError.empty {
    print("input was empty")
} catch ParseError.invalidNumber(let s) {
    print("not a number: \(s)")
} catch {
    print("unknown error: \(error)")
}
```

A bare `catch` binds the error to the implicit variable `error`.

### `defer` for cleanup

```swift
func readFile(_ path: String) throws -> String {
    let handle = open(path)
    defer { close(handle) }      // runs on all exits, including thrown errors
    return try handle.read()
}
```

`defer` blocks execute in reverse order of registration when scope exits.

### `Result<Success, Failure>`

```swift
let r: Result<Int, ParseError> = .success(42)

switch r {
case .success(let value): print(value)
case .failure(let error): print(error)
}

// Bridge between Result and throws
let value = try r.get()
let captured = Result { try parse(raw) }
```

### Typed throws (Swift 6)

```swift
func parse(_ raw: String) throws(ParseError) -> Int {
    guard !raw.isEmpty else { throw ParseError.empty }
    guard let n = Int(raw) else { throw ParseError.invalidNumber(raw) }
    return n
}

// The compiler knows the exhaustive set of errors:
do {
    let n = try parse(input)
} catch .empty {
    // ...
} catch .invalidNumber(let s) {
    // ...
}  // no `default` needed
```

Use sparingly — most APIs should stay open (`throws any Error`) so they can evolve.

---

## Examples

### Domain errors as enums

```swift
enum NetworkError: Error {
    case offline
    case timeout
    case http(status: Int)
    case decoding(underlying: Error)
}

func fetchUser(id: String) async throws -> User {
    let (data, response) = try await URLSession.shared.data(from: makeURL(id))
    guard let http = response as? HTTPURLResponse else { throw NetworkError.offline }
    guard (200..<300).contains(http.statusCode) else {
        throw NetworkError.http(status: http.statusCode)
    }
    do {
        return try JSONDecoder().decode(User.self, from: data)
    } catch {
        throw NetworkError.decoding(underlying: error)
    }
}
```

### Adding context via `LocalizedError`

```swift
extension NetworkError: LocalizedError {
    var errorDescription: String? {
        switch self {
        case .offline:           return "You appear to be offline."
        case .timeout:           return "The request timed out."
        case .http(let status):  return "Server returned status \(status)."
        case .decoding:          return "We couldn't read the response."
        }
    }
}
```

### Bridging `Result` and `throws`

```swift
// Throws-style API
func loadConfig() throws -> Config { ... }

// Capture as Result
let result = Result { try loadConfig() }

// Pass result through, unwrap later
func handle(_ r: Result<Config, Error>) {
    do {
        let cfg = try r.get()
        apply(cfg)
    } catch {
        showError(error)
    }
}
```

### `try?` for "best effort"

```swift
let cached = try? cache.read(key)   // String?, nil on any error
```

Combine with `??`:

```swift
let value = (try? expensiveLookup()) ?? .default
```

### Async + throws

```swift
func sync() async throws -> Snapshot {
    async let remote = api.fetch()
    async let local  = db.snapshot()
    return Snapshot(remote: try await remote, local: try await local)
}
```

---

## When to use

- **Recoverable conditions** — network failures, parse errors, missing files. Anything the caller might reasonably handle.
- **Crossing API boundaries** — throw, don't return sentinel values.
- **Domain modeling** — enums with associated values make error catalogs self-documenting.
- **Composing pipelines** — `Result` (or `try` inside `async let`) lets you carry errors through transformations cleanly.
- **Typed throws** — for tight, internal APIs where the exhaustive set of errors is small and stable.

---

## When NOT to use

- **Programmer errors** — out-of-bounds indices, broken invariants, contract violations. Use `precondition`, `assert`, or `fatalError` — not `throw`.
- **`try!`** — anywhere the error could realistically happen. It crashes the process on failure.
- **Bag-of-strings errors** — `throw "something failed"` (via `String: Error`) is convenient but loses structure. Use enums with cases.
- **Result everywhere** — `Result` is useful for storage/transport. For straight-line code, `throws`/`try` reads better.
- **Typed throws in published APIs** — locks the error set into the ABI; widening it later is a breaking change. Leave external APIs untyped (`throws`).

---

## References

- [The Swift Programming Language — Error Handling](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/errorhandling)
- [`Result` — Swift Standard Library](https://developer.apple.com/documentation/swift/result)
- [`Error` — Swift Standard Library](https://developer.apple.com/documentation/swift/error)
- [`LocalizedError` — Foundation](https://developer.apple.com/documentation/foundation/localizederror)
- [SE-0413 — Typed throws](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0413-typed-throws.md)
- [What's new in Swift — WWDC 2024](https://developer.apple.com/videos/play/wwdc2024/10136/)
