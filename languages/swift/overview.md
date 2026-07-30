---
type: concept
tags:
  - language
  - swift
  - mobile
  - overview
related: []
language: "swift"
---
# Swift Overview

> Swift is a statically typed, compiled language designed by Apple for building safe, fast, and expressive software across all Apple platforms.

---

## What is it?

Swift is an open-source programming language created at Apple, first released in 2014 as the modern successor to Objective-C. It was designed to be safe by default, fast at runtime, and expressive enough to scale from one-line scripts to full operating systems.

Swift compiles to native machine code via LLVM, supports automatic memory management through ARC (Automatic Reference Counting), and treats both value semantics and protocols as first-class language features.

Since 2015 it has been governed in the open through the [Swift Evolution](https://github.com/swiftlang/swift-evolution) process, where every language change is proposed, reviewed, and discussed publicly before landing.

---

## Why does it matter?

Swift fills the gap left by Objective-C: a language that is **as safe as Rust in common cases**, **as productive as Python for app code**, and **as performant as C++ in tight loops** — without leaving the Apple-native developer experience behind.

Three design choices set the tone:

- **Safety is the default.** Optionals force you to handle absent values explicitly. Variables must be initialized. Overflow traps instead of silently wrapping.
- **Value types are first-class.** `struct`, `enum`, and tuples are stored by value with copy-on-write where appropriate. This eliminates entire categories of aliasing bugs.
- **Protocols and generics drive abstraction.** Instead of class hierarchies, Swift composes behavior through protocols with default implementations.

These choices make Swift codebases more predictable and refactorable than equivalent Objective-C, Java, or older C++ code.

---

## What can you build with Swift?

Swift is the primary language for **everything Apple ships**:

| Platform | Use case |
|---|---|
| **iOS / iPadOS** | Native mobile and tablet apps |
| **macOS** | Desktop apps, command-line tools, system utilities |
| **watchOS** | Apple Watch apps and complications |
| **tvOS** | Apple TV apps |
| **visionOS** | Spatial computing apps for Apple Vision Pro |
| **Embedded Swift** | Microcontrollers and resource-constrained devices (since Swift 5.9) |
| **System programming** | Parts of Apple's own platforms — including the Swift compiler itself — are written in Swift |

Beyond Apple platforms, Swift also runs on Linux and Windows, though this guide focuses on Apple-platform development.

---

## Key highlights

**Safety by construction**
Optionals (`T?`) make the presence or absence of a value part of the type. Force-unwrapping is syntactically loud (`!`), and the compiler refuses to use uninitialized variables.

**Value types over reference types**
`struct` and `enum` are stored by value, and Swift uses copy-on-write for collections so this rarely costs a deep copy. Reference types (`class`) exist when identity or shared mutable state is intentional.

**Protocol-Oriented Programming**
Apple's [WWDC 2015 talk](https://developer.apple.com/videos/play/wwdc2015/408/) made it official: Swift favors protocols with default implementations over inheritance. This produces composable, testable code without rigid hierarchies.

**Strict concurrency**
Since Swift 5.5, `async`/`await`, `Task`, and actors provide structured concurrency. Swift 6 turns on **strict concurrency checking** by default — data races become compile-time errors.

**Modern UI through SwiftUI**
SwiftUI is a declarative UI framework that uses result builders to express view hierarchies as composable values. The same code targets every Apple platform.

**Single-binary compilation with LLVM**
Swift compiles to native code with full LLVM optimization. No runtime VM, no interpreter, no JIT for shipping apps.

**Source-level interoperability with C and Objective-C**
Swift can call C and Objective-C APIs directly, and most of Apple's frameworks (Foundation, UIKit, AppKit) are usable from Swift without a binding layer.

**Open governance**
Language changes go through [Swift Evolution](https://github.com/swiftlang/swift-evolution). The compiler, standard library, and key frameworks are open source on [GitHub](https://github.com/swiftlang).

---

## Ecosystem highlights

| Area | Notable libraries / frameworks |
|---|---|
| UI | SwiftUI, UIKit, AppKit |
| State and reactivity | [Observation](https://developer.apple.com/documentation/observation), [Combine](https://developer.apple.com/documentation/combine) |
| Persistence | [SwiftData](https://developer.apple.com/documentation/swiftdata), [Core Data](https://developer.apple.com/documentation/coredata), [GRDB](https://github.com/groue/GRDB.swift) |
| Networking | [URLSession](https://developer.apple.com/documentation/foundation/urlsession), [Alamofire](https://github.com/Alamofire/Alamofire) |
| Architecture | [The Composable Architecture (TCA)](https://github.com/pointfreeco/swift-composable-architecture) |
| Testing | [XCTest](https://developer.apple.com/documentation/xctest), [Swift Testing](https://developer.apple.com/documentation/testing), [ViewInspector](https://github.com/nalexn/ViewInspector) |
| Dependency injection | [Factory](https://github.com/hmlongco/Factory), [swift-dependencies](https://github.com/pointfreeco/swift-dependencies) |
| Concurrency utilities | [swift-async-algorithms](https://github.com/apple/swift-async-algorithms), [swift-collections](https://github.com/apple/swift-collections) |

---

## Versions worth knowing

Swift's evolution has accelerated since version 5.0. A few releases that matter:

| Version | Year | Highlights |
|---|---|---|
| **Swift 5.1** | 2019 | Opaque return types (`some`), property wrappers, SwiftUI ships |
| **Swift 5.5** | 2021 | `async`/`await`, actors, structured concurrency |
| **Swift 5.7** | 2022 | `any` for existentials, `if let` shorthand, regex literals |
| **Swift 5.9** | 2023 | Macros, Embedded Swift preview, `Observation` framework |
| **Swift 6.0** | 2024 | Strict concurrency on by default, typed throws, full data-race safety |

The current major line is **Swift 6**, which is the recommended target for new code on Apple platforms.

---

## Design decisions worth knowing

**Optionals over null** — there is no `null`. Absence is expressed via `Optional<T>` and the compiler forces you to deal with it.

**Value semantics first** — Apple's frameworks and the standard library bias heavily toward `struct`. `class` is for identity, lifecycle, or interop with Objective-C.

**No implicit conversions** — `Int` does not silently become `Double`. You convert explicitly.

**Type inference everywhere** — the compiler infers types in most expressions, so explicit annotations are reserved for API boundaries and clarity.

**No exceptions in the C++ sense** — error handling uses `throws`/`try`/`catch` with typed `Error` values and no stack-unwinding semantics beyond Swift's own.

**Protocols + extensions over inheritance** — composition wins by default.

---

## How it works

Swift's pipeline is fully ahead-of-time compiled — there is no VM or interpreter in shipping apps:

1. **Parse & type-check** — the front end builds an AST and runs Swift's type inference and safety checks (optionals, exclusivity, concurrency isolation).
2. **SIL (Swift Intermediate Language)** — a Swift-specific IR where ARC insertion, generic specialization, and optimizations happen.
3. **LLVM IR → machine code** — SIL lowers to LLVM IR, which LLVM optimizes and emits as native object code for the target triple.
4. **Link** — object files link against the Swift runtime and standard library into an executable or framework.

Memory is managed by **ARC**: the compiler inserts retain/release calls at compile time rather than using a tracing garbage collector, so memory behavior is deterministic. Value types (`struct`, `enum`) are copied on assignment, with copy-on-write for the standard-library collections so a copy is only paid when a shared buffer is mutated.

---

## Examples

A small end-to-end slice showing the language's defaults — value type, optional handling, protocol conformance, and structured concurrency:

```swift
struct User: Codable, Identifiable {
    let id: String
    var name: String
}

enum LoadError: Error { case notFound }

func loadUser(id: String, from store: [String: User]) throws -> User {
    guard let user = store[id] else { throw LoadError.notFound }
    return user
}

func refresh(ids: [String], from store: [String: User]) async -> [User] {
    await withTaskGroup(of: User?.self) { group in
        for id in ids {
            group.addTask { try? loadUser(id: id, from: store) }
        }
        var results: [User] = []
        for await user in group where user != nil {
            results.append(user!)
        }
        return results
    }
}
```

---

## When to use

- **Any Apple-platform app** — iOS, iPadOS, macOS, watchOS, tvOS, visionOS.
- **Performance-sensitive native code** where a GC pause is unacceptable and value semantics simplify reasoning.
- **New projects on Apple platforms** — Swift 6 is the recommended target over Objective-C.
- **Cross-platform libraries** targeting Linux/Windows via SPM, where Apple frameworks are not required.
- **Embedded / resource-constrained targets** via Embedded Swift.

---

## When NOT to use

- **Non-Apple GUI or ecosystems** where the mature toolchain and libraries live elsewhere (e.g. Android-native, most web front ends).
- **Teams with a deep existing investment** in another native stack and no Apple-platform target.
- **Scripting glue** where a dynamically typed language already fits the workflow and startup cost matters more than performance.
- **Environments without a supported toolchain** — some niche platforms lack a Swift port.

---

## References

- [Swift.org — Documentation](https://www.swift.org/documentation/)
- [The Swift Programming Language (book)](https://docs.swift.org/swift-book/)
- [Apple Developer — Swift](https://developer.apple.com/swift/)
- [Swift Evolution proposals](https://github.com/swiftlang/swift-evolution)
- [Swift API Design Guidelines](https://www.swift.org/documentation/api-design-guidelines/)
- [Swift Forums](https://forums.swift.org/)
- [Protocol-Oriented Programming in Swift — WWDC 2015](https://developer.apple.com/videos/play/wwdc2015/408/)
