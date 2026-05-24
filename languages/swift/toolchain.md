# Toolchain

> The command-line tools that ship with Swift — build, test, format, debug, and profile — without ever opening Xcode.

---

## What is it?

A Swift toolchain is the set of executables that compile and tool Swift code. The toolchain that ships with Xcode includes:

| Tool | Purpose |
|---|---|
| `swift` | The driver — entry point for `build`, `test`, `run`, `package`, REPL |
| `swiftc` | The compiler — produces object files and executables |
| `swift package` | SPM operations |
| `swift-format` | Official formatter (since Swift 5.8+) |
| `lldb` | Debugger |
| `xcodebuild` | Build Xcode projects from CLI (Apple-specific) |
| `xcrun` | Locate and run developer tools |
| `xcrun simctl` | Control the iOS Simulator |
| `instruments` | Profile applications (UI in Instruments.app) |
| `xcrun altool` / `xcrun notarytool` | App Store / notarization workflows |

Anything you can do in Xcode's GUI maps to a CLI command. CI systems use these exclusively.

---

## Why does it matter?

The CLI is where reproducibility, automation, and CI live. Knowing the toolchain commands lets you:

- Script builds and tests
- Reproduce Xcode behavior in CI (GitHub Actions, Bitrise, Xcode Cloud, Bazel)
- Profile and debug headlessly
- Format and lint as a pre-commit step

---

## How it works

### Building and running

```bash
# Build a package in debug mode
swift build

# Build in release mode
swift build -c release

# Run the package's default executable target
swift run

# Run a specific executable target
swift run MyTool --arg value

# Pass through additional Swift flags
swift build -Xswiftc -warnings-as-errors
swift build -Xcc -fmodules
```

Build products land in `.build/`:

```
.build/
├── debug/        # debug binaries and intermediates
├── release/      # release binaries
└── checkouts/    # cloned dependencies
```

### Testing

```bash
swift test                                  # run all tests
swift test --filter MyLibraryTests          # filter by class/suite
swift test --parallel                       # parallelize across targets
swift test --enable-code-coverage           # produce coverage data
swift test -c release                       # test the release config
```

To export coverage:

```bash
xcrun llvm-cov export \
    .build/debug/MyLibraryPackageTests.xctest/Contents/MacOS/MyLibraryPackageTests \
    -instr-profile=.build/debug/codecov/default.profdata \
    -format=lcov \
    > coverage.lcov
```

### Formatting

```bash
# Format files in place
swift-format format --in-place --recursive Sources/ Tests/

# Lint without writing
swift-format lint --recursive Sources/
```

Configuration goes in `.swift-format` at the repo root (JSON):

```json
{
  "version": 1,
  "lineLength": 120,
  "indentation": { "spaces": 4 },
  "respectsExistingLineBreaks": true
}
```

### Xcode-specific builds

For `.xcodeproj` and `.xcworkspace`:

```bash
# Build a scheme
xcodebuild build -scheme MyApp -destination 'generic/platform=iOS'

# Test
xcodebuild test \
    -scheme MyAppTests \
    -destination 'platform=iOS Simulator,name=iPhone 15,OS=17.0'

# Archive for release
xcodebuild archive \
    -scheme MyApp \
    -configuration Release \
    -archivePath ./build/MyApp.xcarchive
```

`destination` controls which platform/device the build targets. See `xcrun simctl list devices` for available simulators.

### iOS Simulator from CLI

```bash
# List simulators
xcrun simctl list devices available

# Boot a simulator
xcrun simctl boot "iPhone 15"

# Install an app
xcrun simctl install "iPhone 15" path/to/MyApp.app

# Launch
xcrun simctl launch "iPhone 15" com.example.MyApp

# Take a screenshot
xcrun simctl io "iPhone 15" screenshot screen.png

# Reset all simulators
xcrun simctl erase all
```

### Debugging with LLDB

LLDB is the debugger Xcode uses; you can drive it directly:

```bash
swift run MyTool          # in one terminal

# In another:
lldb -p <pid>             # attach to running process
```

Inside LLDB:

| Command | Effect |
|---|---|
| `b MyType.foo` | Set a breakpoint by symbol |
| `b MyFile.swift:42` | Set a breakpoint at a line |
| `c` | Continue |
| `n` | Step over |
| `s` | Step in |
| `p user.name` | Print value (uses Swift's expression evaluator) |
| `po user` | Print "object" — uses the type's `description` |
| `bt` | Backtrace |
| `frame variable` | Print local variables |

For Swift, `p` and `po` use the Swift REPL parser, so most expressions work as written.

### Profiling with Instruments

```bash
# List available templates
instruments -s templates

# Run with the Time Profiler template
instruments -t "Time Profiler" -D trace.trace MyApp.app

# Open the trace
open trace.trace
```

Common templates: `Time Profiler`, `Allocations`, `Leaks`, `System Trace`, `Network`, `SwiftUI`.

### REPL

```bash
swift
# Welcome to Swift version 6.0...
# > let xs = (1...10).map { $0 * 2 }
# xs: [Int] = [2, 4, 6, ..., 20]
```

Useful for quick experiments. Combine with `:type` and `:print` commands.

### Cross-platform builds

`swift build` works on Linux and Windows. For Apple-only frameworks (UIKit, SwiftUI, Core Data) you still need an Apple platform.

```bash
swift build --triple wasm32-unknown-wasi   # via SwiftWasm
swift build --triple arm64-apple-iphoneos  # iOS (requires Xcode toolchain)
```

---

## Examples

### A minimal CI pipeline

```yaml
# .github/workflows/ci.yml (illustrative)
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: macos-14
    steps:
      - uses: actions/checkout@v4
      - run: swift build
      - run: swift test --parallel --enable-code-coverage
      - run: swift-format lint --recursive Sources/ Tests/
```

### Pre-commit format check

`.git/hooks/pre-commit`:

```bash
#!/bin/sh
changed=$(git diff --cached --name-only --diff-filter=ACM | grep '\.swift$')
[ -z "$changed" ] && exit 0
echo "$changed" | xargs swift-format lint
```

### Running the app on a connected device from CLI

```bash
# Build & install
xcodebuild build -scheme MyApp -destination 'platform=iOS,id=<device-udid>'
xcrun devicectl device install app --device <device-udid> path/to/MyApp.app

# Launch
xcrun devicectl device process launch --device <device-udid> com.example.MyApp
```

`devicectl` is the modern replacement for `ios-deploy` (Xcode 15+).

---

## When to reach for the CLI

- **CI/CD pipelines** — `xcodebuild` + `swift test` are the building blocks.
- **Headless test runs** on a fleet of simulators.
- **Pre-commit hooks** (format, lint).
- **Reproducing a colleague's build issue** with a clean checkout.
- **Profiling automated runs** — `instruments` headless.
- **Scripting repeated dev tasks** — booting simulators, resetting state.

---

## When NOT to

- **Day-to-day app dev.** Xcode's run loop with breakpoints and previews is faster than re-running CLI commands.
- **One-off device testing.** Plug in, hit Run in Xcode — the device-deploy CLI is more setup than it's worth for occasional runs.
- **GUI Instruments work.** The CLI captures traces; analysis is still much easier in the GUI.

---

## References

- [Swift.org — Swift Package Manager](https://www.swift.org/documentation/package-manager/)
- [`swift-format`](https://github.com/swiftlang/swift-format)
- [LLDB Quick Start Guide — Apple Developer](https://lldb.llvm.org/use/tutorial.html)
- [Instruments Help — Apple Developer](https://help.apple.com/instruments/)
- [`xcodebuild` man page](https://developer.apple.com/library/archive/technotes/tn2339/_index.html)
- [`simctl` documentation](https://developer.apple.com/library/archive/documentation/IDEs/Conceptual/iOS_Simulator_Guide/InteractingwiththeiOSSimulator/InteractingwiththeiOSSimulator.html)
- [What's new in Xcode — annual WWDC sessions](https://developer.apple.com/videos/all-videos/?q=what's%20new%20in%20xcode)
