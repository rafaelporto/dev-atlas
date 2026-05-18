# Styling

> Three mainstream approaches: CSS Modules (locally scoped CSS), Tailwind CSS (utility-first), and CSS-in-JS (styled-components, Emotion). Pick by the team's preference and the framework's constraints — there is no universal best.

---

## What is it?

**Styling** in a React app is the strategy for delivering CSS rules to components. Unlike templating libraries that ship with a styling solution, React leaves it open. The main options:

1. **Plain CSS / CSS Modules** — `import styles from "./Foo.module.css"`; class names scoped per file.
2. **Tailwind CSS** — utility classes (`flex`, `gap-2`, `text-red-500`) composed directly in JSX.
3. **CSS-in-JS** — `styled-components`, `Emotion`. Styles in TypeScript, dynamic per-prop.
4. **Component libraries** — Radix UI Themes, shadcn/ui, MUI, Mantine. Pre-styled primitives.

---

## Why does it matter?

The styling layer has the biggest impact on day-to-day developer experience after the framework itself. Naming, dynamic theming, SSR support, bundle size, and refactor cost all flow from this choice. It's worth picking deliberately.

---

## How it works

### CSS Modules

Each file is locally scoped — class names are namespaced at build time:

```css
/* Button.module.css */
.root    { padding: 0.5rem 1rem; border-radius: 4px; }
.primary { background: blue; color: white; }
```

```tsx
import styles from "./Button.module.css";
import clsx from "clsx";

function Button({ primary, children }: { primary?: boolean; children: React.ReactNode }) {
  return (
    <button className={clsx(styles.root, primary && styles.primary)}>
      {children}
    </button>
  );
}
```

Pros: real CSS, real cascade, easy to debug. Cons: still string-based class names, dynamic styling requires extra plumbing.

### Tailwind CSS

Utility classes applied directly in JSX. The compiler scans your files and ships only the classes you use:

```tsx
function Button({ primary, children }: { primary?: boolean; children: React.ReactNode }) {
  return (
    <button className={clsx(
      "px-4 py-2 rounded font-medium",
      primary ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-zinc-200 text-zinc-900",
    )}>
      {children}
    </button>
  );
}
```

Pros: no naming, no context-switch between files, dead-class elimination, very fast iteration. Cons: dense markup, long class strings (mitigate with `cva`, `tailwind-merge`, `clsx`), opinionated.

`tailwind-variants` and `cva` (class-variance-authority) let you express variants cleanly:

```tsx
const button = cva("px-4 py-2 rounded font-medium", {
  variants: {
    variant: {
      primary: "bg-blue-600 text-white hover:bg-blue-700",
      ghost:   "bg-transparent hover:bg-zinc-100",
    },
    size: {
      sm: "text-sm px-2 py-1",
      md: "text-base px-4 py-2",
    },
  },
  defaultVariants: { variant: "primary", size: "md" },
});

function Button({ variant, size, children }: ButtonProps) {
  return <button className={button({ variant, size })}>{children}</button>;
}
```

### CSS-in-JS (styled-components, Emotion)

Styles live in TypeScript; component-level theming and dynamic styles are natural:

```tsx
import styled from "styled-components";

const Button = styled.button<{ $primary?: boolean }>`
  padding: 0.5rem 1rem;
  border-radius: 4px;
  background: ${p => p.$primary ? "blue" : "lightgray"};
  color:      ${p => p.$primary ? "white" : "black"};
`;

<Button $primary>Save</Button>
```

Pros: dynamic styles per-prop, themes via context. Cons: runtime cost, complicated with RSC (most libraries are client-only), bundle overhead. The ecosystem has shifted away from runtime CSS-in-JS toward zero-runtime alternatives (Linaria, vanilla-extract, Panda CSS) or Tailwind.

### Component libraries

Pre-styled primitives speed up product work. Common picks:

- **shadcn/ui** — copy-paste Radix primitives styled with Tailwind. You own the code.
- **Radix UI Themes** — Radix's design system.
- **MUI** — Material Design, mature, large.
- **Mantine** — comprehensive, batteries included.

For headless primitives (no styles, full a11y), use **Radix UI** or **Headless UI** and style with whatever you've chosen.

### Comparison

| | CSS Modules | Tailwind | styled-components | shadcn/ui |
|---|---|---|---|---|
| Setup | Built-in (bundlers) | Config + plugin | Library | Copy components |
| Bundle (runtime) | 0 | 0 (utility CSS) | ~13 KB | Depends on Radix |
| Dynamic styles | Awkward | Conditional classes | Native | Via Tailwind |
| RSC compatible | Yes | Yes | Limited | Yes |
| Refactor cost | Moderate | Low (find/replace) | High | Low (you own it) |
| Best for | Teams with strong CSS background | Most new projects | Theme-heavy design systems | Apps that want a design system fast |

---

## Examples

### Theming with CSS variables

CSS variables work in every approach and are the most portable theming mechanism:

```css
:root {
  --color-primary: hsl(220 90% 50%);
}
[data-theme="dark"] {
  --color-primary: hsl(220 90% 60%);
}
```

```tsx
<button style={{ background: "var(--color-primary)" }}>Save</button>
```

### Combining Tailwind and CSS variables

Tailwind reads CSS variables natively in v4+:

```css
@theme {
  --color-brand: oklch(0.55 0.18 250);
}
```

```tsx
<button className="bg-brand text-white">Save</button>
```

---

## When to use

- **CSS Modules** — when the team has strong CSS skills and prefers separation of concerns.
- **Tailwind** — most new projects; fastest iteration, smallest learning curve for component-shaped CSS, excellent RSC story.
- **styled-components / Emotion** — when an existing codebase uses them; prefer zero-runtime alternatives for new code.
- **shadcn/ui** — when starting a new app and you want a curated base of primitives you fully own.

---

## When NOT to use

- Don't pick CSS-in-JS for new RSC apps — most libraries are client-only and force `"use client"` everywhere.
- Don't mix three styling approaches in the same codebase; one is the right answer.
- Don't ship a UI library "just in case" — it's significant bundle, lock-in, and override pain.
- Don't apply inline styles for everything — they have the highest specificity and resist theming.

---

## References

- [Tailwind CSS](https://tailwindcss.com)
- [CSS Modules](https://github.com/css-modules/css-modules)
- [styled-components](https://styled-components.com)
- [shadcn/ui](https://ui.shadcn.com)
- [Radix UI](https://www.radix-ui.com)
- [vanilla-extract](https://vanilla-extract.style)
