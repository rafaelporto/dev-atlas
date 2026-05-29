---
type: concept
tags: []
related: []
language: "react"
---
# Context

> Context lets you broadcast a value to any descendant in the tree without passing it through every intermediate prop. Useful for cross-cutting data, dangerous as a state-management substitute.

---

## What is it?

**Context** is a mechanism for sharing a value with any descendant component without threading it through props at every level. It is created with `createContext`, made available with a `<Provider>`, and consumed with `useContext`.

```tsx
const ThemeContext = createContext<"light" | "dark">("light");

<ThemeContext.Provider value="dark">
  <App />
</ThemeContext.Provider>

// anywhere inside:
const theme = useContext(ThemeContext);
```

---

## Why does it matter?

Context solves **prop drilling** — the noise of passing data through layers of components that don't care about it. It is the right tool for cross-cutting concerns that many components need to read: theme, current user, locale, feature flags.

It is **not** a state management library. Putting all your application state in one context causes every consumer to re-render when any field changes — leading to performance problems that grow with the app.

---

## How it works

### Creating context

```tsx
type User = { id: string; name: string };

const UserContext = createContext<User | null>(null);
```

The argument is the **default value** — used only when a component consumes the context without a matching `<Provider>` above it.

### Providing a value

```tsx
function App() {
  const [user, setUser] = useState<User | null>(null);

  return (
    <UserContext.Provider value={user}>
      <Layout />
    </UserContext.Provider>
  );
}
```

In React 19, `<UserContext>` can be used directly as the provider (no `.Provider` needed).

### Consuming

```tsx
function Greeting() {
  const user = useContext(UserContext);
  return <p>{user ? `Hi, ${user.name}` : "Sign in"}</p>;
}
```

### Re-renders

Every consumer of a context re-renders when the context's `value` changes by reference. This is the trap: if you put `{ user, setUser, posts, setPosts, theme, setTheme }` in one context, any change to any field re-renders every consumer.

Mitigations:

- **Split contexts** by axis of change (`UserContext` for user data, `ThemeContext` for theme).
- **Stabilise the value** with `useMemo` so it doesn't change identity unnecessarily.
- **Use a real state library** (Zustand, Jotai, Redux Toolkit) for state that changes frequently with many subscribers.

### Pairing context with a typed hook

A common idiom is to expose context through a custom hook that throws if used outside its provider:

```tsx
const UserContext = createContext<User | null>(null);

export function useUser(): User {
  const user = useContext(UserContext);
  if (user === null) {
    throw new Error("useUser must be used inside a UserProvider");
  }
  return user;
}
```

This gives consumers a non-null type and surfaces wiring errors immediately.

---

## Examples

### Theme context

```tsx
type Theme = "light" | "dark";

const ThemeContext = createContext<{
  theme: Theme;
  toggle: () => void;
}>({ theme: "light", toggle: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  const value = useMemo(() => ({
    theme,
    toggle: () => setTheme(t => t === "light" ? "dark" : "light"),
  }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
```

### Composition often beats context

If only one deep descendant needs a value, **composition** is simpler. Lift the consumer up and pass the rendered JSX as `children`:

```tsx
// Before: theme threaded through Layout, Sidebar, UserMenu
<Layout theme={theme}>
  <Sidebar theme={theme}>
    <UserMenu theme={theme} />
  </Sidebar>
</Layout>

// After: only UserMenu reads theme
<Layout>
  <Sidebar>
    <UserMenu theme={theme} />
  </Sidebar>
</Layout>
```

---

## When to use

- Theme, locale, current user, authentication state — values most of the tree may need.
- Feature flags read by scattered components.
- DI-like patterns where a deep component needs an injected service (HTTP client, analytics).
- When composition would require passing JSX through too many layers.

---

## When NOT to use

- **As a state management library** for high-frequency, fine-grained state. Each consumer re-renders on every change.
- **For values used in only one place** — pass a prop.
- **For server data** — use TanStack Query or SWR; they cache, deduplicate, and revalidate.
- **As an excuse to skip prop typing** — context types are still types; treat them with the same rigour.

---

## References

- [Passing Data Deeply with Context — react.dev](https://react.dev/learn/passing-data-deeply-with-context)
- [Scaling Up with Reducer and Context — react.dev](https://react.dev/learn/scaling-up-with-reducer-and-context)
- [`createContext` reference — react.dev](https://react.dev/reference/react/createContext)
- [`useContext` reference — react.dev](https://react.dev/reference/react/useContext)
