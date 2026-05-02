# Visitor

> Represent an operation to be performed on elements of an object structure. Visitor lets you define a new operation without changing the classes of the elements on which it operates.

---

## What is it?

Visitor separates an algorithm from the object structure it operates on. You add new operations by creating new visitor classes, without modifying the element classes.

## Why does it matter?

When you need to perform many distinct operations across a heterogeneous object hierarchy, adding each operation to every class pollutes those classes with unrelated concerns. Visitor collects all variants of one operation into a single class, making it easy to add new operations without touching the hierarchy.

## How it works

The key mechanism is **double dispatch**: when the client calls `element.accept(visitor)`, the element calls `visitor.visit(self)`, passing its concrete type — so the right overload is resolved at runtime.

```
Client → element.accept(visitor)
              └→ visitor.visit(element)   ← correct overload selected at runtime
```

1. **Element** interface declares `accept(visitor)`.
2. Each **ConcreteElement** implements `accept()` as `visitor.visit(self)`.
3. **Visitor** interface declares a `visit()` overload for each concrete element type.
4. **ConcreteVisitor** implements all overloads with the specific operation logic.

## Pseudo-code

```python
from abc import ABC, abstractmethod

# Visitor interface — one visit() per element type
class DocumentVisitor(ABC):
    @abstractmethod
    def visit_heading(self, heading: "Heading"): ...

    @abstractmethod
    def visit_paragraph(self, paragraph: "Paragraph"): ...

    @abstractmethod
    def visit_image(self, image: "Image"): ...


# Element interface
class DocumentElement(ABC):
    @abstractmethod
    def accept(self, visitor: DocumentVisitor): ...


# Concrete elements — each accepts a visitor
class Heading(DocumentElement):
    def __init__(self, level: int, text: str):
        self.level = level
        self.text = text

    def accept(self, visitor: DocumentVisitor):
        visitor.visit_heading(self)           # double dispatch


class Paragraph(DocumentElement):
    def __init__(self, text: str):
        self.text = text

    def accept(self, visitor: DocumentVisitor):
        visitor.visit_paragraph(self)


class Image(DocumentElement):
    def __init__(self, src: str, alt: str):
        self.src = src
        self.alt = alt

    def accept(self, visitor: DocumentVisitor):
        visitor.visit_image(self)


# Concrete visitor 1: render as HTML
class HTMLRenderer(DocumentVisitor):
    def visit_heading(self, heading: Heading):
        print(f"<h{heading.level}>{heading.text}</h{heading.level}>")

    def visit_paragraph(self, paragraph: Paragraph):
        print(f"<p>{paragraph.text}</p>")

    def visit_image(self, image: Image):
        print(f'<img src="{image.src}" alt="{image.alt}"/>')


# Concrete visitor 2: extract plain text
class TextExtractor(DocumentVisitor):
    def __init__(self):
        self._output: list[str] = []

    def visit_heading(self, heading: Heading):
        self._output.append(heading.text.upper())

    def visit_paragraph(self, paragraph: Paragraph):
        self._output.append(paragraph.text)

    def visit_image(self, image: Image):
        self._output.append(f"[Image: {image.alt}]")

    def result(self) -> str:
        return "\n".join(self._output)


# Concrete visitor 3: word count
class WordCounter(DocumentVisitor):
    def __init__(self):
        self.count = 0

    def visit_heading(self, heading: Heading):
        self.count += len(heading.text.split())

    def visit_paragraph(self, paragraph: Paragraph):
        self.count += len(paragraph.text.split())

    def visit_image(self, image: Image):
        pass  # images have no words


# Usage
document = [
    Heading(1, "Introduction"),
    Paragraph("This is the first paragraph with some content."),
    Image("diagram.png", "Architecture diagram"),
    Paragraph("And here is the conclusion."),
]

print("=== HTML ===")
html = HTMLRenderer()
for element in document:
    element.accept(html)
# <h1>Introduction</h1>
# <p>This is the first paragraph with some content.</p>
# <img src="diagram.png" alt="Architecture diagram"/>
# <p>And here is the conclusion.</p>

print("\n=== Plain Text ===")
extractor = TextExtractor()
for element in document:
    element.accept(extractor)
print(extractor.result())

print("\n=== Word Count ===")
counter = WordCounter()
for element in document:
    element.accept(counter)
print(f"Total words: {counter.count}")  # → 13
```

## Adding a new operation

Without Visitor: modify every element class.
With Visitor: add one new `ConcreteVisitor` class — no element class is touched.

## When to use

- You need to perform many distinct operations on a heterogeneous object structure and want to avoid polluting element classes.
- Adding new operations is more frequent than adding new element types.
- The object structure is stable but you need to define new operations over it.

## When NOT to use

- When you frequently add new element types — every new element requires updating every visitor.
- When the hierarchy is shallow and operations are few — direct methods on the elements are simpler.

## References

- Gamma et al. *Design Patterns*. Addison-Wesley, 1994. p. 331.
- [Refactoring Guru — Visitor](https://refactoring.guru/design-patterns/visitor)
