---
type: concept
tags:
  - language
  - java
  - object-oriented
  - functional
  - imperative
related:
  - languages/java/overview
  - languages/java/types-and-generics
  - languages/java/collections-and-streams
language: "java"
---
# Java Paradigms

> Java is object-oriented at its core, imperative in its statements, and — since Java 8 — supports a practical subset of functional programming through lambdas and streams.

---

## What is it?

A programming paradigm is a style of structuring code. Java does not commit to a single one: it began as a class-based, object-oriented language with an imperative statement model, and over time absorbed functional features. Understanding which paradigm a given piece of Java code leans on helps you read it and write it idiomatically.

Java supports three paradigms in practice:

1. **Object-oriented** — the default; code is organized around classes, objects, encapsulation, inheritance, and polymorphism.
2. **Imperative / procedural** — inside methods, statements execute in sequence with mutable state and control flow.
3. **Functional** — lambdas, method references, and the Stream API bring first-class functions and declarative data processing.

---

## Why does it matter?

Java's reputation for verbosity comes largely from code that uses only the object-oriented and imperative styles when a functional approach would be clearer. Modern Java blends the paradigms: an OOP domain model, imperative logic where clarity demands it, and functional pipelines for transforming collections.

Knowing when each paradigm fits keeps code readable. A `for` loop that mutates a counter is fine; a ten-line loop that filters, maps, and sums is usually a one-line stream. Conversely, forcing everything into streams produces unreadable one-liners. Idiomatic Java picks the right tool per problem.

---

## How it works

### Object-oriented: classes and polymorphism

Java's unit of modularity is the class. Behavior is attached to objects; polymorphism is achieved through interfaces and inheritance.

```java
interface Shape {
    double area();
}

final class Circle implements Shape {
    private final double radius;

    Circle(double radius) { this.radius = radius; }

    @Override
    public double area() { return Math.PI * radius * radius; }
}

final class Rectangle implements Shape {
    private final double width, height;

    Rectangle(double width, double height) {
        this.width = width;
        this.height = height;
    }

    @Override
    public double area() { return width * height; }
}
```

The four pillars of OOP as Java expresses them:

- **Encapsulation** — fields are `private`; access is controlled through methods.
- **Inheritance** — `extends` for classes, `implements` for interfaces.
- **Polymorphism** — a `Shape` reference can hold any implementation; the call dispatches at runtime.
- **Abstraction** — interfaces and abstract classes define contracts without implementation.

### Imperative: statements and control flow

Inside methods, Java is a conventional imperative language: assignments, loops, and conditionals mutating local state.

```java
int total = 0;
for (int i = 0; i < prices.length; i++) {
    if (prices[i] > 0) {
        total += prices[i];
    }
}
```

### Functional: lambdas, method references, streams

Since Java 8, functions are values. A lambda implements a **functional interface** (an interface with exactly one abstract method), and the Stream API composes transformations declaratively.

```java
import java.util.List;

List<Integer> prices = List.of(10, -5, 20, 30);

int total = prices.stream()
        .filter(p -> p > 0)          // lambda
        .mapToInt(Integer::intValue) // method reference
        .sum();                      // terminal operation
```

Common functional interfaces live in `java.util.function`:

| Interface | Signature | Use |
|---|---|---|
| `Function<T,R>` | `R apply(T)` | Transform a value |
| `Predicate<T>` | `boolean test(T)` | Filter / test a condition |
| `Consumer<T>` | `void accept(T)` | Side effect (e.g. logging) |
| `Supplier<T>` | `T get()` | Lazily produce a value |
| `BiFunction<T,U,R>` | `R apply(T,U)` | Combine two values |

Lambdas and streams do not make Java a functional language — there is no enforced immutability, and side effects are allowed. They provide a functional *style* layered on the object model.

---

## Examples

### The same task in three styles

Sum the lengths of all non-empty strings.

```java
// Imperative
int sum = 0;
for (String s : words) {
    if (!s.isEmpty()) {
        sum += s.length();
    }
}

// Functional (Stream API)
int sum = words.stream()
        .filter(s -> !s.isEmpty())
        .mapToInt(String::length)
        .sum();
```

### Object-oriented strategy, injected as a lambda

Because a functional interface can be satisfied by a lambda, the classic OOP Strategy pattern collapses to passing a function.

```java
@FunctionalInterface
interface DiscountPolicy {
    double apply(double price);
}

double checkout(double price, DiscountPolicy policy) {
    return policy.apply(price);
}

// Strategy supplied inline as a lambda — no separate class needed
double total = checkout(100.0, price -> price * 0.9);
```

### Records: data-oriented modeling

Records (Java 16+) express immutable data carriers concisely, nudging code toward a data-oriented style.

```java
record Point(int x, int y) {
    Point {
        if (x < 0 || y < 0) throw new IllegalArgumentException("negative coordinate");
    }
}

var p = new Point(3, 4);
// auto-generated: constructor, accessors x()/y(), equals, hashCode, toString
```

---

## When to use

- **Object-oriented** — for modeling a domain with entities, services, and clear contracts; the default structure of any Java application.
- **Imperative** — for local algorithm logic where a loop is clearer than a stream, or where performance in a hot path matters.
- **Functional / streams** — for transforming, filtering, and aggregating collections; for passing behavior as a parameter (callbacks, strategies).
- **Records + sealed types** — for data-oriented programming where the domain is a fixed set of data shapes.

---

## When NOT to use

- **Do not force everything into streams.** A stream with side effects, nested `flatMap`, and stateful lambdas is harder to read than a plain loop.
- **Do not build deep inheritance hierarchies.** Prefer composition and interfaces; deep `extends` chains are fragile (see the Liskov Substitution Principle).
- **Avoid shared mutable state in lambdas** used by parallel streams — it causes data races. Functional pipelines should be side-effect-free.
- **Do not use `parallelStream()` reflexively.** It only helps for large datasets with CPU-bound, independent work; for small collections it is slower.

---

## References

- [dev.java — Lambdas and functional interfaces](https://dev.java/learn/lambdas/)
- [The Java Tutorials — Object-Oriented Programming Concepts](https://docs.oracle.com/javase/tutorial/java/concepts/)
- [java.util.function — API docs](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/function/package-summary.html)
- *Effective Java* — Joshua Bloch (3rd ed., Addison-Wesley, 2018)
- *Modern Java in Action* — Urma, Fusco & Mycroft (Manning, 2018)
