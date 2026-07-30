---
type: concept
tags:
  - language
  - lua
  - procedural
  - functional
  - prototype-based
related:
  - languages/lua/metatables-and-oop
  - languages/lua/coroutines
  - languages/lua/overview
language: "lua"
---
# Paradigms in Lua

> Lua is a small multi-paradigm language: procedural at its core, functional through first-class closures, and object-oriented through prototype-based tables rather than classes.

---

## What is it?

A programming paradigm is a style of structuring code. Lua is intentionally **multi-paradigm but unopinionated about objects**: it gives you a minimal set of mechanisms — functions, tables, closures, metatables, and coroutines — and lets you assemble whatever paradigm you need on top of them.

Crucially, Lua does not ship a class system. Object-oriented programming in Lua is *prototype-based*: objects delegate to other objects (via metatables) instead of instantiating from classes. Understanding which paradigms Lua supports, and how each one is expressed with tables, is the core of writing idiomatic Lua.

---

## Why does it matter?

Lua's designers chose to provide *mechanisms, not policy*. There is no single "correct" object model; the manual even shows several. This freedom is powerful but means idioms vary between codebases. Knowing the paradigms Lua supports — and that OOP is delegation, not instantiation — prevents developers from trying to force a Java- or Python-style class hierarchy onto a language that models objects differently.

---

## Paradigms supported

### 1. Procedural (primary paradigm)

Lua is fundamentally procedural. Code is functions operating on values, executed top to bottom. This is how most scripts and the standard library are written.

```lua
local function calculate_total(prices, tax_rate)
  local subtotal = 0
  for _, price in ipairs(prices) do
    subtotal = subtotal + price
  end
  return subtotal * (1 + tax_rate)
end
```

**Pros with Lua:**
- Simple, readable, and fast — the interpreter is optimized for this style
- `local` functions and variables are the idiomatic default and are faster than globals
- Maps directly onto the C host: a Lua script is often just a sequence of calls into host functions

**Cons with Lua:**
- Globals are the default; forgetting `local` leaks state into the shared global table `_G`
- Large procedural programs need discipline to organize (modules help — see [Modules and LuaRocks](modules-and-luarocks.md))

---

### 2. Functional (well supported)

Functions are first-class values with proper lexical closures. Lua supports higher-order functions, closures capturing *upvalues* by reference, and functions stored in tables — the backbone of many Lua idioms.

```lua
-- Higher-order function
local function map(t, f)
  local result = {}
  for i, v in ipairs(t) do
    result[i] = f(v)
  end
  return result
end

-- Closure capturing an upvalue by reference
local function make_counter()
  local n = 0
  return function()
    n = n + 1
    return n
  end
end

local next_id = make_counter()
print(next_id(), next_id()) -- 1  2
```

**What Lua supports from FP:**
- First-class and higher-order functions
- Closures with true upvalue capture (shared between closures over the same variable)
- Tail calls with **proper tail-call optimization** — `return f(x)` reuses the stack frame, so deep recursion does not overflow
- Functions as table values, enabling dispatch tables and modules

**What Lua does not provide:**
- No pattern matching on data (use `if`/`elseif` or dispatch tables)
- No built-in immutable data structures (tables are mutable; you can freeze via `__newindex`)
- No algebraic data types or lazy evaluation

**Pros with Lua:**
- Proper TCO makes recursive and continuation-style code safe
- Closures make iterators, callbacks, and memoization concise
- Dispatch tables (a table mapping keys to functions) replace large `switch` statements

**Cons with Lua:**
- No standard `map`/`filter`/`reduce` — you write or import them
- Heavy functional pipelines allocate intermediate tables, which pressures the GC

---

### 3. Object-Oriented — prototype-based (idiomatic, but assembled by hand)

Lua has **no classes**. OOP is built from tables and the `__index` metamethod: an object is a table that *delegates* lookups of missing keys to a prototype table. That prototype plays the role of a "class"; inheritance is just a chain of prototypes.

```lua
local Animal = {}
Animal.__index = Animal

function Animal.new(name)
  return setmetatable({ name = name }, Animal)
end

function Animal:speak()          -- ':' adds an implicit 'self' parameter
  return self.name .. " makes a sound"
end

-- Inheritance: Dog's prototype falls back to Animal
local Dog = setmetatable({}, { __index = Animal })
Dog.__index = Dog

function Dog.new(name)
  local self = Animal.new(name)
  return setmetatable(self, Dog)
end

function Dog:speak()
  return self.name .. " barks"
end

local d = Dog.new("Rex")
print(d:speak()) -- Rex barks
```

**What Lua supports from OOP:**
- Encapsulation via closures (private upvalues) or module-local tables
- Polymorphism via duck typing — any table with the right method works
- Delegation-based inheritance through chained `__index` metatables
- The colon syntax `obj:method(args)` as sugar for `obj.method(obj, args)`

**What Lua omits:**
- Built-in class/interface keywords
- Access modifiers (`private`/`public`)
- A single canonical object model — the manual shows several, and libraries differ

**Pros with Lua:**
- Prototype delegation is flexible: you can change an object's behavior at runtime by swapping its metatable
- No boilerplate class machinery to learn — it is all tables

**Cons with Lua:**
- Every codebase reinvents its class helper (or imports one like `middleclass`)
- The `.` vs `:` distinction is a frequent source of `attempt to index nil` bugs
- No compiler-enforced contracts — mistakes surface at runtime

See [Metatables and OOP](metatables-and-oop.md) for the full treatment.

---

### 4. Cooperative concurrency via coroutines

Lua does not have OS threads or preemptive concurrency in the core. Instead it offers **coroutines**: cooperative, single-threaded units of execution that explicitly `yield` control. This underpins generators, cooperative schedulers, and async-style I/O in frameworks like OpenResty.

```lua
local function producer()
  for i = 1, 3 do
    coroutine.yield(i)     -- hand a value back to the resumer
  end
end

local co = coroutine.create(producer)
print(coroutine.resume(co)) -- true  1
print(coroutine.resume(co)) -- true  2
```

**Pros with Lua:**
- No data races — only one coroutine runs at a time, switching only at explicit `yield` points
- Lightweight — far cheaper than OS threads
- Natural fit for generators and event-loop-driven I/O

**Cons with Lua:**
- Cooperative only: a coroutine that never yields blocks everything (no preemption)
- The core provides no scheduler — you or a framework must build one
- No parallelism across CPU cores from coroutines alone

See [Coroutines](coroutines.md) for the full treatment.

---

## Summary

| Paradigm | Support level | Idiomatic in Lua? |
|---|---|---|
| Procedural | Full | Yes — the default style |
| Functional | Strong (closures, TCO) | Yes — for callbacks, iterators, dispatch |
| Object-Oriented (prototype-based) | Assembled from tables + `__index` | Yes — but hand-rolled; no classes |
| Concurrent (coroutines) | Cooperative, single-threaded | Yes — for generators and async I/O |

The idiomatic Lua approach is to **default to procedural code with `local`**, **reach for closures and dispatch tables where functional style clarifies intent**, **build objects from tables and `__index` when you need them**, and **use coroutines for cooperative concurrency**.

---

## How it works

Lua does not implement four separate paradigm engines — it exposes one small set of mechanisms, and each paradigm is a way of using them:

- **Procedural** falls straight out of functions, `local` variables, and top-to-bottom execution.
- **Functional** works because functions are first-class values with lexical closures and proper tail-call optimization; higher-order functions and dispatch tables are just functions stored in and passed through tables.
- **Object-oriented** is *delegation*, not instantiation: an object is a table whose metatable's `__index` points at a prototype, and inheritance is a chain of those `__index` links.
- **Concurrent** is cooperative: `coroutine.create`/`resume`/`yield` suspend and resume a call stack at explicit points, with no preemption and no shared-memory races.

The through-line is that tables, closures, and metatables recombine to express whichever style a given piece of code needs.

---

## Examples

One program touching all four paradigms — a procedural driver, a functional `map`, a prototype-based object, and a coroutine generator:

```lua
-- Object (prototype-based)
local Counter = {}
Counter.__index = Counter
function Counter.new() return setmetatable({ n = 0 }, Counter) end
function Counter:bump() self.n = self.n + 1; return self.n end

-- Functional: higher-order map
local function map(t, f)
  local out = {}
  for i, v in ipairs(t) do out[i] = f(v) end
  return out
end

-- Concurrent: coroutine generator
local function range(limit)
  return coroutine.wrap(function()
    for i = 1, limit do coroutine.yield(i) end
  end)
end

-- Procedural driver tying it together
local counter = Counter.new()
for _ in range(3) do counter:bump() end          -- 3 bumps via the generator
local doubled = map({ 1, 2, 3 }, function(x) return x * 2 end)
print(counter.n, doubled[3])                       -- 3   6
```

---

## When to use

- **Procedural** — the default for scripts, host glue, and anything without a compelling reason to abstract.
- **Functional** — for iterators, callbacks, memoization, and dispatch tables where it clarifies intent.
- **Prototype-based OOP** — when you need stateful objects with shared behavior or shallow inheritance.
- **Coroutines** — for generators, cooperative schedulers, and async-style I/O (e.g. OpenResty).

---

## When NOT to use

- **Heavy functional pipelines** in hot paths — chained `map`/`filter` allocate intermediate tables and pressure the GC.
- **Deep class hierarchies** — prototype chains get slow and confusing; prefer composition.
- **Coroutines for CPU parallelism** — they are single-threaded and cannot use multiple cores.
- **Forcing a Java/Python class model** onto Lua — the language models objects as delegation, and fighting that produces awkward code.

---

## References

- [Lua 5.4 Reference Manual — Values and Types](https://www.lua.org/manual/5.4/manual.html#2.1)
- [Programming in Lua — Object-Oriented Programming](https://www.lua.org/pil/16.html)
- [Programming in Lua — Closures](https://www.lua.org/pil/6.1.html)
- [Programming in Lua — Coroutines](https://www.lua.org/pil/9.html)
- [Lua 5.4 Reference Manual — Coroutines](https://www.lua.org/manual/5.4/manual.html#2.6)
- *Programming in Lua, 4th edition* — Roberto Ierusalimschy (2016)
