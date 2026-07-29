---
type: concept
tags:
  - language
  - go
  - webassembly
  - frontend
related:
  - languages/go/overview
  - software-engineering/architecture/frontend/webassembly
  - languages/javascript/webassembly
  - languages/csharp/webassembly
language: "go"
---

# Go and WebAssembly

> Compiling Go to WebAssembly — targeting the browser with the standard toolchain, calling between Go and JavaScript, and using TinyGo or WASI for smaller, portable modules.

---

## What is it?

Go can compile to **WebAssembly (Wasm)**, producing a `.wasm` module that runs in the browser (or other Wasm hosts) instead of as a native binary. The standard Go toolchain targets the browser via `GOOS=js GOARCH=wasm`, using the `syscall/js` package to talk to JavaScript. Alternatively, **TinyGo** produces much smaller modules and can target **WASI** for server/edge runtimes. For background on Wasm itself, see the [WebAssembly architecture article](../../software-engineering/architecture/frontend/webassembly.md).

---

## Why does it matter?

Go is a natural fit for the compute-heavy work Wasm exists for — its static typing and compiled nature give predictable performance, and its large standard library and existing packages can run in the browser without a rewrite. Teams already writing Go on the backend can share logic (validation, parsing, business rules, crypto) with the frontend by compiling it to Wasm, avoiding a duplicate JavaScript implementation. The main trade-off is **module size**: the standard toolchain bundles the Go runtime and garbage collector, producing multi-megabyte modules — which is exactly the problem TinyGo addresses.

---

## How it works

### Two toolchains, two targets

```
   ┌── standard Go (GOOS=js GOARCH=wasm) ──► large .wasm, full stdlib, browser + syscall/js
   │
   └── TinyGo ──┬── target wasm ──► small .wasm for the browser
                └── target wasi ──► portable module for server/edge (WASI)
```

- **Standard Go** — maximum compatibility with the language and standard library; large output; uses `syscall/js` for browser interop.
- **TinyGo** — a separate compiler optimized for small binaries and embedded/Wasm targets; dramatically smaller modules, with some stdlib/reflection limitations.

### Building for the browser (standard toolchain)

```bash
# Compile to a Wasm module
GOOS=js GOARCH=wasm go build -o main.wasm ./cmd/web

# Copy the JS support shim that instantiates the module
cp "$(go env GOROOT)/lib/wasm/wasm_exec.js" .
```

The `wasm_exec.js` glue is required: it sets up the imports the Go runtime needs and provides the `Go` class used to run the module.

### Loading it from the page

```html
<script src="wasm_exec.js"></script>
<script>
  const go = new Go();
  WebAssembly.instantiateStreaming(fetch("main.wasm"), go.importObject)
    .then((result) => go.run(result.instance));
</script>
```

### Calling between Go and JavaScript

The `syscall/js` package exposes JS globals to Go and lets Go export functions to JS:

```go
//go:build js && wasm

package main

import "syscall/js"

// A Go function callable from JavaScript.
func add(this js.Value, args []js.Value) any {
    return args[0].Int() + args[1].Int()
}

func main() {
    // Expose add() to JS as globalThis.goAdd
    js.Global().Set("goAdd", js.FuncOf(add))

    // Keep the Go program alive so exported funcs remain callable.
    select {}
}
```

```javascript
// after go.run(...)
console.log(goAdd(2, 3)); // 5
```

The `select {}` idiom blocks `main` forever so the runtime stays available for JS calls — otherwise the module would exit immediately.

### The interop boundary

As with all Wasm, crossing the JS↔Go boundary has a cost: values are marshaled through `js.Value`, and Go cannot touch the DOM directly — every DOM access goes through `syscall/js`. Prefer **coarse-grained** calls (hand off a whole task) over chatty per-element calls.

---

## Examples

A TinyGo build targeting WASI for a server/edge runtime (no browser, no `syscall/js`):

```bash
# Small, portable module using standard stdin/stdout via WASI
tinygo build -o app.wasm -target=wasi ./cmd/app
```

```go
// cmd/app/main.go — plain Go; WASI provides the host interface
package main

import "fmt"

func main() {
    fmt.Println("Hello from Go compiled to WASI Wasm")
}
```

Run it in any WASI runtime (e.g. Wasmtime): `wasmtime app.wasm`.

---

## When to use

- Sharing existing Go logic (validation, parsing, crypto, business rules) with a web frontend without rewriting it in JavaScript.
- Compute-heavy, CPU-bound work in the browser where Go's performance and libraries help.
- Portable server/edge modules via TinyGo + WASI, where a small, sandboxed Go module fits a plugin or function runtime.

## When NOT to use

- DOM-heavy UI work — Go can't touch the DOM directly and pays the interop tax; use a JS/TS framework for the UI.
- Size-sensitive pages using the standard toolchain — multi-megabyte modules hurt load time; reach for TinyGo or reconsider.
- Small, simple computations where JavaScript is fast enough — the module download and interop cost outweigh the benefit.

## References

- Go Team. [WebAssembly — Go Wiki](https://go.dev/wiki/WebAssembly). go.dev.
- Go Team. [`syscall/js` package](https://pkg.go.dev/syscall/js). pkg.go.dev.
- TinyGo. [Using WebAssembly](https://tinygo.org/docs/guides/webassembly/). tinygo.org.
