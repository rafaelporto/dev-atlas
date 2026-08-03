---
type: concept
tags:
  - operating-system
  - windows
  - shell
  - cli
related:
  - operating-systems/windows/overview
  - operating-systems/windows/shortcuts
  - operating-systems/linux/shell
language: null
---

# Windows Shells & Commands

> Windows offers three command environments — the legacy **Command Prompt (cmd)**, the modern object-oriented **PowerShell**, and a full **Linux shell via WSL** — plus the Windows Terminal app that hosts them all.

---

## What is it?

Unlike macOS and Linux, which converge on one Unix shell family, Windows has several distinct command environments:

- **Command Prompt (`cmd.exe`)** — the legacy shell. Simple, batch-file (`.bat`/`.cmd`) scripting, limited.
- **PowerShell** — the modern default for administration and scripting. Unusually, it passes **.NET objects** through the pipeline rather than plain text.
- **WSL** — a real Linux shell (usually bash) for Unix-style workflows.

**Windows Terminal** is the recommended host application: a tabbed terminal that can open cmd, PowerShell, and WSL sessions side by side.

---

## Why does it matter?

Choosing the right environment saves effort: PowerShell for anything administrative on Windows, WSL for Unix-style development, and cmd only for legacy scripts. PowerShell's object pipeline is the key conceptual difference from Unix shells — you filter and select **properties**, not text columns, so there's less parsing and fewer fragile string operations.

---

## How it works

**PowerShell's object pipeline.** Where a Unix shell pipes bytes and you slice columns with `awk`/`cut`, PowerShell pipes structured objects and you access named properties:

```powershell
# Unix mental model: text out, then parse columns
# PowerShell: objects out, then select properties
Get-Process | Where-Object { $_.CPU -gt 100 } | Sort-Object CPU -Descending | Select-Object -First 5 Name, CPU
```

**Common commands, side by side** (PowerShell has Unix-like aliases, but the underlying cmdlets are `Verb-Noun`):

| Task | Command Prompt (cmd) | PowerShell (cmdlet) |
|---|---|---|
| List directory | `dir` | `Get-ChildItem` (alias `ls`, `dir`) |
| Change directory | `cd` | `Set-Location` (alias `cd`) |
| Print file | `type file` | `Get-Content file` (alias `cat`) |
| Copy / move / delete | `copy` / `move` / `del` | `Copy-Item` / `Move-Item` / `Remove-Item` |
| Find text | `findstr pattern` | `Select-String pattern` (alias `grep`-like) |
| Environment var | `set VAR=x` / `echo %VAR%` | `$env:VAR = 'x'` / `$env:VAR` |
| Show processes | `tasklist` | `Get-Process` (alias `ps`) |
| Kill process | `taskkill /PID n` | `Stop-Process -Id n` |
| Network config | `ipconfig` | `Get-NetIPConfiguration` |

**Paths** use backslashes and drive letters (`C:\Users\name`), though PowerShell also accepts forward slashes. Scripts are `.ps1`; running them may require setting an execution policy (`Set-ExecutionPolicy`).

---

## Examples

```powershell
# Find the 5 processes using the most memory
Get-Process | Sort-Object WorkingSet -Descending | Select-Object -First 5 Name, WorkingSet

# Which process is listening on port 8080?
Get-NetTCPConnection -LocalPort 8080 | Select-Object OwningProcess, State

# Run a Linux tool from PowerShell via WSL, no context switch
wsl grep -rn "TODO" ./src
```

```bat
:: A minimal cmd batch file (legacy)
@echo off
if exist build\ (
  echo build folder found
) else (
  mkdir build
)
```

---

## When to use

- **PowerShell** — Windows administration, automation, and scripting (its object pipeline shines).
- **WSL** — Unix-style development: git, Node, Python, containers with a Linux mental model.
- **cmd** — only for maintaining existing `.bat`/`.cmd` scripts.
- **Windows Terminal** — as the host for all of the above.

## When NOT to use

- Don't write new automation in `cmd` batch — PowerShell is far more capable.
- Don't expect Unix text-parsing habits to map onto PowerShell — work with object properties instead.
- Don't run heavy Linux workflows against Windows-mounted paths from WSL — keep files in the Linux filesystem for performance.

---

## References

- [PowerShell documentation (Microsoft Learn)](https://learn.microsoft.com/en-us/powershell/)
- [Windows Commands reference (Microsoft Learn)](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/windows-commands)
- [Windows Terminal documentation](https://learn.microsoft.com/en-us/windows/terminal/)
- [Get started with WSL](https://learn.microsoft.com/en-us/windows/wsl/setup/environment)
