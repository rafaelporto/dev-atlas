---
type: concept
tags: []
related: []
language: "react"
---
# Error Boundaries

> Error boundaries catch rendering errors in their subtree and show a fallback UI. They are React's safety net for unexpected exceptions in components.

---

## What is it?

An **error boundary** is a React component that catches JavaScript errors anywhere in its descendant tree during rendering, in lifecycle methods, and in constructors, and renders a fallback UI instead of the broken subtree. Without one, an uncaught error in any component unmounts the entire React tree.

Currently, only **class components** with `componentDidCatch` and `getDerivedStateFromError` can act as error boundaries — there is no hook equivalent. In practice, most teams use the [`react-error-boundary`](https://github.com/bvaughn/react-error-boundary) library.

---

## Why does it matter?

JavaScript errors during rendering are not just "a console message". React unmounts the whole tree to avoid showing corrupted UI. For a real product, that means a blank page. Error boundaries scope the damage: a broken widget shows an error message in its slot while the rest of the app keeps working.

---

## How it works

### A minimal class boundary

```tsx
type Props = { fallback: React.ReactNode; children: React.ReactNode };
type State = { hasError: boolean };

class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    reportError(error, info.componentStack);
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}
```

### `react-error-boundary`

This library wraps the class component in a friendlier API and adds a hook to reset the boundary from within the fallback:

```tsx
import { ErrorBoundary } from "react-error-boundary";

function Fallback({ error, resetErrorBoundary }: {
  error: Error;
  resetErrorBoundary: () => void;
}) {
  return (
    <div role="alert">
      <p>Something went wrong: {error.message}</p>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  );
}

<ErrorBoundary FallbackComponent={Fallback} onReset={() => refetchData()}>
  <Dashboard />
</ErrorBoundary>
```

### What error boundaries do NOT catch

By design, error boundaries do **not** catch:

- Errors in **event handlers** — use a regular `try/catch` inside the handler.
- Errors in **asynchronous code** (timeouts, promises) unless thrown during render.
- Errors during **server-side rendering**.
- Errors thrown in the boundary itself — they propagate to the next boundary up.

For event handlers and async code, use try/catch and surface errors via state:

```tsx
const [error, setError] = useState<Error | null>(null);

async function handleClick() {
  try {
    await doSomething();
  } catch (e) {
    setError(e as Error);
  }
}
```

### Boundary placement

A single boundary at the root of the app is the minimum. A better pattern is **multiple boundaries** at meaningful sections (sidebar, content, modal) so that one broken section doesn't take down the others.

```
<RootBoundary>
  <Layout>
    <SidebarBoundary><Sidebar /></SidebarBoundary>
    <ContentBoundary><Content /></ContentBoundary>
  </Layout>
</RootBoundary>
```

### Suspense + error boundaries

A `<Suspense>` boundary catches *pending* states (a child suspended waiting for data). An error boundary catches *rejected* states. They are complementary — pair them when using Suspense for data fetching:

```tsx
<ErrorBoundary FallbackComponent={Fallback}>
  <Suspense fallback={<Spinner />}>
    <Profile userId={id} />
  </Suspense>
</ErrorBoundary>
```

Next.js exposes both patterns in the App Router via `error.tsx` and `loading.tsx` files.

---

## Examples

### Resetting after a fix

```tsx
const [userId, setUserId] = useState("1");

<ErrorBoundary
  FallbackComponent={Fallback}
  resetKeys={[userId]}     // changing userId resets the boundary
>
  <UserProfile userId={userId} />
</ErrorBoundary>
```

### Reporting to an error tracker

```tsx
<ErrorBoundary
  FallbackComponent={Fallback}
  onError={(error, info) =>
    Sentry.captureException(error, { extra: { componentStack: info.componentStack } })
  }
>
  <App />
</ErrorBoundary>
```

---

## When to use

- A top-level boundary in every app — the minimum safety net.
- Additional boundaries around independent sections (sidebars, modals, panels).
- Around components that wrap third-party widgets (charts, maps) whose internals you don't control.
- Paired with `<Suspense>` for streaming data fetching.

---

## When NOT to use

- For event-handler errors — use try/catch inside the handler.
- For async errors that don't happen during render — use try/catch or surface them through state.
- For validation errors — those are part of normal app flow, not exceptions.
- As a hiding place for bugs — always log boundary catches to an error tracker.

---

## References

- [Catching rendering errors with an error boundary — react.dev](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
- [`react-error-boundary`](https://github.com/bvaughn/react-error-boundary)
- [Next.js — `error.js` convention](https://nextjs.org/docs/app/api-reference/file-conventions/error)
