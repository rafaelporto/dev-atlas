# Interpreter

> Given a language, define a representation for its grammar along with an interpreter that uses the representation to interpret sentences in the language.

---

## What is it?

Interpreter defines a grammar for a simple language and provides an interpreter to process sentences written in that language. Each grammar rule becomes a class, and the sentence is represented as a tree of these classes (an Abstract Syntax Tree, or AST).

## Why does it matter?

When a problem recurs in a well-defined, structured way that can be expressed as a language (search queries, math expressions, configuration rules, command DSLs), building an interpreter gives you a composable, extensible way to evaluate expressions without giant conditionals.

## How it works

```
Expression (interface)
    └── interpret(context)
         ▲              ▲
TerminalExpression    NonTerminalExpression
(leaf: a literal)    (composite: combines sub-expressions)
```

1. Define an **Expression** interface with `interpret(context)`.
2. **TerminalExpression** handles atomic values (numbers, identifiers, literals).
3. **NonTerminalExpression** composes sub-expressions (operators, rules).
4. The client builds an AST from these classes and calls `interpret()` on the root.

## Pseudo-code

### Example: arithmetic expression evaluator

```python
from abc import ABC, abstractmethod

Context = dict[str, int]

# Expression interface
class Expression(ABC):
    @abstractmethod
    def interpret(self, context: Context) -> int: ...


# Terminal expressions (leaves)
class NumberExpression(Expression):
    def __init__(self, value: int):
        self._value = value

    def interpret(self, context: Context) -> int:
        return self._value


class VariableExpression(Expression):
    def __init__(self, name: str):
        self._name = name

    def interpret(self, context: Context) -> int:
        return context.get(self._name, 0)


# Non-terminal expressions (composites)
class AddExpression(Expression):
    def __init__(self, left: Expression, right: Expression):
        self._left = left
        self._right = right

    def interpret(self, context: Context) -> int:
        return self._left.interpret(context) + self._right.interpret(context)


class SubtractExpression(Expression):
    def __init__(self, left: Expression, right: Expression):
        self._left = left
        self._right = right

    def interpret(self, context: Context) -> int:
        return self._left.interpret(context) - self._right.interpret(context)


class MultiplyExpression(Expression):
    def __init__(self, left: Expression, right: Expression):
        self._left = left
        self._right = right

    def interpret(self, context: Context) -> int:
        return self._left.interpret(context) * self._right.interpret(context)


# Usage — build the AST manually for: (a + 5) * (b - 2)
context = {"a": 10, "b": 8}

expression = MultiplyExpression(
    AddExpression(VariableExpression("a"), NumberExpression(5)),      # a + 5
    SubtractExpression(VariableExpression("b"), NumberExpression(2))  # b - 2
)

result = expression.interpret(context)
print(result)  # → (10 + 5) * (8 - 2) = 15 * 6 = 90
```

### Example: boolean filter DSL

```python
class BooleanExpression(ABC):
    @abstractmethod
    def evaluate(self, record: dict) -> bool: ...


class FieldEquals(BooleanExpression):
    def __init__(self, field: str, value):
        self._field = field
        self._value = value

    def evaluate(self, record: dict) -> bool:
        return record.get(self._field) == self._value


class AndExpression(BooleanExpression):
    def __init__(self, left: BooleanExpression, right: BooleanExpression):
        self._left = left
        self._right = right

    def evaluate(self, record: dict) -> bool:
        return self._left.evaluate(record) and self._right.evaluate(record)


class OrExpression(BooleanExpression):
    def __init__(self, *expressions: BooleanExpression):
        self._expressions = expressions

    def evaluate(self, record: dict) -> bool:
        return any(e.evaluate(record) for e in self._expressions)


# Build a filter: (status == "active") AND (role == "admin" OR role == "editor")
filter_expr = AndExpression(
    FieldEquals("status", "active"),
    OrExpression(
        FieldEquals("role", "admin"),
        FieldEquals("role", "editor"),
    )
)

records = [
    {"name": "Alice", "status": "active", "role": "admin"},
    {"name": "Bob",   "status": "active", "role": "viewer"},
    {"name": "Carol", "status": "inactive", "role": "editor"},
    {"name": "Dave",  "status": "active", "role": "editor"},
]

for r in records:
    if filter_expr.evaluate(r):
        print(r["name"])
# → Alice
# → Dave
```

## When to use

- You need to interpret sentences in a simple, well-defined language or grammar.
- The grammar is stable and not too complex (rule of thumb: fewer than ~10 rules).
- Composability is important — new expressions should be combinable freely.

## When NOT to use

- When the grammar is large or complex — Interpreter becomes a maintenance burden. Use a proper parser generator (ANTLR, PLY) instead.
- When performance is critical — tree traversal for every evaluation is slow for high-throughput scenarios.

## References

- Gamma et al. *Design Patterns*. Addison-Wesley, 1994. p. 243.
- [Refactoring Guru — Interpreter](https://refactoring.guru/design-patterns/interpreter)
