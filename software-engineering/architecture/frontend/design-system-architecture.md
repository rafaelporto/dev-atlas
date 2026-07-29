---
type: concept
tags:
  - architecture
  - frontend
  - component-driven
  - concept
related:
  - software-engineering/architecture/frontend/component-driven-architecture
  - languages/react/styling
  - languages/react/composition-patterns
language: null
---
# Design System Architecture

> Treat the shared UI — tokens, components, and theming — as a versioned product with a clear contract, so many apps and teams stay visually and behaviorally consistent without re-deciding every button.

---

## What is it?

A design system is the shared layer of UI that multiple screens, apps, or teams build on: the color/spacing/typography values, the reusable components (button, input, modal), and the rules for combining them. Its **architecture** is how that layer is structured, versioned, and distributed — as opposed to the visual design itself.

It is built from a small number of stacked concerns:

- **Design tokens** — the atomic named values (`color.primary`, `space.4`, `font.body`). The single source of truth for visual decisions, kept independent of any framework.
- **Primitives** — low-level building blocks that consume tokens (a `Box`, `Text`, `Stack`).
- **Components** — the reusable, accessible units teams actually use (`Button`, `Dialog`, `Select`).
- **Patterns** — recommended compositions for recurring problems (a form layout, an empty state).

Above the code sits the **contract**: the component's public props/API and the theming interface, which is what consumers depend on and what must stay stable.

---

## Why does it matter?

Without a shared system, every team re-implements the same button slightly differently. The results compound into real cost:

- **Inconsistency** — twelve shades of "primary blue", buttons with different padding, inconsistent focus states. The product feels incoherent.
- **Duplicated effort** — accessibility, keyboard handling, and edge cases get re-solved (usually incompletely) in every app.
- **Expensive rebrands** — changing the brand color means a find-and-replace across dozens of codebases instead of one token update.

A design system with a real architecture turns the shared UI into a **product with a versioned contract**. A token change propagates everywhere; a component fix ships once; a rebrand becomes a token release. It is also the prerequisite for visual consistency across [micro-frontends](micro-frontends.md), where independent teams would otherwise drift apart.

---

## How it works

### The layered pipeline

```
   ┌──────────────┐   build   ┌───────────────────────────┐
   │ Design tokens │ ────────► │ Platform outputs            │
   │ (JSON, one    │           │ CSS vars · JS/TS · native   │
   │  source of    │           └────────────┬──────────────┘
   │  truth)       │                         │ consumed by
   └──────────────┘                          ▼
                              ┌───────────────────────────┐
                              │ Primitives (Box, Text…)     │
                              └────────────┬──────────────┘
                                           ▼
                              ┌───────────────────────────┐
                              │ Components (Button, Modal…) │  ← public contract
                              └────────────┬──────────────┘
                                           ▼
                              ┌───────────────────────────┐
                              │  Consuming apps / teams     │
                              └───────────────────────────┘
```

Tokens are authored once (often as JSON) and compiled to whatever each platform needs — CSS custom properties for the web, typed constants for JS/TS, resources for native. Because the values live in one place, a change flows down the whole pipeline.

### Theming as a contract

Theming is the ability to swap token *values* (light/dark, brand A/brand B, high-contrast) without touching component *code*. This works only if components read from tokens rather than hardcoding values. The theme is an interface: as long as a theme provides every token the components expect, any theme is interchangeable.

```
   Components  ──read──►  token names  ◄──provide──  Theme (light / dark / brand-x)
   (never hardcode a color; always reference color.primary)
```

### Distribution and versioning

The design system is shipped like any dependency — as versioned packages consumed by apps. That makes **versioning strategy** an architectural decision:

- **Semantic versioning** — a breaking change to a component's props/API is a major version; consumers upgrade deliberately.
- **Deprecation over removal** — mark old APIs deprecated and support them for a window rather than breaking consumers overnight.
- **Independent releasability** — teams pull updates on their own schedule, which is exactly what makes the system viable across [micro-frontends](micro-frontends.md).

The governing rule is the same as any public API: internals can change freely; the **published contract** (props, token names, theme shape) must stay stable or migrate with a clear path.

### Documentation as infrastructure

A design system without a live catalog of components and their states (Storybook or similar) is unusable — consumers can't discover what exists or how to use it. The documented, previewable component gallery is part of the architecture, not an add-on.

---

## Examples

The illustrative snippet (one framework's syntax) shows tokens as the source of truth, a component reading tokens (never hardcoding), and theming by swapping values.

```ts
// tokens.ts — the single source of truth. Framework-agnostic named values.
export const tokens = {
  color: { primary: "var(--color-primary)", text: "var(--color-text)" },
  space: { sm: "0.5rem", md: "1rem" },
  radius: { md: "0.375rem" },
};
```

```tsx
// Button reads token NAMES — it never hardcodes a color or spacing value.
// Because of that, it works under any theme without code changes.
function Button({ children, ...props }: React.ComponentProps<"button">) {
  return (
    <button
      style={{
        background: tokens.color.primary,
        color: tokens.color.text,
        padding: `${tokens.space.sm} ${tokens.space.md}`,
        borderRadius: tokens.radius.md,
      }}
      {...props}
    >
      {children}
    </button>
  );
}
```

```css
/* Theming = swap the token VALUES. Components don't change.
   A rebrand or dark mode is a change here, not in every component. */
:root        { --color-primary: #2563eb; --color-text: #ffffff; }
[data-theme="dark"] { --color-primary: #3b82f6; --color-text: #0b1220; }
```

Changing `--color-primary` re-themes every component that reads `color.primary` — one edit, system-wide effect.

---

## When to use

- Multiple apps or multiple teams that must look and behave consistently.
- A single large app where UI inconsistency and duplicated component logic are already causing pain.
- As a prerequisite for [micro-frontends](micro-frontends.md), to hold independently deployed slices together visually.
- When rebrands, theming (dark mode, multi-brand), or accessibility compliance need to happen in one place rather than everywhere.

## When NOT to use

- A single small app with one team — a lightweight component folder is enough; a versioned, documented system is overhead.
- Very early product stage — the design is still churning, so freezing it into a versioned system creates constant breaking changes. Stabilize the design first.
- Adopting a heavy third-party system when a few shared components would do — the maintenance and learning cost can exceed the benefit for a small surface.
- Building the system as an ivory tower with no consumer input — a design system nobody adopts is wasted effort; it must be driven by real product needs.

---

## References

- Frost, Brad. [Atomic Design](https://atomicdesign.bradfrost.com/). atomicdesign.bradfrost.com.
- Design Tokens Community Group. [Design Tokens Format](https://www.designtokens.org/). designtokens.org.
- Curtis, Nathan. [Design Systems (Medium collection)](https://medium.com/eightshapes-llc/tagged/design-systems). EightShapes.
- Storybook. [Introduction to Storybook](https://storybook.js.org/docs). Storybook Documentation.
