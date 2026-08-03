---
type: concept
tags:
  - tool
  - ide
  - go
related:
  - tools/ides/overview
  - languages/go/overview
language: null
---
# GoLand

> JetBrains' IDE dedicated to Go, offering deep, Go-aware analysis, refactoring, and tooling out of the box.

---

## What is it?

GoLand is a commercial IDE built specifically for the [Go](../../languages/go/overview.md) language, on the same IntelliJ platform as JetBrains' other IDEs. Everything a Go developer needs is bundled and preconfigured: code completion, refactoring, a debugger, a test runner with coverage, and integrations for Go modules, `go vet`, linters, and common tools.

Where a general editor requires installing the Go extension and the `gopls` language server, GoLand ships Go intelligence as a native, first-class capability.

## Why does it matter?

GoLand's value is depth and zero-setup. Its analysis understands Go idioms — interface implementations, struct tags, goroutine usage — and its refactorings (rename, extract, change signature) are Go-aware and reliable across a whole module. For developers who work in Go daily and want the strongest tooling without assembling it, it is the most capable option.

The trade-off is that it is paid and single-language: for a polyglot repository, running GoLand alongside other IDEs is less convenient than one extensible editor.

## How it works

Like all IntelliJ-platform IDEs, GoLand builds and maintains a semantic index of the project, which drives inspections and refactorings. It integrates the Go toolchain directly — the configured **Go SDK**, module resolution, the `dlv` debugger, and the test framework — and surfaces their results in the UI.

```
GoLand
├── Project index (Go-aware semantic model)
│     ├── Inspections (vet, idiom checks, linters)
│     └── Refactorings (rename, extract, change signature)
├── Go toolchain (go build/test, modules, gopls-equivalent analysis)
├── Debugger (Delve / dlv)
└── Test runner + coverage
```

Because it uses the standard `go` toolchain, builds and tests behave identically on the command line and in CI.

**Complexity level: Medium.** Productive quickly for Go developers; mastering the full feature set takes time.

## Getting Started

Install via JetBrains Toolbox or directly, with Go installed:

```bash
# macOS
brew install --cask goland

# Go toolchain (if not already installed)
brew install go
```

Open a module folder (containing `go.mod`); GoLand detects the Go SDK and indexes the project. Configure the SDK under **Settings → Go → GOROOT** if it isn't auto-detected.

| Symptom | Likely cause | Fix |
|---|---|---|
| Unresolved imports on a valid module | GOROOT/GOPATH or modules misconfigured | Set the Go SDK; enable Go modules integration in **Settings → Go** |
| Debugger won't start | Delve missing or out of date | Let GoLand install/update `dlv`; ensure the build compiles |
| Formatting differs from CI | Not using `gofmt`/`goimports` on save | Enable **File Watchers** or the built-in `gofmt`/`goimports` on save |
| Slow indexing | Large module or vendored deps | Wait for indexing; exclude generated/vendored directories |

## Examples

GoLand is configured through its UI and per-project files. Run configurations, code style, and file watchers can be committed under `.idea/` for the team. The key on-save behaviours to enable:

```
Settings → Tools → File Watchers → add "goimports"   (format + fix imports on save)
Settings → Go → Build Tags & Vendoring               (match your build environment)
```

Linters (`golangci-lint`) integrate as external tools/inspections and are configured via their own config file (`.golangci.yml`), referenced in that tool's documentation.

## When to use

- Full-time Go development, especially on large modules where deep analysis pays off.
- Teams that want strong Go refactoring and debugging with no manual editor assembly.
- Test-heavy Go work benefiting from the integrated runner and coverage.

## When NOT to use

- Polyglot repositories where a single extensible editor ([VS Code](vscode.md), [Neovim](neovim.md) with `gopls`) covers Go plus everything else.
- Occasional Go edits that don't justify a paid, single-language IDE.
- Constrained environments where a lighter editor is preferable.

## References

- [GoLand documentation](https://www.jetbrains.com/help/go/)
- [Go documentation](https://go.dev/doc/)
