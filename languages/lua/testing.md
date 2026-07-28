---
type: concept
tags:
  - language
  - lua
  - testing
related:
  - languages/lua/project-setup
  - languages/lua/toolchain
language: "lua"
---
# Testing in Lua

> Lua has no test framework in its standard library; the community standard is **busted**, a BDD-style runner bundled with the **luassert** assertion library, with **luacov** for coverage.

---

## What is it?

Lua ships no testing tools in the core, so tests rely on third-party rocks. The de facto stack is:

- **busted** — a behavior-driven test runner with `describe`/`it` blocks, setup/teardown hooks, spies, mocks, and multiple output formats.
- **luassert** — the assertion library busted bundles, providing `assert.are.equal`, `assert.has_error`, `assert.spy`, and more.
- **luacov** — a coverage analyzer that reports which lines your tests exercised.

An older, single-file alternative, **luaunit**, offers xUnit-style tests with no dependencies and is handy for constrained or embedded environments.

---

## Why does it matter?

Because nothing is built in, "how do I test Lua?" has a real answer only once you adopt a framework. busted has become that answer for most projects: it integrates with LuaRocks, runs under standard Lua and LuaJIT, and its `describe`/`it` structure keeps tests readable. Knowing the stack — and how to wire coverage and CI around it — is what makes a Lua codebase maintainable rather than a pile of ad-hoc `assert` scripts.

---

## How it works

### Installing the stack

```bash
luarocks install busted
luarocks install luacov      # optional: coverage
```

busted pulls in luassert and luassert's helpers as dependencies.

---

### Writing a test with busted

Test files conventionally end in `_spec.lua` and live under a `spec/` directory. busted discovers them automatically.

```lua
-- spec/mymath_spec.lua
local mymath = require("mymath")

describe("mymath", function()
  it("adds two numbers", function()
    assert.are.equal(5, mymath.add(2, 3))
  end)

  it("computes a factorial", function()
    assert.are.equal(120, mymath.factorial(5))
  end)

  it("errors on invalid input", function()
    assert.has_error(function() mymath.add(nil, 1) end)
  end)
end)
```

Run the whole suite from the project root:

```bash
busted                 # discovers and runs spec/**/*_spec.lua
busted --verbose       # print each test
busted spec/mymath_spec.lua   # run one file
```

---

### Setup and teardown hooks

```lua
describe("account", function()
  local account

  before_each(function()
    account = require("account").new(100)   -- fresh state per test
  end)

  after_each(function()
    account = nil
  end)

  it("deposits funds", function()
    account:deposit(50)
    assert.are.equal(150, account:get_balance())
  end)
end)
```

`before_each`/`after_each` run around every `it`; `setup`/`teardown` run once per `describe` block.

---

### luassert assertions

luassert provides a fluent family of matchers. Common ones:

```lua
assert.is_true(cond)
assert.is_nil(value)
assert.are.equal(expected, actual)          -- primitive / identity equality
assert.are.same({ 1, 2 }, actual)           -- deep table equality
assert.has_error(function() f() end, "msg") -- expects f to raise (optionally with msg)
assert.is_not_nil(result)
```

`are.equal` compares by value/identity; `are.same` does a deep, recursive table comparison — the distinction matters constantly when asserting on tables.

---

### Spies and mocks

luassert can wrap a function to record how it was called (a spy) or replace it (a stub/mock).

```lua
it("calls the logger once", function()
  local logger = { info = function() end }
  local s = spy.on(logger, "info")

  do_work(logger)

  assert.spy(s).was_called(1)
  assert.spy(s).was_called_with("done")
end)
```

---

### Coverage with luacov

Run the suite under luacov, then generate the report.

```bash
busted --coverage        # runs tests and records coverage data
luacov                   # produces luacov.report.out
```

`luacov.report.out` lists per-file line coverage and highlights unexecuted lines.

---

### luaunit — the dependency-free alternative

When you cannot install rocks (embedded hosts, minimal CI), luaunit is a single file you can vendor.

```lua
local lu = require("luaunit")

TestMath = {}

function TestMath:testAdd()
  lu.assertEquals(mymath.add(2, 3), 5)
end

os.exit(lu.LuaUnit.run())
```

---

## When to use

- **busted** for essentially all standalone and library projects — the community default
- **luassert** `are.same` for deep table comparisons; `are.equal` for scalars/identity
- **spies/mocks** to assert on interactions with collaborators (loggers, clients) without hitting real systems
- **luacov** to track coverage and find untested branches, especially in CI
- **luaunit** when you must avoid external dependencies or run inside a constrained embedded host

## When NOT to use

- Do not hand-roll bare `assert(...)` scripts for anything beyond a throwaway check — you lose reporting, isolation, and setup/teardown
- Do not use `are.equal` to compare two distinct tables with equal contents — it checks identity; use `are.same`
- Do not share mutable state between `it` blocks — reset it in `before_each` to keep tests independent
- Do not skip `--coverage` in CI if coverage is a project goal; running busted alone records nothing for luacov

---

## References

- [busted — documentation](https://lunarmodules.github.io/busted/)
- [luassert — GitHub](https://github.com/lunarmodules/luassert)
- [luacov — GitHub](https://github.com/lunarmodules/luacov)
- [luaunit — documentation](https://luaunit.readthedocs.io/)
- [LuaRocks — home](https://luarocks.org/)
