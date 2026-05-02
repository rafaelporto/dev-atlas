# Memento

> Capture and externalize an object's internal state so that it can be restored later, without violating encapsulation.

---

## What is it?

Memento stores a snapshot of an object's state in a separate object (the memento). The originator creates mementos and uses them to restore its state. A caretaker stores mementos but never inspects their contents — encapsulation is preserved.

## Why does it matter?

Undo/redo, snapshots, and checkpoints require saving and restoring state. Doing this outside the object usually requires exposing private fields, breaking encapsulation. Memento keeps the state opaque to everyone except the originator.

## How it works

Three roles:

| Role | Responsibility |
|---|---|
| **Originator** | Creates a memento of its current state; restores from a memento |
| **Memento** | Stores the originator's state; exposes nothing to outsiders |
| **Caretaker** | Stores mementos; never reads or modifies their content |

## Pseudo-code

```python
from dataclasses import dataclass
from typing import Any

# Memento — stores state, opaque to caretaker
@dataclass(frozen=True)
class EditorMemento:
    content: str
    cursor_position: int
    selection: tuple[int, int]


# Originator — creates and restores mementos
class TextEditor:
    def __init__(self):
        self._content = ""
        self._cursor = 0
        self._selection = (0, 0)

    def type(self, text: str):
        self._content += text
        self._cursor = len(self._content)

    def select(self, start: int, end: int):
        self._selection = (start, end)

    def save(self) -> EditorMemento:
        return EditorMemento(self._content, self._cursor, self._selection)

    def restore(self, memento: EditorMemento):
        self._content = memento.content
        self._cursor = memento.cursor_position
        self._selection = memento.selection

    def display(self):
        print(f"Content: '{self._content}' | Cursor: {self._cursor}")


# Caretaker — manages history without inspecting mementos
class UndoManager:
    def __init__(self, editor: TextEditor):
        self._editor = editor
        self._history: list[EditorMemento] = []

    def save(self):
        self._history.append(self._editor.save())

    def undo(self):
        if len(self._history) > 1:
            self._history.pop()                    # discard current state
            self._editor.restore(self._history[-1])
        elif self._history:
            self._editor.restore(self._history[0]) # restore to earliest


# Usage
editor = TextEditor()
undo = UndoManager(editor)

undo.save()                    # save initial empty state

editor.type("Hello")
undo.save()
editor.display()               # → Content: 'Hello' | Cursor: 5

editor.type(", World")
undo.save()
editor.display()               # → Content: 'Hello, World' | Cursor: 12

editor.type("!!!")
editor.display()               # → Content: 'Hello, World!!!' | Cursor: 15
# (no save here — this will be discarded on undo)

undo.undo()
editor.display()               # → Content: 'Hello, World' | Cursor: 12

undo.undo()
editor.display()               # → Content: 'Hello' | Cursor: 5
```

### Snapshot pattern (simpler variant)

```python
class GameState:
    def __init__(self):
        self.level = 1
        self.health = 100
        self.position = (0, 0)

    def checkpoint(self) -> dict:
        return {"level": self.level, "health": self.health, "position": self.position}

    def load(self, snapshot: dict):
        self.level = snapshot["level"]
        self.health = snapshot["health"]
        self.position = snapshot["position"]

# Simple and effective for cases where encapsulation is less critical.
```

## When to use

- You need undo/redo or checkpoint/restore functionality.
- Direct access to the object's state would break encapsulation.
- The state snapshot is complete enough to restore the object fully.

## When NOT to use

- When the state is very large — storing many snapshots is expensive.
- When the originator changes frequently — mementos may become stale or incompatible.

## References

- Gamma et al. *Design Patterns*. Addison-Wesley, 1994. p. 283.
- [Refactoring Guru — Memento](https://refactoring.guru/design-patterns/memento)
