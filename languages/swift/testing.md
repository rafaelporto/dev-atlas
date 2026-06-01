---
type: concept
tags:
  - language
  - swift
  - mobile
  - testing
related: []
language: "swift"
---
# Testing

> Swift has two test frameworks: XCTest is the long-standing default, and Swift Testing is the modern macro-based replacement Apple recommends for new code.

---

## What is it?

Apple ships **two** testing frameworks on Apple platforms:

- **XCTest** — the framework that has shipped since the iPhone SDK days. Class-based, method-based test discovery, assertion functions starting with `XCT...`. Still required for UI tests and is the default in older projects.
- **Swift Testing** — introduced at WWDC 2024 (Swift 6.0). Macro-driven, value-type-friendly, expressive `#expect` and `#require` macros, parameterized tests as a first-class feature. Available on Apple platforms from Xcode 16 / iOS 18 onwards and on Linux/Windows via the open-source `swift-testing` package.

Both run side by side. You don't have to migrate — new tests can use Swift Testing while existing XCTest suites keep working.

---

## Why does it matter?

XCTest works, but it carries decades of Objective-C heritage:

- Test classes inherit from `XCTestCase`
- Test discovery requires class methods with specific name prefixes
- Assertions are dozens of separate functions (`XCTAssertEqual`, `XCTAssertNil`, etc.)
- Parameterized tests required workarounds

Swift Testing was designed Swift-first:

- Tests are top-level functions, methods, or static methods marked `@Test`
- Tests can live in `struct`s, `enum`s, or `class`es
- One macro — `#expect` — covers virtually all assertion needs and produces precise failure messages
- Parameterized tests, traits (tags, time limits, conditions), and test suites are built in

For new code on Apple platforms, **prefer Swift Testing** unless a specific feature forces XCTest (notably UI tests).

---

## How it works

### Swift Testing — basics

```swift
import Testing

@Test func sumsTwoNumbers() {
    #expect(2 + 2 == 4)
}

@Test func parsesValidInput() throws {
    let parsed = try parse("42")
    #expect(parsed == 42)
}
```

No base class. No `func test...` prefix. Test discovery is driven by the `@Test` attribute.

### `#expect` vs `#require`

| Macro | Behavior on failure |
|---|---|
| `#expect(expr)` | Record the failure and continue |
| `#require(expr)` | Record the failure and throw (skips the rest of the test) |
| `try #require(value)` | If `value` is optional, throws if nil; otherwise unwraps |

```swift
@Test func requiredUnwrap() throws {
    let user = try #require(repository.find(id: "u1"))
    #expect(user.name == "Ada")
}
```

The `#expect` macro captures the expression source — failures show the full expression, not just "false".

### Suites with `struct` or `class`

```swift
@Suite struct CalculatorTests {
    let calculator = Calculator()

    @Test func adds() {
        #expect(calculator.add(2, 3) == 5)
    }

    @Test func subtracts() {
        #expect(calculator.subtract(5, 2) == 3)
    }
}
```

Each `@Test` gets a fresh instance — like XCTest's `setUp`, but using `init`.

### Parameterized tests

```swift
@Test(arguments: [
    (input: "0", expected: 0),
    (input: "42", expected: 42),
    (input: "-7", expected: -7)
])
func parsesInteger(input: String, expected: Int) throws {
    #expect(try parse(input) == expected)
}
```

Each row runs as a separate test case in Xcode's test navigator.

### Traits

Traits attach metadata to tests:

```swift
@Test("Sums two numbers", .tags(.fast))
func sumsTwoNumbers() { ... }

@Test(.disabled("Flaky — see issue #42"))
func flaky() { ... }

@Test(.timeLimit(.minutes(1)))
func longRunning() async throws { ... }
```

Tags let you filter test runs (`--filter`) by category.

### Async and concurrency

```swift
@Test func fetchesUser() async throws {
    let user = try await api.user(id: "u1")
    #expect(user.name == "Ada")
}
```

Tests can be `async` and/or `throws` — no special wrappers.

### Expected errors

```swift
@Test func throwsOnEmpty() {
    #expect(throws: ParseError.empty) {
        try parse("")
    }
}

@Test func throwsAny() {
    #expect(throws: (any Error).self) {
        try parse("bad")
    }
}
```

---

## XCTest — what you still see

```swift
import XCTest
@testable import MyLibrary

final class CalculatorTests: XCTestCase {
    var calculator: Calculator!

    override func setUp() {
        super.setUp()
        calculator = Calculator()
    }

    override func tearDown() {
        calculator = nil
        super.tearDown()
    }

    func testAdds() {
        XCTAssertEqual(calculator.add(2, 3), 5)
    }

    func testThrowsOnInvalid() {
        XCTAssertThrowsError(try parse("bad")) { error in
            XCTAssertEqual(error as? ParseError, .invalid)
        }
    }
}
```

Common XCTest assertions:

| Function | Use |
|---|---|
| `XCTAssertEqual(a, b)` | Equality |
| `XCTAssertTrue(expr)` / `XCTAssertFalse(expr)` | Boolean |
| `XCTAssertNil(x)` / `XCTAssertNotNil(x)` | Optional checks |
| `XCTAssertThrowsError(try ...)` | Expect an error |
| `XCTUnwrap(opt)` | Unwrap or fail |
| `XCTFail("message")` | Force failure |
| `XCTExpectation` + `wait(for:)` | Async waiting (mostly obsolete since async support) |

XCTest is **required** for UI tests via `XCUIApplication`.

---

## SwiftUI testing

For SwiftUI views, two approaches:

- **Snapshot tests** — render the view and compare against a stored image. Libraries: [swift-snapshot-testing](https://github.com/pointfreeco/swift-snapshot-testing).
- **View hierarchy inspection** — programmatically examine the rendered view tree. Libraries: [ViewInspector](https://github.com/nalexn/ViewInspector).
- **UI tests** — launch the app in the simulator and drive it via `XCUIApplication`.

For most state-shaped logic, test the `@Observable` model directly with Swift Testing — viewing the UI is a separate concern.

```swift
@Test func incrementUpdatesValue() {
    let counter = Counter()
    counter.increment()
    counter.increment()
    #expect(counter.value == 2)
}
```

---

## Running tests

From the CLI:

```bash
swift test                                    # all tests
swift test --filter CalculatorTests          # by suite
swift test --filter "CalculatorTests/adds"   # by test
swift test --parallel                         # parallel execution
swift test --enable-code-coverage            # with coverage
```

From Xcode: `⌘U` runs all tests; `⌃⌥⌘U` re-runs the last; the diamond gutter icons run individual tests or suites.

---

## When to use

### Swift Testing — by default for new code

- Unit tests on iOS 18 / macOS 15 / Xcode 16+ projects
- Cross-platform packages (via `swift-testing`)
- Anywhere you want parameterized tests, structured suites, or expressive failure output

### XCTest — when you must

- Targeting older OS versions
- UI tests with `XCUIApplication`
- Existing test suites — don't migrate solely for the framework change

---

## When NOT to test

- **Glue code with no logic.** Adapters that wire two well-tested layers don't need their own tests.
- **Code you're about to rewrite.** Tests of soon-to-be-deleted code waste effort.
- **UIKit/SwiftUI layout details.** Snapshot tests rot fast with design churn — use them strategically, not everywhere.
- **Auto-generated code.** Test the generator inputs and outputs, not the generated output.

---

## References

- [Swift Testing — Apple Developer](https://developer.apple.com/documentation/testing)
- [Swift Testing repo (open source)](https://github.com/swiftlang/swift-testing)
- [Meet Swift Testing — WWDC 2024](https://developer.apple.com/videos/play/wwdc2024/10179/)
- [Go further with Swift Testing — WWDC 2024](https://developer.apple.com/videos/play/wwdc2024/10195/)
- [Migrating a test from XCTest — Apple Developer](https://developer.apple.com/documentation/testing/migratingfromxctest)
- [XCTest — Apple Developer](https://developer.apple.com/documentation/xctest)
- [`swift-snapshot-testing`](https://github.com/pointfreeco/swift-snapshot-testing)
- [`ViewInspector`](https://github.com/nalexn/ViewInspector)
- [SE-0410 — Atomics (used by Swift Testing internals)](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0410-atomics.md)
