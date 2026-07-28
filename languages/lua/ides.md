---
type: concept
tags:
  - language
  - lua
  - tool
related:
  - languages/lua/toolchain
  - languages/lua/installation
language: "lua"
---
# IDEs and Editors for Lua

> A comparison of the main development environments for Lua, all of which now center on the Lua Language Server for autocompletion and diagnostics.

---

## What is it?

A Lua development environment is an editor configured to talk to a **language server** — almost always [Lua Language Server](https://github.com/LuaLS/lua-language-server) (`lua-language-server`, formerly "sumneko lua") — which provides completion, go-to-definition, diagnostics, and type inference from annotations. Because Lua is dynamically typed and has no compiler to catch mistakes, this static tooling does a large share of the work other languages get from their type checker.

---

## Why does it matter?

Lua gives you no compile step and only runtime errors, so a good editor integration is the main line of defense against typos, `nil` indexing, and the classic `:` vs `.` method-call mistake. The Lua Language Server reads `---@` annotation comments to infer types and flag problems *before* you run the script — turning an untyped language into one with meaningful editor feedback. A weak setup means those errors surface only at runtime, often deep inside an embedded host.

---

## How it works

Modern Lua editors speak the Language Server Protocol (LSP) to `lua-language-server`:

```
Editor  ──LSP──▶  lua-language-server  ──▶  static analysis + type inference
                                              ▲
                                    .lua files + ---@ annotations + .luarc.json
```

The server reads your source, any `---@type` / `---@param` / `---@return` annotations, and a `.luarc.json` config (runtime version, global names, library paths). It streams diagnostics, hovers, and completions back to the editor.

A minimal `.luarc.json` telling the server which runtime and globals to assume:

```json
{
  "runtime.version": "Lua 5.4",
  "diagnostics.globals": ["vim"],
  "workspace.library": ["${3rd}/love2d/library"]
}
```

Annotations that drive inference:

```lua
---@param name string
---@return string
local function greet(name)
  return "hi " .. name
end
```

---

## Options

### VS Code + Lua Language Server

The [Lua extension by sumneko/LuaLS](https://marketplace.visualstudio.com/items?itemName=sumneko.lua) bundles the language server and is the most popular Lua setup.

**Pros:**
- Free, actively maintained, richest annotation-driven type checking available for Lua
- Completion, diagnostics, formatting hooks, and go-to-definition out of the box
- Large ecosystem; pairs with the StyLua and luacheck extensions
- Ships library definitions for LÖVE, OpenResty, and others

**Cons:**
- No integrated Lua debugger by default — needs the separate `local-lua-debugger-vscode` extension
- Type checking is only as good as your annotations; unannotated code gets limited inference

**Best for:** most Lua developers, including Neovim config authors editing from VS Code.

---

### ZeroBrane Studio

A lightweight IDE written *in Lua*, purpose-built for Lua development with a strong debugger.

**Pros:**
- Excellent step debugger with remote debugging into embedded hosts (LÖVE, Corona/Solar2D, OpenResty, custom C hosts)
- Tiny footprint; runs on modest hardware
- Interpreter switching for many Lua flavors and game engines
- Live coding / REPL integration

**Cons:**
- Older UI and smaller extension ecosystem than VS Code
- Uses its own autocomplete engine rather than the modern Lua Language Server
- Less general-purpose (not ideal for polyglot projects)

**Best for:** debugging embedded Lua and game scripting, where its remote debugger shines.

---

### Neovim + lua-language-server

Neovim is itself scripted in Lua, so many Lua developers edit inside it. Configured via `nvim-lspconfig`, it connects to `lua-language-server`.

**Pros:**
- Fastest and lowest-memory option; fully keyboard-driven
- First-class for editing your own Neovim configuration (the server ships Neovim API definitions via `neodev`/`lazydev`)
- Same editor for Lua, shell, and everything else

**Cons:**
- Significant setup: LSP, completion, formatting, and debugging (`nvim-dap`) are wired up manually
- No GUI debugger; step debugging requires extra plugins
- Configuration can drift as plugins update

**Best for:** developers already fluent in Neovim, especially those authoring Neovim plugins/configs.

---

## Comparison table

| | VS Code | ZeroBrane Studio | Neovim |
|---|---|---|---|
| Cost | Free | Free (donationware) | Free |
| Language server | Lua Language Server | Built-in engine | Lua Language Server |
| Debugger | Via extension | Excellent (built-in, remote) | Manual (`nvim-dap`) |
| Memory usage | Medium | Low | Low |
| Setup effort | Low | Low | High |
| Best strength | Type-checking + ecosystem | Debugging embedded/game Lua | Neovim config + speed |

---

## When to use

- **VS Code** — default for most projects; best annotation-driven diagnostics with minimal setup.
- **ZeroBrane Studio** — when you need to step-debug Lua running inside a game engine or C host.
- **Neovim** — for Vim-fluent developers, especially those writing Neovim plugins/configuration.

## When NOT to use

- Do not edit non-trivial Lua in a plain text editor without a language server — you lose the only pre-runtime error checking Lua has.
- Do not expect deep type checking without writing `---@` annotations; unannotated dynamic code limits what the server can infer.
- Do not start with Neovim if you have never used Vim — the setup curve will slow you down before it helps.

---

## References

- [Lua Language Server — GitHub](https://github.com/LuaLS/lua-language-server)
- [Lua Language Server — annotations documentation](https://luals.github.io/wiki/annotations/)
- [Lua extension for VS Code — marketplace](https://marketplace.visualstudio.com/items?itemName=sumneko.lua)
- [ZeroBrane Studio — home](https://studio.zerobrane.com/)
- [nvim-lspconfig — GitHub](https://github.com/neovim/nvim-lspconfig)
