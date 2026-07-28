---
type: how-to
tags:
  - language
  - lua
  - tool
related:
  - languages/lua/toolchain
  - languages/lua/project-setup
language: "lua"
---
# Installing Lua

> How to install the reference Lua interpreter and (optionally) LuaJIT, and manage multiple versions.

---

## Prerequisites

- Terminal access (macOS, Linux, or WSL on Windows)
- A C compiler and `make` (only needed if you build from source)
- `curl` or `wget` available for source downloads
- (Optional) A package manager: Homebrew (macOS), `apt`/`dnf` (Linux)

---

## Steps

### 1. Install via a package manager (fastest)

**macOS (Homebrew):**

```bash
brew install lua          # reference Lua (latest 5.4.x)
brew install luajit        # optional: LuaJIT
brew install luarocks      # package manager (see Modules and LuaRocks)
```

**Debian / Ubuntu:**

```bash
sudo apt update
sudo apt install lua5.4 liblua5.4-dev luarocks
# LuaJIT:
sudo apt install luajit libluajit-5.1-dev
```

**Fedora:**

```bash
sudo dnf install lua lua-devel luarocks
```

Note the `-dev` / `-devel` packages: install them if you plan to build C modules or embed Lua (they provide `lua.h` and the static/shared library). See [Embedding and the C API](embedding-and-c-api.md).

---

### 2. Build the reference interpreter from source

The reference implementation is small, portable ANSI C and builds in seconds. This gives you an exact version, useful because Lua versions are not backward compatible.

```bash
# Replace 5.4.7 with the current release from lua.org/download.html
curl -R -O https://www.lua.org/ftp/lua-5.4.7.tar.gz
tar zxf lua-5.4.7.tar.gz
cd lua-5.4.7

make all test            # 'test' runs the built-in smoke test
sudo make install        # installs lua, luac to /usr/local/bin
```

On Linux, pass a platform target for readline support: `make linux-readline`. On macOS use `make macosx`.

---

### 3. Install LuaJIT from source (optional)

LuaJIT is a separate high-performance implementation compatible with Lua 5.1. Install it when a host (OpenResty, a game engine) requires it or when you need JIT speed and the C FFI.

```bash
git clone https://luajit.org/git/luajit.git
cd luajit
make && sudo make install
```

This installs a `luajit` binary alongside (not replacing) any reference `lua`.

---

### 4. Manage multiple versions

Because Lua 5.1/5.2/5.3/5.4 differ meaningfully, you often need more than one. Options:

**Homebrew versioned formulae:** `brew install lua@5.3` installs an older line side by side; use `brew link --overwrite lua@5.3` to switch the default.

**asdf:** the `lua` plugin manages versions per project via `.tool-versions`.

```bash
asdf plugin add lua
asdf install lua 5.4.7
asdf local lua 5.4.7      # writes .tool-versions in the current directory
```

**hererocks:** a Python script that builds a specific Lua *or* LuaJIT plus LuaRocks into an isolated directory — the closest thing to a per-project virtualenv.

```bash
pip install hererocks
hererocks env -l 5.4 -r latest   # Lua 5.4 + latest LuaRocks into ./env
source env/bin/activate
```

---

## Verification

```bash
lua -v                 # Lua 5.4.7  Copyright (C) 1994-...
luajit -v              # LuaJIT 2.1.x ...  (if installed)
luarocks --version     # luarocks 3.x.x

# Run a one-liner and a REPL check
lua -e 'print("Lua is working, 1-based:", ({10,20,30})[1])'  -- prints 10
```

Confirm the dev headers are present if you plan to embed or build C modules:

```bash
# Should print the include path; empty output means the -dev package is missing
pkg-config --cflags lua5.4 2>/dev/null || echo "lua headers not found"
```

---

## Common issues

| Symptom | Likely cause | Fix |
|---|---|---|
| `lua: command not found` | Install dir not on `PATH`, or only `lua5.4` binary exists | Add `/usr/local/bin` to `PATH`, or symlink/alias `lua` → `lua5.4` |
| `make` fails with `readline` errors | readline dev headers missing | Install `libreadline-dev`, or build the plain `make linux` target |
| `luarocks install` fails to find `lua.h` | `-dev`/`-devel` package not installed | Install `liblua5.4-dev` (Debian) / `lua-devel` (Fedora) |
| Wrong Lua version resolved | Multiple installs on `PATH` | Check `which -a lua`; reorder `PATH` or use asdf/hererocks |
| Rocks installed but not found by `lua` | `package.path` doesn't include the LuaRocks tree | Run `eval "$(luarocks path)"` |
| Scripts fail after upgrading 5.3 → 5.4 | Versions are not fully backward compatible | Pin the target version (hererocks/asdf) and port the code |

---

## References

- [Lua — download](https://www.lua.org/download.html)
- [Lua — building instructions (INSTALL)](https://www.lua.org/manual/5.4/readme.html)
- [LuaJIT — installation](https://luajit.org/install.html)
- [LuaRocks — installation](https://github.com/luarocks/luarocks/wiki/Download)
- [hererocks — GitHub](https://github.com/luarocks/hererocks)
