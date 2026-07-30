---
type: concept
tags:
  - language
  - lua
  - error-handling
related:
  - languages/lua/coroutines
  - languages/lua/paradigms
language: "lua"
---
# Error Handling in Lua

> Lua handles errors by raising them with `error` and catching them in protected calls (`pcall` / `xpcall`) — there is no `try`/`catch`, and error values can be any Lua value, not just strings.

---

## What is it?

Lua's error model has two halves. To signal a failure you call `error(value)` (or a library function does it for you). To *contain* a failure you run code inside a **protected call**: `pcall` or `xpcall`. A protected call catches any error raised beneath it, so an error unwinds the stack only up to the nearest protecting call rather than crashing the program.

Errors are ordinary Lua values. The idiom is to raise a string message, but you can raise a table (an "error object") to carry structured data.

---

## Why does it matter?

Because there is no `try`/`catch` keyword, error handling in Lua is a deliberate choice at each boundary: you either let an error propagate (and crash the script, which is often correct for programmer errors) or you wrap the risky call in `pcall`. Two distinct conventions coexist in the ecosystem — *raising* errors vs. *returning* `nil, err` — and knowing when each is idiomatic keeps code predictable and interoperable with the standard library.

---

## How it works

### Raising an error

`error(message, level)` stops the current function and propagates the error up the stack. By default it prepends the source position; the `level` argument controls which position is reported.

```lua
local function set_age(age)
  if type(age) ~= "number" then
    error("age must be a number", 2)  -- level 2: blame the caller's line
  end
  -- ...
end
```

`assert(v, message)` is a shorthand: it raises `message` (or a default) when `v` is falsy, and otherwise returns its arguments.

```lua
local function open_config(path)
  local file = assert(io.open(path, "r"))  -- raises if io.open returns nil, err
  return file
end
```

---

### Catching errors with pcall

`pcall(f, ...)` calls `f` in *protected mode*. It returns `true` plus `f`'s results on success, or `false` plus the error value on failure. It never itself raises.

```lua
local ok, result = pcall(function()
  return 10 / 0        -- in Lua this yields inf, so force a real error:
end)

local ok, err = pcall(function()
  error("boom")
end)

print(ok, err)  -- false   input:2: boom
```

A realistic use — parsing that may fail:

```lua
local ok, value = pcall(load_and_parse, path)
if not ok then
  print("failed to load config: " .. tostring(value))
  return
end
-- use value safely here
```

---

### xpcall and message handlers

`xpcall(f, handler, ...)` is like `pcall` but calls `handler` **at the point the error occurs**, before the stack unwinds. This is how you capture a traceback, because after unwinding the stack is gone.

```lua
local function handler(err)
  return debug.traceback(tostring(err), 2)  -- attach a stack trace
end

local ok, result = xpcall(risky_function, handler)
if not ok then
  io.stderr:write(result, "\n")  -- result includes the traceback
end
```

---

### Error objects: raising tables

Since the error value can be any type, you can raise a table to carry structured information. A message handler or the top level can then branch on it.

```lua
local function fetch(url)
  if not url:match("^https?://") then
    error({ code = "bad_url", url = url })
  end
  -- ...
end

local ok, err = pcall(fetch, "ftp://x")
if not ok and type(err) == "table" and err.code == "bad_url" then
  print("rejected: " .. err.url)   -- rejected: ftp://x
end
```

Note: when an uncaught error object is a non-string, the default traceback cannot stringify it unless it has a `__tostring` metamethod.

---

### The `nil, err` return convention

Much of the standard library does **not** raise on expected failures; it returns `nil` plus an error message (and sometimes a numeric code). `io.open`, `os.rename`, and `tonumber` follow this style.

```lua
local file, err = io.open("/no/such/file", "r")
if not file then
  print("could not open: " .. err)   -- could not open: /no/such/file: No such file or directory
  return
end
```

**Rule of thumb:** use `error`/`assert` for *programmer* mistakes and truly exceptional conditions; return `nil, err` for *expected* failures the caller should routinely handle (missing file, invalid input, network timeout).

---

### Errors and coroutines

An error raised inside a coroutine is not propagated automatically — `coroutine.resume` behaves like `pcall`, returning `false, err` instead of crashing. See [Coroutines](coroutines.md).

```lua
local co = coroutine.create(function() error("inside") end)
print(coroutine.resume(co))  -- false   input:1: inside
```

---

## Examples

A config loader that ties the model together — `error` with a structured object for programmer/validation faults, the `nil, err` convention for an expected missing file, `xpcall` to capture a traceback at the top boundary, and branching on the error object:

```lua
local function parse_config(text)
  local port = tonumber(text:match("port%s*=%s*(%d+)"))
  if not port then
    error({ code = "bad_config", detail = "missing or non-numeric 'port'" })
  end
  return { port = port }
end

-- Expected failure: return nil, err rather than raising
local function read_file(path)
  local file, err = io.open(path, "r")
  if not file then return nil, err end
  local text = file:read("a")
  file:close()
  return text
end

local function load(path)
  local text, err = read_file(path)
  if not text then error({ code = "io", detail = err }) end
  return parse_config(text)
end

local function handler(e)
  return debug.traceback(type(e) == "table" and e.code or tostring(e), 2)
end

local ok, result = xpcall(load, handler, "/etc/app.conf")
if ok then
  print("port = " .. result.port)
elseif type(result) == "string" then
  io.stderr:write(result, "\n")   -- traceback whose head is the error code
end
```

---

## When to use

- Use `error` / `assert` to reject invalid arguments and enforce invariants (programmer errors)
- Use `pcall` to contain failures at boundaries you control — plugin loading, config parsing, request handlers
- Use `xpcall` with `debug.traceback` when you need a stack trace at the failure site (loggers, top-level handlers)
- Return `nil, err` for expected, recoverable failures the caller must handle routinely
- Raise error *objects* (tables) when the handler needs to branch on structured error data

## When NOT to use

- Do not use `pcall` for ordinary control flow — it is exception handling, not `if`/`else`
- Do not swallow errors silently (`pcall(f)` and ignoring the result) without a documented reason
- Do not raise plain strings when callers need to distinguish error *kinds* — use an error object with a `code`
- Do not expect `debug.traceback` to work *after* the stack has unwound — capture it in an `xpcall` handler
- Do not mix conventions inconsistently in one API: pick raise *or* `nil, err` per function and document it

---

## References

- [Lua 5.4 Reference Manual — Error Handling](https://www.lua.org/manual/5.4/manual.html#2.3)
- [Lua 5.4 Reference Manual — `pcall` / `xpcall` / `error` / `assert`](https://www.lua.org/manual/5.4/manual.html#6.1)
- [Programming in Lua — Error Handling and Exceptions](https://www.lua.org/pil/8.4.html)
- [Programming in Lua — Error Messages and Tracebacks](https://www.lua.org/pil/8.5.html)
- *Programming in Lua, 4th edition* — Roberto Ierusalimschy (2016)
