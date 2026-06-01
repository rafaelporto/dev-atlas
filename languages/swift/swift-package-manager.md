---
type: concept
tags:
  - language
  - swift
  - mobile
related: []
language: "swift"
---
# Swift Package Manager

> SPM is Swift's official dependency manager and build system — it manages packages, builds binaries, and powers modular project structure on Apple platforms.

---

## What is it?

Swift Package Manager (SPM) is the build tool that ships with Swift. It is responsible for:

- Resolving and downloading dependencies
- Building libraries, executables, and tests
- Running tests
- Plugins that extend the build (code generation, linting, formatting)

A package is described by a single Swift file: `Package.swift`. There is no separate manifest format — the manifest is real Swift code, evaluated by the SPM toolchain.

SPM is the recommended dependency manager for new Apple-platform projects. It is integrated directly into Xcode and supplants CocoaPods and Carthage for most modern use cases.

---

## Why does it matter?

Three reasons SPM is the default now:

1. **First-party.** Apple ships it, supports it, and uses it for the Swift toolchain itself.
2. **Integrated with Xcode.** "Add Package Dependency" is a menu item. No `pod install`, no Gemfiles, no Ruby toolchain.
3. **Modularization made easy.** SPM packages are the natural unit for breaking an app into modules, which improves build times and code organization.

For library authors, SPM is the publishing target. For app authors, it's the consumption mechanism.

---

## How it works

### The `Package.swift` manifest

```swift
// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "MyLibrary",
    platforms: [
        .iOS(.v17),
        .macOS(.v14)
    ],
    products: [
        .library(name: "MyLibrary", targets: ["MyLibrary"])
    ],
    dependencies: [
        .package(url: "https://github.com/apple/swift-collections.git", from: "1.0.0")
    ],
    targets: [
        .target(
            name: "MyLibrary",
            dependencies: [
                .product(name: "Collections", package: "swift-collections")
            ]
        ),
        .testTarget(
            name: "MyLibraryTests",
            dependencies: ["MyLibrary"]
        )
    ]
)
```

Key concepts:

| Concept | Meaning |
|---|---|
| **Package** | The root unit — one `Package.swift` |
| **Product** | What the package exposes — `.library`, `.executable`, `.plugin` |
| **Target** | A buildable unit — code + dependencies; corresponds to one module |
| **Dependency** | Another package this one depends on |

### Directory layout

```
MyLibrary/
├── Package.swift
├── Sources/
│   └── MyLibrary/
│       └── MyLibrary.swift
└── Tests/
    └── MyLibraryTests/
        └── MyLibraryTests.swift
```

SPM uses convention: a target named `Foo` lives in `Sources/Foo/`. Override with the `path:` argument when needed.

### Version requirements

```swift
.package(url: "...", from: "1.0.0")              // 1.0.0 ≤ v < 2.0.0
.package(url: "...", .upToNextMajor(from: "1.2.0"))
.package(url: "...", .upToNextMinor(from: "1.2.0"))
.package(url: "...", exact: "1.2.3")
.package(url: "...", branch: "main")             // not for releases
.package(url: "...", revision: "abc123")
.package(path: "../LocalPackage")                 // local development
```

SPM resolves versions with a SAT solver. The result is locked in `Package.resolved`, which you commit.

### Adding a dependency in Xcode

**File → Add Package Dependencies…** → enter the repo URL → pick a version rule → choose which products to add to which targets. Xcode writes the changes into your project's `Package.swift` or `*.xcodeproj`.

### CLI commands

| Command | Purpose |
|---|---|
| `swift package init` | Create a new package |
| `swift package init --type executable` | Create an executable |
| `swift package init --type library` | Create a library (default) |
| `swift build` | Build all targets |
| `swift run` | Build and run the default executable |
| `swift test` | Run tests |
| `swift package update` | Update dependencies to latest matching version |
| `swift package resolve` | Resolve without updating |
| `swift package show-dependencies` | Print the dependency graph |
| `swift package clean` | Remove build artifacts |
| `swift package describe --type json` | Machine-readable package description |

### Resources and binary targets

You can bundle assets, localizations, and data files:

```swift
.target(
    name: "MyLibrary",
    resources: [
        .process("Resources"),    // strings catalogs, images
        .copy("data.json")        // copied verbatim
    ]
)
```

Binary targets ship precompiled frameworks (`.xcframework`):

```swift
.binaryTarget(
    name: "MyClosedSource",
    url: "https://example.com/MyClosedSource-1.0.0.xcframework.zip",
    checksum: "abc123..."
)
```

### Plugins

SPM supports two plugin types:

- **Build tool plugins** — run as part of compilation (code generation, asset processing)
- **Command plugins** — invoked manually via `swift package <command>` (formatting, doc generation)

```swift
.executableTarget(name: "swift-format"),
.plugin(
    name: "FormatPlugin",
    capability: .command(intent: .custom(verb: "format", description: "Run swift-format")),
    dependencies: ["swift-format"]
)
```

---

## Modularization patterns

Breaking an app into SPM packages reduces incremental build time and clarifies ownership. Two common shapes:

### Single-package monorepo

```
MyApp/
├── App/                  ← Xcode project
└── Modules/Package.swift ← multiple targets
    ├── Sources/Core/
    ├── Sources/Networking/
    ├── Sources/Features/
    │   ├── Profile/
    │   └── Settings/
    └── Tests/...
```

One package, many targets. Targets depend on each other via internal references.

### Multi-package

```
MyApp/
├── App.xcworkspace
├── App/                       ← Xcode project
└── Packages/
    ├── Core/Package.swift
    ├── Networking/Package.swift
    └── Features/Package.swift
```

Each subdirectory is an independent SPM package. Useful when packages may be reused across apps, or when teams own packages independently.

---

## Examples

### Bootstrap an executable

```bash
mkdir hello && cd hello
swift package init --type executable
swift run
# Hello, world!
```

The generated `Package.swift`:

```swift
// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "hello",
    targets: [
        .executableTarget(name: "hello")
    ]
)
```

### Add a dependency

```swift
let package = Package(
    name: "hello",
    dependencies: [
        .package(url: "https://github.com/apple/swift-argument-parser", from: "1.3.0")
    ],
    targets: [
        .executableTarget(
            name: "hello",
            dependencies: [
                .product(name: "ArgumentParser", package: "swift-argument-parser")
            ]
        )
    ]
)
```

```swift
import ArgumentParser

@main
struct Hello: ParsableCommand {
    @Argument var name: String

    func run() {
        print("Hello, \(name)!")
    }
}
```

```bash
swift run hello World
# Hello, World!
```

### Two-target library (public + internal)

```swift
let package = Package(
    name: "Networking",
    products: [
        .library(name: "Networking", targets: ["Networking"])
    ],
    targets: [
        .target(name: "Networking", dependencies: ["NetworkingInternal"]),
        .target(name: "NetworkingInternal"),       // not exported via products
        .testTarget(name: "NetworkingTests", dependencies: ["Networking"])
    ]
)
```

Only `Networking` is visible to consumers; `NetworkingInternal` is implementation detail.

---

## Common dependencies worth knowing

| Package | What it provides |
|---|---|
| [swift-collections](https://github.com/apple/swift-collections) | `Deque`, `OrderedDictionary`, `OrderedSet`, `Heap` |
| [swift-algorithms](https://github.com/apple/swift-algorithms) | `chunked`, `windows`, `uniqued`, `combinations` |
| [swift-async-algorithms](https://github.com/apple/swift-async-algorithms) | `AsyncSequence` operators (`merge`, `zip`, `debounce`) |
| [swift-argument-parser](https://github.com/apple/swift-argument-parser) | CLI argument parsing |
| [swift-log](https://github.com/apple/swift-log) | Structured logging API |
| [swift-syntax](https://github.com/swiftlang/swift-syntax) | Build macros and source-rewriting tools |

---

## When to use SPM

- **All new Apple-platform projects.** It's the default.
- **Modularizing an existing app** — extract features into local packages to speed up builds.
- **Publishing a library.** SPM is now the dominant consumption path; CocoaPods support is optional.
- **Building command-line tools in Swift.** `swift run` and `--type executable` cover most needs.

---

## When NOT to use

- **Apps that already work with CocoaPods and have a hard dependency that's SPM-only via a fork.** Migration cost may exceed benefit until the dependency itself adopts SPM.
- **Mixed-language packages where the C/C++ build is complex.** SPM handles C, C++, and Objective-C, but mature CMake or Bazel setups can be a better fit for very large native builds.
- **iOS app distribution as a binary.** SPM produces `.swiftmodule`/`.framework` outputs, not signed `.ipa`s — Xcode still does that.

---

## References

- [Swift Package Manager — Swift.org](https://www.swift.org/documentation/package-manager/)
- [`PackageDescription` API](https://developer.apple.com/documentation/packagedescription)
- [Meet Swift Package plugins — WWDC 2022](https://developer.apple.com/videos/play/wwdc2022/110359/)
- [Swift Package Index](https://swiftpackageindex.com/) — discovery and compatibility data
- [Swift Forums — Package Manager](https://forums.swift.org/c/development/SwiftPM/21)
- [Adding Package Dependencies to Your App — Apple Developer](https://developer.apple.com/documentation/xcode/adding-package-dependencies-to-your-app)
