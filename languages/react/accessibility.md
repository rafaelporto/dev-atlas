# Accessibility

> Use semantic HTML first. Most accessibility comes from `<button>`, `<label>`, `<nav>`, proper heading order, and managing focus — not from ARIA attributes.

---

## What is it?

**Accessibility (a11y)** is the practice of building UIs usable by everyone — including people who navigate with a keyboard, use a screen reader, have low vision, or use voice control. In React, accessibility is a discipline shared between HTML semantics, ARIA attributes (only when semantics aren't enough), and focus/keyboard handling.

---

## Why does it matter?

It's the right thing to do, and it's also the law in many jurisdictions (ADA, EAA, etc.). Beyond compliance, accessible UIs are better for everyone: clearer text, faster keyboard flows, more reliable assistive-technology support. They also overlap heavily with SEO and good UX.

---

## How it works

### Semantic HTML first

The most important rule. Use the element that means what you want:

| Wrong | Right |
|---|---|
| `<div onClick={...}>Submit</div>` | `<button onClick={...}>Submit</button>` |
| `<div className="link">More</div>` | `<a href="...">More</a>` |
| `<span class="title">Welcome</span>` | `<h1>Welcome</h1>` (or `h2`, etc.) |
| `<div>Description</div>` next to an input | `<label>` |

A `<button>` is keyboard-focusable, fires on Enter and Space, has the right role, and gets free hover/focus styles. Replicating that with a `<div>` is non-trivial — don't.

### Headings

Use heading levels (`h1`–`h6`) to reflect the document structure. Don't pick a level for visual size; pick it for the outline. Style separately.

```tsx
<h1>Account</h1>
<h2>Profile</h2>
<h2>Security</h2>
<h3>Two-factor authentication</h3>
```

### Forms

Every input needs a label:

```tsx
// Best — implicit association
<label>
  Email
  <input type="email" name="email" />
</label>

// Equivalent — explicit association
<label htmlFor="email">Email</label>
<input id="email" type="email" name="email" />
```

Error messages should be programmatically associated with the field:

```tsx
<label htmlFor="email">Email</label>
<input
  id="email"
  aria-invalid={!!error}
  aria-describedby={error ? "email-error" : undefined}
/>
{error && <p id="email-error">{error}</p>}
```

### Focus management

When the UI changes significantly — opening a modal, navigating client-side — focus must follow:

```tsx
function Modal({ open, children }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) ref.current?.focus();
  }, [open]);

  return open ? <div ref={ref} role="dialog" tabIndex={-1}>{children}</div> : null;
}
```

For dialogs and menus, prefer **Radix UI** or **Headless UI** — they handle focus trap, restore, and Escape correctly.

After a client-side route change, focus the main heading (or use `useEffect` in the route component to focus a top-level element).

### Images

```tsx
<img src="/logo.png" alt="Acme logo" />        // informative
<img src="/decoration.svg" alt="" />            // decorative; alt="" hides it from AT
```

### Keyboard navigation

Everything clickable must work with the keyboard. The default for `<button>` and `<a>` covers most cases. Custom interactive components need:

- `tabIndex={0}` (or natural focusability)
- Keyboard handlers — Enter, Space, arrow keys when appropriate
- Visible focus styles (don't `outline: none` without a replacement)

### ARIA — only when semantics fall short

ARIA attributes (`role`, `aria-*`) **supplement** HTML semantics; they do not replace them.

```tsx
// ❌ Re-declaring what HTML already provides
<button role="button">Save</button>

// ✅ ARIA where there's no equivalent HTML
<div role="status" aria-live="polite">{message}</div>
```

The first rule of ARIA: **don't use ARIA**. The second: if you must, use it correctly.

Headless component libraries (Radix UI, Headless UI, React Aria) implement the [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/) for common widgets — use them instead of hand-rolling.

### Live regions

For dynamic content that shouldn't move focus (toasts, validation, inline updates):

```tsx
<div role="status" aria-live="polite">{statusMessage}</div>
<div role="alert">{errorMessage}</div>
```

`polite` waits for a pause; `assertive` interrupts. Use `assertive` only for genuinely urgent information.

### Testing accessibility

- **`eslint-plugin-jsx-a11y`** — static checks during development.
- **`axe-core` / `@axe-core/react`** — runtime checks in dev or CI.
- **Manual testing** — keyboard-only navigation, screen reader on at least one platform (VoiceOver on macOS/iOS, NVDA on Windows, TalkBack on Android).
- **Storybook a11y addon** — per-component reports.

---

## Examples

### A dialog with Radix UI

```tsx
import * as Dialog from "@radix-ui/react-dialog";

<Dialog.Root>
  <Dialog.Trigger asChild>
    <button>Edit profile</button>
  </Dialog.Trigger>
  <Dialog.Portal>
    <Dialog.Overlay className="dialog-overlay" />
    <Dialog.Content className="dialog">
      <Dialog.Title>Edit profile</Dialog.Title>
      <Dialog.Description>Update your information below.</Dialog.Description>
      {/* form */}
      <Dialog.Close>Cancel</Dialog.Close>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
```

Radix wires up focus trap, Escape, scroll lock, and ARIA — you get it right by default.

### Skip link

A "skip to content" link is the lowest-effort, highest-impact win for keyboard users:

```tsx
<a href="#main" className="sr-only focus:not-sr-only">Skip to content</a>
<header>…</header>
<main id="main">…</main>
```

(The `sr-only` utility hides the link visually but keeps it focusable.)

---

## When to use

- Always. Accessibility is not a feature — it's a baseline.
- Reach for **semantic HTML** first.
- Use **headless component libraries** (Radix UI, React Aria, Headless UI) for complex widgets.
- Run **axe** in dev and CI to catch regressions automatically.

---

## When NOT to use

- Don't add ARIA when semantic HTML already conveys the meaning.
- Don't suppress focus outlines without replacing them — keyboard users rely on them.
- Don't use `tabIndex` greater than 0; it breaks the natural order.
- Don't trust auto-generated tools alone — they catch about a third of issues. Manual keyboard and screen-reader testing finds the rest.

---

## References

- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [Web Content Accessibility Guidelines (WCAG) 2.2](https://www.w3.org/WAI/WCAG22/quickref/)
- [`eslint-plugin-jsx-a11y`](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y)
- [axe-core](https://github.com/dequelabs/axe-core)
- [Radix UI](https://www.radix-ui.com)
- [MDN — ARIA](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA)
