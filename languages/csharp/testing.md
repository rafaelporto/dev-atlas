---
type: concept
tags:
  - language
  - csharp
  - backend
  - testing
related:
  - languages/csharp/overview
  - languages/csharp/async-and-concurrency
  - languages/csharp/csharp-patterns
language: "csharp"
---
# Testing

> .NET's testing story centres on three interchangeable test frameworks (xUnit, NUnit, MSTest) plus mocking and assertion libraries, all driven by `dotnet test`.

---

## What is it?

C# projects test with a **test framework** that discovers and runs tests, an optional **mocking library** to fake dependencies, and an optional **assertion library** for readable checks. The three mainstream frameworks are:

- **xUnit** — the modern default in the .NET open-source world; used by the .NET runtime itself.
- **NUnit** — long-established, feature-rich, familiar to JUnit users.
- **MSTest** — Microsoft's framework, integrated with Visual Studio.

They are supplemented by **Moq** or **NSubstitute** (mocking) and **FluentAssertions** (expressive assertions). All run through the `dotnet test` command.

---

## Why does it matter?

The frameworks are close enough that the choice is largely team preference — but the surrounding practices (arranging fakes, isolating units, testing async code) determine whether tests are fast, reliable, and maintainable. .NET's dependency injection makes tests straightforward: depend on interfaces, substitute fakes in the test.

---

## How it works

### A test with xUnit

xUnit uses `[Fact]` for a single case and `[Theory]` with `[InlineData]` for parameterized cases:

```csharp
public class CalculatorTests
{
    [Fact]
    public void Add_ReturnsSum()
    {
        var calc = new Calculator();
        var result = calc.Add(2, 3);
        Assert.Equal(5, result);
    }

    [Theory]
    [InlineData(0, 0, 0)]
    [InlineData(-1, 1, 0)]
    [InlineData(2, 3, 5)]
    public void Add_IsCorrect(int a, int b, int expected) =>
        Assert.Equal(expected, new Calculator().Add(a, b));
}
```

`[Theory]` + `[InlineData]` is C#'s equivalent of table-driven tests: each row is a separate, independently reported case.

### Mocking with Moq

Fake a dependency so the unit under test is isolated:

```csharp
[Fact]
public async Task PlaceOrder_NotifiesCustomer()
{
    var notifier = new Mock<INotifier>();
    var service = new OrderService(notifier.Object);

    await service.PlaceOrderAsync(new Order(Guid.NewGuid()));

    notifier.Verify(
        n => n.NotifyAsync(It.IsAny<string>()),
        Times.Once);
}
```

### Readable assertions with FluentAssertions

```csharp
result.Should().Be(5);
orders.Should().HaveCount(3).And.OnlyContain(o => o.IsPaid);
act.Should().Throw<ArgumentException>().WithMessage("*required*");
```

### Testing async code

Async tests return `Task`; `await` the code under test — never block:

```csharp
[Fact]
public async Task FetchAsync_ReturnsData()
{
    var result = await _service.FetchAsync(url);
    result.Should().NotBeNull();
}
```

### Integration testing ASP.NET Core

`WebApplicationFactory<T>` spins up the app in memory and issues real HTTP requests without a network:

```csharp
public class ApiTests(WebApplicationFactory<Program> factory)
    : IClassFixture<WebApplicationFactory<Program>>
{
    [Fact]
    public async Task Get_Health_Returns200()
    {
        var client = factory.CreateClient();
        var response = await client.GetAsync("/health");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }
}
```

---

## Examples

A unit test that arranges a fake repository, exercises the service, and asserts both the result and the interaction:

```csharp
[Fact]
public async Task GetOrder_WhenMissing_Throws()
{
    var repo = new Mock<IOrderRepository>();
    repo.Setup(r => r.FindAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
        .ReturnsAsync((Order?)null);

    var service = new OrderService(repo.Object);

    var act = () => service.GetOrderAsync(Guid.NewGuid(), CancellationToken.None);

    await act.Should().ThrowAsync<KeyNotFoundException>();
}
```

Run the suite:

```bash
dotnet test
dotnet test --filter "FullyQualifiedName~OrderService"
dotnet test --collect:"XPlat Code Coverage"
```

---

## When to use

- **xUnit** for new projects unless the team has a reason to prefer NUnit or MSTest.
- **`[Theory]` + `[InlineData]`** for the same logic across many inputs.
- **Mocking (Moq/NSubstitute)** to isolate a unit from its collaborators.
- **`WebApplicationFactory<T>`** for end-to-end API tests that exercise real routing, DI, and middleware.

---

## When NOT to use

- **Do not mock what you own and can construct cheaply** — a real object or in-memory fake is often clearer than a mock with elaborate setups.
- **Do not block async tests** with `.Result`/`.Wait()` — make the test `async Task` and `await`.
- **Do not over-assert on mock interactions** — verifying every call couples tests to implementation; assert on observable behaviour.
- **Do not share mutable state across tests** — each test must run independently and in any order.

---

## References

- [Testing in .NET — Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/core/testing/)
- [Unit testing C# with xUnit and dotnet test — Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/core/testing/unit-testing-with-dotnet-test)
- [Integration tests in ASP.NET Core — Microsoft Learn](https://learn.microsoft.com/en-us/aspnet/core/test/integration-tests)
- [Moq — quickstart](https://github.com/devlooped/moq)
- [FluentAssertions — documentation](https://fluentassertions.com/)
