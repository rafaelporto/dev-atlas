---
type: concept
tags:
  - architecture
  - frontend
  - component-driven
  - concept
related:
  - languages/react/components-and-props
  - languages/react/composition-patterns
  - software-engineering/architecture/frontend/design-system-architecture
  - software-engineering/architecture/frontend/layered-frontend-architecture
language: null
---
# Component-Driven Architecture

> Build the interface as a tree of small, self-contained components — each owning its markup, style, and behavior — and compose them into screens instead of writing pages top to bottom.

Component-Driven Architecture is the organizing principle behind every modern UI framework — React, Vue, Angular, Svelte, SolidJS, and the Web Components standard. This article covers the model they share, not the API of any one of them.

---

## What is it?

A component is a reusable unit of interface that packages three things together: what it renders (markup), how it looks (style), and how it behaves (logic and local state). Component-Driven Architecture is the practice of building an application by composing these units into a tree, where a parent passes data down to its children and children report events back up.

The key shift from older page-centric approaches is **ownership**: instead of a template, a stylesheet, and a script file that each span the whole page, responsibility is sliced *vertically* — a `SearchBar` owns its own markup, style, and behavior wherever it appears.

Two orthogonal classifications recur across frameworks:

- **Presentational vs. container** ("dumb" vs. "smart"). A presentational component receives everything through inputs and renders; it has no knowledge of where data comes from. A container component wires data sources, state, and side effects, then delegates rendering to presentational children.
- **Leaf vs. composite.** Leaves render primitives (a button, an avatar). Composites arrange other components (a `Card` built from `Avatar`, `Title`, `Actions`).

---

## Why does it matter?

Without component boundaries, UI logic sprawls: the same markup is copy-pasted, a styling change means hunting through a global stylesheet, and a page's script grows into a monolith that no one wants to touch. Components solve this the way functions solve it in general programming — through **encapsulation and reuse**.

Concretely, component-driven design gives you:

- **Reuse** — a well-scoped `Button` is written once and used in hundreds of places.
- **Isolated reasoning** — you can understand and test a component from its inputs alone, without loading the whole app.
- **Parallel work** — teams own components behind a stable input contract and iterate independently.
- **Independent testing and previewing** — tools like Storybook render a component in isolation across its states.

The cost of getting boundaries *wrong* is equally real: components that are too large become mini-monoliths, and components that are too granular drown the codebase in indirection. Drawing the boundary well is the core skill.

---

## How it works

An application is a tree. Data flows **down** through inputs (props); events flow **up** through callbacks. This one-directional shape is what makes a large tree tractable — a child never reaches into its parent's internals.

```
                     ┌──────────────┐
                     │     App      │  container: owns routing + global data
                     └──────┬───────┘
                 props ▼            ▲ events
              ┌─────────────┐  ┌──────────────┐
              │  PageLayout │  │  SearchBar   │  presentational
              └──────┬──────┘  └──────────────┘
             props ▼
        ┌───────────────────┐
        │   ProductList     │  container: fetches + holds list state
        └─────────┬─────────┘
           props ▼   ▲ onAddToCart
        ┌───────────────────┐
        │   ProductCard     │  presentational (composite)
        └───┬───────────┬───┘
       ┌────▼───┐   ┌───▼──────┐
       │ Avatar │   │  Button  │  presentational (leaf)
       └────────┘   └──────────┘
```

### Drawing component boundaries

A component should have a **single reason to change**. Useful signals that you have the boundary right:

- It maps to one concept a designer or user would name ("the price tag", "the nav bar").
- Its input contract (props) is small and describable in a sentence.
- It can be rendered in isolation with mock inputs.
- Cutting it out and reusing it elsewhere requires no edits to unrelated code.

Signals the boundary is wrong: a prop list with a dozen booleans toggling internal layout, a component that only ever renders inside one specific parent, or a "God component" that fetches data, holds page state, and renders every element itself.

### Composition over configuration

When a component needs to vary, prefer **passing children in** (composition) over **adding flags** (configuration). A `Modal` that accepts arbitrary content as a slot stays simple; a `Modal` with `hasHeader`, `hasFooter`, `variant`, and `size` booleans accretes complexity with every new case. This is the UI-layer expression of *composition over inheritance*.

### Container / presentational split

```
Container                          Presentational
─────────                          ──────────────
fetches data                       receives data via props
holds state / effects              stateless (or local UI-only state)
knows about services               knows nothing about the outside world
hard to reuse                      highly reusable
delegates rendering  ───────────►  does the rendering
```

Modern frameworks blur this line (hooks, composables, signals let any component hold logic), so treat it as a *guideline for where to concentrate side effects*, not a hard rule to enforce mechanically.

---

## Examples

The pattern is framework-agnostic; the snippet below is illustrative TypeScript + JSX (one framework's syntax) showing a presentational leaf, a presentational composite, and a container.

```tsx
// Presentational leaf — pure function of its props, no data source.
function Button({ label, onClick }: { label: string; onClick: () => void }) {
  return <button className="btn" onClick={onClick}>{label}</button>;
}

// Presentational composite — composes leaves; still no data source.
// Note it takes `children` (composition) instead of layout flags (configuration).
function ProductCard({
  product,
  onAddToCart,
  children,
}: {
  product: Product;
  onAddToCart: (id: string) => void;
  children?: React.ReactNode;
}) {
  return (
    <article className="card">
      <h3>{product.name}</h3>
      {children /* slot: caller decides what extra content goes here */}
      <Button label="Add to cart" onClick={() => onAddToCart(product.id)} />
    </article>
  );
}

// Container — owns the data source and state; delegates rendering downward.
function ProductList() {
  const { data: products, addToCart } = useCatalog(); // side effects live here
  return (
    <section>
      {products.map((p) => (
        <ProductCard key={p.id} product={p} onAddToCart={addToCart} />
      ))}
    </section>
  );
}
```

The same three-role structure (leaf → composite → container) appears as Vue Single-File Components, Angular components with `@Input`/`@Output`, Svelte components, or framework-free custom elements. The syntax changes; the tree and the data-down/events-up flow do not.

---

## When to use

- Any non-trivial UI — this is the default architecture for the entire modern frontend ecosystem.
- When multiple screens share visual or behavioral elements that should stay consistent.
- When a design system or shared component library is in play (see [Design System Architecture](design-system-architecture.md)).
- When multiple people or teams work on the same UI and need stable boundaries to work in parallel.

## When NOT to use

- A truly static, content-only page (a single marketing splash) — plain HTML/CSS is simpler than a component runtime.
- Over-decomposition: splitting a three-line block into five components adds indirection without reuse. Extract a component when there is a real second use or a genuinely independent concern, not preemptively.
- Prop-drilling as a substitute for architecture: if data is threaded through many intermediate components that don't use it, the problem is state placement, not component granularity — see [State Management Architecture](state-management-architecture.md).

---

## References

- Robinson, Tom. [Component-Driven Development (CDD)](https://www.componentdriven.org/). componentdriven.org.
- Meta. [Thinking in React](https://react.dev/learn/thinking-in-react). React Documentation.
- MDN. [Web Components](https://developer.mozilla.org/en-US/docs/Web/API/Web_components). MDN Web Docs.
- Fowler, Martin. [PresentationDomainSeparation](https://martinfowler.com/bliki/PresentationDomainSeparation.html). martinfowler.com, 2005.
