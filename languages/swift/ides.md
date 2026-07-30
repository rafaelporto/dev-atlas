---
type: concept
tags:
  - language
  - swift
  - mobile
related: []
language: "swift"
---
# IDEs and Editors

> Xcode is the canonical Swift IDE on macOS; VS Code with `sourcekit-lsp` covers most non-app workflows; Cursor extends VS Code with AI assistance.

---

## What is it?

Three credible editors for Swift development on Apple platforms:

- **Xcode** — Apple's official IDE. Required for building iOS / macOS / watchOS / tvOS / visionOS apps and for using Interface Builder, Instruments, and the simulator.
- **VS Code** with the official **Swift extension** — Editor-class tooling for Swift powered by `sourcekit-lsp`. Used for SPM packages, server-side Swift, and Swift scripts where Xcode is overkill.
- **Cursor** — A fork of VS Code with first-class AI features. The Swift extension works the same; the differentiator is the AI experience.

There used to be a fourth — JetBrains AppCode — but JetBrains [discontinued it in 2022](https://blog.jetbrains.com/appcode/2022/12/appcode-2022-3-release-and-end-of-sales-and-support/). It is no longer maintained.

---

## Why does it matter?

The choice of editor decides which workflows are friction-free. Building an iOS app outside Xcode is technically possible but practically painful — simulator launches, Interface Builder, asset catalogs, code signing, and provisioning all live in Xcode. Conversely, editing a SPM package or a Swift script inside Xcode is much heavier than VS Code.

A common setup: Xcode for app projects, VS Code/Cursor for everything else, both on the same machine.

---

## How it works

### Xcode

| Capability | Notes |
|---|---|
| **Project model** | `.xcodeproj` and `.xcworkspace` files; SPM packages can be opened directly |
| **Build system** | Native — Xcode's build engine, used by App Store distribution |
| **Simulator** | Built-in iOS, iPadOS, watchOS, tvOS, visionOS simulators |
| **Interface Builder** | Visual editor for storyboards and XIBs (UIKit) |
| **SwiftUI previews** | Render previews live in the canvas with `#Preview { ... }` |
| **Instruments** | Profiling — Time Profiler, Allocations, Leaks, System Trace |
| **Debugger** | LLDB integration, view hierarchy debugger, memory graph debugger |
| **Code signing** | Provisioning, entitlements, App Store Connect integration |
| **Refactoring** | Rename, extract, generate protocol stubs |
| **Testing** | XCTest and Swift Testing UI, code coverage, parallel runs |

Xcode's strengths are app-shaped tasks: building, debugging, profiling, signing, and shipping to the App Store. Its weakness is general-purpose editing — keyboard latency in large files, an opinionated layout, and search/refactor tools that lag behind dedicated editors.

### VS Code with the Swift extension

| Capability | Notes |
|---|---|
| **Engine** | `sourcekit-lsp` (Apple's language server) |
| **What it gives you** | Completion, go-to-definition, find-references, diagnostics, doc hover |
| **Build** | Through SPM — runs `swift build` / `swift test` |
| **Debugger** | LLDB integration via the [CodeLLDB](https://marketplace.visualstudio.com/items?itemName=vadimcn.vscode-lldb) extension |
| **Format** | Via [`swift-format`](https://github.com/swiftlang/swift-format) |
| **iOS simulator** | Not directly supported — use Xcode for app runs |

The official extension is published by `swiftlang` (Apple). Earlier community extensions exist but the official one is now the recommendation.

### Cursor

[Cursor](https://cursor.sh/) is a fork of VS Code that adds AI features as first-class citizens: inline completion, chat over the codebase, agentic edits. For Swift, install the same Swift extension as in VS Code — the LSP and build behavior are identical.

If you already use VS Code, Cursor is a drop-in. If you don't, evaluate based on whether the AI features fit your workflow.

---

## Examples

The same SwiftUI file drives a different loop in each editor. Xcode renders the `#Preview` live in its canvas; VS Code / Cursor give completion and diagnostics through `sourcekit-lsp` and defer the visual run to the simulator:

```swift
import SwiftUI

/// A counter view. The `///` doc comment surfaces in Xcode quick-help
/// and on hover in VS Code / Cursor via sourcekit-lsp.
struct CounterView: View {
    @State private var count = 0

    var body: some View {
        VStack {
            Text("Count: \(count)")
            Button("Increment") { count += 1 }
        }
    }
}

#Preview {          // rendered live in Xcode's canvas; ignored by CLI builds
    CounterView()
}
```

Running the previews and the simulator requires Xcode; editing, search, and refactoring this file is often faster in VS Code / Cursor.

---

## When to use

| Use case | Best choice |
|---|---|
| iOS / iPadOS / macOS / watchOS / tvOS / visionOS app | **Xcode** |
| SwiftUI app with previews | **Xcode** |
| UIKit/AppKit app with Interface Builder | **Xcode** |
| App Store submission | **Xcode** |
| Instruments profiling | **Xcode** |
| SPM library package | **VS Code / Cursor** (or Xcode — both work) |
| Swift script or CLI tool | **VS Code / Cursor** |
| Multi-file refactor with regex / grep | **VS Code / Cursor** |
| AI-assisted editing | **Cursor** |
| Quick reads and edits in a Swift file | **VS Code / Cursor** |

A common pattern: open the project in both. Xcode handles the run/debug/profile loop; VS Code handles editing, search, and Git workflows.

---

## Recommendations

### For an iOS / macOS app developer

- **Primary:** Xcode
- **Secondary:** VS Code or Cursor for fast file-level work, large refactors, and editing SPM packages

### For a Swift library / CLI author

- **Primary:** VS Code or Cursor
- **Secondary:** Xcode only for occasional debugging or profiling

### Useful Xcode settings

- **Xcode → Settings → Text Editing → Editing → Show: Line numbers, Code folding ribbon**
- **Xcode → Settings → Behaviors** — customize what happens on test failure, build start, etc.
- **Xcode → Settings → Key Bindings** — increase the muscle-memory speed (cmd-shift-O for "Open Quickly" is essential)
- Enable **Code coverage** under the test scheme settings

### Useful VS Code / Cursor extensions

- **Swift** (publisher `swiftlang`) — required
- **CodeLLDB** — debugging
- **Even Better TOML** — `Package.resolved` is JSON, but Swift packages occasionally include TOML
- **GitLens** — Git history inline

---

## When NOT to use

- **Don't try to ship an iOS app from VS Code.** Build, sign, archive, and upload through Xcode. The CLI (`xcodebuild`, `xcrun altool`) works, but most teams don't need that complexity.
- **Don't keep a `.xcodeproj` in version control when you have a `Package.swift`.** Xcode opens SPM packages directly; the project file is regenerated.
- **Don't use Cursor's AI to write code you don't understand**, especially around concurrency, memory ownership, or Swift 6 strict checking — those are where AI tools most often produce code that compiles but is wrong.

---

## References

- [Xcode — Apple Developer](https://developer.apple.com/xcode/)
- [Swift Extension for VS Code](https://marketplace.visualstudio.com/items?itemName=swiftlang.swift-vscode)
- [`sourcekit-lsp`](https://github.com/swiftlang/sourcekit-lsp) — the language server
- [Cursor](https://cursor.sh/)
- [CodeLLDB extension](https://marketplace.visualstudio.com/items?itemName=vadimcn.vscode-lldb)
- [`swift-format`](https://github.com/swiftlang/swift-format)
- [Instruments — Apple Developer](https://developer.apple.com/tutorials/instruments)
