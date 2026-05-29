---
type: concept
tags: []
related: []
language: null
---
# Single Responsibility Principle (SRP)

> A module should have one, and only one, reason to change — and that reason should come from one stakeholder.

---

## What is it?

A module — a class, a function, a file — should answer to exactly one *actor*: a group of people whose needs cause the module to be modified. Two actors that can demand changes for unrelated reasons should not share a module, because their changes will interfere with each other.

The principle is widely misquoted as "a class should do one thing". That phrasing is harmful: every non-trivial class does several things, and trying to reduce every class to one method produces a fragmented mess. The original statement, from Robert C. Martin, is *about who asks for the change*, not about how many lines or methods the module contains.

> *"A module should be responsible to one, and only one, actor."* — Robert C. Martin, *Clean Architecture*

---

## Why does it matter?

When two unrelated responsibilities live in the same module, four problems appear:

- **Accidental coupling between teams.** A change requested by Finance touches the same file as a change requested by HR. The two teams collide on merges and on review without ever having intended to collaborate.
- **Hidden regressions.** Modifying calculation logic accidentally breaks formatting, because both share state, helpers, or imports.
- **Diffuse code review.** A reviewer needs to understand finance rules *and* persistence concerns to approve a PR that only changed one of them.
- **Tests that mix concerns.** Setting up a test for one responsibility drags in dependencies that belong to the other.

Splitting by responsibility (actor) is what keeps a 5-year-old codebase from collapsing under its own change history.

---

## How it works

Identify the **actors** that can demand changes from a module. An actor is a role, not a person: *Accounting*, *HR Operations*, *the DBA team*, *the mobile client*, *the compliance officer*.

```
Before:                          After (one module per actor):

┌──────────────────┐            ┌──────────────────┐
│    Employee      │            │  PayCalculator   │ ◄── Accounting
│                  │            └──────────────────┘
│ calculatePay()   │ ◄ Acct.    ┌──────────────────┐
│ reportHours()   │ ◄ HR        │   HoursReporter  │ ◄── HR
│ save()           │ ◄ DBA      └──────────────────┘
└──────────────────┘            ┌──────────────────┐
                                │EmployeeRepository│ ◄── DBA
                                └──────────────────┘
                                ┌──────────────────┐
                                │     Employee     │  (plain data)
                                └──────────────────┘
```

If two methods would be modified by the same actor for the same kind of change, they belong together. If they would be modified by *different* actors, or by the same actor for unrelated reasons, they belong apart.

A useful test: imagine each actor's change request reaches a different person. Can each person work in their own file without touching the others' code? If not, SRP is being violated.

### What about coordination?

Splitting by actor does not mean the actors never collaborate. It means *the policy belongs in its own place*. A higher-level coordinator (a use case, a service, an application layer object) can compose `PayCalculator`, `HoursReporter`, and `EmployeeRepository` to produce the desired effect. The coordinator changes only when *the workflow* changes — itself a single responsibility.

---

## Examples

**Scenario.** An `Employee` class in a payroll system holds employee data and offers three operations: compute monthly pay, generate an hours report for HR, and save itself to the database. Three actors (Accounting, HR, DBA) can demand changes to those three operations independently — a classic SRP violation.

The "before" code shows the violation; the "after" code splits responsibilities by actor.

### TypeScript

**Before — one class, three actors.**

```typescript
class Employee {
  constructor(public id: string, public name: string, public hours: number, public rate: number) {}

  calculatePay(): number {
    // Accounting owns this rule.
    return this.hours * this.rate;
  }

  reportHours(): string {
    // HR owns this format.
    return `${this.name}: ${this.hours}h`;
  }

  save(): void {
    // DBA owns this persistence concern.
    db.execute(`INSERT INTO employees ...`);
  }
}
```

**After — one module per actor.**

```typescript
type Employee = { id: string; name: string; hours: number; rate: number };

class PayCalculator {
  monthlyPay(e: Employee): number {
    return e.hours * e.rate;
  }
}

class HoursReporter {
  format(e: Employee): string {
    return `${e.name}: ${e.hours}h`;
  }
}

class EmployeeRepository {
  save(e: Employee): void {
    db.execute(`INSERT INTO employees ...`);
  }
}
```

### Go

**Before.**

```go
type Employee struct {
    ID, Name string
    Hours    float64
    Rate     float64
}

func (e Employee) CalculatePay() float64 { return e.Hours * e.Rate }
func (e Employee) ReportHours() string   { return fmt.Sprintf("%s: %.1fh", e.Name, e.Hours) }
func (e Employee) Save(db *sql.DB) error { /* INSERT ... */ }
```

**After.**

```go
type Employee struct {
    ID, Name string
    Hours    float64
    Rate     float64
}

type PayCalculator struct{}
func (PayCalculator) MonthlyPay(e Employee) float64 { return e.Hours * e.Rate }

type HoursReporter struct{}
func (HoursReporter) Format(e Employee) string { return fmt.Sprintf("%s: %.1fh", e.Name, e.Hours) }

type EmployeeRepository struct{ DB *sql.DB }
func (r EmployeeRepository) Save(e Employee) error { /* INSERT ... */ }
```

### Swift

**Before.**

```swift
struct Employee {
    let id: String
    let name: String
    let hours: Double
    let rate: Double

    func calculatePay() -> Double { hours * rate }
    func reportHours() -> String { "\(name): \(hours)h" }
    func save(to db: Database) throws { /* INSERT ... */ }
}
```

**After.**

```swift
struct Employee {
    let id: String
    let name: String
    let hours: Double
    let rate: Double
}

struct PayCalculator {
    func monthlyPay(of e: Employee) -> Double { e.hours * e.rate }
}

struct HoursReporter {
    func format(_ e: Employee) -> String { "\(e.name): \(e.hours)h" }
}

struct EmployeeRepository {
    let db: Database
    func save(_ e: Employee) throws { /* INSERT ... */ }
}
```

### Dart (Flutter)

**Before.**

```dart
class Employee {
  final String id;
  final String name;
  final double hours;
  final double rate;

  Employee(this.id, this.name, this.hours, this.rate);

  double calculatePay() => hours * rate;
  String reportHours() => '$name: ${hours}h';
  Future<void> save(Database db) async { /* INSERT ... */ }
}
```

**After.**

```dart
class Employee {
  final String id;
  final String name;
  final double hours;
  final double rate;
  Employee(this.id, this.name, this.hours, this.rate);
}

class PayCalculator {
  double monthlyPay(Employee e) => e.hours * e.rate;
}

class HoursReporter {
  String format(Employee e) => '${e.name}: ${e.hours}h';
}

class EmployeeRepository {
  final Database db;
  EmployeeRepository(this.db);
  Future<void> save(Employee e) async { /* INSERT ... */ }
}
```

### C# (.NET)

**Before.**

```csharp
public class Employee
{
    public string Id { get; init; }
    public string Name { get; init; }
    public double Hours { get; init; }
    public double Rate { get; init; }

    public double CalculatePay() => Hours * Rate;
    public string ReportHours() => $"{Name}: {Hours}h";
    public void Save(DbConnection db) { /* INSERT ... */ }
}
```

**After.**

```csharp
public record Employee(string Id, string Name, double Hours, double Rate);

public class PayCalculator
{
    public double MonthlyPay(Employee e) => e.Hours * e.Rate;
}

public class HoursReporter
{
    public string Format(Employee e) => $"{e.Name}: {e.Hours}h";
}

public class EmployeeRepository
{
    private readonly DbConnection _db;
    public EmployeeRepository(DbConnection db) => _db = db;
    public void Save(Employee e) { /* INSERT ... */ }
}
```

---

## Beyond OOP

In functional and modular code the same principle applies, with different mechanics:

- **Functional code** — one module per responsibility, each exporting pure functions. `payroll.ts` calculates, `hr_report.ts` formats, `employee_repo.ts` persists. The `Employee` is a record type imported everywhere.
- **Dynamic languages** — the language allows mixing, the principle says don't. A 2000-line Python `Employee` class with `calculate_pay`, `to_csv`, `save_to_db`, and `send_welcome_email` is the canonical case the principle warns against.

The principle is about **the layout of responsibilities across files and types**, not about which keyword introduces a module.

---

## When to use

- Whenever a single class, file, or function is modified by more than one team for unrelated reasons.
- During code review, when two unrelated changes keep landing in the same file in successive PRs.
- When test setup for a piece of code mixes unrelated concerns (a unit test for pay calculation having to construct a database connection).
- When refactoring code that has grown organically and accumulated multiple responsibilities — splitting by actor is usually the cleanest first cut.

## When NOT to use

- For small scripts or utilities that *do* mix concerns by design (a CLI command can legitimately read input, transform it, and print it).
- To produce one class per method. "One reason to change" is not "one line of code".
- When the responsibilities truly are owned by the same actor and split in the same way. Forced splits make code harder to follow without buying any decoupling.
- Before you know who the actors are. Speculative splits made on syntactic grounds (one class per noun) often need to be undone later.

---

## References

- Robert C. Martin — *Clean Architecture* (2017), chapter 7. The clearest statement of the actor-centered formulation.
- Robert C. Martin — *Clean Code* (2008), chapter 10. The earlier, narrower "one reason to change" framing.
- Robert C. Martin — [The Single Responsibility Principle](https://blog.cleancoder.com/uncle-bob/2014/05/08/SingleReponsibilityPrinciple.html), 2014. Direct correction of the common misreading.
- Sandi Metz — *POODR*, chapter 2. Treats SRP through cohesion and "what does this class know?" rather than counting reasons to change.
- Martin Fowler — [Conway's Law](https://martinfowler.com/bliki/ConwaysLaw.html). Related lens: modules tend to mirror the communication structure of the people who write them.
