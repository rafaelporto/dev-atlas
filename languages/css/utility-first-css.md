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
  - software-engineering/architecture/frontend/design-system-architecture
  - software-engineering/architecture/frontend/component-driven-architecture
  - software-engineering/architecture/frontend/styling/design-tokens
  - languages/css/styling-approaches-comparison
  - software-engineering/architecture/frontend/styling/styling-in-monorepos
language: "css"
---
# Utility-First CSS

> Utility-first CSS styles elements by composing many small single-purpose classes (`flex`, `gap-4`, `text-sm`) drawn from a constrained token scale; tools like Tailwind CSS and UnoCSS generate only the classes you use, trading markup verbosity for no naming, no dead CSS and a built-in design system.

---

## What is it?

Utility-first CSS is a way of styling where, instead of inventing a class name like `.profile-card` and writing its rules in a stylesheet, you put many tiny ready-made classes directly on the element — each one doing exactly one thing, such as adding padding or setting a font size.

```html
<div class="flex items-center gap-4 rounded-lg bg-white p-4 shadow-sm">…</div>
```

Two related terms:

- **Atomic CSS** — the underlying technique: one class per declaration (or property-value pair). The term was popularised by Thierry Koblentz's 2013 article and Yahoo's Atomizer. Atomic CSS can be written by hand, generated from markup (Atomizer, Tailwind, UnoCSS), or generated from JS objects by a compiler (StyleX, Panda CSS — see [CSS-in-JS](css-in-js.md)).
- **Utility-first** — a *workflow*: reach for utilities by default, and extract an abstraction (a component, occasionally a CSS class) only when duplication becomes real. Utility classes have existed for a long time (`.text-center`, `.mt-0` in Bootstrap); "utility-first" makes them the primary tool rather than an escape hatch.

**Tailwind CSS** is the dominant implementation; **UnoCSS** is an engine-style alternative. The current Tailwind major version is **v4** (v4.0 released January 2025; the 4.3.x line is current as of October 2026).

---

## Why does it matter?

Semantic class names ("`.card`, `.card__header`") push a naming decision onto every element and keep CSS and markup in separate files that drift apart. Utility-first removes several failure modes at once:

- **No naming** — no debates about `.wrapper` vs `.container`, no BEM tree to design up front.
- **Append-only CSS is gone** — the stylesheet is a function of the utilities used in source files; deleting markup deletes CSS. Stylesheet size plateaus because utilities are shared.
- **Constraint system** — classes come from a token scale (`p-4`, `text-sm`, `bg-brand-500`), so arbitrary one-off values become visible exceptions (`p-[13px]`) instead of the default.
- **Local reasoning** — every style affecting an element is on the element; no cascade surprises from a rule in another file.
- **Fast iteration** — no context switch between files.

The cost is real, too: dense class strings, HTML that mixes structure and presentation, and a reliance on a component layer (React/Vue/Svelte components, template partials) to avoid repetition. Whether utility-first fits is mostly a question of whether your codebase *has* that component layer.

---

## How it works

### Build-time generation (JIT)

Modern utility frameworks generate CSS on demand by scanning source files:

```
  source files (.tsx, .vue, .svelte, .html, .md…)
            │  scan for class-like tokens
            ▼
  candidate set {flex, gap-4, md:grid-cols-2, hover:bg-brand-600, p-[13px] …}
            │  match against utility rules + theme tokens
            ▼
  CSS output: only matching utilities, ordered in cascade layers
```

- Tailwind's just-in-time engine became the default in v3 and is the only mode in v4. Arbitrary values (`w-[37rem]`) and arbitrary properties are generated as encountered.
- **Detection is textual.** The scanner looks for complete class strings; it does not execute your code. Building a class name by concatenation (`` `bg-${color}-500` ``) produces a string the scanner never sees, so the CSS is never generated. Map props to *complete* class names instead.
- **Variants** prefix utilities with conditions: `hover:`, `focus-visible:`, `md:` (breakpoints), `dark:`, `aria-expanded:`, `data-[state=open]:`, `@md:` (container queries), `group-hover:`, `peer-checked:`.

### Tailwind CSS v4

The v4 rewrite moved configuration into CSS:

```css
@import "tailwindcss";               /* theme, preflight (base), utilities */

@theme {
  --color-brand-500: oklch(0.55 0.18 250);
  --font-display: "Inter", sans-serif;
  --breakpoint-3xl: 120rem;
}
```

- **CSS-first configuration** — `@theme` declares design tokens in namespaces (`--color-*`, `--font-*`, `--text-*`, `--spacing`, `--radius-*`, `--shadow-*`, `--breakpoint-*`…). Each token generates utilities (`bg-brand-500`, `font-display`, `3xl:`) **and** is emitted as a real custom property on `:root`, so the same token is usable in hand-written CSS and inline styles.
- `--color-*: initial;` clears a default namespace; `@theme inline` resolves values that reference other variables.
- **Other directives** — `@source` (add/exclude scan paths; detection is automatic and respects `.gitignore`), `@utility` (define custom utilities that work with variants), `@custom-variant`, `@variant`, `@apply`, `@reference` (import theme and utilities into a separate stylesheet — e.g. a Vue/Svelte `<style>` block — without duplicating output), and `@config`/`@plugin` for loading legacy v3 JavaScript configuration and plugins.
- **Native CSS underneath** — output uses cascade layers (`theme`, `base`, `components`, `utilities`), `@property`, `color-mix()` and logical properties, which raised the browser baseline (v4 targets modern evergreen browsers; projects needing older browsers stay on v3).
- Integrations: a Vite plugin, a PostCSS plugin (`@tailwindcss/postcss`), and a CLI.

### UnoCSS

UnoCSS (created by Anthony Fu) is an **atomic CSS engine** rather than a framework: the core ships no utilities. Everything comes from **presets** — `preset-wind3`/`preset-wind4` (Tailwind-compatible), `preset-mini`, `preset-attributify` (utilities as HTML attributes), `preset-icons` (pure-CSS icons from Iconify), typography, web fonts. Custom rules are static strings or regexes mapped to CSS, which makes it highly customisable. It is popular in the Vue/Vite/Nuxt ecosystem.

| | Tailwind CSS v4 | UnoCSS |
|---|---|---|
| Model | Opinionated framework with a default design system | Engine + presets; unopinionated core |
| Configuration | CSS (`@theme`, `@utility`) | `uno.config.ts` (rules, shortcuts, presets) |
| Custom utilities | `@utility` in CSS | Regex/static rules in TS |
| Extras | First-party ecosystem, docs, IDE extension, Prettier class sorting | Attributify mode, icons preset, variant groups |
| Best fit | Teams wanting a standard with broad community knowledge | Teams wanting maximum flexibility or a custom utility language |

### Abstraction: components first, `@apply` last

Repetition in utility-first codebases is handled at the **component** level, not the CSS level:

```
repeated class string ──▶ extract a component (Button, Card) ──▶ variants via cva / tailwind-variants
                                    │
                                    └─ only if no component layer exists (plain HTML, CMS, Markdown)
                                       ──▶ a CSS class built with @apply
```

**The `@apply` debate.** `@apply` inlines utilities into a custom class:

```css
.btn { @apply rounded-md px-4 py-2 font-medium; }
```

Arguments against overusing it: it recreates semantic CSS (naming, file switching, dead code) while adding Tailwind-specific syntax; it couples hand-written CSS to the utility engine; and in v4 using it in isolated stylesheets requires `@reference`. Arguments for: styling third-party markup, Markdown/CMS output, or small shared primitives in non-component templates. Tailwind's own docs present it as a tool for those cases, not the main abstraction mechanism.

**Class conflicts.** Two utilities setting the same property (`p-2 p-4`) resolve by *stylesheet order*, not by order in the `class` attribute. Libraries like `tailwind-merge` resolve conflicts when a component accepts a `className` override.

### Theming via tokens

Because v4 tokens are custom properties, runtime theming is plain CSS:

```css
@import "tailwindcss";

@theme {
  --color-surface: var(--surface);         /* utility bg-surface → runtime variable */
  --color-on-surface: var(--on-surface);
}

:root          { --surface: oklch(0.99 0 0); --on-surface: oklch(0.2 0 0); }
[data-theme="dark"] { --surface: oklch(0.2 0 0); --on-surface: oklch(0.95 0 0); }
```

Utilities stay the same (`bg-surface text-on-surface`); only variables change per theme. Combine with `@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));` when you also need explicit `dark:` overrides. See [custom properties and theming](custom-properties-and-theming.md) and [design tokens](../../software-engineering/architecture/frontend/styling/design-tokens.md) for keeping one token source across tools.

---

## Examples

### A component with variants

```tsx
import { cva, type VariantProps } from "class-variance-authority";
import { twMerge } from "tailwind-merge";

const button = cva(
  "inline-flex items-center gap-2 rounded-md font-medium focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50",
  {
    variants: {
      intent: {
        primary: "bg-brand-500 text-white hover:bg-brand-600",
        ghost: "bg-transparent text-on-surface hover:bg-on-surface/5",
      },
      size: { sm: "px-2 py-1 text-sm", md: "px-4 py-2 text-base" },
    },
    defaultVariants: { intent: "primary", size: "md" },
  },
);

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof button>;

export function Button({ intent, size, className, ...rest }: Props) {
  // twMerge lets a caller's "px-6" replace the variant's "px-4" instead of fighting it
  return <button className={twMerge(button({ intent, size }), className)} {...rest} />;
}
```

### Responsive and state variants

```html
<ul class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
  <li class="group rounded-lg border p-4 hover:border-brand-500">
    <h3 class="font-semibold group-hover:text-brand-600">Plan</h3>
    <details class="mt-2 open:bg-surface">…</details>
  </li>
</ul>
```

### Never build class names dynamically

```tsx
// Broken: the scanner never sees "bg-red-500" or "bg-green-500"
const bad = (color: "red" | "green") => `bg-${color}-500`;

// Works: complete class names appear in source
const tone = { red: "bg-red-500", green: "bg-green-500" } as const;
const good = (color: keyof typeof tone) => tone[color];
```

### A custom utility and variant in v4

```css
@import "tailwindcss";

@utility content-auto {
  content-visibility: auto;
}

@custom-variant theme-contrast (&:where([data-contrast="more"], [data-contrast="more"] *));
```

```html
<section class="content-auto theme-contrast:border-2">…</section>
```

### UnoCSS configuration

```ts
// uno.config.ts
import { defineConfig, presetWind4, presetIcons } from "unocss";

export default defineConfig({
  presets: [presetWind4(), presetIcons()],
  shortcuts: { "btn": "px-4 py-2 rounded-md font-medium" },
  rules: [[/^stack-(\d+)$/, ([, n]) => ({ display: "flex", "flex-direction": "column", gap: `${Number(n) / 4}rem` })]],
});
```

---

## When to use

- **Component-based apps** (React, Vue, Svelte, Angular, Astro) where repetition is solved by components — the natural home of utility-first.
- **Teams that want a constraint system** — consistent spacing, type and color scales without writing a design-system stylesheet.
- **Server Components and SSR-heavy apps** — output is static CSS and class strings, no runtime.
- **Prototyping and product teams iterating quickly on UI.**
- **Codebases suffering from dead or append-only CSS** — generated CSS tracks usage automatically.

---

## When NOT to use

- **Content you do not template** — CMS rich text, Markdown, third-party widgets; use element styles, a typography plugin, or scoped CSS.
- **Without a component layer** — long class strings copied across plain HTML pages become unmaintainable.
- **Heavy `@apply` to recreate semantic classes** — you pay for both systems; write normal CSS instead.
- **Dynamic class-name construction** — conflicts with scanning; any approach that assembles class names at runtime will miss CSS.
- **Legacy browser targets** — Tailwind v4 relies on modern CSS features; use v3 or another approach.
- **Teams or stakeholders that need markup readable by non-developers**, or where design comes as hand-written semantic CSS — the mismatch costs more than it saves.
- **As a replacement for design decisions** — the default palette and scale are a starting point; skipping token work produces generic UIs and arbitrary-value sprawl (`[13px]` everywhere).

---

## References

- [Tailwind CSS documentation](https://tailwindcss.com/docs/styling-with-utility-classes) — official
- [Tailwind CSS v4.0 announcement](https://tailwindcss.com/blog/tailwindcss-v4) — official, January 2025
- [Tailwind CSS: Theme variables](https://tailwindcss.com/docs/theme) — official
- [Tailwind CSS: Functions and directives](https://tailwindcss.com/docs/functions-and-directives) — official
- [Tailwind CSS: Adding custom styles](https://tailwindcss.com/docs/adding-custom-styles) — official
- [UnoCSS guide](https://unocss.dev/guide/) — official
- [Atomizer / ACSS](https://acss.io) — official site of Yahoo's atomic CSS tool
- [Challenging CSS Best Practices](https://www.smashingmagazine.com/2013/10/challenging-css-best-practices-atomic-approach/) — community article by Thierry Koblentz (origin of "Atomic CSS")
- [CSS Utility Classes and "Separation of Concerns"](https://adamwathan.me/css-utility-classes-and-separation-of-concerns/) — community essay by Adam Wathan, Tailwind's creator
