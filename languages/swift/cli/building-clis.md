---
type: how-to
tags:
  - language
  - swift
  - cli
related:
  - languages/swift/cli/overview
  - languages/swift/swift-package-manager
  - languages/swift/concurrency
  - languages/swift/error-handling
language: "swift"
---

# How to Build a CLI in Swift

> A hands-on guide: define a `ParsableCommand` with swift-argument-parser, add subcommands and validation, go async, wire up correct exit codes and streams, and keep it testable.

---

## Prerequisites

- A Swift toolchain installed and a SwiftPM package — see [Swift Package Manager](../swift-package-manager.md). A CLI is an `executableTarget`.
- The swift-argument-parser dependency added to `Package.swift`.
- Familiarity with `throws`/[error handling](../error-handling.md) and [concurrency](../concurrency.md).

This guide bakes in the CLI conventions that matter — **exit codes**, **stdout vs. stderr**, and **honoring `NO_COLOR`** — as it goes.

## Steps

### 1. Set up the package

Declare an executable target that depends on `ArgumentParser`.

```swift
// Package.swift
// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "todo",
    dependencies: [
        .package(url: "https://github.com/apple/swift-argument-parser", from: "1.3.0"),
    ],
    targets: [
        .executableTarget(
            name: "todo",
            dependencies: [.product(name: "ArgumentParser", package: "swift-argument-parser")]
        ),
    ]
)
```

### 2. Define a single command

A command is a `struct` conforming to `ParsableCommand`. Property wrappers declare the interface; `run()` does the work.

```swift
import ArgumentParser

@main
struct Todo: ParsableCommand {
    static let configuration = CommandConfiguration(
        commandName: "todo",
        abstract: "A tiny task manager"
    )

    @Argument(help: "the task to add")
    var task: String

    @Option(name: [.short, .long], help: "task priority")
    var priority: Int = 1

    @Flag(name: [.short, .long], help: "verbose output")
    var verbose = false

    func run() throws {
        if verbose {
            FileHandle.standardError.write(
                Data("adding with priority \(priority)\n".utf8))
        }
        print("added: \(task)") // stdout
    }
}
```

```console
$ swift run todo "buy milk" -p 2 -v
adding with priority 2
added: buy milk
```

`@Option` and `@Flag` types are parsed and validated for you (`Int` rejects non-numbers), and `--help` is generated from the `help:` strings.

### 3. Add subcommands

For a git-style tool, list subcommands in the root's `CommandConfiguration`. Each subcommand is its own `ParsableCommand`.

```swift
@main
struct Todo: ParsableCommand {
    static let configuration = CommandConfiguration(
        commandName: "todo",
        abstract: "A tiny task manager",
        subcommands: [Add.self, List.self],
        defaultSubcommand: List.self
    )
}

struct Add: ParsableCommand {
    @Argument var task: String
    @Option(name: .shortAndLong) var priority: Int = 1
    func run() throws { print("added: \(task) (priority \(priority))") }
}

struct List: ParsableCommand {
    func run() throws { print("listing tasks") }
}
```

### 4. Validate input and set exit codes

Implement `validate()` for cross-field checks, and throw to fail. Throw `ValidationError` for bad usage (exit code 2-style) or `ExitCode` to set a specific status. Never call `exit()` deep in your logic — throw and let the framework translate it.

```swift
struct Add: ParsableCommand {
    @Argument var task: String
    @Option var priority: Int = 1

    func validate() throws {
        guard (1...5).contains(priority) else {
            throw ValidationError("priority must be between 1 and 5")
        }
    }

    func run() throws {
        guard !task.isEmpty else { throw ExitCode.failure } // exit 1
        print("added: \(task)")
    }
}
```

`ValidationError` prints your message plus usage to **stderr** and exits non-zero; `ExitCode.success`/`.failure` (or `ExitCode(2)`) set the process status explicitly.

### 5. Use streams correctly and go async

- **Results to `stdout`** via `print`; **diagnostics to `stderr`** via `FileHandle.standardError`.
- **Respect `NO_COLOR` and non-TTY output.** Colorize only when attached to a terminal.

```swift
import Foundation

let useColor = isatty(fileno(stdout)) == 1
    && ProcessInfo.processInfo.environment["NO_COLOR"] == nil
func ok(_ s: String) -> String { useColor ? "\u{001B}[32m\(s)\u{001B}[0m" : s }
```

For I/O-bound work, conform to `AsyncParsableCommand` and make `run()` async:

```swift
struct Fetch: AsyncParsableCommand {
    @Argument var url: String
    func run() async throws {
        let (data, _) = try await URLSession.shared.data(from: URL(string: url)!)
        print("fetched \(data.count) bytes")
    }
}
```

### 6. Make it testable

Keep parsing separate from logic. swift-argument-parser can `parse` arguments in a test without running the process, and you can put the real work in functions that return values (writing to an injectable sink) rather than printing directly. See [Testing](../testing.md).

```swift
import XCTest
import ArgumentParser
@testable import todo

final class TodoTests: XCTestCase {
    func testParsesPriority() throws {
        let cmd = try Todo.parseAsRoot(["add", "buy milk", "-p", "3"])
        let add = try XCTUnwrap(cmd as? Add)
        XCTAssertEqual(add.priority, 3)
    }
}
```

## Verification

Run in dev, then build a release binary and exercise each path:

```bash
swift run todo add "buy milk" --priority 2   # expect: added: buy milk
swift run todo --help                        # expect: usage with subcommands
swift build -c release                       # binary in .build/release/todo
.build/release/todo add x
echo $?                                       # expect: 0 on success, non-zero on error
```

## Common issues

| Symptom | Likely cause | Fix |
|---|---|---|
| `Missing expected argument` | A required `@Argument` not provided | Give it a default, or supply it; check the generated `--help` |
| Type error on an option | `@Option var n: Int` given a non-number | Fix the input; the type drives validation intentionally |
| Exit code always `0` on failure | Returning normally instead of throwing | Throw `ExitCode.failure`/`ValidationError` to set a non-zero status |
| Error text on stdout | Printing errors with `print` | Write diagnostics to `FileHandle.standardError` |
| `async` work in a sync command | Command conforms to `ParsableCommand` | Conform to `AsyncParsableCommand` and make `run()` async |
| Colors leak into piped output | Colorizing unconditionally | Gate on `isatty(...)` and `NO_COLOR` |

## References

- [Swift Argument Parser — documentation](https://swiftpackageindex.com/apple/swift-argument-parser/documentation)
- [swift-argument-parser repository](https://github.com/apple/swift-argument-parser)
- [Swift Package Manager](https://www.swift.org/documentation/package-manager/)
- [Command Line Interface Guidelines (clig.dev)](https://clig.dev/)
