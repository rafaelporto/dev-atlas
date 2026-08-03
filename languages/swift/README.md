# Swift

> A study guide covering Swift's core concepts, modern concurrency, idiomatic patterns, and the Apple-platform ecosystem.

---

## Overview & Philosophy

| Article | Description |
|---|---|
| [Overview](overview.md) | What Swift is, history, Apple platforms, Swift Evolution, and where it shines |
| [Paradigms](paradigms.md) | Multi-paradigm: protocol-oriented, OOP, functional, value semantics |

---

## Core Language

| Article | Description |
|---|---|
| [Types and Optionals](types-and-optionals.md) | Value vs reference types, `struct`/`class`/`enum`, optionals, `guard let` |
| [Protocols and Extensions](protocols-and-extensions.md) | Protocol-oriented programming, conditional conformance, `some` vs `any` |
| [Generics](generics.md) | Generic functions and types, `where` clauses, type erasure, opaque types |
| [Error Handling](error-handling.md) | `throws`/`try`/`do-catch`, `Result`, typed throws |
| [Closures and Memory](closures-and-memory.md) | Closures, `@escaping`, `@Sendable`, ARC, capture lists, retain cycles |

---

## Concurrency

| Article | Description |
|---|---|
| [Concurrency](concurrency.md) | `async`/`await`, structured concurrency, `Task`, `TaskGroup`, cancellation |
| [Actors and Sendable](actors-and-sendable.md) | Actors, data-race safety, Swift 6 strict concurrency |
| [Async Sequences](async-sequences.md) | `AsyncSequence`, `AsyncStream`, `AsyncThrowingStream` |

---

## Patterns & Best Practices

| Article | Description |
|---|---|
| [Swift Patterns](swift-patterns.md) | GoF adaptations and Swift-idiomatic patterns with usage frequency |
| [Property Wrappers and Result Builders](property-wrappers-and-result-builders.md) | `@propertyWrapper`, result builders, and the DSLs they power |
| [Best Practices](best-practices.md) | Swift API Design Guidelines, naming, immutability, value-first design |

---

## Frameworks & Ecosystem

| Article | Description |
|---|---|
| [SwiftUI and Observation](swiftui-and-observation.md) | Declarative UI, the Observation framework, comparison with Combine |
| [SwiftData](swift-data.md) | SwiftData and Core Data — persistence on Apple platforms |
| [Swift Package Manager](swift-package-manager.md) | SPM manifest, dependencies, modules, plugins |

---

## Getting Started

| Article | Description |
|---|---|
| [Installation](installation.md) | Xcode, `swiftly`, command-line tools, version selection |
| [IDEs and Editors](ides.md) | Xcode, VS Code with sourcekit-lsp, Cursor — pros, cons, and when to use each |

---

## Toolchain & Testing

| Article | Description |
|---|---|
| [Toolchain](toolchain.md) | `swift build/test/run`, `swift-format`, LLDB, Instruments |
| [Testing](testing.md) | XCTest and the modern Swift Testing framework |

---

## CLI & Terminal

| Article | Description |
|---|---|
| [CLI & Terminal](cli/README.md) | Building command-line tools in Swift — swift-argument-parser and SPM executables |

---

## See also

| Article | Description |
|---|---|
| [Mobile Architecture — Comparison and Decision Matrix](../../software-engineering/architecture/mobile/comparison.md) | Side-by-side comparison of MVC, MVP, MVVM, MVI, VIPER, Clean, and Modular — with a matrix for choosing one |
| [Mobile Architecture (section)](../../software-engineering/architecture/mobile/README.md) | Full coverage of mobile architectural patterns |

---

> Swift is the primary language for building apps across all Apple platforms — iOS, macOS, iPadOS, watchOS, tvOS, and visionOS. Its evolution since 2014 has been driven by safety, performance, and expressiveness, with recent focus on strict data-race safety and declarative UI through SwiftUI.
