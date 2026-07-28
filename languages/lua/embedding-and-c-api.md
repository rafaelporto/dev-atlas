---
type: concept
tags:
  - language
  - lua
related:
  - languages/lua/types-and-tables
  - languages/lua/overview
language: "lua"
---
# Embedding and the C API

> Lua's defining use case: a C or C++ program creates a Lua state, runs scripts in it, and exchanges data through a virtual stack — this is how games, editors, and servers add scripting.

---

## What is it?

The **Lua C API** is the set of C functions a host application uses to embed the Lua interpreter. A host creates a `lua_State` (an independent interpreter instance), loads and runs Lua code in it, registers its own C functions so scripts can call back into the host, and moves values between C and Lua through a **virtual stack**.

This is not a niche feature bolted on afterward — embedding is the reason Lua exists. The standalone `lua` binary is itself a thin C program built on this same API.

---

## Why does it matter?

Lua rarely runs alone in production. It is the scripting brain inside a bigger C/C++ application: gameplay logic in a game engine, plugins in an editor, request handlers in a server, configuration in a device. All of that flows through the C API. Understanding the state, the stack, and error handling is what lets you expose exactly the right surface of your host to untrusted or user-supplied scripts — safely and with tight control over memory and capabilities.

---

## How it works

### The lua_State and the stack

Everything happens against a `lua_State *`. Values are not passed to API functions by C value; instead they live on a per-state **virtual stack**. C pushes arguments onto the stack, calls a function, and reads results back off the stack. Stack slots are addressed by index: `1` is the bottom, and negative indices count from the top (`-1` is the top).

```c
#include <lua.h>
#include <lauxlib.h>
#include <lualib.h>

int main(void) {
    lua_State *L = luaL_newstate();   /* create a fresh interpreter state */
    luaL_openlibs(L);                 /* load the standard libraries      */

    /* Run a string of Lua code */
    if (luaL_dostring(L, "print('hello from Lua')") != LUA_OK) {
        fprintf(stderr, "error: %s\n", lua_tostring(L, -1));
        lua_pop(L, 1);                /* pop the error message            */
    }

    lua_close(L);                     /* free the state                   */
    return 0;
}
```

`luaL_dostring` (and `luaL_dofile`) are auxiliary-library convenience wrappers that load and run code, leaving either results or an error message on the stack.

---

### Reading globals set by a script

To fetch a value the script defined, push it from the globals table onto the stack, then convert it to a C type.

```c
luaL_dostring(L, "width = 1920");

lua_getglobal(L, "width");            /* push _G.width onto the stack     */
if (lua_isinteger(L, -1)) {
    lua_Integer w = lua_tointeger(L, -1);
    printf("width = %lld\n", (long long) w);
}
lua_pop(L, 1);                        /* restore the stack                */
```

---

### Registering a C function callable from Lua

A C function exposed to Lua has the signature `int (lua_State *L)`. It reads its arguments from the stack (helped by `luaL_check*`), pushes its results, and returns *how many* results it left on the stack.

```c
/* Lua signature: sum(a, b) -> number */
static int l_sum(lua_State *L) {
    double a = luaL_checknumber(L, 1);   /* 1st argument, or raise a type error */
    double b = luaL_checknumber(L, 2);   /* 2nd argument                         */
    lua_pushnumber(L, a + b);            /* push the single result               */
    return 1;                            /* we return 1 value                     */
}

int main(void) {
    lua_State *L = luaL_newstate();
    luaL_openlibs(L);

    lua_pushcfunction(L, l_sum);         /* push the C function          */
    lua_setglobal(L, "sum");             /* _G.sum = l_sum               */

    luaL_dostring(L, "print(sum(2, 3))"); /* prints 5.0                  */

    lua_close(L);
    return 0;
}
```

`luaL_checknumber` doubles as validation: if argument 1 is not a number, it raises a Lua error with a clear message and never returns.

---

### Registering a library (a table of functions)

To expose several functions as one module, fill a `luaL_Reg` array and register it into a table.

```c
static int l_add(lua_State *L) { lua_pushnumber(L, luaL_checknumber(L,1) + luaL_checknumber(L,2)); return 1; }
static int l_mul(lua_State *L) { lua_pushnumber(L, luaL_checknumber(L,1) * luaL_checknumber(L,2)); return 1; }

static const luaL_Reg mathx[] = {
    { "add", l_add },
    { "mul", l_mul },
    { NULL,  NULL  },   /* sentinel terminates the array */
};

/* Entry point loaded by require("mathx") when built as a .so/.dll */
int luaopen_mathx(lua_State *L) {
    luaL_newlib(L, mathx);   /* create a table and fill it with the functions */
    return 1;                /* return the module table                        */
}
```

Named `luaopen_<modname>`, this becomes a loadable C module: `local mathx = require("mathx")`.

---

### Calling a Lua function from C with error protection

To call into Lua safely, push the function and its arguments, then use `lua_pcall`, which catches errors instead of aborting the host.

```c
luaL_dostring(L, "function greet(name) return 'hi ' .. name end");

lua_getglobal(L, "greet");     /* push the function            */
lua_pushstring(L, "world");    /* push its argument            */

/* lua_pcall(L, nargs, nresults, msgh) */
if (lua_pcall(L, 1, 1, 0) != LUA_OK) {
    fprintf(stderr, "call failed: %s\n", lua_tostring(L, -1));
    lua_pop(L, 1);
} else {
    printf("%s\n", lua_tostring(L, -1)); /* hi world */
    lua_pop(L, 1);
}
```

Using `lua_pcall` (rather than `lua_call`) is essential when embedding: an unprotected error in a script would otherwise `longjmp` out and can terminate the host.

---

### The golden rule: keep the stack balanced

Every value you push must eventually be popped (or consumed by a call). Leaking stack slots across many calls eventually overflows the stack. The auxiliary library helps — `luaL_checkstack` guards growth, and `lua_settop`/`lua_pop` reset it — but stack discipline is the C programmer's responsibility.

---

## Examples

### Sandboxing: expose only what a script may touch

Because the host controls which libraries and globals a state gets, you can run untrusted scripts with a restricted surface — omit `luaL_openlibs` and register only safe functions.

```c
lua_State *L = luaL_newstate();       /* no standard libraries loaded */
/* expose a curated API only */
lua_pushcfunction(L, l_sum);
lua_setglobal(L, "sum");
/* io, os, and file access are simply unavailable to the script */
luaL_dostring(L, "return sum(2, 3)");
```

This capability-by-omission model is a major reason Lua is the embedded language for games and plugins.

---

## When to use

- Adding a scripting layer to a C/C++ application (games, editors, DAWs, network appliances)
- Exposing host functionality to designers or end users as safe, high-level Lua APIs
- Writing performance-critical C modules that Lua code loads via `require`
- Sandboxing untrusted user scripts by controlling exactly which functions a state receives
- Using Lua as a readable, executable configuration format inside a native program

## When NOT to use

- Do not use `lua_call` for untrusted or fallible code — use `lua_pcall` so errors do not abort the host
- Do not forget to balance the stack — leaked slots eventually overflow it
- Do not share one `lua_State` across OS threads without external locking — a state is not thread-safe
- Do not `luaL_openlibs` when running untrusted scripts — it grants `io`/`os` and filesystem access
- Do not mix Lua versions between the interpreter and any precompiled C modules — the ABI differs across versions

---

## References

- [Lua 5.4 Reference Manual — The Application Program Interface](https://www.lua.org/manual/5.4/manual.html#4)
- [Lua 5.4 Reference Manual — The Stack](https://www.lua.org/manual/5.4/manual.html#4.1)
- [Lua 5.4 Reference Manual — The Auxiliary Library](https://www.lua.org/manual/5.4/manual.html#5)
- [Programming in Lua — An Overview of the C API](https://www.lua.org/pil/24.html)
- [Programming in Lua — Extending your Application](https://www.lua.org/pil/28.html)
- *Programming in Lua, 4th edition* — Roberto Ierusalimschy (2016), Part IV
