---
type: concept
tags:
  - language
  - react
  - typescript
  - frontend
related: []
language: "react"
---
# Refs

> Refs let you reach outside React's declarative model — to read a DOM node, hold a mutable value across renders, or expose an imperative API. Use sparingly.

---

## What is it?

A **ref** is a stable, mutable container created by `useRef`. It survives re-renders, but updating it does **not** trigger a re-render. Refs are React's escape hatch for two main use cases:

1. **Accessing a DOM node** (focus, scroll, measure, integrate with non-React libraries).
2. **Holding a mutable value** across renders that isn't part of the render output (a timer ID, a previous value).

```tsx
const inputRef = useRef<HTMLInputElement>(null);
const renderCount = useRef(0);
```

---

## Why does it matter?

Most of React encourages you to *describe* the UI for a given state and let the framework handle the rest. But some operations are inherently imperative — focusing an input after mount, measuring a node's size, integrating with a charting library that mutates the DOM. Refs are how you do those things without fighting React.

---

## How it works

### `useRef`

```tsx
const ref = useRef<T | null>(initialValue);
// ref.current is the mutable slot
```

- `ref.current` can be read and written at any time.
- Changing `ref.current` does **not** schedule a re-render.
- The ref object itself is stable across renders — its identity does not change.

### Attaching to a DOM node

```tsx
function AutoFocusInput() {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return <input ref={inputRef} />;
}
```

### Refs as instance variables

```tsx
function Stopwatch() {
  const [seconds, setSeconds] = useState(0);
  const intervalRef = useRef<number | null>(null);

  function start() {
    intervalRef.current = window.setInterval(() => setSeconds(s => s + 1), 1000);
  }

  function stop() {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  // ...
}
```

### Forwarding refs (React 19+)

As of React 19, `ref` is a regular prop on function components — no need for `forwardRef`:

```tsx
type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  ref?: React.Ref<HTMLInputElement>;
};

function Input({ ref, ...rest }: InputProps) {
  return <input ref={ref} {...rest} />;
}
```

In React 18 and below, use `forwardRef`:

```tsx
const Input = forwardRef<HTMLInputElement, InputProps>((props, ref) => (
  <input ref={ref} {...props} />
));
```

### Exposing an imperative handle

When a parent needs to call an imperative method on a child (focus, scrollIntoView, open/close), use `useImperativeHandle`:

```tsx
type ModalHandle = { open: () => void; close: () => void };

function Modal({ ref }: { ref?: React.Ref<ModalHandle> }) {
  const [open, setOpen] = useState(false);

  useImperativeHandle(ref, () => ({
    open: () => setOpen(true),
    close: () => setOpen(false),
  }), []);

  return open ? <dialog open>...</dialog> : null;
}
```

Use it only when there is no clean declarative way.

---

## Examples

### Measuring a node

```tsx
function Measured() {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver(([entry]) => {
      setSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return <div ref={ref}>w: {size.width}, h: {size.height}</div>;
}
```

### Tracking the previous value

```tsx
function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  useEffect(() => { ref.current = value; }, [value]);
  return ref.current;
}
```

---

## When to use

- Managing focus, scroll position, or text selection.
- Integrating with third-party DOM libraries that own a subtree (maps, editors, charts).
- Storing values that change over time but should not trigger re-renders (timer IDs, previous values, mutable caches).
- Triggering imperative effects (e.g., playing a video, calling `.scrollIntoView()`).

---

## When NOT to use

- Don't use refs to read or modify state that should be reactive — use `useState`.
- Don't reach into a child's DOM to mutate it; let the child render its own state.
- Don't use refs to skip the dependency array of an effect — the rules of hooks still apply.
- Don't read `ref.current` during render of the same component that just wrote to it — values written in render are not guaranteed to be visible in the same pass.

---

## References

- [Referencing Values with Refs — react.dev](https://react.dev/learn/referencing-values-with-refs)
- [Manipulating the DOM with Refs — react.dev](https://react.dev/learn/manipulating-the-dom-with-refs)
- [`useRef` reference — react.dev](https://react.dev/reference/react/useRef)
- [`useImperativeHandle` reference — react.dev](https://react.dev/reference/react/useImperativeHandle)
