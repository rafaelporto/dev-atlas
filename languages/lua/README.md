# Lua

> A study guide covering Lua's core concepts, paradigms, table-based idioms, tooling, and its anchor use case — embedding in a C host.

---

## Overview & Philosophy

| Article | Description |
|---|---|
| [Overview](overview.md) | What Lua is, applicability by domain, ecosystem highlights, versions (5.1–5.4 + LuaJIT), and key design decisions |
| [Paradigms](paradigms.md) | Procedural, functional, prototype-based OOP, and coroutine-based concurrency — with pros and cons of each |

---

## Core Language

| Article | Description |
|---|---|
| [Types and Tables](types-and-tables.md) | The eight value types, truthiness, 1-based sequences, and tables as the universal data structure |
| [Metatables and OOP](metatables-and-oop.md) | Metamethods, `__index` delegation, and building classes and inheritance from tables |
| [Error Handling](error-handling.md) | `error`/`assert`, protected calls with `pcall`/`xpcall`, error objects, and the `nil, err` convention |
| [Coroutines](coroutines.md) | Cooperative multitasking, generators, and async-style code with `coroutine.*` |

---

## Patterns & Data

| Article | Description |
|---|---|
| [Lua Patterns](lua-patterns.md) | Class via metatables, modules, closures-as-objects, dispatch tables, and memoization |
| [Modules and LuaRocks](modules-and-luarocks.md) | `require`, `package.path`, the module cache, and the LuaRocks package manager and rockspecs |
| [Databases and ORMs](databases-and-orms.md) | LuaSQL, LuaDBI, Lapis models, and Redis — with an honest look at ecosystem maturity |
| [Testing](testing.md) | busted, luassert, and luacov — the community testing stack |

---

## Getting Started

| Article | Description |
|---|---|
| [Installation](installation.md) | Install reference Lua and LuaJIT, and manage multiple versions with asdf/hererocks |
| [Project Setup](project-setup.md) | Project layout, rockspec dependencies, local rock trees, tests, and linting |
| [IDEs and Editors](ides.md) | VS Code + Lua Language Server, ZeroBrane Studio, and Neovim compared |

---

## Toolchain & Embedding

| Article | Description |
|---|---|
| [Toolchain](toolchain.md) | The `lua`/`luac` tools, LuaJIT, luacheck, StyLua, and LuaRocks |
| [Embedding and the C API](embedding-and-c-api.md) | Lua's anchor use case — embedding in a C/C++ host via `lua_State`, the stack, and registering functions |
