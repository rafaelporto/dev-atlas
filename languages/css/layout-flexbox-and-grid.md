---
type: concept
tags:
  - language
  - css
  - styling
  - frontend
related:
  - languages/javascript-typescript/frameworks/react/styling
  - software-engineering/architecture/frontend/design-system-architecture
  - languages/css/responsive-design
  - languages/css/cascade-specificity-and-inheritance
language: "css"
---
# Layout: Flexbox and Grid

> Every element is a box placed by a layout algorithm — normal flow by default, Flexbox for one-dimensional distribution, Grid for two-dimensional structure — and choosing the right one removes most layout hacks.

---

## What is it?

CSS layout is how the browser decides where each element sits on the page and how big it is. Every element generates a rectangular **box**, and a **layout algorithm** — chosen by the parent's `display` value — places its children.

The main algorithms:

- **Normal flow** — the default: block boxes stack vertically, inline content flows in lines like text.
- **Positioning** — `relative`, `absolute`, `fixed`, `sticky` move boxes relative to their normal spot, an ancestor, the viewport, or a scroll container.
- **Flexbox** (`display: flex`) — distributes items along **one axis** (a row or a column), with wrapping.
- **Grid** (`display: grid`) — places items on **two axes** at once, in rows and columns defined by the container.

Floats and tables were once used for page layout; today floats are only for wrapping text around images, and tables only for tabular data.

---

## Why does it matter?

Before Flexbox and Grid, layouts were built with floats, clearfix hacks, `inline-block` whitespace tricks, negative margins, and JavaScript height-equalizers. Those techniques were fragile and coupled markup to presentation.

Flexbox (Baseline widely available since 2018), Grid (since 2020), and `gap` for flex containers (since 2023), with subgrid widely available since March 2026, make common layouts declarative: centering, equal-height columns, sidebars, card grids, holy-grail page shells. Knowing the box model and formatting contexts explains the remaining surprises — collapsing margins, overflowing flex items, `z-index` that "does nothing".

---

## How it works

### The box model

```
┌───────────────────────── margin ─────────────────────────┐
│  ┌────────────────────── border ──────────────────────┐  │
│  │  ┌─────────────────── padding ──────────────────┐  │  │
│  │  │                                               │  │  │
│  │  │                content box                    │  │  │
│  │  │          (width × height by default)          │  │  │
│  │  │                                               │  │  │
│  │  └───────────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────┘
```

- `box-sizing: content-box` (the default): `width` sets only the content box; padding and border are added on top. A `width: 100%` element with padding overflows its parent.
- `box-sizing: border-box`: `width` includes padding and border. Nearly every reset applies it globally.

Vertical margins between adjacent blocks in normal flow **collapse** (the larger wins, they do not add). They do not collapse inside flex or grid containers.

### Formatting contexts

A **block formatting context** (BFC) is an isolated layout region: margins do not collapse across its edge and floats do not leak in or out. Flex, grid, `overflow` other than `visible`, and `display: flow-root` all create one. `display: flow-root` is the modern, side-effect-free clearfix.

A **stacking context** is the separate concept that governs `z-index`. It is created by positioned elements with a `z-index`, and also by `opacity < 1`, `transform`, `filter`, `isolation: isolate`, and others. A child can never escape its parent's stacking context, which is why a huge `z-index` sometimes has no effect.

### Positioning

| Value | Positioned relative to | In normal flow? |
|---|---|---|
| `static` | — (default) | Yes |
| `relative` | its own normal position | Yes (space reserved) |
| `absolute` | nearest positioned ancestor (the **containing block**) | No |
| `fixed` | the viewport (or an ancestor with `transform`/`filter`) | No |
| `sticky` | normal position until a scroll threshold, then sticks within its scroll container | Yes |

Use logical insets (`inset-inline-start`, `inset-block-end`, or the `inset` shorthand) instead of `left`/`top` for direction-aware layouts. For tooltips and popovers tied to another element, [anchor positioning](modern-css.md) replaces JavaScript measurement.

### Flexbox — one dimension

```
 main axis (flex-direction: row) ─────────────────────────►
┌──────────────────────────────────────────────────────────┐ ▲
│ ┌──────┐ ┌────────────┐ ┌──────┐                         │ │ cross
│ │ item │ │    item    │ │ item │  ← free space            │ │ axis
│ └──────┘ └────────────┘ └──────┘    distributed by       │ │
│                                     justify-content      │ ▼
└──────────────────────────────────────────────────────────┘
```

- **Container**: `flex-direction`, `flex-wrap`, `justify-content` (main axis), `align-items` (cross axis), `gap`.
- **Items**: `flex: <grow> <shrink> <basis>`. `flex: 1` = grow equally from a zero basis; `flex: none` = rigid; `flex: auto` = grow from content size.
- Content decides size first; free space is then distributed. That is why Flexbox suits content of unknown size (navbars, toolbars, tag lists).
- Flex items have `min-width: auto` by default, so long words or wide children can refuse to shrink. Set `min-width: 0` on the item to allow it.

### Grid — two dimensions

```
            col 1        col 2        col 3
          ┌─────────┬────────────┬─────────┐
  row 1   │ header  │  header    │ header  │   grid-template-columns:
          ├─────────┼────────────┼─────────┤     200px 1fr 200px;
  row 2   │ sidebar │   main     │  aside  │   grid-template-areas:
          ├─────────┼────────────┼─────────┤     "header header header"
  row 3   │ footer  │  footer    │ footer  │     "sidebar main aside"
          └─────────┴────────────┴─────────┘     "footer footer footer";
```

- The **container** defines tracks (`grid-template-columns/rows`), and items are placed by line numbers, named lines, or named areas. Unplaced items are auto-placed.
- The `fr` unit shares remaining space; `minmax(min, max)` bounds a track; `repeat(auto-fill | auto-fit, minmax(16rem, 1fr))` creates responsive columns without media queries.
- Structure is decided by the container first, then content fills it — the opposite of Flexbox.

### Subgrid

Nested grids normally define their own tracks, so a card's title, body, and footer cannot align with the sibling card's. `grid-template-rows: subgrid` (or columns) makes a child grid **reuse the parent's tracks**, so rows line up across siblings.

Baseline: **Widely available** since March 2026 (newly available September 2023).

### Choosing between them

| Need | Use |
|---|---|
| Text and documents flowing top to bottom | Normal flow |
| A row or column of items whose size comes from content | Flexbox |
| Centering one thing | Grid (`place-items: center`) or Flexbox — both fine |
| A page shell, dashboard, or anything with rows **and** columns | Grid |
| A card list that reflows by available width | Grid with `auto-fill` + `minmax()` |
| Aligning parts of nested components across siblings | Grid + subgrid |
| An overlay or element taken out of flow | Positioning (or anchor positioning) |

The two compose: a Grid page shell with Flexbox inside each region is the common case.

---

## Examples

### A global reset for predictable sizing

```css
*, *::before, *::after { box-sizing: border-box; }
```

### Flexbox toolbar with a pushed-right action

```css
.toolbar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.toolbar .spacer { margin-inline-start: auto; } /* pushes the rest to the end */
```

### Responsive card grid without media queries

```css
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(16rem, 100%), 1fr));
  gap: 1rem;
}
```

### Page shell with named areas

```css
.page {
  display: grid;
  min-block-size: 100dvh;
  grid-template:
    "header header" auto
    "nav    main"   1fr
    "footer footer" auto
    / 14rem 1fr;
}

.page > header { grid-area: header; }
.page > nav    { grid-area: nav; }
.page > main   { grid-area: main; }
.page > footer { grid-area: footer; }
```

### Aligned card sections with subgrid

```css
.cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.card {
  display: grid;
  grid-row: span 3;                 /* title, body, footer */
  grid-template-rows: subgrid;      /* share the parent's row tracks */
}
```

Every card's footer now sits on the same line, regardless of how long each body is.

---

## When to use

- **Normal flow** for documents and article content — do not wrap prose in flex containers.
- **Flexbox** for components whose children size themselves: navbars, button groups, chips, media objects, form rows.
- **Grid** for page layout, dashboards, galleries, forms with aligned labels, and any layout where rows and columns must line up.
- **Subgrid** when nested components (cards, list rows, form fields) must align with each other.
- **`position: sticky`** for headers and table headers that follow scroll without JavaScript.

## When NOT to use

- Do not use floats for layout; use them only to wrap text around media.
- Do not use Flexbox with percentage widths and negative margins to fake a grid — that is a Grid job.
- Do not use `position: absolute` for regular layout; it removes elements from flow and breaks with content changes and zoom.
- Do not use `order`, `grid-auto-flow: dense`, or area placement to reorder content visually away from DOM order — keyboard and screen-reader order follow the DOM, not the visual layout.
- Do not reach for a CSS framework's grid classes when three lines of native Grid do the job.

---

## References

- W3C. [CSS Flexible Box Layout Module Level 1](https://www.w3.org/TR/css-flexbox-1/). W3C.
- W3C. [CSS Grid Layout Module Level 2](https://www.w3.org/TR/css-grid-2/). W3C.
- W3C. [CSS Box Sizing Module Level 3](https://www.w3.org/TR/css-sizing-3/). W3C.
- MDN Web Docs. [CSS layout](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/CSS_layout). Mozilla.
- web.dev. [Learn CSS — Layout, Flexbox, Grid](https://web.dev/learn/css). Google.
- Comeau, Josh (non-official author). [An Interactive Guide to CSS Grid](https://www.joshwcomeau.com/css/interactive-guide-to-grid/). joshwcomeau.com.
