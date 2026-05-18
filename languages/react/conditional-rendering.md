# Conditional Rendering

> Show different UI based on conditions using JavaScript expressions inside JSX: ternaries, `&&`, early returns, and guard variables. Each has trade-offs.

---

## What is it?

**Conditional rendering** is choosing what to render based on the current state or props. React doesn't have a special syntax for it — you use ordinary JavaScript expressions inside JSX (`{...}`) or branch with early returns.

```tsx
{user ? <Dashboard user={user} /> : <SignIn />}
```

---

## Why does it matter?

How you express a condition affects readability, bundle size, and how easy it is to extend later. The wrong pattern produces subtle bugs — most famously, `0 && <Component />` rendering a literal `0` on the screen.

---

## How it works

### Ternary (`? :`)

The default for "one of two outputs":

```tsx
{isLoading ? <Spinner /> : <Content />}
```

Keep ternaries shallow. Nested ternaries become unreadable fast — extract to a function or guard variable.

### Logical AND (`&&`)

For "render this only if a condition is truthy":

```tsx
{hasErrors && <ErrorBanner errors={errors} />}
```

**Pitfall**: in JavaScript, `0 && x` evaluates to `0`, not `false`. React renders `0` as the text "0".

```tsx
{items.length && <ItemList items={items} />}
// renders "0" when items is empty!

{items.length > 0 && <ItemList items={items} />}
// safe
```

### Early return

For top-level branches inside a component, early return is clearer than wrapping the entire body in a ternary:

```tsx
function Page({ user }: { user?: User }) {
  if (!user) return <SignIn />;
  if (user.suspended) return <Suspended />;

  return <Dashboard user={user} />;
}
```

### Guard variables

When a branch is reused or the condition is complex, assign to a variable above the return:

```tsx
function ProductPage({ product, status }: Props) {
  let banner: React.ReactNode = null;
  if (status === "discontinued") banner = <Banner type="info">No longer sold.</Banner>;
  else if (status === "low-stock") banner = <Banner type="warning">Only a few left.</Banner>;

  return (
    <article>
      {banner}
      <ProductDetails product={product} />
    </article>
  );
}
```

### Switching on a sum type

For a known set of states (loading, error, success), a `switch` or a typed mapping is clearer than chained ternaries:

```tsx
function QueryView({ query }: { query: QueryState }) {
  switch (query.status) {
    case "pending": return <Spinner />;
    case "error":   return <ErrorView error={query.error} />;
    case "success": return <Data data={query.data} />;
  }
}
```

### Conditional class names

Use a helper like `clsx` rather than concatenating strings:

```tsx
<button className={clsx("btn", { "btn--primary": primary, "btn--disabled": disabled })}>
  {label}
</button>
```

---

## Examples

### Loading / error / success

```tsx
function UserProfile({ userId }: { userId: string }) {
  const { data, error, isLoading } = useUser(userId);

  if (isLoading) return <Spinner />;
  if (error) return <ErrorBanner error={error} />;
  if (!data) return null;

  return <Profile user={data} />;
}
```

### Showing one of N outputs

```tsx
function Avatar({ src, name, status }: AvatarProps) {
  return (
    <div className="avatar">
      {src ? <img src={src} alt={name} /> : <Initials name={name} />}
      {status === "online" && <span className="dot dot--online" />}
    </div>
  );
}
```

### `null` to render nothing

Returning `null` from a component renders nothing without unmounting siblings:

```tsx
function Toast({ message }: { message?: string }) {
  if (!message) return null;
  return <div className="toast">{message}</div>;
}
```

---

## When to use

- Ternary for binary choices.
- `&&` for "render only when truthy" — but **always** convert to a boolean first if there's any risk of `0` or `""`.
- Early return for top-level branches in a component.
- `switch` or a mapping for sum types with three or more states.

---

## When NOT to use

- Nested ternaries beyond one level — extract to a variable or function.
- `&&` with numbers or strings without converting to boolean — `0 && <X />` renders `"0"`.
- Conditional hooks — hooks must always run in the same order. Move the condition inside the hook's logic, not around the call.
- Hiding components with CSS `display: none` when the cost of unmounting/remounting is non-trivial — but be aware the component is still mounted and runs effects.

---

## References

- [Conditional Rendering — react.dev](https://react.dev/learn/conditional-rendering)
- [JavaScript in JSX with Curly Braces — react.dev](https://react.dev/learn/javascript-in-jsx-with-curly-braces)
