---
type: concept
tags:
  - language
  - lua
  - tool
related:
  - languages/lua/installation
  - languages/lua/modules-and-luarocks
  - languages/lua/testing
language: "lua"
---
# Lua Toolchain

> The set of command-line tools around Lua — the `lua` interpreter, the `luac` compiler, LuaJIT, and the community linter, formatter, and package manager.

---

## What is it?

Unlike Go or Rust, Lua does not ship a large first-party toolchain. The core distribution provides just two programs — the `lua` interpreter and the `luac` bytecode compiler — plus LuaJIT as a separate high-performance interpreter/compiler. Everything else (dependency management, linting, formatting, testing) comes from the community: LuaRocks, luacheck, StyLua, and busted. Together they form the practical Lua toolchain.

---

## Why does it matter?

Because the core is minimal, a productive Lua setup is something you assemble. Knowing which tool does what — that `luac` precompiles to bytecode, that `luacheck` catches undefined globals a dynamically typed language would otherwise miss at runtime, that StyLua enforces one style — is what turns a bare interpreter into a maintainable development environment. Getting the linter and formatter into CI is especially valuable in Lua, where there is no compiler to reject mistakes.

---

## How it works

### The `lua` interpreter

Runs a script, evaluates an expression, or opens a REPL.

```bash
lua script.lua              # run a file
lua script.lua arg1 arg2    # args available in the global 'arg' table
lua -e 'print(1 + 2)'       # evaluate an expression
lua -i script.lua           # run, then drop into an interactive REPL
lua                         # start the REPL
```

The `-l` flag requires a module before running, handy for preloading:

```bash
lua -l socket -e 'print(socket._VERSION)'
```

---

### `luac` — the bytecode compiler

Precompiles Lua source into bytecode. This speeds startup (no parse step), lets you ship without source, and reports syntax errors without running the code.

```bash
luac -o script.luac script.lua   # compile to bytecode
luac -p script.lua                # parse only: report syntax errors, produce no output
lua script.luac                   # run the compiled chunk
```

Bytecode is **not portable** across Lua versions or across word sizes/endianness — recompile per target.

---

### LuaJIT

A drop-in faster interpreter (compatible with Lua 5.1) that JIT-compiles hot code and offers the `ffi` library for calling C directly.

```bash
luajit script.lua           # run under the JIT
luajit -b script.lua out.o  # produce an object file to link into a C program
luajit -jv script.lua       # verbose JIT trace info (which loops compiled)
```

Reach for LuaJIT when performance matters and the host permits it; stay on reference Lua when you need 5.2/5.3/5.4 language features.

---

### LuaRocks — package manager

Installs modules, resolves dependencies, and builds projects from rockspecs. Covered in depth in [Modules and LuaRocks](modules-and-luarocks.md).

```bash
luarocks install penlight        # install a rock
luarocks list                    # installed rocks
luarocks make                    # build/install the rockspec in the current dir
eval "$(luarocks path)"          # export LUA_PATH/LUA_CPATH so 'lua' finds rocks
```

---

### luacheck — linter / static analysis

`luacheck` is the standard linter. It catches the mistakes a dynamic language hides: **undefined globals**, unused variables, shadowing, and accidental global assignments (the missing-`local` bug).

```bash
luarocks install luacheck
luacheck src spec                # lint directories
luacheck --std lua54 src         # assume Lua 5.4 standard globals
```

Configure via `.luacheckrc` (see [Project Setup](project-setup.md)). Run it in CI — it is the closest thing Lua has to compiler diagnostics.

---

### StyLua — formatter

`StyLua` is an opinionated, deterministic formatter (the `gofmt` of Lua), widely used in the Neovim ecosystem.

```bash
# Install a release binary or: cargo install stylua
stylua src/                      # format in place
stylua --check src/              # exit non-zero if any file is unformatted (CI mode)
```

Configure with `stylua.toml` (indent type, column width, quote style).

---

### busted — test runner

The community test framework; see [Testing](testing.md).

```bash
busted                           # discover and run spec/**/*_spec.lua
busted --coverage                # record data for luacov
```

---

## Examples

### A typical local check-and-run loop

```bash
luacheck src spec        # 1. static analysis
stylua --check src       # 2. formatting gate
busted                   # 3. tests
lua src/main.lua         # 4. run
```

### A minimal CI pipeline (shell)

```bash
set -e
eval "$(luarocks path)"
luacheck src spec
stylua --check src
busted --coverage
luacov
```

---

## When to use

- `lua` / `luajit` — run scripts and REPL; pick LuaJIT for speed, reference Lua for newer language features
- `luac` — precompile for faster startup or to distribute without source
- `luacheck` — always, in CI: it substitutes for the compiler Lua lacks
- `StyLua` — to keep formatting consistent and out of code review
- `LuaRocks` — for any project with dependencies
- `busted` — for tests

## When NOT to use

- Do not ship `luac` bytecode across different Lua versions or architectures — it is not portable
- Do not treat LuaJIT as identical to reference Lua — it tracks 5.1 semantics, not 5.4
- Do not skip `luacheck` in CI — without it, undefined-global and missing-`local` bugs reach runtime
- Do not hand-format when StyLua exists — it removes an entire class of review comments

---

## References

- [Lua 5.4 Reference Manual — the standalone `lua` interpreter](https://www.lua.org/manual/5.4/manual.html#7)
- [Lua 5.4 Reference Manual — `luac`](https://www.lua.org/manual/5.4/luac.html)
- [LuaJIT — running](https://luajit.org/running.html)
- [luacheck — documentation](https://luacheck.readthedocs.io/)
- [StyLua — GitHub](https://github.com/JohnnyMorganz/StyLua)
- [LuaRocks — home](https://luarocks.org/)
