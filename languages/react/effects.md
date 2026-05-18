# Effects

> `useEffect` runs code as a side effect of rendering — but most code you might put in an Effect doesn't belong there.

---

## What is it?

`useEffect` is a hook that lets a component perform a **side effect** after rendering: synchronising with an external system, setting up a subscription, manually controlling a non-React widget. It runs *after* the browser has painted, so the screen always reflects the rendered output before the effect executes.

```tsx
useEffect(() => {
  // side effect
  return () => { /* cleanup */ };
}, [dependencies]);
```

---

## Why does it matter?

Effects are the most-misused hook in React. Used correctly, they let you connect a component to an external system. Used incorrectly, they cause redundant renders, infinite loops, stale data, and hard-to-trace bugs.

The React team's guidance is explicit: **"You might not need an Effect."** Many things that look like side effects are actually derived data, event-handler logic, or initializer logic that belong elsewhere.

---

## How it works

### The dependency array

```tsx
useEffect(() => {
  // runs after render
}, [dep1, dep2]);
```

- **No array** → runs after every render.
- **Empty `[]`** → runs once after mount, cleanup on unmount.
- **`[dep1, dep2]`** → runs after mount and whenever any dep changes (by `Object.is`).

**Every reactive value used inside the effect must be in the dependency array.** The `eslint-plugin-react-hooks` rule enforces this — do not silence it.

### Cleanup

If the effect returns a function, React calls it before the next effect run and on unmount. Cleanup must undo what the effect set up:

```tsx
useEffect(() => {
  const id = setInterval(tick, 1000);
  return () => clearInterval(id);
}, []);
```

### Strict Mode mounts twice in development

In development, React intentionally mounts each component twice to surface effects that don't cleanly handle remount. Effects must be **idempotent and properly cleaned up** — if the second mount produces a bug, the effect is wrong.

### "You Might Not Need an Effect"

Common misuses and the right alternative:

```tsx
// ❌ Adjusting state when props change
useEffect(() => {
  setFullName(`${firstName} ${lastName}`);
}, [firstName, lastName]);

// ✅ Derive during render
const fullName = `${firstName} ${lastName}`;
```

```tsx
// ❌ Reacting to user input via effect
useEffect(() => {
  if (submitted) sendForm(data);
}, [submitted]);

// ✅ Do it in the event handler
function handleSubmit() {
  sendForm(data);
}
```

```tsx
// ❌ Fetching in an Effect (no cancellation, no caching, race conditions)
useEffect(() => {
  fetch(`/api/items?q=${query}`).then(r => r.json()).then(setItems);
}, [query]);

// ✅ Use a data library (TanStack Query, SWR) or a framework data loader
const { data: items } = useQuery(["items", query], () => fetchItems(query));
```

---

## Examples

### Subscribing to a browser API

```tsx
useEffect(() => {
  function onResize() { setWidth(window.innerWidth); }
  window.addEventListener("resize", onResize);
  return () => window.removeEventListener("resize", onResize);
}, []);
```

For browser APIs and external stores, prefer `useSyncExternalStore` when available — it integrates with concurrent features.

### Synchronising with a non-React widget

```tsx
useEffect(() => {
  const map = new MapLibre({ container: ref.current!, center, zoom });
  return () => map.remove();
}, [center, zoom]);
```

### Connecting and disconnecting

```tsx
useEffect(() => {
  const socket = createConnection(roomId);
  socket.connect();
  return () => socket.disconnect();
}, [roomId]);
```

The cleanup runs when `roomId` changes, so the old connection closes before a new one opens.

---

## When to use

- Synchronising with **external systems**: browser APIs, third-party widgets, WebSocket connections, timers.
- Manually managing the DOM in escape-hatch scenarios (most cases should go through React).
- Anything genuinely outside React that needs to be set up and torn down with the component.

---

## When NOT to use

- **To derive data from props or state** — compute during render.
- **To respond to user events** — do it in the event handler.
- **To fetch data** — use a data-fetching library or framework loader.
- **To "sync" two pieces of state** — usually a sign one is derivable from the other.
- **To run initialisation "once on mount"** unrelated to an external system — many cases (resetting state on prop change, initialising from props) have dedicated patterns on [react.dev](https://react.dev/learn/you-might-not-need-an-effect).

---

## References

- [Synchronizing with Effects — react.dev](https://react.dev/learn/synchronizing-with-effects)
- [You Might Not Need an Effect — react.dev](https://react.dev/learn/you-might-not-need-an-effect)
- [Lifecycle of Reactive Effects — react.dev](https://react.dev/learn/lifecycle-of-reactive-effects)
- [`useEffect` reference — react.dev](https://react.dev/reference/react/useEffect)
- [`useSyncExternalStore` — react.dev](https://react.dev/reference/react/useSyncExternalStore)
