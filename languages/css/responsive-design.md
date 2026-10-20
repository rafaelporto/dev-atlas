---
type: concept
tags:
  - language
  - css
  - styling
  - frontend
related:
  - languages/react/styling
  - languages/nextjs/styling-and-assets
  - software-engineering/architecture/frontend/rendering-patterns
  - languages/css/layout-flexbox-and-grid
  - languages/css/modern-css
language: "css"
---
# Responsive Design

> Responsive design makes one codebase adapt to every screen, input, and user preference — with fluid values first, container queries for components, media queries for the page and user settings, and logical properties for any writing direction.

---

## What is it?

Responsive design means building a page that rearranges and resizes itself to fit whatever device it is viewed on, from a phone to a wide monitor, instead of building a separate site per device.

Modern responsive CSS adapts to three kinds of context:

- **The viewport** — size, orientation, and capabilities of the screen, via **media queries**.
- **The component's own space** — the size or style of a parent container, via **container queries**.
- **The user's preferences** — dark mode, reduced motion, higher contrast, via **`prefers-*` media features**.

Alongside queries, **intrinsic and fluid techniques** — `clamp()`, `min()`, `max()`, `fr`, `auto-fill`, flexible images — let many layouts adapt with no breakpoints at all.

---

## Why does it matter?

- Traffic is split across phones, tablets, laptops, foldables, and large monitors; a fixed-width layout fails most of them.
- Components are reused in different slots (a card in a sidebar and in a main column). Viewport breakpoints cannot know how wide the slot is; container queries can.
- Accessibility depends on it: users zoom to 400%, increase font size, request reduced motion, or use right-to-left languages. A layout that only works at the designer's width fails these users.
- Mobile browsers' collapsing address bars made the old `100vh` unreliable; the new viewport units fix it.

---

## How it works

### Order of preference

```
 1. Intrinsic layout      Grid auto-fill/minmax, flex-wrap, max-width   → no breakpoints
 2. Fluid values          clamp(), min(), max(), %, fr, cqi            → smooth scaling
 3. Container queries     component adapts to its slot                  → reusable components
 4. Media queries         page-level layout and user preferences       → global switches
```

Reach for the next level only when the previous one cannot express the design.

### Media queries

```css
@media (width >= 48rem) { /* tablet and up */ }
@media (40rem <= width < 64rem) { /* a range */ }
@media (hover: hover) and (pointer: fine) { /* mouse-like input */ }
```

- **Range syntax** (`width >= 48rem`) replaces `min-width`/`max-width` and avoids off-by-one gaps. Baseline: **Widely available** (since September 2025).
- Prefer `rem`/`em` breakpoints: they scale with the user's font size setting.
- Write **mobile-first** (base styles for small screens, `>=` queries add complexity for larger ones): small screens get the least CSS to override.

User-preference features:

| Feature | Use |
|---|---|
| `prefers-color-scheme: dark` | Dark theme — see [Custom Properties and Theming](custom-properties-and-theming.md). |
| `prefers-reduced-motion: reduce` | Remove or shorten non-essential animation. |
| `prefers-contrast: more` | Stronger borders and text contrast. |
| `forced-colors: active` | Windows High Contrast mode; respect system colors. |

All four are Baseline widely available.

### Container queries

A **container** is declared with `container-type`; descendants can then query its size:

```css
.slot { container: card-slot / inline-size; }

@container card-slot (inline-size >= 30rem) {
  .card { grid-template-columns: 10rem 1fr; }
}
```

- `container-type: inline-size` is the usual choice; `size` also tracks block size but requires the container to have an explicit height.
- **Container query units** — `cqi`, `cqb`, `cqmin`, `cqmax` — are percentages of the container's size, useful for fluid type inside components.
- Size queries are Baseline **Widely available** (since August 2025).

**Style queries** test a custom property value on the container, letting a parent switch a child's variant without extra classes:

```css
@container style(--variant: compact) {
  .card { padding: 0.5rem; }
}
```

Style queries for custom properties became Baseline **Newly available** in May 2026 (Firefox 151 was the last engine). Use them as enhancement if you support older browsers.

### Fluid values

```
 font-size: clamp( 1rem,  0.8rem + 1vw,  1.5rem )
                   ▲       ▲               ▲
                   min     preferred       max
                           (scales with viewport)
```

- `clamp(min, preferred, max)` gives fluid type and spacing with bounds. Always add a `rem` term to the preferred value so text still responds to user zoom.
- `min()` / `max()` express "this, but never more/less than that": `width: min(100% - 2rem, 70ch)`.
- Baseline: **Widely available**.

### Viewport units

| Unit | Height of | Use |
|---|---|---|
| `vh` | the **large** viewport on most mobile browsers (address bar hidden) | Legacy; can be taller than visible space |
| `svh` | **small** viewport (browser UI fully shown) | Content that must always fit |
| `lvh` | **large** viewport (browser UI hidden) | Backgrounds that should never show a gap |
| `dvh` | **dynamic** — follows the UI as it expands/collapses | Full-height app shells (may cause relayout on scroll) |

The same `s`/`l`/`d` prefixes exist for `vw`, `vi`, `vb`, `vmin`, `vmax`. Baseline: **Widely available** (since June 2025).

### Logical properties

Physical properties (`margin-left`, `width`, `top`) assume left-to-right, top-to-bottom text. **Logical properties** follow the writing mode instead:

| Physical | Logical |
|---|---|
| `width` / `height` | `inline-size` / `block-size` |
| `margin-left` / `margin-right` | `margin-inline-start` / `margin-inline-end` |
| `padding-top` + `padding-bottom` | `padding-block` |
| `top` / `left` | `inset-block-start` / `inset-inline-start` |
| `text-align: left` | `text-align: start` |

One stylesheet then works for English, Arabic (`dir="rtl"`), and vertical Japanese. Baseline: **Widely available**.

### Responsive images in CSS

- `img { max-inline-size: 100%; block-size: auto; }` keeps images inside their container.
- `aspect-ratio: 16 / 9` reserves space before the image loads, preventing layout shift.
- `object-fit: cover` crops an image to its box without distortion.
- `background-image: image-set("a.avif" type("image/avif"), "a.jpg" type("image/jpeg"))` lets the browser choose format and resolution for CSS backgrounds (Baseline widely available since March 2026).
- For content images, resolution switching belongs in HTML (`srcset`, `sizes`, `<picture>`), not CSS — the browser picks the file before CSS is applied.

---

## Examples

### Fluid type scale

```css
:root {
  --step-0: clamp(1rem, 0.95rem + 0.25vw, 1.125rem);
  --step-1: clamp(1.25rem, 1.1rem + 0.6vw, 1.5rem);
  --step-2: clamp(1.5rem, 1.2rem + 1.4vw, 2.25rem);
}

body { font-size: var(--step-0); }
h2   { font-size: var(--step-2); }
```

### A component that adapts to its slot

```css
.product-slot { container-type: inline-size; }

.product {
  display: grid;
  gap: 1rem;
}

@container (inline-size >= 32rem) {
  .product { grid-template-columns: 12rem 1fr; }
}

.product h3 { font-size: clamp(1rem, 4cqi, 1.5rem); }
```

The same `.product` stacks vertically in a narrow sidebar and goes side-by-side in a wide main column, on any viewport.

### Full-height app shell on mobile

```css
.app {
  min-block-size: 100vh;   /* fallback for very old browsers */
  min-block-size: 100dvh;
}
```

### Respecting reduced motion

```css
@media (prefers-reduced-motion: no-preference) {
  .reveal { transition: opacity 300ms, translate 300ms; }
}
```

Animation is opt-in for users who have not asked to reduce it, rather than opt-out.

### Direction-agnostic spacing

```css
.callout {
  border-inline-start: 4px solid var(--color-accent);
  padding-inline: 1rem;
  margin-block: 1.5rem;
}
```

---

## When to use

- **Fluid values and intrinsic Grid** as the first tool for any layout or type scale.
- **Container queries** for reusable components and design-system parts that appear in slots of different widths.
- **Media queries** for page-level structure (navigation pattern, page shell) and for user preferences and input capabilities.
- **`dvh`/`svh`** for full-height mobile layouts; `svh` when content must never be hidden by browser UI.
- **Logical properties** in every new stylesheet, and especially in products that are, or may become, localized to right-to-left languages.

## When NOT to use

- Do not define breakpoints per device model ("iPhone 15 width"); define them where the content breaks.
- Do not use media queries to make a component adapt to its slot — that couples it to page layout; use a container query.
- Do not use pure `vw` for font sizes — it ignores user zoom; combine with `rem` inside `clamp()`.
- Do not put `container-type: size` on elements whose height comes from content — it collapses them.
- Do not hide content on small screens as a substitute for designing for them; hidden content is still downloaded and often still needed.

---

## References

- W3C. [Media Queries Level 5](https://www.w3.org/TR/mediaqueries-5/). W3C.
- W3C. [CSS Conditional Rules Module Level 5 (container queries)](https://www.w3.org/TR/css-conditional-5/). W3C.
- W3C. [CSS Values and Units Module Level 4 (viewport units, clamp)](https://www.w3.org/TR/css-values-4/). W3C.
- W3C. [CSS Logical Properties and Values Level 1](https://www.w3.org/TR/css-logical-1/). W3C.
- MDN Web Docs. [Responsive web design](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/CSS_layout/Responsive_Design). Mozilla.
- MDN Web Docs. [CSS container queries](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries). Mozilla.
- web.dev. [Learn Responsive Design](https://web.dev/learn/design). Google.
