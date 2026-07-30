---
type: concept
tags:
  - language
  - lua
  - database
related:
  - languages/lua/modules-and-luarocks
  - languages/lua/error-handling
language: "lua"
---
# Databases and ORMs in Lua

> Lua can talk to relational and key-value stores through libraries like LuaSQL, LuaDBI, and (on OpenResty) Lapis models — but its database ecosystem is thinner and less mature than the JVM's or .NET's.

---

## What is it?

Lua does not include database drivers in its standard library. Data access comes entirely from third-party rocks. The main options are:

- **LuaSQL** — a low-level driver collection (PostgreSQL, MySQL, SQLite3, ODBC) with a uniform connection/cursor API.
- **LuaDBI** — an alternative low-level layer with prepared statements across the same engines.
- **Lapis models** — a lightweight active-record-style ORM that runs on OpenResty (LuaJIT + NGINX), backed by PostgreSQL (via `pgmoon`) or MySQL.
- **redis-lua / lua-resty-redis** — clients for Redis; the `resty` variant is non-blocking inside OpenResty.

There is no dominant, general-purpose ORM comparable to Hibernate, Entity Framework, or ActiveRecord. The richest ORM-like experience is tied to the OpenResty/Lapis stack.

---

## Why does it matter?

Choosing how to reach a database in Lua is as much about *where Lua runs* as about the API. In a standalone script, LuaSQL or LuaDBI drivers block like any C library. Inside OpenResty, you must use the non-blocking `lua-resty-*` clients (or Lapis, which builds on them) so a query does not stall the NGINX event loop. Picking a blocking driver in an event-loop context is a classic performance mistake. Being honest about the ecosystem's maturity also sets expectations: you will often write more SQL by hand than you would in a JVM or .NET project.

---

## How it works

### LuaSQL — connect, query, iterate

LuaSQL exposes an *environment* → *connection* → *cursor* model. You install the driver for your engine (`luarocks install luasql-postgres`).

```lua
local driver = require("luasql.postgres")

local env = assert(driver.postgres())
local conn = assert(env:connect("dbname=app user=app host=127.0.0.1"))

-- Query returns a cursor you fetch rows from
local cursor = assert(conn:execute("SELECT id, email FROM users ORDER BY id"))

local row = cursor:fetch({}, "a")   -- "a" = fetch as a table keyed by column name
while row do
  print(row.id, row.email)
  row = cursor:fetch(row, "a")      -- reuse the same table
end

cursor:close()
conn:close()
env:close()
```

Note the manual resource management: cursors, connections, and the environment must each be closed. Errors follow the `nil, err` convention, which is why `assert` wraps each call — see [Error Handling](error-handling.md).

For writes, `execute` returns the affected row count:

```lua
local n = assert(conn:execute(
  string.format("UPDATE users SET active = true WHERE id = %d", id)
))
print(n .. " row(s) updated")
```

> **Security:** LuaSQL's `execute` takes a raw SQL string, so build queries with `conn:escape(value)` or prefer a driver/layer offering prepared statements. Never interpolate untrusted input directly.

---

### LuaDBI — prepared statements

LuaDBI (`luarocks install luadbi-postgresql`) offers parameter binding, which is the safer default for untrusted input.

```lua
local DBI = require("DBI")

local dbh = assert(DBI.Connect("PostgreSQL", "app", "app", "secret", "127.0.0.1", 5432))

local sth = assert(dbh:prepare("SELECT id, email FROM users WHERE active = ?"))
assert(sth:execute(true))          -- bind parameters positionally

for row in sth:rows(true) do        -- true => rows as name-keyed tables
  print(row.id, row.email)
end

sth:close()
dbh:close()
```

---

### Lapis models — an ORM on OpenResty

[Lapis](https://leafo.net/lapis/) is a web framework for OpenResty. Its `Model` class provides an active-record-style abstraction over PostgreSQL/MySQL, with class methods for the common queries. A model maps to a table by name.

```lua
local Model = require("lapis.db.model").Model

-- Maps to the "users" table
local Users = Model:extend("users")

-- Create
local user = Users:create({ name = "Ada", active = true })

-- Read
local found = Users:find(user.id)            -- by primary key
local actives = Users:select("where active = ?", true)

-- Update / delete
found:update({ active = false })
found:delete()
```

Lapis also ships schema migrations and a query builder (`lapis.db`). Because it runs on `pgmoon`/`lua-resty-mysql`, queries are non-blocking inside NGINX.

---

### Redis

For key-value and caching workloads, `redis-lua` works in standalone scripts; `lua-resty-redis` is the non-blocking client for OpenResty.

```lua
-- Standalone (blocking) with redis-lua
local redis = require("redis")
local client = redis.connect("127.0.0.1", 6379)

client:set("greeting", "hello")
print(client:get("greeting"))     -- hello
client:expire("greeting", 60)
```

---

## Ecosystem maturity — an honest assessment

| Aspect | Reality in Lua |
|---|---|
| Low-level drivers | Solid: LuaSQL and LuaDBI cover Postgres, MySQL, SQLite, ODBC |
| General-purpose ORM | Thin: no framework-agnostic ORM; the mature option (Lapis models) is coupled to OpenResty |
| Migrations / schema tooling | Limited: mostly via Lapis; otherwise hand-written SQL |
| Connection pooling | Environment-dependent: provided by OpenResty/`lua-resty-*`; scarce for plain scripts |
| Async / non-blocking access | Only inside OpenResty via `lua-resty-*` clients |

Compared with the JVM (Hibernate, jOOQ) or .NET (Entity Framework), Lua's data layer expects you to write more SQL by hand and offers far fewer batteries-included abstractions. This reflects Lua's role as an embedded/scripting language rather than a standalone application platform.

---

## Examples

A standalone read-then-write flow using LuaDBI's prepared statements (the safer default), following the `nil, err` convention with `assert` at each boundary and closing every resource:

```lua
local DBI = require("DBI")

local function activate_recent(min_id)
  local dbh = assert(DBI.Connect("PostgreSQL", "app", "app", "secret", "127.0.0.1", 5432))

  -- Read with a bound parameter — never string-interpolate untrusted input
  local sel = assert(dbh:prepare("SELECT id, name FROM users WHERE id >= ?"))
  assert(sel:execute(min_id))

  local ids = {}
  for row in sel:rows(true) do          -- true => name-keyed row tables
    print(row.id, row.name)
    ids[#ids + 1] = row.id
  end
  sel:close()

  -- Write, also parameterized
  local upd = assert(dbh:prepare("UPDATE users SET active = true WHERE id >= ?"))
  assert(upd:execute(min_id))
  dbh:commit()
  upd:close()

  dbh:close()
  return #ids
end

print(activate_recent(100) .. " user(s) processed")
```

Inside OpenResty this same logic would use `lua-resty-*` (or Lapis models) so the query stays non-blocking.

---

## When to use

- Talking to SQLite/Postgres/MySQL from a standalone Lua script → LuaSQL or LuaDBI (prefer LuaDBI's prepared statements)
- Building a web app or API on OpenResty → Lapis models + `lapis.db`
- Caching, sessions, rate limiting, or queues → Redis via `lua-resty-redis` (OpenResty) or `redis-lua` (standalone)
- Embedding SQLite for local, file-based storage in a tool or game

## When NOT to use

- Do not use blocking drivers (LuaSQL/LuaDBI/`redis-lua`) inside OpenResty — they stall the event loop; use `lua-resty-*` instead
- Do not interpolate untrusted values into SQL strings — use prepared statements or `conn:escape`
- Do not expect a full-featured, framework-agnostic ORM — for heavy relational/ORM needs the JVM or .NET are better platforms
- Do not forget to close cursors/connections in LuaSQL — there is no automatic scope cleanup outside `__gc`

---

## References

- [LuaSQL — documentation](https://lunarmodules.github.io/luasql/)
- [LuaDBI — GitHub](https://github.com/mwild-lua/luadbi)
- [Lapis — Models and Database](https://leafo.net/lapis/reference/database.html)
- [Lapis — home](https://leafo.net/lapis/)
- [lua-resty-redis — GitHub](https://github.com/openresty/lua-resty-redis)
- [OpenResty — home](https://openresty.org/)
