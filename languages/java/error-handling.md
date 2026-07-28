---
type: concept
tags:
  - language
  - java
  - error-handling
  - backend
related:
  - languages/java/concurrency
  - languages/java/types-and-generics
language: "java"
---
# Error Handling

> Java models failures as exceptions — objects thrown up the call stack — and splits them into checked exceptions the compiler forces you to handle and unchecked exceptions it does not.

---

## What is it?

An exception is an object representing something that went wrong. When code hits an error, it `throw`s an exception; the JVM unwinds the call stack until a matching `catch` handles it, or the program terminates. Java's exception hierarchy has one root, `Throwable`, split into:

- **`Error`** — serious problems the application should not catch (e.g. `OutOfMemoryError`, `StackOverflowError`).
- **`Exception`** — recoverable conditions, further divided into:
  - **Checked exceptions** — must be declared with `throws` or caught; the compiler enforces it (e.g. `IOException`, `SQLException`).
  - **Unchecked exceptions** (`RuntimeException` and subclasses) — not enforced by the compiler (e.g. `NullPointerException`, `IllegalArgumentException`).

---

## Why does it matter?

Checked exceptions are one of Java's most distinctive — and debated — design decisions. Almost no other mainstream language enforces them. Used well, they make failure part of a method's contract: a caller *cannot* forget that reading a file might fail. Used badly, they lead to boilerplate `try/catch` blocks that swallow errors or wrap everything in a generic `RuntimeException`.

Getting error handling right determines whether a system fails loudly and diagnosably or silently corrupts state. The rules for *what* to throw, *when* to catch, and *how* to preserve context are core to writing reliable Java.

---

## How it works

### Throwing and catching

```java
public Order findOrder(String id) {
    if (id == null || id.isBlank()) {
        throw new IllegalArgumentException("id must not be blank");
    }
    Order order = repository.get(id);
    if (order == null) {
        throw new OrderNotFoundException(id);
    }
    return order;
}
```

```java
try {
    Order order = service.findOrder(id);
    process(order);
} catch (OrderNotFoundException e) {
    return Response.notFound();
} catch (IllegalArgumentException e) {
    return Response.badRequest(e.getMessage());
}
```

### Checked vs unchecked — the decision

| | Checked | Unchecked (`RuntimeException`) |
|---|---|---|
| Compiler enforcement | Must declare `throws` or catch | None |
| Represents | Recoverable, expected conditions | Programming errors / unrecoverable state |
| Examples | `IOException`, `SQLException` | `NullPointerException`, `IllegalArgumentException`, `IllegalStateException` |
| Guidance | Use when the caller can reasonably recover | Use for bugs and precondition violations |

Modern practice, especially in frameworks like Spring, leans heavily toward unchecked exceptions to avoid `throws` clauses propagating through every layer.

### try-with-resources

Any object implementing `AutoCloseable` is closed automatically at the end of the block, in reverse order of opening — even if an exception is thrown. This replaces error-prone `finally` blocks.

```java
try (var conn = dataSource.getConnection();
     var stmt = conn.prepareStatement("SELECT name FROM users WHERE id = ?")) {
    stmt.setLong(1, id);
    try (var rs = stmt.executeQuery()) {
        return rs.next() ? rs.getString("name") : null;
    }
}
// conn and stmt are closed automatically, even on exception
```

### Chaining — preserve the cause

Never discard the original exception. Wrapping preserves the stack trace and root cause.

```java
try {
    return parse(input);
} catch (ParseException e) {
    // Wrap a checked exception as a domain-specific one, keeping the cause
    throw new ConfigurationException("invalid config file: " + path, e);
}
```

### Custom exceptions

```java
public class OrderNotFoundException extends RuntimeException {
    private final String orderId;

    public OrderNotFoundException(String orderId) {
        super("order not found: " + orderId);
        this.orderId = orderId;
    }

    public String orderId() { return orderId; }
}
```

---

## Examples

### Multi-catch

Handle several unrelated exception types with the same logic.

```java
try {
    process(request);
} catch (IOException | TimeoutException e) {
    log.warn("transient failure, retrying", e);
    retry(request);
}
```

### Translating exceptions at a layer boundary

A common pattern: catch low-level checked exceptions in the persistence layer and rethrow domain exceptions, so upper layers never import `SQLException`.

```java
public User loadUser(long id) {
    try (var conn = dataSource.getConnection()) {
        // ... JDBC query ...
        return user;
    } catch (SQLException e) {
        throw new DataAccessException("failed to load user " + id, e);
    }
}
```

### Centralized handling in a web layer

Frameworks let you map exceptions to responses in one place rather than at every endpoint (illustrative Spring style):

```java
@ExceptionHandler(OrderNotFoundException.class)
public ResponseEntity<String> handleNotFound(OrderNotFoundException e) {
    return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
}
```

---

## When to use

- **Throw exceptions for exceptional conditions** — I/O failures, violated invariants, missing required data.
- **Use checked exceptions** when the caller can plausibly recover and you want to force acknowledgement.
- **Use unchecked exceptions** for programming errors and precondition violations (`IllegalArgumentException`, `IllegalStateException`).
- **Use try-with-resources** for anything holding a resource — connections, streams, files, locks.
- **Wrap and rethrow** at layer boundaries to keep low-level exception types out of higher layers.

---

## When NOT to use

- **Do not use exceptions for control flow.** Throwing to break out of a loop or signal "not found" in a hot path is slow and obscures intent — return an `Optional` or a result type instead.
- **Never swallow exceptions silently** — an empty `catch` block hides failures and is a top source of undiagnosable bugs.
- **Do not catch `Throwable` or `Error`** — you cannot meaningfully recover from `OutOfMemoryError`.
- **Do not lose the cause** — always pass the original exception to the wrapping constructor.
- **Avoid overly broad `catch (Exception e)`** that hides which failures are actually possible.

---

## References

- [The Java Tutorials — Exceptions](https://docs.oracle.com/javase/tutorial/essential/exceptions/index.html)
- [The try-with-resources Statement](https://docs.oracle.com/javase/tutorial/essential/exceptions/tryResourceClose.html)
- [Throwable — API docs](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Throwable.html)
- *Effective Java* — Joshua Bloch (3rd ed., Addison-Wesley, 2018), Chapter 10: Exceptions
