---
type: concept
tags:
  - language
  - csharp
  - object-oriented
  - null-safety
related:
  - languages/csharp/overview
  - languages/csharp/paradigms
  - languages/csharp/error-handling
language: "csharp"
---
# Types and Nullability

> C# splits its type system into value types and reference types, and — since C# 8 — lets the compiler track which references may be `null`.

---

## What is it?

Every C# type is either a **value type** or a **reference type**. Value types (structs, enums, primitives like `int` and `bool`) hold their data directly and are copied on assignment. Reference types (classes, records, arrays, strings, delegates) hold a reference to data on the managed heap, and assignment copies the reference, not the object.

On top of this split, C# offers **nullable value types** (`int?`) and, since C# 8, **nullable reference types** — a compile-time feature that annotates whether a reference is allowed to be `null` and warns when you might dereference `null`.

---

## Why does it matter?

The value/reference distinction drives both **semantics** (does modifying a copy affect the original?) and **performance** (heap allocation and GC pressure vs. stack-friendly copies).

Nullable reference types attack the single most common runtime crash in C#: the `NullReferenceException`. By opting in, you move an entire class of bugs from runtime to compile time — the compiler flags "this could be null" before your code ships.

---

## How it works

### Value vs reference types

```csharp
struct PointStruct { public int X; }   // value type
class PointClass   { public int X; }    // reference type

var s1 = new PointStruct { X = 1 };
var s2 = s1;          // full copy
s2.X = 99;            // s1.X is still 1

var c1 = new PointClass { X = 1 };
var c2 = c1;          // reference copy — same object
c2.X = 99;            // c1.X is now 99
```

### Records — value semantics for reference types

Records are reference types that behave like values for equality. They generate `Equals`, `GetHashCode`, `ToString`, and support non-destructive mutation with `with`.

```csharp
public record Money(decimal Amount, string Currency);

var a = new Money(10m, "USD");
var b = new Money(10m, "USD");
Console.WriteLine(a == b);          // True — value equality
var c = a with { Amount = 20m };    // new record, a unchanged
```

Use `record struct` when you want value equality *and* value-type (copy) semantics.

### Structs vs classes — how to choose

| Prefer a `struct` when... | Prefer a `class`/`record` when... |
|---|---|
| The type is small (roughly ≤ 16 bytes) | The type is large or has many fields |
| It logically represents a single value | It has identity and lifecycle |
| It is immutable | It is mutable or reference-shared |
| You want to avoid heap allocation | You want reference semantics |

### Nullable value types

A value type cannot normally be `null`. Adding `?` wraps it in `Nullable<T>`:

```csharp
int? maybe = null;
if (maybe is int value)      // pattern match unwraps it
    Console.WriteLine(value);

int fallback = maybe ?? 0;   // null-coalescing
```

### Nullable reference types

Enable the feature project-wide in the `.csproj` (default in new templates):

```xml
<Nullable>enable</Nullable>
```

Now the compiler distinguishes `string` (must not be null) from `string?` (may be null):

```csharp
#nullable enable

string name = null;      // ⚠️ warning: assigning null to non-nullable
string? maybe = null;    // fine

int Length(string? text)
{
    // ⚠️ warning: possible null dereference
    // return text.Length;

    return text?.Length ?? 0;   // safe
}
```

Useful operators:

- `?.` — null-conditional access (returns `null` instead of throwing)
- `??` and `??=` — null-coalescing and null-coalescing assignment
- `!` — the null-forgiving operator: asserts "I know this isn't null" and silences the warning. Use sparingly; it disables the safety net.

---

## Examples

A nullable-aware domain type combining records and pattern matching:

```csharp
#nullable enable

public record User(Guid Id, string Name, string? Nickname);

static string DisplayName(User user) =>
    user.Nickname switch
    {
        null or ""     => user.Name,
        var nickname   => nickname,
    };
```

Guarding a public API boundary:

```csharp
public void Register(string email)
{
    ArgumentException.ThrowIfNullOrWhiteSpace(email);
    // email is guaranteed non-null, non-blank below
}
```

---

## When to use

- **Enable nullable reference types on every new project** — the compile-time null checks pay for themselves immediately.
- **Use records** for immutable data carriers, DTOs, domain values, and message types.
- **Use structs** for small, immutable values that are allocated in large numbers (coordinates, IDs, money).

---

## When NOT to use

- **Do not make large mutable structs** — copying cost and accidental-copy bugs outweigh the allocation savings; use a class.
- **Do not sprinkle `!` (null-forgiving)** to silence warnings you do not understand — it reintroduces the exact bug the feature prevents.
- **Do not use records where identity matters** — an entity with a database ID and mutable state is a class, not a value.

---

## References

- [Types (C# language tour) — Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/types/)
- [Nullable reference types — Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/csharp/nullable-references)
- [Records — Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/record)
- [Choosing between class and struct — Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/standard/design-guidelines/choosing-between-class-and-struct)
