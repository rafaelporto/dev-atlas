# Test-Driven Development (TDD)

> A development discipline where tests are written before the code that makes them pass, guiding design through small, verified increments.

---

## What is it?

Test-Driven Development is a way of writing code in which the test for a piece of behavior is written *before* the code that implements it. Each new behavior is added by following a tight loop — write a failing test, write just enough code to pass, then improve the design without changing behavior.

The discipline was popularized by Kent Beck in his book *Test-Driven Development by Example* (2002), where he formalized the **Red → Green → Refactor** cycle that defines the practice.

---

## Why does it matter?

Tests are usually treated as a verification step *after* the code is written. TDD inverts this: tests come first and *drive* the design. The practical effects are:

- **Design feedback** — writing the test first forces you to think about how the code will be used before deciding how it is built. Awkward tests are a signal that the API itself is awkward.
- **Safety net for change** — at any moment the codebase has a complete suite of tests for every behavior that exists, so refactoring and adding features is low-risk.
- **Executable documentation** — the tests describe what the code is supposed to do, in code that is guaranteed to be up to date.
- **Small steps, fast feedback** — bugs are caught in seconds, not after long debugging sessions, because the gap between writing code and verifying it is measured in minutes.

---

## How it works

TDD is built around one short cycle, repeated for every new behavior.

```
       ┌────────────────┐
       │      RED       │   Write a failing
       │  Test fails    │   test for the next
       │                │   behavior.
       └────────┬───────┘
                │
                ▼
       ┌────────────────┐
       │     GREEN      │   Write the simplest
       │  Test passes   │   code that makes
       │                │   the test pass.
       └────────┬───────┘
                │
                ▼
       ┌────────────────┐
       │    REFACTOR    │   Improve the design
       │ All still pass │   with all tests
       │                │   still green.
       └────────┬───────┘
                │
                └─────────► back to RED
```

The three phases have very different purposes:

1. **Red** — the test is written first and *must fail*. A test that passes immediately is suspicious: it may not actually exercise the behavior you intended.
2. **Green** — the implementation should be the simplest thing that makes the test pass, even if it looks naive. Don't generalize prematurely; the next test will push the design forward.
3. **Refactor** — once the test is green, improve the design (extract functions, rename, remove duplication). The test suite guarantees behavior is preserved.

The cycle is intentionally short — typically a few minutes per loop — so problems surface quickly and the codebase is never far from a green state.

### Two schools: Classicist and Mockist

There are two complementary styles of practicing TDD:

- **Classicist (Chicago / Detroit)** — work *inside-out*, starting from the domain core and using real collaborators in tests. Tests verify the **final state** of the system. Mocks are reserved for external boundaries (database, HTTP, time). This style is closest to Kent Beck's original work.
- **Mockist (London)** — work *outside-in*, starting from the system's entry point and using mocks to define the interfaces of collaborators that don't exist yet. Tests verify the **interactions** between objects. Popularized by Freeman & Pryce in *Growing Object-Oriented Software, Guided by Tests*.

In short: the classicist style tests *results*, the mockist style tests *conversations*. Most teams blend the two, leaning classicist for domain logic and using mocks selectively at architectural boundaries.

---

## Examples

The example below builds a small discount calculator using TDD. The same problem is implemented in TypeScript, Go, and Dart (Flutter) so you can compare the loop across languages.

**Behavior to build, one test at a time:**

1. Apply a percentage discount to a cart subtotal.
2. Do not apply the discount if the subtotal is below a minimum value.
3. Refactor the code into clearer pieces, keeping all tests green.

### TypeScript

The TypeScript ecosystem has two dominant test runners. Both are shown below — they share almost the same API.

> **Jest vs Vitest** — **Jest** is the long-standing default in the JavaScript/TypeScript ecosystem, deeply integrated with React, React Native, and many enterprise codebases. **Vitest** is a newer runner built on top of Vite, with a Jest-compatible API, faster cold start, native ESM and TypeScript support, and is now the common choice for projects built with Vite. For pure test code, the two are nearly indistinguishable.

#### Iteration 1 — Red → Green

```ts
// discount.test.ts (Jest)
import { applyDiscount } from './discount';

describe('applyDiscount', () => {
  it('applies a percentage discount to the subtotal', () => {
    expect(applyDiscount(100, { percentage: 10 })).toBe(90);
  });
});
```

```ts
// discount.test.ts (Vitest)
import { describe, it, expect } from 'vitest';
import { applyDiscount } from './discount';

describe('applyDiscount', () => {
  it('applies a percentage discount to the subtotal', () => {
    expect(applyDiscount(100, { percentage: 10 })).toBe(90);
  });
});
```

The simplest implementation that makes the test pass:

```ts
// discount.ts
export function applyDiscount(
  subtotal: number,
  discount: { percentage: number },
): number {
  return subtotal - (subtotal * discount.percentage) / 100;
}
```

#### Iteration 2 — Red → Green

A new behavior — a minimum subtotal — is added through a new test.

```ts
it('does not apply the discount when subtotal is below the minimum', () => {
  expect(
    applyDiscount(40, { percentage: 10, minSubtotal: 50 }),
  ).toBe(40);
});
```

The implementation grows just enough to pass:

```ts
export function applyDiscount(
  subtotal: number,
  discount: { percentage: number; minSubtotal?: number },
): number {
  if (discount.minSubtotal !== undefined && subtotal < discount.minSubtotal) {
    return subtotal;
  }
  return subtotal - (subtotal * discount.percentage) / 100;
}
```

#### Iteration 3 — Refactor

Both tests are green, so the design can be cleaned up. The `Discount` shape becomes a named type and the eligibility check is extracted. No new tests, no behavior change.

```ts
export type Discount = {
  percentage: number;
  minSubtotal?: number;
};

function isEligible(subtotal: number, discount: Discount): boolean {
  return discount.minSubtotal === undefined || subtotal >= discount.minSubtotal;
}

export function applyDiscount(subtotal: number, discount: Discount): number {
  if (!isEligible(subtotal, discount)) return subtotal;
  return subtotal - (subtotal * discount.percentage) / 100;
}
```

### Go

The same problem in Go uses the built-in `testing` package. The full set of tests and the final implementation after the three iterations:

```go
// discount.go
package discount

type Discount struct {
    Percentage  float64
    MinSubtotal float64 // zero means no minimum
}

func Apply(subtotal float64, d Discount) float64 {
    if !isEligible(subtotal, d) {
        return subtotal
    }
    return subtotal - (subtotal*d.Percentage)/100
}

func isEligible(subtotal float64, d Discount) bool {
    return d.MinSubtotal == 0 || subtotal >= d.MinSubtotal
}
```

```go
// discount_test.go
package discount

import "testing"

func TestAppliesPercentageDiscount(t *testing.T) {
    got := Apply(100, Discount{Percentage: 10})
    if got != 90 {
        t.Errorf("got %v, want 90", got)
    }
}

func TestDoesNotApplyBelowMinimum(t *testing.T) {
    got := Apply(40, Discount{Percentage: 10, MinSubtotal: 50})
    if got != 40 {
        t.Errorf("got %v, want 40", got)
    }
}
```

The same Red-Green-Refactor cycle drives the design: write `TestAppliesPercentageDiscount` first (red), implement just enough (green), add `TestDoesNotApplyBelowMinimum` (red), extend the implementation (green), then extract `isEligible` (refactor).

### Flutter (Dart)

In a Flutter project, unit tests for pure Dart logic use the `flutter_test` package, which re-exports the matchers from `package:test`.

```dart
// lib/discount.dart
class Discount {
  final double percentage;
  final double? minSubtotal;

  const Discount({required this.percentage, this.minSubtotal});
}

double applyDiscount(double subtotal, Discount discount) {
  if (!_isEligible(subtotal, discount)) return subtotal;
  return subtotal - (subtotal * discount.percentage) / 100;
}

bool _isEligible(double subtotal, Discount discount) {
  final min = discount.minSubtotal;
  return min == null || subtotal >= min;
}
```

```dart
// test/discount_test.dart
import 'package:flutter_test/flutter_test.dart';
import 'package:my_app/discount.dart';

void main() {
  test('applies a percentage discount to the subtotal', () {
    expect(applyDiscount(100, const Discount(percentage: 10)), 90);
  });

  test('does not apply the discount when subtotal is below the minimum', () {
    expect(
      applyDiscount(40, const Discount(percentage: 10, minSubtotal: 50)),
      40,
    );
  });
}
```

Across all three languages, the discipline is the same: a failing test, a minimal implementation, then a refactor. The tools change; the loop does not.

---

## When to use

- The behavior can be expressed clearly as input/output or observable state.
- The domain has non-trivial rules that benefit from being captured as tests.
- The code is expected to live and evolve over time, so a regression safety net pays off.
- Refactoring is expected — TDD keeps the design safe to change.
- The right API or design is unclear and you want the tests to push the shape.

## When NOT to use

- Exploratory UI work or visual tweaks, where the feedback loop is the screen, not assertions.
- Throwaway spikes and prototypes meant to be deleted once a question is answered.
- Code that depends almost entirely on external systems (raw glue code), where every test would be a mock with little real signal.
- When the team has no experience with TDD and the deadline does not allow learning — partial adoption tends to produce slow, brittle tests that erode trust in the practice.

---

## References

- Beck, Kent. *Test-Driven Development: By Example*. Addison-Wesley, 2002.
- Freeman, Steve; Pryce, Nat. *Growing Object-Oriented Software, Guided by Tests*. Addison-Wesley, 2009.
- Fowler, Martin. ["Mocks Aren't Stubs"](https://martinfowler.com/articles/mocksArentStubs.html) — the foundational article contrasting the classicist and mockist styles.
- [Vitest documentation](https://vitest.dev/)
- [Jest documentation](https://jestjs.io/)
- [Go `testing` package](https://pkg.go.dev/testing)
- [`package:test` for Dart](https://pub.dev/packages/test) and the [Flutter testing guide](https://docs.flutter.dev/testing/overview)
