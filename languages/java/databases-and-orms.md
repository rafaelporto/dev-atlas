---
type: concept
tags:
  - language
  - java
  - database
  - backend
related:
  - languages/java/error-handling
  - languages/java/java-patterns
language: "java"
---
# Databases and ORMs

> Java accesses relational databases through JDBC at the base, with higher-level options — JPA/Hibernate, Spring Data JPA, and jOOQ — trading SQL control for productivity in different ways.

---

## What is it?

Java's data-access stack has layers. At the bottom is **JDBC** (Java Database Connectivity), the standard low-level API for sending SQL to any relational database through a driver. Above it sit abstractions that reduce boilerplate:

- **JPA** (Jakarta Persistence API) — a specification for mapping objects to tables; **Hibernate** is its dominant implementation (an ORM).
- **Spring Data JPA** — generates repository implementations from interface method names on top of JPA.
- **jOOQ** — a SQL-first library that generates type-safe Java code from your database schema, keeping you close to SQL while adding compile-time safety.

---

## Why does it matter?

The choice of data-access layer is one of the most consequential decisions in a Java backend. An ORM like Hibernate can eliminate huge amounts of boilerplate and handle change tracking, caching, and lazy loading — but it also hides the SQL it generates, which leads to performance surprises (the N+1 query problem, unexpected joins) when developers do not understand what runs underneath.

A SQL-first tool like jOOQ or plain JDBC keeps the SQL explicit and type-checked, which teams with strong SQL skills often prefer. Knowing the trade-offs — productivity vs control — lets you pick the right layer instead of fighting the wrong one.

---

## How it works

### JDBC — the foundation

Every higher-level tool ultimately uses JDBC. You obtain a `Connection`, create a `PreparedStatement` (always parameterized, never string-concatenated — that prevents SQL injection), and read a `ResultSet`.

```java
String sql = "SELECT id, name FROM users WHERE email = ?";
try (var conn = dataSource.getConnection();
     var stmt = conn.prepareStatement(sql)) {
    stmt.setString(1, email);
    try (var rs = stmt.executeQuery()) {
        if (rs.next()) {
            return new User(rs.getLong("id"), rs.getString("name"));
        }
        return null;
    }
}
```

Use a connection pool (HikariCP is the de facto standard) in production — opening a raw connection per query is far too slow.

### JPA / Hibernate — object-relational mapping

You annotate a class as an `@Entity`; Hibernate maps it to a table and manages persistence, dirty checking, and relationships.

```java
@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(unique = true)
    private String email;

    @OneToMany(mappedBy = "user", fetch = FetchType.LAZY)
    private List<Order> orders = new ArrayList<>();

    // JPA requires a no-arg constructor; getters/setters omitted
}
```

You work through an `EntityManager`:

```java
User user = entityManager.find(User.class, id);   // SELECT by primary key
user.setName("New Name");                          // dirty tracking
entityManager.getTransaction().commit();           // UPDATE flushed automatically
```

### Spring Data JPA — repositories from interfaces

Spring Data generates the implementation from the method name. You declare an interface; there is no implementation to write.

```java
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    List<User> findByNameContainingIgnoreCase(String fragment);

    @Query("SELECT u FROM User u WHERE u.createdAt > :since")
    List<User> findRecent(@Param("since") Instant since);
}
```

`findByEmail` becomes `WHERE email = ?` automatically. `save`, `findById`, `findAll`, and `delete` come from `JpaRepository`.

### jOOQ — SQL-first, type-safe

jOOQ generates classes from your schema, so queries are written in a fluent DSL that mirrors SQL and is checked by the compiler.

```java
Result<Record2<Long, String>> result = dsl
    .select(USERS.ID, USERS.NAME)
    .from(USERS)
    .where(USERS.EMAIL.eq(email))
    .fetch();
```

If a column is renamed, the generated code changes and the query fails to compile — errors caught at build time, not in production.

---

## Examples

### The N+1 problem and its fix

The classic ORM pitfall: loading a list of entities, then triggering one extra query per entity for a lazy relationship.

```java
// N+1: one query for users, then one per user for orders
List<User> users = repository.findAll();
for (User u : users) {
    process(u.getOrders());   // lazy load fires a query each iteration
}
```

Fix with a fetch join so the relationship loads in a single query:

```java
@Query("SELECT DISTINCT u FROM User u LEFT JOIN FETCH u.orders")
List<User> findAllWithOrders();
```

### Transaction boundary

```java
@Transactional
public void transfer(long fromId, long toId, long cents) {
    Account from = accountRepo.findById(fromId).orElseThrow();
    Account to   = accountRepo.findById(toId).orElseThrow();
    from.debit(cents);
    to.credit(cents);
    // Both updates commit together; a thrown exception rolls back everything
}
```

---

## When ORM vs SQL-first

| Choose | When |
|---|---|
| **JPA / Hibernate** | Rich domain model, CRUD-heavy app, standard access patterns; you want change tracking, caching, and lazy loading, and the team understands what Hibernate generates. |
| **Spring Data JPA** | You already use Spring and JPA and want to eliminate repository boilerplate for common queries. |
| **jOOQ** | Complex, hand-tuned SQL; reporting and analytics; teams that think in SQL and want compile-time safety without an ORM's abstraction. |
| **Plain JDBC / JdbcTemplate** | Simple needs, full control, minimal dependencies, or performance-critical paths where you want exactly one query. |

---

## When to use

- **JDBC + a connection pool** — always the base; use directly for simple, performance-sensitive access.
- **JPA/Hibernate** — for domain-rich applications with mostly standard access patterns.
- **Spring Data JPA** — in Spring apps to remove repository boilerplate.
- **jOOQ** — when SQL is central to the application and you want type safety.
- **Flyway or Liquibase** — for versioned schema migrations regardless of the access layer.

---

## When NOT to use

- **Do not use an ORM for reporting / analytics queries** — complex aggregations and window functions fight the object model; drop to jOOQ or SQL.
- **Never build SQL by string concatenation** with user input — always use parameterized statements to avoid SQL injection.
- **Do not ignore the SQL Hibernate generates** — enable SQL logging and watch for N+1 queries and accidental eager loading.
- **Avoid entity graphs that are too deep** — cascading fetches can pull half the database into memory.
- **Do not open a new connection per query** without a pool — it will not survive production load.

---

## References

- [JDBC — The Java Tutorials](https://docs.oracle.com/javase/tutorial/jdbc/index.html)
- [Jakarta Persistence (JPA) specification](https://jakarta.ee/specifications/persistence/)
- [Hibernate ORM documentation](https://hibernate.org/orm/documentation/)
- [Spring Data JPA reference](https://docs.spring.io/spring-data/jpa/reference/)
- [jOOQ documentation](https://www.jooq.org/doc/latest/manual/)
- [HikariCP](https://github.com/brettwooldridge/HikariCP)
