---
type: concept
tags:
  - language
  - lua
  - tool
related:
  - languages/lua/project-setup
  - languages/lua/types-and-tables
language: "lua"
---
# Modules and LuaRocks

> A Lua module is just a table returned from a file, loaded with `require`; LuaRocks is the package manager that fetches and installs third-party modules.

---

## What is it?

A **module** in Lua is a unit of reusable code — conventionally a Lua file that builds a table of functions and `return`s it. You load a module with the built-in `require` function, which finds the file, runs it once, caches the result, and hands back whatever it returned.

**LuaRocks** is the community package manager. It installs modules (called *rocks*), resolves their dependencies, and describes each package with a `.rockspec` file. It is Lua's equivalent of npm, pip, or Cargo.

---

## Why does it matter?

Lua's core deliberately keeps almost nothing beyond the language itself, so real programs are assembled from modules. Understanding how `require` locates files (`package.path`), how it caches them (`package.loaded`), and how LuaRocks fits into that search is essential to structuring anything larger than a single script — and to avoiding the classic "module not found" and "global leak" pitfalls.

---

## How it works

### Defining a module

The modern idiom (Lua 5.2+) is to build a local table and return it. The old `module()` function was removed in 5.2 and should not be used.

```lua
-- mymath.lua
local mymath = {}

function mymath.add(a, b)
  return a + b
end

function mymath.factorial(n)
  if n <= 1 then return 1 end
  return n * mymath.factorial(n - 1)
end

return mymath
```

### Using a module with require

`require` runs the file *once*, caches the returned value in `package.loaded`, and returns the same value on every later call.

```lua
local mymath = require("mymath")   -- no ".lua" extension; dots map to directories
print(mymath.add(2, 3))            -- 5

local again = require("mymath")    -- not re-executed; returns the cached table
print(again == mymath)             -- true
```

Submodules use dotted paths that map to directory separators: `require("app.db.users")` looks for `app/db/users.lua`.

---

### How require finds files: package.path and package.cpath

`require` searches a set of templates in `package.path` (for Lua files) and `package.cpath` (for compiled C modules, `.so`/`.dll`). Each template contains a `?` replaced by the module name (with dots turned into path separators).

```lua
print(package.path)
-- e.g. ./?.lua;./?/init.lua;/usr/local/share/lua/5.4/?.lua;...

print(package.cpath)
-- e.g. ./?.so;/usr/local/lib/lua/5.4/?.so;...
```

Note `?/init.lua`: a directory `foo/` with a `foo/init.lua` file can itself be `require("foo")` — the package-as-directory idiom.

You can extend the search path at runtime (though configuring it via environment or LuaRocks is cleaner):

```lua
package.path = package.path .. ";./libs/?.lua"
```

The `LUA_PATH` and `LUA_CPATH` environment variables seed these values at startup.

---

### The module cache

`package.loaded[name]` holds the cached result. To force a reload (rare — mostly for REPL development), clear the entry first:

```lua
package.loaded["mymath"] = nil
local fresh = require("mymath")   -- re-executes the file
```

`package.preload[name]` lets you register a loader function for a module that is not on disk — useful for bundling.

---

### LuaRocks: installing modules

LuaRocks installs rocks locally or system-wide and wires them into `package.path`/`package.cpath`.

```bash
luarocks install penlight          # install a pure-Lua library
luarocks install luasocket         # install a library with a C component
luarocks install busted --local    # install into the per-user tree
luarocks list                      # list installed rocks
luarocks show penlight             # show details and dependencies
```

To make the current shell see locally installed rocks:

```bash
eval "$(luarocks path)"            # exports LUA_PATH / LUA_CPATH
```

---

### The rockspec file

A rockspec is a Lua-syntax manifest describing a package: its version, source, dependencies, and how to build it. This is what you write to *publish* a module or to declare a project's dependencies.

```lua
-- mymath-1.0-1.rockspec
package = "mymath"
version = "1.0-1"

source = {
  url = "git+https://example.com/you/mymath.git",
  tag = "v1.0",
}

description = {
  summary = "Small math helpers",
  license = "MIT",
}

dependencies = {
  "lua >= 5.1",
}

build = {
  type = "builtin",
  modules = {
    mymath = "src/mymath.lua",   -- module name = file path
  },
}
```

Install a project's own dependencies straight from its rockspec:

```bash
luarocks make        # build/install using the rockspec in the current directory
```

---

## Examples

### A package laid out as a directory

```
app/
├── init.lua          -- require("app") loads this
├── config.lua        -- require("app.config")
└── db/
    └── users.lua     -- require("app.db.users")
```

```lua
-- app/init.lua
local app = {}
app.config = require("app.config")
app.users  = require("app.db.users")
return app
```

### Avoiding accidental globals

Because variables are global by default, always declare module internals `local` so they do not leak into `_G`:

```lua
local helper = {}            -- module table

local function private_util()  -- 'local' => not exported, not global
  -- ...
end

function helper.public()
  return private_util()
end

return helper
```

---

## When to use

- Any codebase past a single file — split responsibilities into `require`-able modules
- Sharing code across projects via LuaRocks rocks
- Declaring reproducible dependencies with a rockspec
- Packaging a multi-file library as a directory with `init.lua`

## When NOT to use

- Do not use the removed `module()` function (pre-5.2) — return a table instead
- Do not rely on modules mutating globals; a module should return its table
- Do not hardcode absolute paths in `package.path` — prefer `luarocks path` or environment configuration
- Do not assume `require` re-runs a file each call — it caches; clear `package.loaded` if you truly need a reload

---

## References

- [Lua 5.4 Reference Manual — Modules (`require`, `package`)](https://www.lua.org/manual/5.4/manual.html#6.3)
- [Programming in Lua — Modules and Packages](https://www.lua.org/pil/15.html)
- [LuaRocks — home](https://luarocks.org/)
- [LuaRocks — Creating a rock (rockspec format)](https://github.com/luarocks/luarocks/wiki/Creating-a-rock)
- [LuaRocks — Documentation](https://github.com/luarocks/luarocks/wiki/Documentation)
- *Programming in Lua, 4th edition* — Roberto Ierusalimschy (2016)
