# Value Object

> An immutable domain object whose equality is defined by its attributes, not by an identifier.

---

## What is it?

A value object represents a value the same way a number or a date does: two are considered the same when their contents match, not because they are the same object. Equality is by content, never by reference.

The pattern originates as a tactical building block in Domain-Driven Design (Eric Evans) and was formalized outside that context by Martin Fowler. Value objects are how a domain expresses concepts that have meaning but no identity — prices, ranges, addresses, coordinates.

The contrast with [Entity](domain-driven-design.md#entity) is the defining distinction: an Entity is "who you are" (identity), a Value Object is "what you are" (attributes). A customer with a new email address is still the same customer; a `Money(10, "USD")` with a different amount is a different `Money`.

## Why does it matter?

Without value objects, a domain typically suffers from four recurring problems:

- **Primitive Obsession** — passing `string`, `number`, or tuples around loses meaning. A signature like `transfer(amount: number, currency: string)` reveals nothing about the rules these values must obey.
- **Scattered validation** — the same rule ("a currency code is three uppercase letters", "an amount cannot be negative") gets re-implemented at every boundary, and any of those copies can fall behind.
- **Equality bugs** — comparing references when the intent is to compare contents produces silent, hard-to-spot defects.
- **Loss of domain expressiveness** — `Money`, `Email`, `Coordinates` speak the language of the business; `Decimal`, `string`, `(float, float)` do not.

Value objects collapse all four problems into a single construct: a small class that owns its rules and is compared by content.

## How it works

A value object exhibits six properties. The first five are intrinsic to the object itself; the sixth describes how it is used.

```
┌──────────────────────────┐     ┌──────────────────────────┐
│         Entity           │     │      Value Object        │
│                          │     │                          │
│  Equality: by identity   │     │  Equality: by attributes │
│  Mutable                 │     │  Immutable               │
│  Has lifecycle           │     │  Created, used, discarded│
│  Example: Customer       │     │  Example: Money, Email   │
└──────────────────────────┘     └──────────────────────────┘
```

1. **Value equality** — two value objects are equal if and only if all their attributes are equal. Reference identity is irrelevant.
2. **Immutability** — there are no setters. Once constructed, a value object's state cannot change.
3. **Self-validation** — the constructor rejects invalid input. An invalid value object cannot exist; if construction succeeds, the invariants hold.
4. **Side-effect-free behavior** — operations on a value object return a new value object rather than mutating the receiver. `price.add(tax)` produces a new `Money`; it does not change `price`.
5. **Wholeness** — the attributes form an indivisible conceptual unit. `Money` is `amount` *and* `currency` together — splitting them loses meaning.
6. **Replaceability** — since value objects cannot change, "updating" one means replacing the reference that holds it. A `Customer` swaps its `Address` for a new one; the old `Address` is discarded.

## Not every field is a Value Object

The case against Primitive Obsession can be over-applied. Wrapping every primitive in a class adds ceremony without value if the wrapper carries no rule, no behavior, and no meaningful composition.

A `Title` class whose only content is a `string` validates nothing, computes nothing, combines nothing. Replacing `string title` with `Title title` does not make the code clearer — it just adds a layer.

A primitive deserves to become a value object only when at least one of the following holds:

- **It carries validation rules.** An email is a `string` with structure; a currency code is three uppercase letters. Encapsulating these rules in one place justifies the type.
- **It composes multiple values into a whole.** `Money` is `amount` *and* `currency`; `DateRange` is `start` *and* `end`. The combination has meaning the parts do not.
- **It owns domain behavior.** `Money.add`, `Coordinates.distanceTo`, `Temperature.toFahrenheit`. The type is a natural home for operations the domain cares about.
- **It encodes a unit or constraint that the type system cannot.** `Meters` and `Feet` are indistinguishable if both are `double`. A value object makes the unit explicit and prevents accidental mixing.

If none of these apply, leave the primitive alone — the wrapper would be noise, not modeling.

## Examples

The canonical example is `Money` — an amount paired with a currency, validated at construction, compared by content, and supporting an `add` operation that returns a new `Money`.

### TypeScript

```typescript
export class Money {
  constructor(
    public readonly amount: number,
    public readonly currency: string,
  ) {
    if (amount < 0) throw new Error("amount cannot be negative");
    if (!/^[A-Z]{3}$/.test(currency)) throw new Error("invalid currency code");
  }

  equals(other: Money): boolean {
    return this.amount === other.amount && this.currency === other.currency;
  }

  add(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new Error("cannot add different currencies");
    }
    return new Money(this.amount + other.amount, this.currency);
  }
}

// new Money(10, "USD").equals(new Money(10, "USD")) → true
```

JavaScript has no native value equality, so `equals` is explicit. `readonly` fields prevent mutation after construction.

### Go

```go
package money

import (
    "errors"
    "regexp"
)

var currencyPattern = regexp.MustCompile(`^[A-Z]{3}$`)

type Money struct {
    amount   int64
    currency string
}

func New(amount int64, currency string) (Money, error) {
    if amount < 0 {
        return Money{}, errors.New("amount cannot be negative")
    }
    if !currencyPattern.MatchString(currency) {
        return Money{}, errors.New("invalid currency code")
    }
    return Money{amount: amount, currency: currency}, nil
}

func (m Money) Add(other Money) (Money, error) {
    if m.currency != other.currency {
        return Money{}, errors.New("cannot add different currencies")
    }
    return New(m.amount+other.amount, m.currency)
}

// a, _ := New(10, "USD")
// b, _ := New(10, "USD")
// a == b → true  (built-in struct equality)
```

Because `Money` contains only comparable types, Go's `==` operator already gives value equality — no `Equals` method needed. Unexported fields combined with a constructor returning `error` guarantee that no invalid `Money` can exist.

### Dart (Flutter)

```dart
import 'package:meta/meta.dart';

@immutable
class Money {
  final int amount;
  final String currency;

  Money(this.amount, this.currency) {
    if (amount < 0) {
      throw ArgumentError('amount cannot be negative');
    }
    if (!RegExp(r'^[A-Z]{3}$').hasMatch(currency)) {
      throw ArgumentError('invalid currency code');
    }
  }

  Money add(Money other) {
    if (currency != other.currency) {
      throw ArgumentError('cannot add different currencies');
    }
    return Money(amount + other.amount, currency);
  }

  @override
  bool operator ==(Object other) =>
      other is Money && amount == other.amount && currency == other.currency;

  @override
  int get hashCode => Object.hash(amount, currency);
}

// Money(10, 'USD') == Money(10, 'USD') → true
```

Dart requires explicit overrides of `==` and `hashCode` to get value equality. `@immutable` from `package:meta` is a static analysis hint that reinforces the invariant that all fields are `final`.

## When to use

- The concept has no identity — prices, coordinates, date ranges, email addresses, colors, measurements.
- The concept has validation rules that should be enforced in a single place.
- A primitive (`string`, `number`) is being passed around in many places and its meaning is implicit.
- Equality of two instances should be based on their content.

## When NOT to use

- The concept needs to be tracked across time despite attribute changes (e.g., a customer whose email changes is still the same customer — that is an Entity).
- The object is intrinsically mutable or has a lifecycle (active sessions, long-lived stateful components).
- The codebase is a small CRUD application without meaningful domain rules — the abstraction overhead is not justified.
- The attribute is genuinely a primitive in the domain (e.g., a counter that is just a number).

## References

- Evans, Eric. *Domain-Driven Design: Tackling Complexity in the Heart of Software*. Addison-Wesley, 2003. Chapter "Value Objects".
- Vernon, Vaughn. *Implementing Domain-Driven Design*. Addison-Wesley, 2013. Chapter 6.
- Fowler, Martin. ["ValueObject" — martinfowler.com](https://martinfowler.com/bliki/ValueObject.html).
- Fowler, Martin. *Refactoring: Improving the Design of Existing Code*. "Replace Primitive with Object".
