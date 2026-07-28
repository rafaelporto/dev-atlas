---
type: concept
tags:
  - language
  - lua
  - concurrency
related:
  - languages/lua/paradigms
  - languages/lua/error-handling
language: "lua"
---
# Coroutines in Lua

> A coroutine is a function you can pause and resume — Lua's built-in mechanism for cooperative multitasking, generators, and async-style code without threads.

---

## What is it?

A coroutine is an independent line of execution that can **suspend itself** with `coroutine.yield` and later be **resumed** by another part of the program with `coroutine.resume`, continuing exactly where it left off with its local state intact. Unlike OS threads, coroutines are cooperative and single-threaded: only one runs at a time, and a switch happens only where the code explicitly yields.

Lua's `coroutine` library is part of the core language. A coroutine has the value type `thread` (though it is not an OS thread).

---

## Why does it matter?

Coroutines give Lua a lightweight way to express problems that would otherwise need threads, callbacks, or explicit state machines:

- **Generators / iterators** that produce values lazily, one at a time
- **Cooperative schedulers** that interleave many tasks on one thread
- **Async I/O** without callback nesting — frameworks like OpenResty use coroutines so that "blocking" Lua code actually yields to an event loop under the hood

Because switching happens only at explicit `yield` points, coroutines sidestep data races entirely: there is no preemption, so shared state is never interrupted mid-update.

---

## How it works

### The four core operations

| Function | Purpose |
|---|---|
| `coroutine.create(f)` | Create a coroutine wrapping function `f`; returns a `thread` (does not start it) |
| `coroutine.resume(co, ...)` | Start or continue `co`; arguments are passed to `f` (first resume) or become the return of the paused `yield` |
| `coroutine.yield(...)` | Suspend the running coroutine; its arguments become the results of `resume` |
| `coroutine.status(co)` | `"suspended"`, `"running"`, `"normal"`, or `"dead"` |

Values flow both ways: `resume` sends values *into* the coroutine, `yield` sends values *out*.

```lua
local co = coroutine.create(function(a, b)
  print("start", a, b)          -- start   1   2
  local c = coroutine.yield(a + b)  -- yields 3; c gets the next resume's arg
  print("resumed with", c)      -- resumed with   10
  return "done"
end)

print(coroutine.resume(co, 1, 2))  -- true   3   (from yield)
print(coroutine.resume(co, 10))    -- true   done (from return)
print(coroutine.status(co))        -- dead
print(coroutine.resume(co))        -- false  cannot resume dead coroutine
```

---

### The lifecycle

```
create ──▶ suspended ──resume──▶ running ──yield──▶ suspended ──…──▶ dead
                                        └── return / error ─────────────┘
```

- A fresh coroutine is **suspended**.
- `resume` moves it to **running** until it yields, returns, or errors.
- After the body returns or errors, it becomes **dead** and cannot be resumed again.

---

### coroutine.wrap — coroutines as iterators

`coroutine.wrap(f)` returns a *function* instead of a thread. Each call resumes the coroutine and returns the yielded values directly (no `true`/`false` status). This is the idiomatic way to build generators for `for` loops.

```lua
local function range(n)
  return coroutine.wrap(function()
    for i = 1, n do
      coroutine.yield(i)
    end
  end)
end

for i in range(3) do
  print(i)     -- 1  2  3
end
```

The trade-off: `wrap` re-raises errors from the coroutine (it does not protect them like `resume` does).

---

### Error behavior

`coroutine.resume` acts like a protected call: if the coroutine raises, `resume` returns `false` plus the error rather than crashing. See [Error Handling](error-handling.md).

```lua
local co = coroutine.create(function() error("boom") end)
local ok, err = coroutine.resume(co)
print(ok, err)   -- false   input:1: boom
```

---

## Examples

### A cooperative scheduler

Round-robin between tasks that each yield to give others a turn.

```lua
local tasks = {}

local function spawn(name, steps)
  tasks[#tasks + 1] = coroutine.create(function()
    for i = 1, steps do
      print(name .. " step " .. i)
      coroutine.yield()          -- give up control
    end
  end)
end

spawn("A", 2)
spawn("B", 3)

-- Run until every coroutine is dead
while #tasks > 0 do
  for i = #tasks, 1, -1 do
    local ok = coroutine.resume(tasks[i])
    if coroutine.status(tasks[i]) == "dead" then
      table.remove(tasks, i)
    end
  end
end
-- Output interleaves A and B step by step
```

### A lazy producer/consumer

```lua
local producer = coroutine.wrap(function()
  for line in io.lines("data.txt") do
    coroutine.yield(line)        -- yield one line at a time, lazily
  end
end)

for line in producer do
  print("#" .. line)
end
```

---

## When to use

- Building lazy generators and custom iterators for `for` loops
- Cooperative scheduling of many logical tasks on a single thread
- Async/event-loop I/O where a framework resumes coroutines when data is ready (OpenResty, `copas`)
- Turning a callback-based API into linear, readable code (yield instead of nesting callbacks)
- State machines where each state is naturally a segment between yields

## When NOT to use

- Do not expect parallelism across CPU cores — coroutines run one at a time on one thread
- Do not use them for preemptive tasks: a coroutine that never yields blocks everything
- Do not use `wrap` when you need to *catch* errors — use `create` + `resume` (which protects) instead
- Do not resume a `dead` coroutine — check `coroutine.status` if unsure
- Do not reach for coroutines when a plain loop or closure is clearer

---

## References

- [Lua 5.4 Reference Manual — Coroutines](https://www.lua.org/manual/5.4/manual.html#2.6)
- [Lua 5.4 Reference Manual — `coroutine` library](https://www.lua.org/manual/5.4/manual.html#6.2)
- [Programming in Lua — Coroutines](https://www.lua.org/pil/9.html)
- [Programming in Lua — Coroutines as Iterators](https://www.lua.org/pil/9.3.html)
- *Programming in Lua, 4th edition* — Roberto Ierusalimschy (2016)
