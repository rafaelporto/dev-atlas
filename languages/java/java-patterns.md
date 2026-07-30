---
type: concept
tags:
  - language
  - java
  - design-pattern
  - creational
  - structural
  - behavioral
related:
  - languages/java/types-and-generics
  - languages/java/paradigms
  - languages/java/databases-and-orms
language: "java"
---
# Java Patterns

> Java code converges on a set of recurring patterns — classic Gang of Four patterns expressed through interfaces and classes, plus modern idioms built on records, sealed types, and dependency injection.

---

## What is it?

Java patterns are idiomatic solutions to recurring design problems in Java codebases. Because Java is class-based and object-oriented, the original Gang of Four (GoF) patterns map almost directly onto the language — many were written with Java and C++ in mind. But modern Java (records, sealed classes, lambdas) has also produced its own idioms that simplify or replace some classic patterns.

This article splits them into:

1. **GoF pattern adaptations** — how the classic patterns look in idiomatic Java.
2. **Java-idiomatic patterns** — patterns shaped by modern language features and the framework ecosystem.

---

## Why does it matter?

Frameworks like Spring and libraries like the JDK itself are built on these patterns — `InputStream` decorators, `Comparator` strategies, `Iterator`, factory methods on `List`. Recognizing them lets you read unfamiliar code fluently. Applying the modern idioms (builder, records-as-DTO, sealed hierarchies, constructor injection) keeps code concise and testable instead of ceremonial.

---

## GoF Pattern Adaptations

### Builder

Constructs complex objects step by step, avoiding telescoping constructors. The canonical Java solution for classes with many optional fields.

```java
public final class HttpRequest {
    private final String url;
    private final String method;
    private final Map<String, String> headers;

    private HttpRequest(Builder b) {
        this.url = b.url;
        this.method = b.method;
        this.headers = Map.copyOf(b.headers);
    }

    public static Builder builder(String url) { return new Builder(url); }

    public static final class Builder {
        private final String url;
        private String method = "GET";
        private final Map<String, String> headers = new HashMap<>();

        private Builder(String url) { this.url = url; }

        public Builder method(String method) { this.method = method; return this; }
        public Builder header(String k, String v) { headers.put(k, v); return this; }
        public HttpRequest build() { return new HttpRequest(this); }
    }
}

var request = HttpRequest.builder("https://api.example.com")
        .method("POST")
        .header("Content-Type", "application/json")
        .build();
```

**Frequency:** Universal for value objects with more than a few optional fields.

---

### Factory Method / Static Factory

A static method that returns an instance, hiding the concrete type behind an interface. Preferred over `new` when the returned type may vary or when the name adds clarity.

```java
public interface Store {
    String get(String key);
    void put(String key, String value);
}

public final class Stores {
    private Stores() {}

    public static Store inMemory() { return new MemoryStore(); }
    public static Store redis(String addr) { return new RedisStore(addr); }
}
```

The JDK uses this everywhere: `List.of(...)`, `Optional.of(...)`, `Integer.valueOf(...)`.

**Frequency:** Universal.

---

### Singleton

A single shared instance. The idiomatic, thread-safe form is a single-element `enum`; for lazy initialization, the initialization-on-demand holder idiom.

```java
// Enum singleton — thread-safe, serialization-safe (Effective Java, Item 3)
public enum Config {
    INSTANCE;
    private final Properties props = load();
    public String get(String key) { return props.getProperty(key); }
}
```

```java
// Lazy holder idiom — initialized on first access, no synchronization cost
public final class Registry {
    private Registry() {}
    private static class Holder { static final Registry INSTANCE = new Registry(); }
    public static Registry getInstance() { return Holder.INSTANCE; }
}
```

**Frequency:** Common, though in framework code a single Spring bean usually replaces a hand-rolled singleton.

---

### Strategy

Encapsulates interchangeable behavior behind an interface. In modern Java a functional interface lets you pass the strategy as a lambda.

```java
@FunctionalInterface
interface PricingStrategy {
    double price(Cart cart);
}

class Checkout {
    private final PricingStrategy strategy;
    Checkout(PricingStrategy strategy) { this.strategy = strategy; }
    double total(Cart cart) { return strategy.price(cart); }
}

// Strategy as a lambda
var blackFriday = new Checkout(cart -> cart.subtotal() * 0.7);
```

`Comparator` is the JDK's most-used strategy: `list.sort(Comparator.comparing(User::name))`.

**Frequency:** Universal.

---

### Decorator

Wraps an object to add behavior without changing its interface. The JDK's I/O streams are the textbook example.

```java
// JDK stream decorators stack behavior
InputStream in = new BufferedInputStream(
                     new GZIPInputStream(
                         new FileInputStream("data.gz")));
```

A custom decorator over a domain interface:

```java
interface Repository { User find(long id); }

class CachingRepository implements Repository {
    private final Repository delegate;
    private final Map<Long, User> cache = new ConcurrentHashMap<>();

    CachingRepository(Repository delegate) { this.delegate = delegate; }

    @Override
    public User find(long id) {
        return cache.computeIfAbsent(id, delegate::find);
    }
}
```

**Frequency:** Common at cross-cutting boundaries (caching, logging, metrics).

---

### Adapter

Wraps an incompatible type to satisfy a target interface, keeping the domain decoupled from third-party APIs.

```java
// Domain-owned interface
interface Notifier {
    void notify(String userId, String message);
}

// Adapter around a third-party SDK
final class PushNotifier implements Notifier {
    private final VendorPushClient client;

    PushNotifier(VendorPushClient client) { this.client = client; }

    @Override
    public void notify(String userId, String message) {
        client.send(new VendorMessage(userId, message, VendorPriority.HIGH));
    }
}
```

**Frequency:** Common at every integration boundary.

---

### Observer

Notifies subscribers of events. Rather than the legacy `java.util.Observer` (deprecated), use a listener list or `PropertyChangeSupport`.

```java
interface EventListener { void onEvent(Event e); }

class EventBus {
    private final List<EventListener> listeners = new CopyOnWriteArrayList<>();
    void subscribe(EventListener l) { listeners.add(l); }
    void publish(Event e) { listeners.forEach(l -> l.onEvent(e)); }
}
```

**Frequency:** Common in event-driven and UI code.

---

## Java-Idiomatic Patterns

### Records as DTOs / Value Objects

Records replace the hand-written immutable data class. Use them for API request/response bodies, value objects, and any structural-equality data.

```java
record CreateUserRequest(String name, String email) {}
record UserResponse(long id, String name, String email) {}
```

No constructor, getters, `equals`, `hashCode`, or `toString` to write or review.

**Frequency:** Universal in modern codebases (Java 16+).

---

### Sealed Hierarchies for Domain States

Model a fixed set of variants with a sealed interface plus records, then handle them exhaustively with `switch` — Java's answer to algebraic data types.

```java
sealed interface PaymentResult permits Approved, Declined, Pending {}
record Approved(String txId) implements PaymentResult {}
record Declined(String reason) implements PaymentResult {}
record Pending(String pollUrl) implements PaymentResult {}

String describe(PaymentResult r) {
    return switch (r) {                       // compiler enforces exhaustiveness
        case Approved(String tx)     -> "approved: " + tx;
        case Declined(String reason) -> "declined: " + reason;
        case Pending(String url)     -> "pending: poll " + url;
    };
}
```

**Frequency:** Growing rapidly (Java 17/21+); the idiomatic way to model closed sets of outcomes.

---

### Dependency Injection via Constructor

Inject collaborators through the constructor rather than constructing them inside. This is the foundation of testability and the default style in Spring, Guice, and Dagger.

```java
class OrderService {
    private final OrderRepository repository;
    private final PaymentGateway gateway;

    // Constructor injection: dependencies are explicit, final, and mockable
    OrderService(OrderRepository repository, PaymentGateway gateway) {
        this.repository = repository;
        this.gateway = gateway;
    }
}
```

In tests, pass mocks; in production, the DI container supplies real implementations. Prefer constructor injection over field injection — it keeps fields `final` and dependencies visible.

**Frequency:** Universal in application code.

---

### Optional Instead of Null

Return `Optional<T>` to signal "value may be absent" instead of returning `null`, forcing the caller to handle the empty case.

```java
Optional<User> findByEmail(String email) {
    return repository.query(email); // empty when not found
}

String name = findByEmail(email)
        .map(User::name)
        .orElse("unknown");
```

Use `Optional` for return types; do not use it for fields or method parameters.

**Frequency:** Common for lookup and query methods.

---

### Try-With-Resources for Cleanup

Any `AutoCloseable` is closed deterministically — the idiomatic replacement for `finally` blocks.

```java
try (var lock = distributedLock.acquire("orders");
     var conn = dataSource.getConnection()) {
    // work; both closed in reverse order automatically
}
```

**Frequency:** Universal wherever resources are held.

---

## Quick Reference

| Pattern | Category | Frequency | Key mechanism |
|---|---|---|---|
| Builder | GoF: Creational | Universal | Fluent inner `Builder` class |
| Factory Method / Static Factory | GoF: Creational | Universal | `static` method returning an interface |
| Singleton | GoF: Creational | Common | Enum singleton or lazy holder idiom |
| Strategy | GoF: Behavioral | Universal | Functional interface / lambda |
| Decorator | GoF: Structural | Common | Wrap delegate, same interface |
| Adapter | GoF: Structural | Common | Domain interface wraps external type |
| Observer | GoF: Behavioral | Common | Listener list, `CopyOnWriteArrayList` |
| Records as DTOs | Idiomatic | Universal | `record` for immutable data |
| Sealed Hierarchies | Idiomatic | Growing | `sealed interface` + exhaustive `switch` |
| Constructor DI | Idiomatic | Universal | Final fields set in constructor |
| Optional over null | Idiomatic | Common | `Optional<T>` return type |
| Try-with-resources | Idiomatic | Universal | `AutoCloseable` in `try (...)` |

---

## How it works

There is no pattern machinery in Java — each pattern is just a disciplined use of the language's core building blocks:

- **Interfaces** decouple *what* from *how*: they are the seam behind Strategy, Adapter, Observer, and Factory Method.
- **Composition (holding a delegate)** rather than inheritance powers Decorator and Adapter — wrap an instance, forward or augment its calls.
- **Modern features collapse ceremony**: a `@FunctionalInterface` + lambda replaces a Strategy class, `record`s replace hand-written DTOs, and `sealed` interfaces plus exhaustive `switch` give algebraic-data-type modelling.
- **Constructor injection** wires collaborators together, which is what makes the objects above testable in isolation.

The two groups in this article reflect that split: the GoF adaptations show the interface/composition mechanics, and the idiomatic patterns show where a language feature has absorbed the pattern.

---

## Examples

One small flow combining several patterns — records as DTOs, a functional-interface Strategy, constructor DI, a Decorator adding caching, and a sealed result handled exhaustively:

```java
record Order(long id, double subtotal) {}

@FunctionalInterface
interface PricingStrategy { double price(Order order); }

sealed interface Charge permits Ok, Rejected {}
record Ok(double amount) implements Charge {}
record Rejected(String reason) implements Charge {}

interface Rates { double taxFor(long orderId); }

// Decorator: adds caching over any Rates implementation
final class CachingRates implements Rates {
    private final Rates delegate;
    private final java.util.Map<Long, Double> cache = new java.util.concurrent.ConcurrentHashMap<>();
    CachingRates(Rates delegate) { this.delegate = delegate; }
    public double taxFor(long orderId) { return cache.computeIfAbsent(orderId, delegate::taxFor); }
}

final class Checkout {
    private final PricingStrategy strategy;   // constructor-injected collaborators
    private final Rates rates;
    Checkout(PricingStrategy strategy, Rates rates) { this.strategy = strategy; this.rates = rates; }

    Charge charge(Order order) {
        double total = strategy.price(order) * (1 + rates.taxFor(order.id()));
        return total > 0 ? new Ok(total) : new Rejected("non-positive total");
    }
}

// Wiring: lambda Strategy + decorated Rates
var checkout = new Checkout(o -> o.subtotal() * 0.9, new CachingRates(id -> 0.2));
Charge result = checkout.charge(new Order(1, 100));
String message = switch (result) {                 // exhaustive over the sealed type
    case Ok(double amount)    -> "charged " + amount;
    case Rejected(String why) -> "rejected: " + why;
};
```

---

## When to use

- **Builder** — value objects with more than a few optional fields.
- **Static Factory / Factory Method** — when the concrete type may vary or a named constructor reads better than `new`.
- **Strategy (lambda)** — interchangeable behavior, e.g. `Comparator` or pricing rules.
- **Decorator / Adapter** — cross-cutting concerns (caching, logging) and integration boundaries.
- **Records, sealed hierarchies, constructor DI, `Optional`, try-with-resources** — the modern defaults for data, closed outcome sets, wiring, absence, and resource cleanup.

---

## When NOT to use

- **A hand-rolled Singleton** where the DI container already manages a single bean — let the framework own the lifecycle.
- **A formal pattern for a one-off shape** — wait for repetition before abstracting; premature patterns add ceremony.
- **Inheritance to share helpers** — prefer composition and interfaces with default methods.
- **`Optional` for fields or method parameters** — it is designed for return types signalling absence.
- **Legacy `java.util.Observer` / telescoping constructors** — use listener lists and the Builder instead.

---

## References

- [Design Patterns — Gamma, Helm, Johnson, Vlissides (GoF, 1994)](https://en.wikipedia.org/wiki/Design_Patterns)
- *Effective Java* — Joshua Bloch (3rd ed., Addison-Wesley, 2018)
- [JEP 395: Records](https://openjdk.org/jeps/395)
- [JEP 409: Sealed Classes](https://openjdk.org/jeps/409)
- [Pattern Matching for switch — dev.java](https://dev.java/learn/pattern-matching/)
- [Spring Framework — Dependency Injection](https://docs.spring.io/spring-framework/reference/core/beans/dependencies/factory-collaborators.html)
