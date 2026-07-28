---
type: how-to
tags:
  - language
  - lua
  - tool
related:
  - languages/lua/modules-and-luarocks
  - languages/lua/testing
  - languages/lua/installation
language: "lua"
---
# Lua Project Setup

> How to lay out a Lua project, declare its dependencies with a rockspec, and wire up modules, tests, and linting with LuaRocks.

---

## Prerequisites

- Lua installed (`lua -v` prints a version) — see [Installing Lua](installation.md)
- LuaRocks installed (`luarocks --version`)
- Basic familiarity with the terminal

---

## Steps

### 1. Create the project layout

Lua imposes no structure, but the community convention — used by most rocks — separates source, tests, and the rockspec.

```
myproject/
├── myproject-dev-1.rockspec   # dependency + build manifest
├── src/
│   └── myproject/
│       ├── init.lua           # require("myproject")
│       └── util.lua           # require("myproject.util")
├── spec/                       # busted tests (*_spec.lua)
│   └── util_spec.lua
├── .luacheckrc                 # linter config
└── README.md
```

The nested `src/myproject/` mirrors the module namespace: `require("myproject.util")` maps to `src/myproject/util.lua`. See [Modules and LuaRocks](modules-and-luarocks.md).

---

### 2. Write a module

```lua
-- src/myproject/util.lua
local util = {}

function util.slugify(s)
  return (s:lower():gsub("%s+", "-"):gsub("[^%w%-]", ""))
end

return util
```

```lua
-- src/myproject/init.lua
local myproject = {}
myproject.util = require("myproject.util")
return myproject
```

---

### 3. Create a rockspec

A rockspec is a Lua-syntax manifest declaring the package, its dependencies, and how to build it. Using a `dev` (or `scm`) version is conventional for an in-development project.

```lua
-- myproject-dev-1.rockspec
rockspec_format = "3.0"
package = "myproject"
version = "dev-1"

source = {
  url = "git+https://example.com/you/myproject.git",
}

description = {
  summary = "Example Lua project",
  license = "MIT",
}

dependencies = {
  "lua >= 5.1",
  "penlight",           -- example runtime dependency
}

-- test_dependencies keep test-only rocks out of the runtime install
test_dependencies = {
  "busted",
  "luacov",
}

build = {
  type = "builtin",
  modules = {
    ["myproject"]      = "src/myproject/init.lua",
    ["myproject.util"] = "src/myproject/util.lua",
  },
}

test = {
  type = "busted",
}
```

---

### 4. Install dependencies into a local tree

Keep dependencies project-local (like `node_modules`) instead of polluting the system, using LuaRocks' `--tree` or the `--local` per-user tree.

```bash
# Install this project's declared dependencies into a project-local tree
luarocks install --tree lua_modules --deps-only myproject-dev-1.rockspec

# Point the shell at that tree
eval "$(luarocks path --tree lua_modules)"
```

Now `require` can find the installed rocks and your own `src/` modules (add `src/` to `LUA_PATH` for local runs):

```bash
export LUA_PATH="./src/?.lua;./src/?/init.lua;$LUA_PATH"
lua -e 'print(require("myproject.util").slugify("Hello World"))'  -- hello-world
```

---

### 5. Add tests

Put busted specs under `spec/`. See [Testing](testing.md).

```lua
-- spec/util_spec.lua
local util = require("myproject.util")

describe("util.slugify", function()
  it("lowercases and hyphenates", function()
    assert.are.equal("hello-world", util.slugify("Hello World"))
  end)
end)
```

Run them:

```bash
busted
```

---

### 6. Configure linting

`luacheck` reads `.luacheckrc` from the project root.

```lua
-- .luacheckrc
std = "lua54"          -- assume Lua 5.4 globals
include_files = { "src", "spec" }
ignore = { "212" }     -- e.g. ignore "unused argument" if desired
```

```bash
luacheck src spec
```

---

## Verification

```bash
luacheck src spec          # static analysis — 0 warnings when clean
busted                     # all tests pass
luarocks make               # builds/installs the rockspec without error
lua -e 'require("myproject")'   # module loads (with LUA_PATH set)
```

---

## Common issues

| Symptom | Likely cause | Fix |
|---|---|---|
| `module 'myproject.util' not found` | `src/` not on `package.path` | Export `LUA_PATH="./src/?.lua;./src/?/init.lua;$LUA_PATH"` |
| `busted: command not found` | busted not on `PATH` (installed in local tree) | Run `eval "$(luarocks path --tree lua_modules)"` |
| Installed rocks not visible to `lua` | LuaRocks tree not on `package.path` | Run `eval "$(luarocks path)"` (or `--tree ...`) |
| `luarocks make` fails on modules map | A path in `build.modules` is wrong | Ensure each `name = "path"` matches an existing file |
| Tests pass locally, fail in CI | CI uses a different Lua version | Pin the version (asdf/hererocks) and set `std` in `.luacheckrc` |

---

## References

- [LuaRocks — Creating a rock (rockspec format)](https://github.com/luarocks/luarocks/wiki/Creating-a-rock)
- [LuaRocks — rockspec_format 3.0](https://github.com/luarocks/luarocks/wiki/Rockspec-format)
- [LuaRocks — the `path` command](https://github.com/luarocks/luarocks/wiki/path)
- [busted — documentation](https://lunarmodules.github.io/busted/)
- [luacheck — documentation](https://luacheck.readthedocs.io/)
