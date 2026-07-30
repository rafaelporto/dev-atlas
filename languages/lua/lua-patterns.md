---
type: concept
tags:
  - language
  - lua
  - design-pattern
  - creational
  - structural
  - behavioral
related:
  - languages/lua/metatables-and-oop
  - languages/lua/modules-and-luarocks
language: "lua"
---
# Lua Patterns

> Lua code converges on a small set of table-and-closure idioms — classes via metatables, modules, closures-as-objects, and memoization — that recur across almost every codebase.

---

## What is it?

Lua patterns are idiomatic solutions to recurring design problems, expressed with Lua's minimal toolkit: tables, metatables, closures, and first-class functions. Because Lua ships no class system and a tiny standard library, these idioms *are* how the language does object orientation, encapsulation, and caching. They map loosely onto Gang-of-Four categories but are assembled by hand rather than provided by the language.

---

## Why does it matter?

Most Lua libraries — from web frameworks to game engines — reimplement the same handful of patterns. Recognizing them lets you read unfamiliar Lua at a glance and write code other Lua developers will find familiar. Just as important, these idioms encode the *right* way to do things Lua does not give you directly (private state, classes, inheritance), steering you away from global-leaking, `self`-forgetting mistakes.

---

## Class via metatables (creational / structural)

The canonical object model: a table acts as the class, instances delegate to it through `__index`, and a `new` constructor wires up the metatable. See [Metatables and OOP](metatables-and-oop.md) for the mechanics.

```lua
local Stack = {}
Stack.__index = Stack

function Stack.new()
  return setmetatable({ items = {}, size = 0 }, Stack)
end

function Stack:push(v)
  self.size = self.size + 1
  self.items[self.size] = v
end

function Stack:pop()
  if self.size == 0 then return nil end
  local v = self.items[self.size]
  self.items[self.size] = nil
  self.size = self.size - 1
  return v
end

local s = Stack.new()
s:push(1); s:push(2)
print(s:pop())  -- 2
```

**Frequency:** Universal — the default way to define any stateful object.

---

## Inheritance via prototype chaining (structural)

A subclass delegates to its parent by setting the parent as the `__index` of the subclass table.

```lua
local Shape = {}
Shape.__index = Shape

function Shape.new(name) return setmetatable({ name = name }, Shape) end
function Shape:describe() return "a " .. self.name end

local Circle = setmetatable({}, { __index = Shape })  -- Circle inherits from Shape
Circle.__index = Circle

function Circle.new(r)
  local self = Shape.new("circle")
  self.r = r
  return setmetatable(self, Circle)
end

function Circle:area() return math.pi * self.r ^ 2 end

local c = Circle.new(2)
print(c:describe())            -- a circle   (inherited)
print(string.format("%.2f", c:area()))  -- 12.57
```

**Frequency:** Common — but prefer composition for anything beyond one or two levels.

---

## Module pattern (creational)

Build a local table, keep internals `local`, return the table. This is Lua's encapsulation boundary. See [Modules and LuaRocks](modules-and-luarocks.md).

```lua
-- logger.lua
local logger = {}

local level = "info"           -- private state (not global, not exported)

local function stamp(msg)      -- private helper
  return os.date("!%Y-%m-%dT%H:%M:%SZ") .. " " .. msg
end

function logger.set_level(l) level = l end
function logger.info(msg) print(stamp("[info] " .. msg)) end

return logger
```

**Frequency:** Universal — every non-trivial file is a module.

---

## Closures as objects (behavioral / encapsulation)

A closure over local variables gives you private state without a table or metatable. The returned function(s) *are* the object; the upvalues are its fields, inaccessible from outside.

```lua
local function new_counter(start)
  local count = start or 0        -- fully private upvalue

  return {
    increment = function() count = count + 1; return count end,
    value     = function() return count end,
  }
end

local c = new_counter(10)
c.increment()
print(c.value())   -- 11
-- there is no way to read or write `count` except through these functions
```

This is Lua's strongest form of encapsulation: unlike metatable classes, the state is genuinely unreachable. The trade-off is memory — each instance holds its own copy of every method closure.

**Frequency:** Common for small objects, factories, and anything needing true privacy.

---

## Dispatch table (behavioral — Strategy / Command)

Replace long `if`/`elseif` chains or a `switch` with a table mapping keys to functions. This is Lua's Strategy and Command pattern in one.

```lua
local handlers = {
  add = function(a, b) return a + b end,
  sub = function(a, b) return a - b end,
  mul = function(a, b) return a * b end,
}

local function calculate(op, a, b)
  local fn = handlers[op] or error("unknown op: " .. op)
  return fn(a, b)
end

print(calculate("mul", 6, 7))  -- 42
```

**Frequency:** Universal — idiomatic wherever behavior varies by a key.

---

## Memoization (behavioral — caching via closures)

Wrap a function so results are cached in an upvalue table keyed by argument. A classic use of closures plus tables.

```lua
local function memoize(fn)
  local cache = {}
  return function(n)
    local hit = cache[n]
    if hit == nil then
      hit = fn(n)
      cache[n] = hit
    end
    return hit
  end
end

local slow_fib
slow_fib = memoize(function(n)
  if n < 2 then return n end
  return slow_fib(n - 1) + slow_fib(n - 2)
end)

print(slow_fib(40))  -- fast: each n computed once
```

A related trick uses the `__index` metamethod so the cache fills itself lazily on first access.

**Frequency:** Common in parsers, layout engines, and any pure, expensive computation.

---

## Default values via `__index` (structural)

Give a table fallback values without copying them into every instance.

```lua
local defaults = { width = 80, height = 24, wrap = true }

local function with_defaults(opts)
  return setmetatable(opts or {}, { __index = defaults })
end

local cfg = with_defaults({ width = 120 })
print(cfg.width, cfg.height)  -- 120   24
```

**Frequency:** Common for configuration and options tables.

---

## Quick reference

| Pattern | Category | Frequency | Key mechanism |
|---|---|---|---|
| Class via metatables | Creational/Structural | Universal | `setmetatable(inst, Class)` + `Class.__index = Class` |
| Inheritance via prototype chaining | Structural | Common | subclass `__index` delegates to parent |
| Module pattern | Creational | Universal | local table, `local` internals, `return t` |
| Closures as objects | Behavioral | Common | private upvalues + returned functions |
| Dispatch table | Behavioral | Universal | table mapping key → function |
| Memoization | Behavioral | Common | closure over a `cache` table |
| Default values via `__index` | Structural | Common | metatable fallback table |

---

## How it works

Every pattern above is assembled from the same three primitives — there is no framework underneath:

- **Tables** carry state and namespaces. A "class", a "module", and an "instance" are all just tables.
- **Metatables** redirect behavior. `__index` turns one table into a fallback for another, which is simultaneously method lookup (class), inheritance (prototype chain), and default values.
- **Closures** capture `local` upvalues by reference, giving genuinely private state and letting a returned function *be* the object.

Because these primitives compose, the patterns overlap: a dispatch table is a table of closures, memoization is a closure over a table, and a class is a table wired to itself through `__index`. Learning the primitives is learning the patterns.

---

## Examples

A single module that layers several idioms together — the module pattern for the file, a metatable class with a dispatch table of operations, and a memoized pure function:

```lua
-- calculator.lua
local calculator = {}                     -- module pattern

local Calc = {}                           -- class via metatable
Calc.__index = Calc

local ops = {                             -- dispatch table (Strategy)
  add = function(a, b) return a + b end,
  sub = function(a, b) return a - b end,
  mul = function(a, b) return a * b end,
}

function calculator.new()
  return setmetatable({ history = {} }, Calc)
end

function Calc:apply(op, a, b)
  local fn = ops[op] or error("unknown op: " .. op)
  local result = fn(a, b)
  self.history[#self.history + 1] = result
  return result
end

-- memoization via a closure over a private cache
local function memoize(fn)
  local cache = {}
  return function(n)
    if cache[n] == nil then cache[n] = fn(n) end
    return cache[n]
  end
end

calculator.square = memoize(function(n) return n * n end)

return calculator
```

```lua
local calculator = require("calculator")
local c = calculator.new()
print(c:apply("mul", 6, 7))   -- 42
print(calculator.square(9))    -- 81 (cached on first call)
```

---

## When to use

- **Class via metatables / prototype chaining** — whenever you need stateful objects or a shallow inheritance hierarchy.
- **Module pattern** — for every non-trivial file, to keep internals `local` and export a clean table.
- **Closures as objects** — when state must be genuinely private and the object is small.
- **Dispatch table** — wherever behavior varies by a key, in place of long `if`/`elseif` chains.
- **Memoization / `__index` defaults** — for pure expensive functions and configuration/options tables.

---

## When NOT to use

- **Deep inheritance chains** — prefer composition; metatable chains get slow and hard to follow beyond a level or two.
- **Closures-as-objects for large objects** — each instance copies every method closure, wasting memory; use a metatable class instead.
- **A custom class helper in every file** — pick one convention (or a library like `middleclass`) rather than reinventing it.
- **Metatable magic where a plain table suffices** — `__index` tricks that a direct field access would express more clearly.

---

## References

- [Programming in Lua — Object-Oriented Programming](https://www.lua.org/pil/16.html)
- [Programming in Lua — Modules and Packages](https://www.lua.org/pil/15.html)
- [Programming in Lua — Closures](https://www.lua.org/pil/6.1.html)
- [Programming in Lua — Memoize Functions](https://www.lua.org/pil/17.1.html)
- [Lua 5.4 Reference Manual — Metatables](https://www.lua.org/manual/5.4/manual.html#2.4)
- *Programming in Lua, 4th edition* — Roberto Ierusalimschy (2016)
