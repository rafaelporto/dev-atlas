# Go

> A study guide covering Go's core concepts, paradigms, idioms, and recurring patterns.

---

## Overview & Philosophy

| Article | Description |
|---|---|
| [Overview](overview.md) | What Go is, best uses, ecosystem highlights, and key design decisions |
| [Paradigms](paradigms.md) | Which paradigms Go supports — OOP, functional, concurrent — and pros/cons of each |

---

## Core Language

| Article | Description |
|---|---|
| [Types and Interfaces](types-and-interfaces.md) | Structs, interfaces, embedding, zero values, pointer vs value receivers |
| [Error Handling](error-handling.md) | Errors as values, sentinel errors, wrapping with `%w`, `errors.Is` / `errors.As` |
| [Packages and Modules](packages-and-modules.md) | Module system, package visibility, `internal/`, workspace mode |

---

## Concurrency

| Article | Description |
|---|---|
| [Concurrency](concurrency.md) | Goroutines, channels, select, WaitGroup, Mutex, fan-out/fan-in |
| [Context](context.md) | Cancellation, deadlines, value propagation via `context.Context` |

---

## Patterns & Testing

| Article | Description |
|---|---|
| [Go Patterns](go-patterns.md) | GoF adaptations and Go-idiomatic patterns with usage frequency |
| [Functional Options](functional-options.md) | The Functional Options pattern for flexible API configuration |
| [Testing](testing.md) | Table-driven tests, subtests, benchmarks, fuzz testing |

---

## Toolchain

| Article | Description |
|---|---|
| [Toolchain](toolchain.md) | `go build`, `go test`, `go vet`, `gofmt`, race detector, `pprof` |
