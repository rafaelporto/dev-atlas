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
  - languages/css/methodologies
  - languages/css/best-practices
  - software-engineering/architecture/frontend/styling/css-architecture-and-organization
language: "css"
---
# Cascade, Specificity and Inheritance

> When several CSS rules set the same property on the same element, the cascade picks exactly one winner by origin, importance, layer, specificity, scope proximity and source order — and inheritance fills in whatever no rule set.

---

## What is it?

When two CSS rules disagree about how an element should look, the browser needs a fixed procedure to decide which one wins. That procedure is the **cascade**.

Three mechanisms work together:

- **Cascade** — sorts all declarations that apply to an element/property pair and keeps the one with the highest precedence.
- **Specificity** — one of the cascade's criteria: a weight computed from the selector, so `#nav a` beats `a`.
- **Inheritance** — for properties with no winning declaration, some (mostly text-related) take the parent's value; the rest fall back to their initial value.

Modern CSS adds explicit control over the cascade: **cascade layers** (`@layer`), **scoping** (`@scope`), and specificity-adjusting selectors (`:where()`, `:is()`).

---

## Why does it matter?

Most "CSS is unpredictable" complaints are cascade problems: a component style overridden by a global one, a third-party library that can only be beaten with `!important`, a selector made longer and longer to win a fight. These lead to **specificity wars** — each fix raises the stakes for the next one.

Understanding the cascade lets you:

- Predict which rule wins without trial and error in DevTools.
- Design a stylesheet where overrides are cheap (low, flat specificity).
- Use `@layer` to make "reset < third-party < components < utilities" an explicit contract instead of an accident of import order.

Every styling approach — Sass, CSS Modules, Tailwind, CSS-in-JS — still runs through this algorithm in the browser.

---

## How it works

### The cascade sort order

For each element and property, the browser collects every matching declaration and compares them criterion by criterion, moving to the next only on a tie:

```
1. Origin and importance      transitions > !important (UA > user > author)
                              > animations > normal (author > user > UA)
2. Context                    shadow DOM: outer context vs. encapsulated styles
3. Element-attached styles    style="" attribute beats selector-based rules
4. Cascade layers             later layer wins (reversed for !important)
5. Specificity                (ID, CLASS, TYPE) compared left to right
6. Scope proximity            nearer @scope root wins
7. Order of appearance        last declaration wins
```

**Origins** are where the CSS comes from: the **user agent** (browser defaults), the **user** (accessibility settings, user stylesheets), and the **author** (your site). Normally author beats user beats UA. `!important` **reverses** this, so a user's important accessibility override beats an author's important rule.

### Specificity

Specificity is a three-part tuple `(A, B, C)`, compared column by column — never as a decimal number:

| Column | Counts |
|---|---|
| **A** | ID selectors (`#main`) |
| **B** | Classes (`.btn`), attributes (`[type="text"]`), pseudo-classes (`:hover`, `:nth-child()`) |
| **C** | Type selectors (`button`), pseudo-elements (`::before`) |

The universal selector `*` and combinators (`>`, `+`, `~`, space) add nothing.

```
a                         (0,0,1)
.nav a                    (0,1,1)
.nav a:hover              (0,2,1)
#header .nav a            (1,1,1)   ← one ID beats any number of classes
```

Functional pseudo-classes have special rules:

| Selector | Specificity |
|---|---|
| `:is(a, #x)`, `:not(...)`, `:has(...)` | the **most specific** argument (`:is(a, #x)` → `(1,0,0)`) |
| `:where(...)` | always **zero** `(0,0,0)` |
| `:nth-child(2 of .x)` | the pseudo-class `(0,1,0)` plus its most specific argument |

`:where()` is the tool for writing defaults that are trivially overridable; `:is()` groups selectors without changing the weight model.

### `!important`

`!important` moves a declaration into a higher-priority bucket (step 1 above), ahead of all specificity comparisons. It is legitimate for **user-protecting utilities** (e.g. `.visually-hidden`) and for overriding inline styles you do not control. Used to win specificity fights, it escalates: the only way to beat an `!important` is another `!important` with higher precedence.

### Cascade layers (`@layer`)

Layers group rules into named buckets whose order is declared once. **Layer order beats specificity**: a `(0,0,1)` selector in a later layer beats a `(1,0,0)` selector in an earlier one.

```
Normal declarations                      !important declarations
(lowest → highest)                       (lowest → highest)

reset                                    unlayered !important
third-party                              utilities !important
components                               components !important
utilities                                third-party !important
unlayered styles   ← highest normal      reset !important   ← highest important
```

Key rules:

- The **first** `@layer a, b, c;` statement fixes the order; later blocks append rules to existing layers.
- **Unlayered** styles beat all layered normal styles — useful while migrating, surprising otherwise.
- For `!important`, the order **reverses**: an early layer (e.g. a reset) can protect a declaration from every later layer.
- `@import url(lib.css) layer(third-party);` puts a whole external stylesheet into a layer.
- `revert-layer` rolls a property back to what earlier layers set.

Baseline: **Widely available** (newly available March 2022).

### Scoping (`@scope`)

`@scope` limits rules to a DOM subtree, optionally with a **lower boundary** ("donut scope") where styles stop applying:

```css
@scope (.card) to (.card-content) {
  img { border: 1px solid; }   /* images in .card, but not inside .card-content */
}
```

It adds **scope proximity** to the cascade: when specificity ties, the rule whose scope root is closer in the DOM wins — so a nested `.dark` theme beats an outer `.light` one regardless of source order. Selectors inside `@scope` do not inherit the specificity of the scope root; `:scope` adds `(0,1,0)`.

Baseline: **Newly available** since March 2026 (the web-features dataset records full support in Chrome 143, Firefox 146, and Safari 26.4, the last of the three). Treat it as progressive enhancement for audiences on older browsers.

### Inheritance

When no declaration wins for a property:

- **Inherited properties** take the parent's computed value. Mostly typography and text: `color`, `font-*`, `line-height`, `letter-spacing`, `text-align`, `visibility`, `cursor`, and all **custom properties**.
- **Non-inherited properties** take their **initial value**: `margin`, `padding`, `border`, `background`, `display`, `width`, and most layout/box properties.

Explicit keywords override the default behavior for any property:

| Keyword | Effect |
|---|---|
| `inherit` | Take the parent's value. |
| `initial` | Take the spec's initial value (note: `display: initial` is `inline`, not the browser default for that element). |
| `unset` | `inherit` if the property inherits, otherwise `initial`. |
| `revert` | Roll back to the user-agent/user origin (e.g. restore a `<button>`'s native look). |
| `revert-layer` | Roll back to the value from previous cascade layers. |

`all: unset` or `all: revert` reset every property at once — handy for isolating a widget from page styles.

---

## Examples

### Low-specificity defaults with `:where()`

```css
/* Library defaults: specificity (0,0,0), any consumer rule wins */
:where(.btn) {
  padding: 0.5rem 1rem;
  border: 1px solid currentColor;
}

/* Consumer override: a plain class beats it, no !important needed */
.checkout .btn { padding: 0.75rem 1.5rem; }
```

### Taming third-party CSS with layers

```css
/* Order declared once, at the top of the entry stylesheet */
@layer reset, vendor, components, utilities;

@import url("normalize.css") layer(reset);
@import url("datepicker.css") layer(vendor);

@layer components {
  /* (0,1,0) beats any vendor selector, even #ids — layer order wins */
  .datepicker-day { border-radius: 50%; }
}

@layer utilities {
  /* !important beats every normal declaration in every layer and unlayered CSS;
     only an !important in an EARLIER layer (e.g. reset) could beat it */
  .hidden { display: none !important; }
}
```

### Nested themes with `@scope` proximity

```css
@scope (.theme-light) { a { color: #0b57d0; } }
@scope (.theme-dark)  { a { color: #a8c7fa; } }
```

```html
<section class="theme-dark">
  <div class="theme-light">
    <a href="/">Light link</a>  <!-- nearest root is .theme-light → wins -->
  </div>
</section>
```

Without `@scope`, the same selectors would tie on specificity and whichever rule appeared last in the file would win for every link.

### Restoring native styles

```css
.prose button { all: revert; }  /* undo site-wide button styles inside rich text */
```

---

## When to use

- **`@layer`** — in any stylesheet that combines resets, third-party CSS, components, and utilities; when migrating legacy CSS (put it in a low layer and override cleanly).
- **`:where()`** — for library/base styles that consumers must be able to override with a single class.
- **`:is()`** — to shorten selector lists when the resulting specificity is acceptable.
- **`@scope`** — for component styles in plain CSS without a build-time scoping tool, and for nested themes where proximity should decide.
- **`!important`** — for utility classes that must always win, and for user-protective rules; ideally inside a deliberate layer.

## When NOT to use

- Do not use IDs in selectors for styling — a single ID outweighs any number of classes and makes overrides expensive.
- Do not use `!important` to win a specificity fight; fix the selector or the layer order instead.
- Do not nest selectors deeply (Sass or native nesting) just to mirror the DOM — each level adds specificity and couples CSS to markup.
- Do not leave most styles unlayered once you adopt `@layer` — unlayered styles silently beat every layer.
- Do not rely on `@scope` as your only isolation mechanism if you must support browsers older than early 2026; CSS Modules or naming conventions remain safer there.

---

## References

- W3C. [CSS Cascading and Inheritance Level 6](https://www.w3.org/TR/css-cascade-6/). W3C.
- W3C. [Selectors Level 4 — Calculating a selector's specificity](https://www.w3.org/TR/selectors-4/#specificity-rules). W3C.
- MDN Web Docs. [Introduction to the CSS cascade](https://developer.mozilla.org/en-US/docs/Web/CSS/Cascade). Mozilla.
- MDN Web Docs. [Cascade layers](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Styling_basics/Cascade_layers). Mozilla.
- MDN Web Docs. [@scope](https://developer.mozilla.org/en-US/docs/Web/CSS/@scope). Mozilla.
- Suzanne, Miriam (non-official author, CSSWG editor). [A Complete Guide to CSS Cascade Layers](https://css-tricks.com/css-cascade-layers/). CSS-Tricks.
