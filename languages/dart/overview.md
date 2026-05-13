# Dart Overview

> Dart is a client-optimised, statically typed language designed by Google for building fast apps on any platform — mobile, web, desktop, and server.

---

## What is it?

Dart is an open-source, general-purpose programming language created by Lars Bak and Kasper Lund at Google, first released in 2011. It was designed with a clear focus: enable developers to build high-performance, maintainable applications that compile to native code, JavaScript, or run in the Dart VM.

Dart is best known today as the language behind Flutter — Google's UI toolkit for building natively compiled apps from a single codebase. But Dart also runs on the server, as CLI tools, and compiles to JavaScript for the web.

---

## Why does it matter?

Dart fills an unusual position in the ecosystem: a language that is **familiar to Java and JavaScript developers**, yet **strongly typed**, **null-safe by design**, and capable of **ahead-of-time (AOT) compilation** to native binaries.

Its design philosophy prioritises developer productivity and application performance together:

- Sound type system eliminates an entire class of runtime errors at compile time.
- Null safety is enforced by the compiler — no more null crashes by default.
- AOT compilation delivers startup times and frame rendering speeds comparable to native Swift or Kotlin.
- The JIT compiler in development mode enables hot reload, cutting the feedback loop to milliseconds.

---

## What can you build with Dart?

| Use case | Notes |
|---|---|
| Mobile apps (iOS + Android) | Via Flutter — single codebase, native performance |
| Desktop apps (macOS, Windows, Linux) | Via Flutter |
| Web apps | Via Flutter Web or `dart compile js` |
| HTTP servers and REST APIs | Via `shelf`, `dart_frog`, or `serverpod` |
| CLI tools | Compile to self-contained native executables with `dart compile exe` |
| WebAssembly | Experimental support for Wasm targets (Dart 3+) |

---

## Key highlights

**Sound null safety**
Since Dart 2.12, the type system distinguishes nullable (`String?`) from non-nullable (`String`) types. The compiler enforces this distinction — null errors are caught at analysis time, not at runtime.

**Two compilation modes**
Dart supports JIT (Just-In-Time) for development — enabling hot reload and a fast iteration cycle — and AOT (Ahead-Of-Time) for production, producing compact, fast-starting native binaries.

**Async-first language design**
`async`/`await` and `Stream` are built into the language, not bolted on. The event loop model is similar to JavaScript but with stronger typing and a richer async API.

**Strong type inference**
Dart infers types aggressively with `var`, `final`, and `const`. You get the safety of static typing without writing type annotations everywhere.

**`const` as a performance primitive**
`const` objects are compile-time constants and are canonicalised — two `const` objects with identical values share the same memory instance. Flutter's rendering engine relies on this for diffing the widget tree efficiently.

**Single package ecosystem**
All Dart and Flutter packages live on [pub.dev](https://pub.dev). The `dart pub` CLI manages the full dependency lifecycle.

---

## Ecosystem highlights

| Area | Notable packages |
|---|---|
| HTTP client | `http`, `dio` |
| HTTP server | `shelf`, `dart_frog`, `serverpod` |
| JSON | `dart:convert` (stdlib), `json_serializable` |
| Testing | `test`, `mockito`, `mocktail` |
| Dependency injection | `get_it`, `injectable` |
| Database | `drift`, `isar`, `sqflite` (Flutter) |
| State management | `riverpod`, `bloc`, `provider` (Flutter) |
| CLI utilities | `args`, `mason` |

---

## Design decisions worth knowing

**No checked exceptions** — Dart has exceptions, but the type system does not enforce catching them. By convention, thrown exceptions are documented in API comments rather than in signatures.

**No primitive types** — everything in Dart is an object, including numbers and booleans. `int` and `double` are classes, not primitives.

**`const` and `final` are different** — `final` means the variable is assigned once (at runtime); `const` means the value is known at compile time.

**Cascade notation (`..`)** — Dart's cascade operator chains method calls on the same object without reassigning a variable:

```dart
final list = <int>[]
  ..add(1)
  ..add(2)
  ..add(3);
```

**`late` variables** — the `late` modifier defers initialisation of a non-nullable variable to first access, bridging null safety and lazy initialisation.

---

## References

- [Dart overview — dart.dev](https://dart.dev/overview)
- [A tour of the Dart language — dart.dev](https://dart.dev/language)
- [Effective Dart — dart.dev](https://dart.dev/effective-dart)
- [Dart language specification](https://spec.dart.dev/)
- [pub.dev — Dart package repository](https://pub.dev)
