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
# Composition Patterns

> React's superpower is composition: small components combined into bigger ones. A few recurring patterns — `children`, slots, compound components, render props, and `as` — cover most reuse needs without inheritance.

---

## What is it?

**Composition** is React's primary mechanism for reuse: a component receives smaller components (via `children` or other props) and combines them into a larger one. It replaces inheritance, mixins, and most uses of higher-order components.

The most useful patterns:

1. **`children` prop** — accept arbitrary JSX inside.
2. **Multiple slots** — accept named pieces as props.
3. **Compound components** — a parent and a set of child components that share implicit state.
4. **Render props** — accept a function that returns JSX.
5. **The `as` prop** — render as different underlying elements.

---

## Why does it matter?

These patterns let you build flexible, type-safe components without forcing every consumer to subclass or configure dozens of boolean flags. They also keep components decoupled — the inner pieces don't need to know about the outer container's internals.

---

## How it works

### `children`

The simplest and most powerful pattern:

```tsx
type CardProps = { title: string; children: React.ReactNode };

function Card({ title, children }: CardProps) {
  return (
    <section>
      <h3>{title}</h3>
      <div>{children}</div>
    </section>
  );
}

<Card title="Profile">
  <Avatar user={user} />
  <Bio user={user} />
</Card>
```

### Multiple slots

When you need more than one place for the consumer to put JSX, accept additional JSX-typed props:

```tsx
type PageProps = {
  header: React.ReactNode;
  sidebar: React.ReactNode;
  children: React.ReactNode;
};

function Page({ header, sidebar, children }: PageProps) {
  return (
    <div className="page">
      <aside>{sidebar}</aside>
      <main>
        <header>{header}</header>
        {children}
      </main>
    </div>
  );
}
```

### Compound components

A compound component is a parent that exposes named children, sharing state via context. The consumer composes the parent and its children freely.

```tsx
const TabsContext = createContext<{
  active: string;
  setActive: (k: string) => void;
} | null>(null);

function Tabs({ defaultActive, children }: {
  defaultActive: string;
  children: React.ReactNode;
}) {
  const [active, setActive] = useState(defaultActive);
  return (
    <TabsContext.Provider value={{ active, setActive }}>
      <div className="tabs">{children}</div>
    </TabsContext.Provider>
  );
}

function TabList({ children }: { children: React.ReactNode }) {
  return <div role="tablist">{children}</div>;
}

function Tab({ id, children }: { id: string; children: React.ReactNode }) {
  const ctx = useContext(TabsContext)!;
  const active = ctx.active === id;
  return (
    <button role="tab" aria-selected={active} onClick={() => ctx.setActive(id)}>
      {children}
    </button>
  );
}

function Panel({ id, children }: { id: string; children: React.ReactNode }) {
  const ctx = useContext(TabsContext)!;
  return ctx.active === id ? <div role="tabpanel">{children}</div> : null;
}

Tabs.List = TabList;
Tabs.Tab = Tab;
Tabs.Panel = Panel;

// Usage
<Tabs defaultActive="profile">
  <Tabs.List>
    <Tabs.Tab id="profile">Profile</Tabs.Tab>
    <Tabs.Tab id="security">Security</Tabs.Tab>
  </Tabs.List>
  <Tabs.Panel id="profile"><Profile /></Tabs.Panel>
  <Tabs.Panel id="security"><Security /></Tabs.Panel>
</Tabs>
```

This pattern powers most modern UI libraries (Radix UI, Headless UI, Reach UI).

### Render props

A component accepts a function as `children` (or a named prop) and calls it with internal state:

```tsx
type MouseTrackerProps = {
  children: (pos: { x: number; y: number }) => React.ReactNode;
};

function MouseTracker({ children }: MouseTrackerProps) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  return (
    <div onMouseMove={e => setPos({ x: e.clientX, y: e.clientY })}>
      {children(pos)}
    </div>
  );
}

<MouseTracker>
  {({ x, y }) => <p>{x},{y}</p>}
</MouseTracker>
```

Custom hooks have largely replaced render props for sharing logic. Render props remain useful for sharing both *logic and a wrapper element* (e.g., virtualised lists).

### The `as` prop (polymorphism)

Letting a component render as different elements while keeping its styling:

```tsx
type ButtonProps<T extends React.ElementType = "button"> = {
  as?: T;
  children: React.ReactNode;
} & Omit<React.ComponentPropsWithoutRef<T>, "as" | "children">;

function Button<T extends React.ElementType = "button">({
  as,
  children,
  ...rest
}: ButtonProps<T>) {
  const Component = as ?? "button";
  return <Component {...rest}>{children}</Component>;
}

<Button>Save</Button>
<Button as="a" href="/profile">Profile</Button>
<Button as={Link} to="/profile">Profile</Button>
```

---

## Examples

### When to switch from props to children

```tsx
// ❌ Configuration explosion
<Modal
  open={open}
  title="Delete account"
  body="Are you sure?"
  confirmText="Delete"
  cancelText="Cancel"
  onConfirm={...}
  onCancel={...}
  showFooter
  variant="danger"
/>

// ✅ Composition
<Modal open={open} onClose={...}>
  <Modal.Header>Delete account</Modal.Header>
  <Modal.Body>Are you sure?</Modal.Body>
  <Modal.Footer>
    <Button onClick={cancel}>Cancel</Button>
    <Button variant="danger" onClick={remove}>Delete</Button>
  </Modal.Footer>
</Modal>
```

---

## When to use

- **`children`** — almost always. Default to it.
- **Multiple slots** — when a single `children` doesn't capture the structure (header, sidebar, content).
- **Compound components** — for UI primitives whose parts must coordinate (tabs, accordions, menus).
- **Render props** — when sharing both logic and a host element.
- **`as` prop** — when one styled component must render as different elements.

---

## When NOT to use

- Don't reach for compound components for a one-off layout — slot props are simpler.
- Don't replace plain props with render props "for flexibility" — extra indirection without payoff.
- Don't use higher-order components (HOCs) for new code — custom hooks and composition cover the same ground with less boilerplate.

---

## References

- [Passing JSX as children — react.dev](https://react.dev/learn/passing-props-to-a-component#passing-jsx-as-children)
- [Reusing Logic with Custom Hooks — react.dev](https://react.dev/learn/reusing-logic-with-custom-hooks)
- [Radix UI — primitives](https://www.radix-ui.com/primitives/docs/overview/introduction)
- [Headless UI](https://headlessui.com)
