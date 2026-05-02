# Design Patterns

> Reusable solutions to commonly occurring problems in software design.

Design patterns are not finished code — they are templates describing how to solve a problem in a given context. They were popularized by the "Gang of Four" (GoF) in the book *Design Patterns: Elements of Reusable Object-Oriented Software* (1994).

Patterns are organized into three categories based on their intent:

---

## Creational Patterns

Deal with object creation, making systems independent of how objects are created, composed, and represented.

| Pattern | Intent |
|---|---|
| [Singleton](creational/singleton.md) | Ensure a class has only one instance and provide a global access point to it |
| [Factory Method](creational/factory-method.md) | Define an interface for creating objects, letting subclasses decide which class to instantiate |
| [Abstract Factory](creational/abstract-factory.md) | Create families of related objects without specifying their concrete classes |
| [Builder](creational/builder.md) | Construct complex objects step by step, separating construction from representation |
| [Prototype](creational/prototype.md) | Create new objects by copying an existing object |

---

## Structural Patterns

Deal with how classes and objects are composed to form larger structures.

| Pattern | Intent |
|---|---|
| [Adapter](structural/adapter.md) | Convert an interface into another interface that clients expect |
| [Bridge](structural/bridge.md) | Decouple an abstraction from its implementation so they can vary independently |
| [Composite](structural/composite.md) | Compose objects into tree structures to represent part-whole hierarchies |
| [Decorator](structural/decorator.md) | Attach additional responsibilities to an object dynamically |
| [Facade](structural/facade.md) | Provide a simplified interface to a complex subsystem |
| [Flyweight](structural/flyweight.md) | Share common state among many fine-grained objects to save memory |
| [Proxy](structural/proxy.md) | Provide a surrogate or placeholder that controls access to another object |

---

## Behavioral Patterns

Deal with communication and responsibility between objects.

| Pattern | Intent |
|---|---|
| [Chain of Responsibility](behavioral/chain-of-responsibility.md) | Pass a request along a chain of handlers until one processes it |
| [Command](behavioral/command.md) | Encapsulate a request as an object, enabling undo, queuing, and logging |
| [Iterator](behavioral/iterator.md) | Provide a way to sequentially access elements without exposing the underlying structure |
| [Mediator](behavioral/mediator.md) | Define an object that encapsulates how a set of objects interact |
| [Memento](behavioral/memento.md) | Capture and restore an object's internal state without violating encapsulation |
| [Observer](behavioral/observer.md) | Define a one-to-many dependency so that when one object changes state, its dependents are notified |
| [State](behavioral/state.md) | Allow an object to alter its behavior when its internal state changes |
| [Strategy](behavioral/strategy.md) | Define a family of algorithms, encapsulate each one, and make them interchangeable |
| [Template Method](behavioral/template-method.md) | Define the skeleton of an algorithm, deferring some steps to subclasses |
| [Visitor](behavioral/visitor.md) | Add new operations to objects without modifying their classes |

---

## How to choose a pattern

1. Identify the problem category: are you solving a creation, composition, or communication problem?
2. Look for the forces at play: what must vary? What must stay fixed?
3. Prefer the simplest pattern that solves the problem. Do not apply a pattern just because you can.

> Patterns should emerge from refactoring, not be imposed upfront.

---

## References

- Gamma, E., Helm, R., Johnson, R., Vlissides, J. *Design Patterns: Elements of Reusable Object-Oriented Software*. Addison-Wesley, 1994.
- [Refactoring Guru — Design Patterns](https://refactoring.guru/design-patterns)
- [SourceMaking — Design Patterns](https://sourcemaking.com/design_patterns)
