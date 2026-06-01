---
type: how-to
tags:
  - language
  - swift
  - mobile
related: []
language: "swift"
---
# How to Install Swift

> Install Swift and the Apple development toolchain on macOS, with notes on managing multiple Swift versions.

---

## Prerequisites

- A Mac running macOS 14 (Sonoma) or later for current Xcode versions
- ~15 GB of free disk space (Xcode is large)
- An [Apple ID](https://appleid.apple.com/) (free; only required if you'll sign apps for devices)

---

## Steps

### 1. Install Xcode

Xcode bundles the Swift compiler, the standard library, the iOS/macOS/watchOS/tvOS SDKs, the iOS Simulator, and Instruments. It is the canonical way to develop for Apple platforms.

From the Mac App Store:

```bash
# Or open the App Store, search for Xcode, click Get
open "macappstores://itunes.apple.com/app/id497799835"
```

Launch Xcode at least once after install — it provisions additional components and prompts for the license agreement.

### 2. Install the Xcode command-line tools

These provide `swift`, `swiftc`, `git`, `clang`, and `xcodebuild` on the command line:

```bash
xcode-select --install
```

If you already have Xcode installed, point the tools at it explicitly:

```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
xcode-select -p   # should print the path above
```

### 3. Verify the Swift toolchain

```bash
swift --version
```

Expected output (version will vary):

```
swift-driver version: 1.115 Apple Swift version 6.0 (swiftlang-6.0.0)
Target: arm64-apple-macosx14.0
```

### 4. (Optional) Install `swiftly` for multiple Swift versions

[`swiftly`](https://www.swift.org/install/macos/swiftly/) is the official Swift toolchain version manager — analogous to `rustup` or `nvm`. Useful when you need to test against multiple Swift releases or use a newer toolchain than the one Xcode ships.

```bash
curl -O https://download.swift.org/swiftly/darwin/swiftly.pkg
installer -pkg swiftly.pkg -target CurrentUserHomeDirectory
~/.swiftly/bin/swiftly init
```

Then in a new shell:

```bash
swiftly list-available           # see published toolchains
swiftly install 6.0              # install Swift 6.0
swiftly use 6.0                  # set the active toolchain
swift --version                  # confirm
```

`swiftly` is most useful for command-line and SPM workflows. For app development inside Xcode, the toolchain that ships with Xcode is what runs your code by default — to use a `swiftly`-installed toolchain in Xcode, select it under **Xcode → Settings → Components → Toolchains** after installing it as an `.xctoolchain`.

### 5. (Optional) Configure VS Code

For editing Swift outside Xcode, install the official VS Code extension:

- Install [VS Code](https://code.visualstudio.com/) if you don't have it
- Install the [Swift extension](https://marketplace.visualstudio.com/items?itemName=swiftlang.swift-vscode) (publisher `swiftlang`)
- The extension uses `sourcekit-lsp`, which ships with the Xcode toolchain — no additional setup typically needed on macOS

### 6. (Optional) Verify with a sample package

```bash
mkdir hello && cd hello
swift package init --type executable
swift run
```

Expected output:

```
Building for debugging...
Build complete!
Hello, world!
```

---

## Verification

```bash
# Compiler installed and version correct
swift --version

# Command-line tools resolved
xcode-select -p
# /Applications/Xcode.app/Contents/Developer

# Xcode can build (this opens the welcome screen the first time)
open -a Xcode

# SPM is wired up
swift package --help | head -1
# OVERVIEW: Perform operations on Swift packages
```

---

## Common issues

| Symptom | Likely cause | Fix |
|---|---|---|
| `xcrun: error: unable to find utility "swift"` | Command-line tools not pointing at Xcode | `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer` |
| `swift --version` shows Xcode's bundled version, not the one from `swiftly` | Toolchain not exported, or Xcode override active | `swiftly use 6.0` and restart the terminal; ensure `~/.swiftly/bin` is in `PATH` before `/usr/bin` |
| Xcode prompts to "install additional components" repeatedly | First-run setup interrupted | Run Xcode with admin rights once; if it persists, try `sudo xcodebuild -runFirstLaunch` |
| iOS Simulator missing | Components not installed | Xcode → Settings → Platforms → install iOS |
| `swiftly: command not found` | `~/.swiftly/bin` not on `PATH` | Add `export PATH="$HOME/.swiftly/bin:$PATH"` to `~/.zshrc` |
| Build fails with "SDK does not contain..." after macOS upgrade | Xcode is older than the SDK headers expect | Update Xcode from the App Store |

---

## References

- [Apple Developer — Download Xcode](https://developer.apple.com/xcode/)
- [Swift.org — Install Swift](https://www.swift.org/install/macos/)
- [`swiftly` — Swift toolchain manager](https://www.swift.org/install/macos/swiftly/)
- [VS Code Swift extension](https://marketplace.visualstudio.com/items?itemName=swiftlang.swift-vscode)
- [Apple Developer — Command Line Tools](https://developer.apple.com/download/all/?q=command%20line%20tools)
