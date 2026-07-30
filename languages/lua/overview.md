---
type: concept
tags:
  - language
  - lua
  - overview
related:
  - languages/lua/paradigms
  - languages/lua/embedding-and-c-api
language: "lua"
---
# Lua Overview

> Lua is a small, fast, embeddable scripting language designed to be dropped into a larger host application written in C.

---

## What is it?

Lua is a lightweight, dynamically typed scripting language created in 1993 by Roberto Ierusalimschy, Luiz Henrique de Figueiredo, and Waldemar Celes at PUC-Rio in Brazil. The name means "moon" in Portuguese.

Lua was designed from the start to be **embedded** inside programs written in other languages, most commonly C and C++. Rather than being a standalone platform, it ships as a small library (roughly 30k lines of C, a few hundred kilobytes compiled) that a host application links against and drives through a well-defined C API. It has one universal data structure — the table — dynamic typing, automatic memory management with an incremental garbage collector, and first-class functions with proper closures.

---

## Why does it matter?

Lua occupies a niche almost no other language fills as well: it is the **glue and configuration layer** for applications that need a scripting brain without a heavyweight runtime. Because the interpreter is tiny, portable ANSI C, it runs everywhere a C compiler exists — from game consoles to routers to microcontrollers.

Its design philosophy is deliberate minimalism, similar in spirit to Go's but taken further. The language has a handful of concepts (values and types, tables, functions, metatables, coroutines) that combine to express much larger ideas. There is no built-in class system, no module keyword after 5.1, and a standard library small enough to read in an afternoon. What you do not get from the core, you build from tables and metatables — or you get from the host.

This smallness is exactly why Lua became the de facto embedded language for games (World of Warcraft, Roblox, many engines), editors (Neovim), and web servers (OpenResty/NGINX).

---

## What can you build with Lua?

| Domain | Fit | Notes |
|---|---|---|
| Embedded scripting / configuration | ⭐ Strong | The original design goal — drive a C/C++ host through the C API |
| Game scripting | ⭐ Strong | Roblox, WoW, Defold, LÖVE, and countless engines embed Lua for gameplay logic |
| Editor / tool scripting | ⭐ Strong | Neovim's built-in language; Redis, Nginx, Wireshark, and Hammerspoon all script in Lua |
| Web (OpenResty / Lapis) | 🟢 Solid | LuaJIT + NGINX (OpenResty) powers high-throughput APIs; Lapis is a mature web framework |
| Data / plugin pipelines | 🟢 Solid | Common as the extension language in analytics and networking tools |
| Numerical / scientific computing | 🟡 Promising with LuaJIT | LuaJIT's FFI and JIT rival C speed; plain Lua (PUC) is slower for heavy math |
| Standalone large applications | 🟠 Limited | Small standard library and dynamic typing make big self-contained apps harder to scale |
| Large typed codebases | 🟠 Limited | No static types in the core; tooling (Lua Language Server) mitigates but cannot fully replace them |

> Not the best fit for: standalone desktop/enterprise applications, machine learning (Python dominates), or large teams that need compiler-enforced static typing.

---

## Key highlights

**Tiny and embeddable**
The entire interpreter compiles to a few hundred kilobytes. It links into a host program as a library and is driven through the C API — Lua rarely runs "on its own" in production.

**One data structure — the table**
Arrays, dictionaries, objects, namespaces, and modules are all tables. Learning tables and their metatables is most of learning Lua.

**First-class functions and closures**
Functions are values. Closures capture upvalues by reference, which makes iterators, callbacks, and object-like abstractions natural.

**Metatables**
A table can have a metatable whose metamethods (`__index`, `__add`, `__call`, …) customize its behavior. This one mechanism gives Lua operator overloading, inheritance, default values, and proxies.

**Coroutines**
Built-in cooperative multitasking. A coroutine can yield and later resume exactly where it left off — the basis for generators, cooperative schedulers, and async-style code without threads.

**Incremental garbage collection**
Automatic memory management with a configurable incremental collector (generational mode added in 5.4).

**LuaJIT — near-native speed**
LuaJIT is a separate, extremely fast just-in-time compiler for Lua 5.1 with a C FFI. For performance-critical embedding (games, OpenResty) it is often the runtime of choice.

---

## Ecosystem highlights

| Area | Notable projects |
|---|---|
| Package manager | LuaRocks (`.rockspec` specs, `luarocks install`) |
| Fast runtime | LuaJIT (JIT compiler + FFI, tracks Lua 5.1) |
| Web | OpenResty (NGINX + LuaJIT), Lapis (web framework), lua-resty-* libraries |
| Testing | busted, luassert, luaunit, luacov |
| Linting / formatting | luacheck, StyLua |
| Databases | LuaSQL, LuaDBI, pgmoon, redis-lua / lua-resty-redis |
| Editor tooling | Lua Language Server (lua-language-server), ZeroBrane Studio |
| Notable hosts | Neovim, Redis, NGINX, Roblox, World of Warcraft, Wireshark |

---

## Versions worth knowing

Unlike most languages, Lua does **not** keep strict backward compatibility across minor versions — 5.1, 5.2, 5.3, and 5.4 are meaningfully different, and code often targets one specific version. Choose deliberately.

| Version | Key changes |
|---|---|
| **Lua 5.1** (2006) | The long-lived baseline. `module()` function, `setfenv`/`getfenv` environments. **The version LuaJIT tracks** — still the most-embedded release because of LuaJIT and games like WoW/Roblox lineage. |
| **Lua 5.2** (2011) | Removed `module()`, replaced function environments with `_ENV` (lexically scoped). Added `goto`, ephemeron tables, and `bit32`. |
| **Lua 5.3** (2015) | Added a real **integer subtype** (distinct from float), native **bitwise operators** (`&`, `\|`, `~`, `<<`, `>>`), integer division (`//`), and the `utf8` library. |
| **Lua 5.4** (2020) | **Generational GC**, to-be-closed variables (`local x <close>`), const variables (`local x <const>`), and a new integer-for-loop semantics. Current stable line. |
| **LuaJIT** | A distinct implementation, not a Lua version. Compatible with **5.1** (plus a few 5.2/5.3 extensions), adds a tracing JIT and the `ffi` library for calling C directly. Development of the mainline is slower, but it remains widely deployed for performance. |

Practical guidance: embed **5.4** for new standalone/host projects; target **5.1 / LuaJIT** when the host (OpenResty, a game engine, Roblox) dictates it.

---

## Design decisions worth knowing

**Everything is built from tables** — there is no separate class, struct, array, or module type. Tables plus metatables cover all of them.

**1-based indexing** — sequences conventionally start at index `1`, not `0`. `#t` gives the length of a sequence. This trips up newcomers from C-family languages.

**`nil` means absence** — assigning `nil` to a table key removes it. There is no separate "null vs undefined". Accessing a missing key returns `nil` rather than erroring.

**Only `false` and `nil` are falsy** — `0` and `""` are truthy. This differs from C and Python.

**`local` is opt-in** — variables are global by default unless declared `local`. Idiomatic Lua declares almost everything `local` for speed and safety.

**No integer/float split until 5.3** — before 5.3 all numbers were doubles. Version choice affects arithmetic semantics.

**Minimal standard library** — string, table, math, io, os, coroutine, and a few others. Anything larger comes from LuaRocks or the host application.

---

## How it works

Lua almost never runs alone — a host program written in C/C++ owns the process and *embeds* the Lua interpreter:

1. **The host creates a Lua state** (`lua_State`) — an isolated interpreter instance holding globals, the stack, and the garbage collector.
2. **Lua source is compiled to bytecode** for a small register-based virtual machine (either ahead of time via `luac` or on load).
3. **The VM executes the bytecode**, managing memory with an incremental garbage collector.
4. **Host and script exchange values through a stack**: C pushes arguments and reads results via the C API (`lua_push*` / `lua_to*`), and Lua can call registered C functions the same way.

Everything above the primitives is built from **tables** plus **metatables**: an object is a table whose metatable's `__index` points at a "class" table, inheritance is a chain of `__index` links, and operators are metamethods. **LuaJIT** replaces the reference VM with a tracing JIT that compiles hot bytecode paths to native code and adds an FFI for calling C without writing binding code.

---

## Examples

A self-contained slice showing tables-as-objects, a metatable for method lookup, a closure-based iterator, and a coroutine:

```lua
-- Table used as a "class" via metatable __index
local Account = {}
Account.__index = Account

function Account.new(balance)
  return setmetatable({ balance = balance or 0 }, Account)
end

function Account:deposit(amount)
  self.balance = self.balance + amount
  return self.balance
end

-- Closure-based iterator
local function counter(n)
  local i = 0
  return function()
    if i < n then i = i + 1; return i end
  end
end

-- Coroutine as a cooperative generator
local function squares(limit)
  return coroutine.wrap(function()
    for i = 1, limit do coroutine.yield(i * i) end
  end)
end

local acc = Account.new(100)
acc:deposit(50)                         -- 150
for step in counter(3) do print(step) end   -- 1 2 3
for sq in squares(3) do print(sq) end        -- 1 4 9
```

---

## When to use

- **Embedding a scripting layer** into a C/C++ host — the original design goal.
- **Game logic and modding** where designers script behavior without rebuilding the engine.
- **Configuration and plugins** for tools that need a safe, tiny extension language (Neovim, Redis, NGINX).
- **High-throughput request handling** via LuaJIT + OpenResty.
- **Resource-constrained targets** (routers, microcontrollers) where a full runtime won't fit.

---

## When NOT to use

- **Large standalone applications** — the minimal standard library and dynamic typing make big self-contained codebases harder to scale.
- **Machine learning / data science** — the ecosystem is thin; Python dominates.
- **Teams needing compiler-enforced static types** — the core has none; external tooling only partly compensates.
- **Cross-version portability without care** — 5.1/5.2/5.3/5.4 differ meaningfully, so pinning a version matters.

---

## References

- [Lua: about](https://www.lua.org/about.html)
- [Lua 5.4 Reference Manual](https://www.lua.org/manual/5.4/)
- [The Evolution of Lua (HOPL paper)](https://www.lua.org/doc/hopl.pdf)
- [Programming in Lua (first edition, online)](https://www.lua.org/pil/)
- [LuaJIT](https://luajit.org/luajit.html)
- [LuaRocks](https://luarocks.org/)
- *Programming in Lua, 4th edition* — Roberto Ierusalimschy (2016)
