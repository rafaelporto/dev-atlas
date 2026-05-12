# Types and Interfaces in Go

> Go's type system is statically typed, structurally typed for interfaces, and built around composition rather than inheritance.

---

## What is it?

Go's type system defines how values are stored, passed, and constrained at compile time. It includes basic types, composite types (structs, arrays, slices, maps), function types, and interfaces. The most distinctive feature is **implicit interface satisfaction**: a type satisfies an interface simply by implementing its methods — no declaration is needed.

---

## Why does it matter?

The type system is the foundation of every Go program. Understanding zero values, pointer vs value semantics, and how interfaces work unlocks idiomatic Go design. Misunderstanding these leads to the most common Go bugs: nil pointer dereferences, unexpected copies of structs, and interface satisfaction surprises.

---

## How it works

### Basic types

```go
// Numeric
var i int = 42
var f float64 = 3.14
var b byte = 255    // alias for uint8
var r rune = 'A'    // alias for int32 (Unicode code point)

// String — immutable byte slice
s := "hello"

// Boolean
ok := true
```

Go does **not** implicitly convert between numeric types. `int` and `int64` are distinct types even on a 64-bit machine.

---

### Zero values

Every type in Go has a zero value — the default when no initializer is provided. This eliminates uninitialized variable bugs.

| Type | Zero value |
|---|---|
| `int`, `float64` | `0` |
| `bool` | `false` |
| `string` | `""` |
| pointer, slice, map, channel, function | `nil` |
| struct | each field set to its zero value |

```go
var s string   // s == ""
var n int      // n == 0
var p *int     // p == nil
var sl []int   // sl == nil, len(sl) == 0
```

---

### Structs

Structs are the primary way to group related data. There are no classes.

```go
type User struct {
    ID    int
    Name  string
    Email string
}

// Constructor by convention — a plain function, not a keyword
func NewUser(id int, name, email string) *User {
    return &User{ID: id, Name: name, Email: email}
}
```

Fields starting with an uppercase letter are **exported** (visible outside the package). Lowercase fields are unexported.

---

### Methods

Methods are functions with a **receiver** — they can be defined on any named type in the same package.

```go
type Rectangle struct {
    Width, Height float64
}

// Value receiver — receives a copy
func (r Rectangle) Area() float64 {
    return r.Width * r.Height
}

// Pointer receiver — receives a pointer, can mutate
func (r *Rectangle) Scale(factor float64) {
    r.Width *= factor
    r.Height *= factor
}
```

**Value receiver** when the method does not mutate the struct and the struct is small.
**Pointer receiver** when the method mutates the struct, or the struct is large (avoids copying).

Consistency matters: if any method on a type uses a pointer receiver, all methods should use pointer receivers.

---

### Interfaces

An interface defines a set of method signatures. Any type that implements all methods **implicitly satisfies** the interface — no `implements` keyword.

```go
type Writer interface {
    Write(p []byte) (n int, err error)
}

type Logger interface {
    Log(message string)
}

// ConsoleLogger satisfies Logger without declaring it
type ConsoleLogger struct{}

func (c ConsoleLogger) Log(message string) {
    fmt.Println(message)
}

func notify(l Logger, msg string) {
    l.Log(msg)
}
```

This is called **structural typing** (or duck typing): if it has the right methods, it satisfies the interface.

---

### The empty interface

`interface{}` (or `any` since Go 1.18) is satisfied by every type. Use it when the type is genuinely unknown at compile time — prefer typed interfaces otherwise.

```go
func printAnything(v any) {
    fmt.Printf("%T: %v\n", v, v)
}
```

---

### Type assertions and type switches

```go
var i interface{} = "hello"

// Type assertion — panics if wrong type
s := i.(string)

// Safe assertion
s, ok := i.(string)
if !ok {
    // handle mismatch
}

// Type switch
switch v := i.(type) {
case string:
    fmt.Println("string:", v)
case int:
    fmt.Println("int:", v)
default:
    fmt.Printf("unknown: %T\n", v)
}
```

---

### Struct embedding (composition)

Go achieves code reuse through embedding, not inheritance. Embedded types promote their methods to the outer type.

```go
type Base struct {
    ID int
}

func (b Base) Describe() string {
    return fmt.Sprintf("ID: %d", b.ID)
}

type Admin struct {
    Base            // embedded — not a parent class
    Permissions []string
}

a := Admin{Base: Base{ID: 1}, Permissions: []string{"read", "write"}}
fmt.Println(a.Describe()) // promoted from Base
fmt.Println(a.ID)         // promoted field
```

Embedding is **not** inheritance. `Admin` is not a `Base`. You cannot pass an `Admin` where a `Base` is expected unless `Base` is an interface. Method promotion can be overridden by defining a method with the same name on the outer struct.

---

### Generics (Go 1.18+)

Type parameters allow writing functions and types that work across multiple types while remaining type-safe.

```go
func Min[T int | float64](a, b T) T {
    if a < b {
        return a
    }
    return b
}

// Using the built-in constraints package
import "golang.org/x/exp/constraints"

func Sum[T constraints.Number](nums []T) T {
    var total T
    for _, n := range nums {
        total += n
    }
    return total
}
```

---

## When to use

- Use **value receivers** for small, read-only structs; **pointer receivers** for mutation or large structs
- Define **narrow interfaces** (1–3 methods) at the point of use — not at the point of definition
- Use **struct embedding** to share behavior between types without building a hierarchy
- Accept **interfaces** in function parameters to keep code testable and decoupled
- Return **concrete types** from constructors so callers can access all methods

## When NOT to use

- Do not define a large interface and then implement it with one struct — that is a class disguised as an interface
- Do not embed a type just to access its fields — compose with a named field instead when ownership is ambiguous
- Do not use `interface{}` / `any` as a shortcut for "I don't know the type yet" — define the interface
- Do not use pointer receivers inconsistently across methods of the same type
- Do not ignore the zero value — design structs so their zero value is valid and useful

---

## References

- [Go Specification — Types](https://go.dev/ref/spec#Types)
- [Go Specification — Interface types](https://go.dev/ref/spec#Interface_types)
- [Effective Go — Interfaces and other types](https://go.dev/doc/effective_go#interfaces_and_types)
- [Go Blog — The Go type system](https://go.dev/blog/type-system)
- [Go Blog — Generics Tutorial](https://go.dev/doc/tutorial/generics)
- *The Go Programming Language* — Donovan & Kernighan, Chapters 4 and 7
