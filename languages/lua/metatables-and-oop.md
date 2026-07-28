---
type: concept
tags:
  - language
  - lua
  - object-oriented
related:
  - languages/lua/types-and-tables
  - languages/lua/lua-patterns
  - languages/lua/paradigms
language: "lua"
---
# Metatables and OOP in Lua

> A metatable is a table that customizes how another table behaves — and it is the single mechanism Lua uses to build operator overloading, default values, and object orientation.

---

## What is it?

Every Lua table can have an associated **metatable**: a second table whose specially named fields — *metamethods* like `__index`, `__add`, and `__call` — tell Lua what to do in situations the table itself does not handle. When you look up a missing key, add two tables, or call a table like a function, Lua consults the metatable.

Because Lua ships no class system, metatables are also how you do object-oriented programming. An "object" is a table; its "class" is a prototype table reached through the `__index` metamethod.

---

## Why does it matter?

Metatables are the one feature that turns Lua's minimal core into an expressive language. The same mechanism gives you:

- Operator overloading (`__add`, `__eq`, `__lt`, …)
- Custom string conversion (`__tostring`)
- Default values and read-only tables (`__index`, `__newindex`)
- Object orientation and inheritance (`__index` chains)
- Callable tables (`__call`)

Learn metatables and you understand how nearly every Lua library implements classes, DSLs, and proxies — because they all rest on this one idea.

---

## How it works

### Setting a metatable

```lua
local t = {}
local mt = {}
setmetatable(t, mt)     -- attach mt as t's metatable
print(getmetatable(t) == mt) -- true
```

### The `__index` metamethod

When you read `t.k` and `k` is **not** present in `t`, Lua checks `mt.__index`:
- If `__index` is a **table**, the lookup continues in that table (delegation).
- If `__index` is a **function**, Lua calls `__index(t, k)` and uses its result.

```lua
-- Default values via an __index table
local defaults = { color = "black", size = "M" }
local shirt = setmetatable({ color = "red" }, { __index = defaults })
print(shirt.color) -- red   (found in shirt)
print(shirt.size)  -- M     (falls back to defaults)
```

`__newindex` is the mirror image: it intercepts assignment to *missing* keys, which is how read-only tables and validation are implemented.

```lua
-- A read-only table
local function readonly(t)
  return setmetatable({}, {
    __index = t,
    __newindex = function() error("attempt to modify a read-only table", 2) end,
  })
end

local config = readonly({ debug = false })
print(config.debug)   -- false
-- config.debug = true -- error: attempt to modify a read-only table
```

---

### Common metamethods

| Metamethod | Triggered by | Purpose |
|---|---|---|
| `__index` | reading a missing key | delegation / defaults / OOP |
| `__newindex` | assigning a missing key | read-only tables, validation |
| `__call` | calling the table `t(...)` | callable objects, functors |
| `__tostring` | `tostring(t)`, `print(t)` | custom text representation |
| `__eq`, `__lt`, `__le` | `==`, `<`, `<=` | comparison overloading |
| `__add`, `__sub`, `__mul`, `__div` | arithmetic operators | numeric-like types (vectors) |
| `__concat` | the `..` operator | string-like concatenation |
| `__len` | the `#` operator | custom length |
| `__gc` | garbage collection | finalizers (5.4 / userdata) |

---

### OOP: objects as tables, classes as prototypes

The idiomatic class in Lua is a table that serves as the metatable's `__index` for its instances. Methods defined with `:` receive an implicit `self`.

```lua
local Account = {}
Account.__index = Account          -- instances delegate lookups to Account

function Account.new(balance)
  return setmetatable({ balance = balance or 0 }, Account)
end

function Account:deposit(amount)   -- ':' => implicit self
  self.balance = self.balance + amount
end

function Account:get_balance()
  return self.balance
end

local acc = Account.new(100)
acc:deposit(50)                    -- sugar for acc.deposit(acc, 50)
print(acc:get_balance())           -- 150
```

Why this works: `acc` has no `deposit` key, so Lua follows `Account.__index` (which is `Account` itself) and finds the method there.

---

### Inheritance: chaining prototypes

A subclass sets its own `__index` to itself and makes *its* metatable delegate to the parent, forming a lookup chain.

```lua
-- Base class from above: Account

local SavingsAccount = setmetatable({}, { __index = Account })
SavingsAccount.__index = SavingsAccount

function SavingsAccount.new(balance, rate)
  local self = Account.new(balance)          -- reuse base constructor
  self.rate = rate
  return setmetatable(self, SavingsAccount)
end

function SavingsAccount:add_interest()
  self:deposit(self.balance * self.rate)     -- deposit inherited from Account
end

local s = SavingsAccount.new(1000, 0.05)
s:add_interest()
print(s:get_balance())  -- 1050.0   (get_balance inherited from Account)
```

Lookup order for `s:get_balance()`: `s` → `SavingsAccount` (its `__index`) → `Account` (SavingsAccount's metatable `__index`).

---

### The `:` vs `.` distinction

This is the most common source of bugs:

- `function Obj:method()` defines a method with a hidden `self` parameter.
- `obj:method()` calls it, passing `obj` as `self`.
- `obj.method()` calls the *same* function but **without** `self` — `self` is `nil` inside, usually causing `attempt to index a nil value`.

```lua
local acc = Account.new(10)
acc:deposit(5)     -- correct: self = acc
-- acc.deposit(5)  -- wrong: self = 5, amount = nil -> runtime error
```

---

## Examples

### A callable, printable 2D vector with operator overloading

```lua
local Vector = {}
Vector.__index = Vector

function Vector.new(x, y)
  return setmetatable({ x = x, y = y }, Vector)
end

function Vector.__add(a, b)
  return Vector.new(a.x + b.x, a.y + b.y)
end

function Vector.__eq(a, b)
  return a.x == b.x and a.y == b.y
end

function Vector.__tostring(v)
  return string.format("(%g, %g)", v.x, v.y)
end

function Vector.__call(v, factor)          -- make the vector callable
  return Vector.new(v.x * factor, v.y * factor)
end

local a = Vector.new(1, 2)
local b = Vector.new(3, 4)
print(tostring(a + b))     -- (4, 6)
print(a == Vector.new(1, 2)) -- true
print(tostring(a(3)))      -- (3, 6)  via __call
```

---

## When to use

- Modeling objects with shared behavior (classes) and inheritance
- Value types that should support operators (vectors, big numbers, money)
- Default-value tables and read-only configuration
- Proxies, lazy loading, and DSLs that intercept table access

## When NOT to use

- Do not overload operators where a plain named function would be clearer — `__index` magic can obscure control flow
- Do not build deep inheritance chains; prototype delegation makes them slow and hard to trace — prefer composition
- Do not confuse `:` and `.` when defining or calling methods
- Do not rely on `__gc` for ordinary cleanup; finalizer timing is not deterministic

---

## References

- [Lua 5.4 Reference Manual — Metatables and Metamethods](https://www.lua.org/manual/5.4/manual.html#2.4)
- [Programming in Lua — Metatables and Metamethods](https://www.lua.org/pil/13.html)
- [Programming in Lua — Object-Oriented Programming](https://www.lua.org/pil/16.html)
- [Programming in Lua — Inheritance](https://www.lua.org/pil/16.2.html)
- *Programming in Lua, 4th edition* — Roberto Ierusalimschy (2016)
