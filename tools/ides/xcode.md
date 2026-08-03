---
type: concept
tags:
  - tool
  - ide
  - swift
  - macos
  - mobile
related:
  - tools/ides/overview
  - languages/swift/overview
language: null
---
# Xcode

> Apple's official IDE — the only complete toolchain for building, testing, and shipping apps for iOS, macOS, and the rest of Apple's platforms.

---

## What is it?

Xcode is the IDE Apple provides for developing software for its platforms: iOS, iPadOS, macOS, watchOS, tvOS, and visionOS. It bundles the [Swift](../../languages/swift/overview.md) and Objective-C toolchains, Interface Builder and SwiftUI previews for UI, the iOS/watchOS/tvOS simulators, the Instruments profiling suite, and the signing and submission tooling required to publish on the App Store.

It runs only on macOS. For Apple-platform work that touches UI design, on-device debugging, or App Store distribution, Xcode is effectively mandatory.

## Why does it matter?

Apple's build, signing, and submission pipeline is proprietary and only fully supported through Xcode and its command-line tools. You can edit Swift in another editor, but building an app bundle, running it in the simulator or on a device, profiling it with Instruments, and submitting it to the App Store all route through Xcode's toolchain.

It is also where new Apple technologies land first — new Swift versions, SwiftUI features, and OS SDKs ship with Xcode releases. For anyone targeting Apple platforms, mastering it is unavoidable.

## How it works

An Xcode **project** (or a **workspace** grouping several) describes targets, build settings, and dependencies. The build system compiles Swift/Objective-C, links frameworks, and produces an app bundle, which runs in a **simulator** or on a connected device. **Instruments** attaches to a running app to profile CPU, memory, and more. Dependencies come from Swift Package Manager (built in), or CocoaPods/Carthage.

```
Xcode (macOS only)
├── Project / Workspace (targets, build settings)
├── Swift / Objective-C toolchain (clang, swiftc)
├── Interface Builder + SwiftUI previews
├── Simulator (iOS / watchOS / tvOS) + on-device run
├── Instruments (profiling) + Debugger (LLDB)
└── Signing & App Store submission (certificates, provisioning)
```

The bundled `xcodebuild` command-line tool drives the same build for CI, so automated pipelines reproduce local builds.

**Complexity level: Medium.** The editor is approachable, but signing, provisioning profiles, and build settings are a notorious source of friction.

## Getting Started

Install Xcode from the Mac App Store (or Apple's developer downloads), then the command-line tools:

```bash
# after installing Xcode.app
xcode-select --install          # command-line tools
xcodebuild -version             # verify the toolchain

# accept the license if prompted
sudo xcodebuild -license accept
```

Create or open a project, choose a simulator or device from the toolbar, and press **Run** (`Cmd+R`). Manage simulators under **Window → Devices and Simulators**.

| Symptom | Likely cause | Fix |
|---|---|---|
| "Signing for … requires a development team" | No team/profile selected | Set your Apple ID team under **Signing & Capabilities**; enable automatic signing |
| Build fails after an update | Stale derived data | **Product → Clean Build Folder** (`Cmd+Shift+K`); delete DerivedData |
| Simulator won't launch | Simulator runtime missing | Install the runtime in **Settings → Platforms** |
| SwiftUI preview not updating | Preview process crashed | Resume the preview; clean build; check the diagnostics pane |

## Examples

Xcode is configured through its UI and the project file; there is no single hand-edited config. The most common command-line touchpoint is building in CI:

```bash
# build and run tests for a scheme on a simulator
xcodebuild test \
  -scheme MyApp \
  -destination 'platform=iOS Simulator,name=iPhone 15'
```

Swift Package dependencies are declared in a `Package.swift` manifest or added through the Xcode UI; provisioning and capabilities are managed in the Signing & Capabilities tab, documented by Apple rather than reproduced here.

## When to use

- Any development targeting Apple platforms that requires UI tools, on-device debugging, profiling, or App Store submission.
- SwiftUI and UIKit app development, where previews and Interface Builder live.
- Building and signing release artefacts for distribution.

## When NOT to use

- Editing Swift as *part* of a cross-platform or server-side project where a lighter editor ([VS Code](vscode.md) with the Swift extension) is more convenient — though you'll still need Xcode's toolchain to build Apple apps.
- Non-Apple development — Xcode has no role outside Apple's ecosystem.
- Any non-macOS machine, since Xcode does not run elsewhere.

## References

- [Xcode documentation](https://developer.apple.com/documentation/xcode)
- [Swift.org](https://www.swift.org/)
