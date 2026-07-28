---
type: how-to
tags:
  - language
  - csharp
  - dotnet
  - tool
related:
  - languages/csharp/project-setup
  - languages/csharp/toolchain
  - languages/csharp/ides
language: "csharp"
---
# Installing the .NET SDK

> How to install the .NET SDK, verify it, and manage multiple versions so you can build and run C# projects.

---

## Prerequisites

- A supported OS: Windows, macOS, or a common Linux distribution
- Administrator/sudo rights to install system packages (or use a per-user install)
- A terminal you are comfortable running commands in

> Install the **SDK**, not just the runtime. The SDK includes the `dotnet` CLI, compiler, and build tools needed to develop; the runtime only *runs* published apps.

---

## Steps

### 1. Choose a version

Target the current **LTS** release for production work (see [Overview](overview.md) for the version table). LTS releases get three years of support. Only pick a newer STS release if you need a specific new feature.

### 2. Install the SDK

**macOS (Homebrew):**

```bash
brew install --cask dotnet-sdk
```

**Windows (winget):**

```powershell
winget install Microsoft.DotNet.SDK.10
```

**Linux (example: Ubuntu via apt):**

```bash
sudo apt-get update
sudo apt-get install -y dotnet-sdk-10.0
```

For other distributions, or when you want an exact version, use the official install script:

```bash
curl -sSL https://dot.net/v1/dotnet-install.sh | bash /dev/stdin --channel 10.0
```

The official downloads page always lists the current installers: <https://dotnet.microsoft.com/download>.

### 3. Make `dotnet` available on your PATH

Package-manager installs configure PATH automatically. If you used the install script (which installs to `~/.dotnet` by default), add it to your shell profile:

```bash
export PATH="$PATH:$HOME/.dotnet"
```

### 4. Manage multiple versions (optional)

You can install several SDKs side by side — they coexist. Pin a specific SDK per repository with a `global.json` at the repo root:

```json
{
  "sdk": {
    "version": "10.0.100",
    "rollForward": "latestfeature"
  }
}
```

`dotnet` then uses that SDK version inside the repo regardless of what else is installed.

---

## Verification

```bash
# Show the active SDK version
dotnet --version

# List all installed SDKs and runtimes
dotnet --list-sdks
dotnet --list-runtimes

# Confirm you can build and run
dotnet new console -o hello
cd hello
dotnet run
# → Hello, World!
```

---

## Common issues

| Symptom | Likely cause | Fix |
|---|---|---|
| `dotnet: command not found` | SDK dir not on PATH | Add the install dir (e.g. `~/.dotnet`) to PATH and restart the shell |
| `dotnet --version` shows an older version | An older SDK resolves first, or `global.json` pins it | Check `dotnet --list-sdks`; update PATH order or the `global.json` version |
| Only the runtime installed | Installed the runtime package, not the SDK | Install the `dotnet-sdk` package instead |
| `global.json` version not found | Pinned SDK not installed | Install that SDK version or relax `rollForward` |
| Wrong architecture on Apple Silicon | x64 SDK on an arm64 Mac | Install the arm64 SDK build |

---

## References

- [Download .NET — Microsoft](https://dotnet.microsoft.com/download)
- [Install .NET on Windows, Linux, and macOS — Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/core/install/)
- [dotnet-install scripts — Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-install-script)
- [global.json overview — Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/core/tools/global-json)
