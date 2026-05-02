# Bridge

> Decouple an abstraction from its implementation so that the two can vary independently.

---

## What is it?

Bridge splits a large class (or closely related classes) into two separate hierarchies — **abstraction** and **implementation** — which can be developed and extended independently.

## Why does it matter?

Without Bridge, adding new variants to two orthogonal dimensions causes a combinatorial explosion of subclasses.

```
# Without Bridge: 2 shapes × 3 rendering APIs = 6 classes
CircleOpenGL, CircleVulkan, CircleMetal
RectangleOpenGL, RectangleVulkan, RectangleMetal

# With Bridge: 2 shapes + 3 renderers = 5 classes
```

## How it works

1. Identify the two dimensions of variation (e.g., shape vs. renderer).
2. Extract one dimension into an **implementor** interface.
3. The **abstraction** holds a reference to an implementor and delegates the implementation-specific work to it.

```
Abstraction ──────────────────► Implementor (interface)
     │                               ▲           ▲
     │                               │           │
RefinedAbstraction         ConcreteImplA   ConcreteImplB
```

## Pseudo-code

```python
# Implementor interface
class Renderer:
    def render_circle(self, x: float, y: float, radius: float): ...
    def render_rectangle(self, x: float, y: float, w: float, h: float): ...


# Concrete implementors
class OpenGLRenderer(Renderer):
    def render_circle(self, x, y, radius):
        print(f"OpenGL: circle at ({x},{y}) r={radius}")

    def render_rectangle(self, x, y, w, h):
        print(f"OpenGL: rect at ({x},{y}) {w}x{h}")


class SVGRenderer(Renderer):
    def render_circle(self, x, y, radius):
        print(f'<circle cx="{x}" cy="{y}" r="{radius}"/>')

    def render_rectangle(self, x, y, w, h):
        print(f'<rect x="{x}" y="{y}" width="{w}" height="{h}"/>')


# Abstraction — holds a reference to the implementor
class Shape:
    def __init__(self, renderer: Renderer):
        self._renderer = renderer   # the "bridge"

    def draw(self): ...
    def resize(self, factor: float): ...


# Refined abstractions
class Circle(Shape):
    def __init__(self, x: float, y: float, radius: float, renderer: Renderer):
        super().__init__(renderer)
        self.x, self.y, self.radius = x, y, radius

    def draw(self):
        self._renderer.render_circle(self.x, self.y, self.radius)

    def resize(self, factor: float):
        self.radius *= factor


class Rectangle(Shape):
    def __init__(self, x, y, w, h, renderer: Renderer):
        super().__init__(renderer)
        self.x, self.y, self.w, self.h = x, y, w, h

    def draw(self):
        self._renderer.render_rectangle(self.x, self.y, self.w, self.h)

    def resize(self, factor: float):
        self.w *= factor
        self.h *= factor


# Usage — mix any shape with any renderer freely
gl = OpenGLRenderer()
svg = SVGRenderer()

Circle(0, 0, 10, gl).draw()        # → OpenGL: circle at (0,0) r=10
Circle(0, 0, 10, svg).draw()       # → <circle cx="0" cy="0" r="10"/>
Rectangle(5, 5, 20, 15, svg).draw()# → <rect x="5" y="5" width="20" height="15"/>
```

## Bridge vs Adapter

| | Bridge | Adapter |
|---|---|---|
| Intent | Design upfront to allow variation | Fix incompatible interfaces after the fact |
| Timing | Applied at design time | Applied at integration time |

## When to use

- You want to avoid a permanent binding between abstraction and implementation.
- Both abstraction and implementation should be extensible via subclassing independently.
- Changes in implementation should not impact client code.

## When NOT to use

- When there is only one implementation — the extra layer adds complexity without benefit.
- When the two dimensions do not genuinely vary independently.

## References

- Gamma et al. *Design Patterns*. Addison-Wesley, 1994. p. 151.
- [Refactoring Guru — Bridge](https://refactoring.guru/design-patterns/bridge)
