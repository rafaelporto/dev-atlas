---
type: concept
tags:
  - language
  - java
  - immutability
related:
  - languages/java/paradigms
  - languages/java/collections-and-streams
  - languages/java/java-patterns
language: "java"
---
# Types and Generics

> Java's type system is static, nominal, and class-based, extended by generics for type-safe containers and by modern features like records, sealed classes, and `var`.

---

## What is it?

Java's type system checks types at compile time (static) and matches them by declared name (nominal). Every value is either a **primitive** (`int`, `long`, `double`, `boolean`, `char`, `byte`, `short`, `float`) or a **reference** to an object.

**Generics** let a class or method be parameterized by type — `List<String>` is a list guaranteed to hold strings — so the compiler enforces type safety instead of forcing runtime casts. Recent language features (records, sealed classes, `var`) build on this foundation to reduce boilerplate and model data more precisely.

---

## Why does it matter?

Before generics (added in Java 5), collections held `Object` and every read required a cast that could fail at runtime. Generics moved those errors to compile time. Before records (Java 16), a simple immutable data class needed a constructor, getters, `equals`, `hashCode`, and `toString` — dozens of lines the IDE generated and everyone had to review. Before sealed classes (Java 17), you could not tell the compiler "these are the *only* subtypes," so exhaustiveness checks were impossible.

These features together let Java model data precisely and concisely, catching whole categories of bugs before the program runs.

---

## How it works

### Primitives vs references

Primitives store the value directly; references store a pointer to a heap object. Each primitive has a wrapper class (`Integer`, `Long`, `Double`), and **autoboxing** converts between them automatically.

```java
int primitive = 42;
Integer boxed = primitive;   // autoboxing
int back = boxed;            // auto-unboxing
```

Wrappers can be `null`; primitives cannot. Prefer primitives in hot paths — boxing allocates objects.

### Generics

A generic type parameter is declared in angle brackets. The compiler enforces it, then **erases** it (type erasure): at runtime `List<String>` and `List<Integer>` are the same raw `List`.

```java
// Generic method with a bounded type parameter
static <T extends Comparable<T>> T max(List<T> items) {
    T best = items.get(0);
    for (T item : items) {
        if (item.compareTo(best) > 0) best = item;
    }
    return best;
}
```

**Wildcards** express variance:

```java
// Producer extends, consumer super (the PECS rule)
void copy(List<? extends Number> src, List<? super Number> dst) {
    for (Number n : src) dst.add(n);
}
```

- `? extends T` — read-only view; you can *get* a `T` (covariant).
- `? super T` — write view; you can *put* a `T` (contravariant).

Type erasure means you cannot write `new T[]`, call `instanceof List<String>`, or overload solely on generic type arguments.

### `var` — local type inference

Since Java 10, `var` infers a local variable's type from its initializer. It is still statically typed — just less verbose. It works only for local variables with an initializer, not fields, parameters, or return types.

```java
var names = new ArrayList<String>();  // inferred as ArrayList<String>
var count = 10;                       // inferred as int
```

### Records — concise immutable data

A record declares an immutable data carrier. The compiler generates the constructor, accessors, `equals`, `hashCode`, and `toString`.

```java
record Money(long amountCents, String currency) {
    // Compact constructor for validation
    Money {
        if (amountCents < 0) throw new IllegalArgumentException("negative amount");
        if (currency.length() != 3) throw new IllegalArgumentException("bad currency");
    }

    // You can still add derived methods
    String formatted() {
        return "%.2f %s".formatted(amountCents / 100.0, currency);
    }
}
```

### Sealed classes — closed hierarchies

A sealed type restricts which classes may extend or implement it, enabling exhaustive `switch`.

```java
sealed interface Shape permits Circle, Rectangle {}

record Circle(double radius) implements Shape {}
record Rectangle(double width, double height) implements Shape {}

static double area(Shape shape) {
    // No default needed: the compiler knows all permitted subtypes
    return switch (shape) {
        case Circle c    -> Math.PI * c.radius() * c.radius();
        case Rectangle r -> r.width() * r.height();
    };
}
```

Sealed hierarchies plus record patterns make Java capable of algebraic-data-type-style modeling.

---

## Examples

### Record patterns and deconstruction (Java 21)

```java
sealed interface Expr permits Num, Add, Mul {}
record Num(int value) implements Expr {}
record Add(Expr left, Expr right) implements Expr {}
record Mul(Expr left, Expr right) implements Expr {}

static int eval(Expr expr) {
    return switch (expr) {
        case Num(int v)          -> v;
        case Add(Expr l, Expr r) -> eval(l) + eval(r);
        case Mul(Expr l, Expr r) -> eval(l) * eval(r);
    };
}
```

### A generic, type-safe cache

```java
final class Cache<K, V> {
    private final Map<K, V> store = new HashMap<>();

    V getOrCompute(K key, Function<K, V> compute) {
        return store.computeIfAbsent(key, compute);
    }
}

var cache = new Cache<String, Integer>();
int len = cache.getOrCompute("hello", String::length); // 5
```

---

## When to use

- **Generics** — for any container, repository, or utility that should work across types without losing type safety.
- **`var`** — when the initializer already makes the type obvious (`var users = new ArrayList<User>()`).
- **Records** — for DTOs, value objects, API request/response bodies, and any immutable data with structural equality.
- **Sealed types** — when a type has a fixed, known set of variants and you want exhaustive `switch` handling.

---

## When NOT to use

- **`var` when it hurts readability** — `var result = service.process()` hides the type; write it out.
- **Records for entities with identity or mutable state** — records are immutable and use structural equality; JPA entities need mutable fields and identity equality.
- **Raw types** (`List` instead of `List<String>`) — they defeat generics and generate unchecked warnings.
- **Overusing bounded wildcards** in public APIs — they can make signatures hard to read; apply PECS only where variance is genuinely needed.

---

## References

- [The Java Tutorials — Generics](https://docs.oracle.com/javase/tutorial/java/generics/index.html)
- [JEP 395: Records](https://openjdk.org/jeps/395)
- [JEP 409: Sealed Classes](https://openjdk.org/jeps/409)
- [JEP 440: Record Patterns](https://openjdk.org/jeps/440)
- [Local Variable Type Inference — dev.java](https://dev.java/learn/language-basics/using-var/)
- *Effective Java* — Joshua Bloch (3rd ed., Addison-Wesley, 2018), Chapter 5: Generics
