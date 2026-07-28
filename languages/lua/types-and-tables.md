---
type: concept
tags:
  - language
  - lua
related:
  - languages/lua/metatables-and-oop
  - languages/lua/paradigms
language: "lua"
---
# Types and Tables in Lua

> Lua has just eight value types, and one of them — the table — is the universal data structure used to build arrays, dictionaries, objects, and modules alike.

---

## What is it?

Lua is dynamically typed: variables have no type, only *values* do. There are exactly **eight basic types**, and a small set of rules (1-based sequences, `nil` for absence, truthiness) that govern how values behave. The standout type is the **table**, the only structured type Lua provides — everything composite is a table.

---

## Why does it matter?

Most languages give you several composite types (arrays, structs, maps, classes). Lua gives you one and asks you to build the rest. Understanding tables — how sequences differ from maps, how `nil` deletes keys, and how the length operator behaves — is the single most important thing to learn, because it determines how you model *all* data in Lua.

---

## How it works

### The eight types

`type(v)` returns one of these strings:

| Type | Description | Example |
|---|---|---|
| `nil` | Absence of a value; the only falsy value besides `false` | `nil` |
| `boolean` | `true` or `false` | `true` |
| `number` | Since 5.3, an integer *or* float subtype (before 5.3, always a double) | `42`, `3.14` |
| `string` | Immutable, 8-bit clean byte sequence | `"lua"` |
| `function` | First-class value; Lua or C function | `print` |
| `table` | The only structured type — associative array | `{}` |
| `userdata` | A block of raw C memory owned by the host | (from the C API) |
| `thread` | An independent coroutine | `coroutine.create(f)` |

Two subtleties:
- **`userdata`** exists so the host application can hand C objects to Lua. See [Embedding and the C API](embedding-and-c-api.md).
- **`thread`** is a coroutine, *not* an OS thread. See [Coroutines](coroutines.md).

---

### Truthiness and nil

Only `false` and `nil` are falsy. **Everything else is truthy**, including `0` and the empty string `""`.

```lua
if 0 then print("zero is truthy") end   -- prints
if "" then print("empty is truthy") end -- prints

local x            -- unassigned locals are nil
print(x == nil)    -- true
```

`nil` also means "no value" in a table: assigning `nil` to a key **removes** it.

```lua
local t = { a = 1, b = 2 }
t.a = nil          -- removes key "a"
print(t.a)         -- nil (reading a missing key is not an error)
```

---

### Numbers: integer vs float (5.3+)

Since Lua 5.3 a number is either an integer or a float. Arithmetic follows rules that keep integers where possible; division `/` always yields a float, while floor division `//` and the modulo `%` preserve integers.

```lua
print(math.type(3))     -- integer
print(math.type(3.0))   -- float
print(7 / 2)            -- 3.5   (always float)
print(7 // 2)           -- 3     (floor division, integer)
print(2^10)             -- 1024.0 (^ is always float)
```

Before 5.3 all numbers were 64-bit doubles — a detail that matters when targeting Lua 5.1 / LuaJIT.

---

### Strings

Strings are immutable and can hold arbitrary bytes (including embedded zeros). The `string` library offers pattern matching (a lightweight regex alternative), formatting, and manipulation. Any string method can be called with the colon syntax because the standard library sets a metatable on strings.

```lua
local s = "Hello, Lua"
print(#s)                 -- 10  (# is the length operator)
print(s:upper())          -- HELLO, LUA
print(s:sub(1, 5))        -- Hello
print(("x=%d"):format(7)) -- x=7
print(string.match("2020-07-28", "(%d+)-(%d+)-(%d+)")) -- 2020
```

---

### Tables — the universal structure

A table is an associative array: it maps keys (any value except `nil` or NaN) to values. The same table can be used as an array, a dictionary, a set, an object, or a module.

```lua
-- As a dictionary
local person = { name = "Ada", age = 36 }
print(person.name)          -- Ada       (sugar for person["name"])
print(person["age"])        -- 36

-- As an array (sequence): 1-based, contiguous integer keys
local colors = { "red", "green", "blue" }
print(colors[1])            -- red   (indexing starts at 1)
print(#colors)              -- 3

-- As a set
local seen = { apple = true, pear = true }
print(seen.apple)           -- true
```

**1-based indexing** is the convention: sequences start at index `1`. The length operator `#` returns the length of a *sequence* — a table with contiguous integer keys `1..n`.

---

### Sequences, gaps, and the border problem

`#t` is well-defined only for a sequence (no `nil` holes). If a table has gaps, `#` may return **any** border, so never rely on `#` for tables with holes.

```lua
local t = { 10, 20, nil, 40 }  -- a "hole" at index 3
print(#t)  -- may print 4 OR 2 — undefined; both are valid borders
```

To iterate:
- `ipairs(t)` walks `1, 2, 3, …` and **stops at the first `nil`** — use for sequences.
- `pairs(t)` walks **all** keys in unspecified order — use for dictionaries.

```lua
for i, v in ipairs(colors) do print(i, v) end     -- ordered 1..n
for k, v in pairs(person) do print(k, v) end       -- any order
```

---

### Copy semantics

Tables, functions, threads, and userdata are **reference** values — assignment copies the reference, not the contents. Numbers, booleans, strings, and nil behave as values.

```lua
local a = { 1, 2, 3 }
local b = a          -- b references the same table
b[1] = 99
print(a[1])          -- 99  (a and b are the same table)
```

---

## Examples

### A table used as several things at once

```lua
-- A "module-like" table holding data and behavior
local inventory = {
  items = { "sword", "shield" },   -- sequence
  gold  = 100,                       -- scalar field
  add = function(self, item)         -- function value
    self.items[#self.items + 1] = item
  end,
}

inventory:add("potion")             -- colon call passes inventory as self
print(#inventory.items)             -- 3
print(inventory.gold)               -- 100
```

### Using a table as a set and counting members

```lua
local function to_set(list)
  local set = {}
  for _, v in ipairs(list) do
    set[v] = true
  end
  return set
end

local fruits = to_set({ "apple", "pear", "apple" })
local count = 0
for _ in pairs(fruits) do count = count + 1 end
print(count) -- 2  (duplicates collapse into one key)
```

---

## When to use

- Modeling **any** structured data — records, lists, maps, sets, trees, graphs, objects
- Building modules: a module is conventionally a table of functions
- Configuration: Lua tables double as a readable data/config format
- Sparse or mixed key spaces where a fixed struct would be awkward

## When NOT to use

- Do not use `#t` on tables that may contain `nil` holes — the result is undefined
- Do not assume `pairs` iterates in any particular order — it does not
- Do not use `0`-based indexing for sequences — the standard library (`ipairs`, `table.insert`, string functions) is 1-based
- Do not store large numeric matrices as nested tables when performance matters — consider LuaJIT's FFI arrays instead

---

## References

- [Lua 5.4 Reference Manual — Values and Types](https://www.lua.org/manual/5.4/manual.html#2.1)
- [Lua 5.4 Reference Manual — The Length Operator](https://www.lua.org/manual/5.4/manual.html#3.4.7)
- [Programming in Lua — Tables](https://www.lua.org/pil/2.5.html)
- [Programming in Lua — The Table Library](https://www.lua.org/pil/19.html)
- [Lua 5.4 Reference Manual — String Manipulation](https://www.lua.org/manual/5.4/manual.html#6.4)
- *Programming in Lua, 4th edition* — Roberto Ierusalimschy (2016)
