---
type: concept
tags:
  - operating-system
  - windows
  - overview
related:
  - operating-systems/windows/shell
  - operating-systems/windows/shortcuts
  - operating-systems/linux/overview
language: null
---

# Windows Overview

> Windows is Microsoft's desktop and server operating system, built on the NT kernel — the most widely used desktop OS, and increasingly a first-class development platform thanks to WSL.

---

## What is it?

Windows is Microsoft's proprietary OS family for PCs and servers. Under the hood it runs the **Windows NT kernel**, a design distinct from Unix: a hybrid kernel with its own driver model, a registry-based configuration store, and a native API (Win32) rather than POSIX. The consumer line (Windows 10/11) and the server line (Windows Server) share this NT core.

For developers, the headline of the last few years is **WSL (Windows Subsystem for Linux)**, which runs a real Linux kernel and userland alongside Windows — closing much of the historical gap with Unix workstations.

---

## Why does it matter?

Windows dominates desktop market share, so it's the OS most end users run — which matters for anyone shipping desktop software, games, or cross-platform apps. For engineering workstations it used to be the awkward choice for Unix-style workflows; WSL 2 changed that by providing a genuine Linux environment without dual-booting or a full VM.

---

## How it works

Windows differs from Unix in a few structural ways worth knowing:

- **Drive letters, not a single root.** Paths look like `C:\Users\name`, with backslashes; there is no single `/` tree. Each volume is a letter.
- **The Registry.** A hierarchical database (`HKEY_LOCAL_MACHINE`, `HKEY_CURRENT_USER`, …) holds system and app configuration, in place of Unix's `/etc` text files.
- **Win32 API + NT kernel.** Applications call the Win32/Windows API; the NT kernel handles processes, memory, and I/O beneath it.
- **Services** are managed by the Service Control Manager (the rough analogue of systemd/launchd).
- **WSL 2** runs an actual Linux kernel in a lightweight utility VM. You get `bash`, `apt`, and native Linux tooling, with interop to Windows files and executables. It is the recommended path for Unix-style development on Windows.

```
Windows (NT kernel, Win32, Registry, C:\ ...)
        │
        └── WSL 2 ──▶ real Linux kernel + distro userland (bash, apt, ...)
```

---

## Examples

Identify the system from a terminal:

```powershell
# PowerShell: OS name, version, build
Get-ComputerInfo | Select-Object OsName, OsVersion, OsBuildNumber

# Classic command prompt equivalent
ver
systeminfo | findstr /B /C:"OS Name" /C:"OS Version"
```

Check and launch WSL:

```powershell
wsl --status
wsl --list --verbose      # installed distros and their WSL version
wsl                       # drop into the default Linux distro
```

---

## When to use

- The target users run Windows — desktop apps, games, or enterprise software.
- You need Windows-only tooling (certain enterprise, CAD, or .NET desktop workflows).
- You want one machine that runs Windows apps and, via WSL, a Linux dev environment.

## When NOT to use

- You need Apple's toolchain (Xcode) — that's macOS-only.
- You want a native Unix environment as the primary OS — Linux or macOS fit better, though WSL narrows the gap.
- Lightweight server/container hosts — Linux is the standard and leaner choice.

---

## References

- [Windows documentation (Microsoft Learn)](https://learn.microsoft.com/en-us/windows/)
- [Windows kernel-mode architecture (Microsoft Learn)](https://learn.microsoft.com/en-us/windows-hardware/drivers/kernel/)
- [Windows Subsystem for Linux documentation](https://learn.microsoft.com/en-us/windows/wsl/)
- [Windows Registry overview (Microsoft Learn)](https://learn.microsoft.com/en-us/windows/win32/sysinfo/registry)
