# Command

> Encapsulate a request as an object, allowing you to parameterize clients with different requests, queue or log requests, and support undoable operations.

---

## What is it?

Command turns a request into a standalone object that contains all information about the request: the action, the receiver, and the parameters. This decouples the sender (who triggers the action) from the receiver (who performs it).

## Why does it matter?

Without Command, the sender must know the receiver and call it directly — tight coupling. With Command, the sender only knows the `execute()` interface. This enables:

- **Queuing**: commands can be stored and executed later.
- **Undo/redo**: commands can implement `undo()`.
- **Logging**: commands can be serialized and replayed.
- **Macro recording**: a sequence of commands can be saved as a single compound command.

## How it works

```
Invoker ──► Command (interface) ──► execute() ──► Receiver
                   ▲
         ConcreteCommand (stores receiver + params)
```

1. **Command** interface: `execute()`, optionally `undo()`.
2. **ConcreteCommand** stores the receiver and implements the action.
3. **Invoker** calls `execute()` — it never calls the receiver directly.
4. **Receiver** is the object that actually performs the work.

## Pseudo-code

```python
from abc import ABC, abstractmethod
from collections import deque

# Command interface
class Command(ABC):
    @abstractmethod
    def execute(self): ...

    @abstractmethod
    def undo(self): ...


# Receiver
class TextEditor:
    def __init__(self):
        self.content = ""

    def insert(self, text: str, position: int):
        self.content = self.content[:position] + text + self.content[position:]

    def delete(self, position: int, length: int):
        self.content = self.content[:position] + self.content[position + length:]


# Concrete commands
class InsertCommand(Command):
    def __init__(self, editor: TextEditor, text: str, position: int):
        self._editor = editor
        self._text = text
        self._position = position

    def execute(self):
        self._editor.insert(self._text, self._position)

    def undo(self):
        self._editor.delete(self._position, len(self._text))


class DeleteCommand(Command):
    def __init__(self, editor: TextEditor, position: int, length: int):
        self._editor = editor
        self._position = position
        self._length = length
        self._deleted = ""

    def execute(self):
        self._deleted = self._editor.content[self._position:self._position + self._length]
        self._editor.delete(self._position, self._length)

    def undo(self):
        self._editor.insert(self._deleted, self._position)


# Invoker — manages history for undo/redo
class CommandHistory:
    def __init__(self):
        self._history: deque[Command] = deque()

    def execute(self, command: Command):
        command.execute()
        self._history.append(command)

    def undo(self):
        if self._history:
            self._history.pop().undo()


# Usage
editor = TextEditor()
history = CommandHistory()

history.execute(InsertCommand(editor, "Hello", 0))
print(editor.content)   # → Hello

history.execute(InsertCommand(editor, " World", 5))
print(editor.content)   # → Hello World

history.execute(DeleteCommand(editor, 5, 6))
print(editor.content)   # → Hello

history.undo()
print(editor.content)   # → Hello World

history.undo()
print(editor.content)   # → Hello
```

### Command queue (task scheduling)

```python
class JobQueue:
    def __init__(self):
        self._queue: deque[Command] = deque()

    def enqueue(self, command: Command):
        self._queue.append(command)

    def process_next(self):
        if self._queue:
            self._queue.popleft().execute()
```

## When to use

- You need to parameterize objects with operations.
- You need undo/redo functionality.
- You need to queue, schedule, or log operations.
- You need to implement macro commands (a sequence of commands as one).

## When NOT to use

- When the operation is simple and does not need to be queued, undone, or logged — direct invocation is clearer.
- When the number of command classes grows disproportionately for simple use cases.

## References

- Gamma et al. *Design Patterns*. Addison-Wesley, 1994. p. 233.
- [Refactoring Guru — Command](https://refactoring.guru/design-patterns/command)
