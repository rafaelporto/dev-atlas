---
type: concept
tags:
  - language
  - java
  - testing
  - backend
related:
  - languages/java/error-handling
  - languages/java/java-patterns
language: "java"
---
# Testing

> Java's testing ecosystem centers on JUnit 5 for structure and assertions, Mockito for test doubles, and AssertJ for fluent, readable assertions.

---

## What is it?

Automated testing in Java is built from a small set of well-established libraries that compose together:

- **JUnit 5** (Jupiter) — the standard test framework: defines tests, lifecycle hooks, parameterized tests, and the runner build tools invoke.
- **Mockito** — creates mocks and stubs so a unit under test can be isolated from its collaborators (databases, HTTP clients).
- **AssertJ** — a fluent assertion library whose chained, discoverable API reads like English and produces clear failure messages.
- **Testcontainers** — spins up real dependencies (Postgres, Kafka) in Docker for integration tests.

---

## Why does it matter?

Java's strong typing catches many errors at compile time, but it cannot verify behavior — that a discount is calculated correctly, that an order transitions states properly. Tests are what let large, long-lived Java systems evolve safely: they are the safety net that makes refactoring possible.

The specific libraries matter because they set the ergonomics. JUnit 4's assertions were terse and their failure messages poor; AssertJ's fluent style makes both the test and its failure output far more readable. Mockito makes it practical to test a service in isolation instead of standing up its entire dependency graph.

---

## How it works

### JUnit 5 basics

A test is a method annotated `@Test`. Lifecycle hooks run setup and teardown.

```java
import org.junit.jupiter.api.*;
import static org.junit.jupiter.api.Assertions.*;

class CalculatorTest {

    private Calculator calc;

    @BeforeEach
    void setUp() {
        calc = new Calculator();
    }

    @Test
    @DisplayName("adds two positive numbers")
    void addsPositives() {
        assertEquals(5, calc.add(2, 3));
    }

    @Test
    void throwsOnDivideByZero() {
        assertThrows(ArithmeticException.class, () -> calc.divide(1, 0));
    }
}
```

| Annotation | Purpose |
|---|---|
| `@Test` | Marks a test method |
| `@BeforeEach` / `@AfterEach` | Run before/after every test |
| `@BeforeAll` / `@AfterAll` | Run once for the class (static) |
| `@DisplayName` | Human-readable test name |
| `@Disabled` | Skip a test |
| `@Nested` | Group related tests in an inner class |

### Parameterized tests

Run the same test over many inputs.

```java
@ParameterizedTest
@CsvSource({
    "2, 3, 5",
    "0, 0, 0",
    "-1, 1, 0"
})
void adds(int a, int b, int expected) {
    assertEquals(expected, calc.add(a, b));
}
```

### AssertJ — fluent assertions

AssertJ's `assertThat` reads naturally and gives rich failure messages.

```java
import static org.assertj.core.api.Assertions.assertThat;

@Test
void filtersActiveUsers() {
    List<User> active = service.activeUsers();

    assertThat(active)
        .hasSize(2)
        .extracting(User::name)
        .containsExactly("Ann", "Bob");

    assertThat(active).allMatch(User::isActive);
}
```

### Mockito — isolating collaborators

Mock a dependency, stub its behavior, run the unit under test, and verify interactions.

```java
import static org.mockito.Mockito.*;

@Test
void chargesCustomerOnCheckout() {
    PaymentGateway gateway = mock(PaymentGateway.class);
    when(gateway.charge(anyLong(), eq(1000L))).thenReturn(Result.approved("tx-1"));

    var service = new CheckoutService(gateway);
    service.checkout(customerId, 1000L);

    verify(gateway).charge(customerId, 1000L);   // interaction happened
    verifyNoMoreInteractions(gateway);
}
```

With the `mockito-junit-jupiter` extension, `@Mock` and `@InjectMocks` reduce boilerplate:

```java
@ExtendWith(MockitoExtension.class)
class CheckoutServiceTest {
    @Mock PaymentGateway gateway;
    @InjectMocks CheckoutService service;
    // ...
}
```

---

## Examples

### A focused unit test with the full stack

```java
@ExtendWith(MockitoExtension.class)
class OrderServiceTest {

    @Mock OrderRepository repository;
    @InjectMocks OrderService service;

    @Test
    @DisplayName("returns saved order when repository succeeds")
    void createsOrder() {
        var input = new CreateOrder("SKU-1", 2);
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Order result = service.create(input);

        assertThat(result.sku()).isEqualTo("SKU-1");
        assertThat(result.quantity()).isEqualTo(2);
        verify(repository).save(any(Order.class));
    }

    @Test
    void rejectsZeroQuantity() {
        assertThatThrownBy(() -> service.create(new CreateOrder("SKU-1", 0)))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("quantity");
    }
}
```

### Integration test with Testcontainers

```java
@Testcontainers
class UserRepositoryIT {

    @Container
    static PostgreSQLContainer<?> postgres =
        new PostgreSQLContainer<>("postgres:16");

    @Test
    void persistsAndReadsUser() {
        // configure a real DataSource from postgres.getJdbcUrl()
        // run migrations, then exercise the repository against a real Postgres
    }
}
```

---

## When to use

- **JUnit 5** — for all tests; it is the standard runner every build tool supports.
- **AssertJ** — as the default assertion style; its readability and failure output beat plain JUnit assertions.
- **Mockito** — to isolate a unit from slow or nondeterministic collaborators.
- **Parameterized tests** — when the same logic must hold across many inputs (the Java equivalent of Go's table-driven tests).
- **Testcontainers** — for integration tests that need a real database or broker.

---

## When NOT to use

- **Do not mock what you do not own** without wrapping it — mock your own interfaces, not third-party classes directly.
- **Avoid mocking value objects or simple data** — construct real instances instead.
- **Do not over-verify** — asserting on every internal interaction makes tests brittle; verify behavior, not implementation.
- **Do not use mocks in integration tests** meant to exercise real wiring — that defeats their purpose; use Testcontainers.
- **Avoid one giant test** with many assertions — prefer small, focused tests with clear names.

---

## References

- [JUnit 5 User Guide](https://junit.org/junit5/docs/current/user-guide/)
- [Mockito documentation](https://javadoc.io/doc/org.mockito/mockito-core/latest/org/mockito/Mockito.html)
- [AssertJ — fluent assertions](https://assertj.github.io/doc/)
- [Testcontainers for Java](https://java.testcontainers.org/)
- *Effective Java* — Joshua Bloch (3rd ed., Addison-Wesley, 2018)
