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
# TypeScript with React

> TypeScript pairs well with React: typed props, typed hooks, generics for reuse, and discriminated unions for safer rendering. A few idioms cover most situations.

---

## What is it?

React itself is written in JavaScript with type definitions shipped via `@types/react`. TypeScript adds compile-time guarantees to component contracts: prop shapes, hook return values, event types, and ref shapes. The result is fewer runtime errors and better IDE feedback.

---

## Why does it matter?

Most React bugs in a JS codebase fall into a few categories: wrong prop shape, wrong event shape, wrong key on an object accessed in render. TypeScript eliminates them at compile time without runtime cost. It also makes large refactors safer: rename a prop and the compiler points to every call site.

---

## How it works

### Typing props

Prefer **type aliases** (over `interface`) for prop shapes — they support unions and mapped types more cleanly, and the React docs use them.

```tsx
type ButtonProps = {
  label: string;
  variant?: "primary" | "secondary";
  disabled?: boolean;
  onClick?: () => void;
};

function Button({ label, variant = "primary", disabled, onClick }: ButtonProps) {
  return (
    <button data-variant={variant} disabled={disabled} onClick={onClick}>
      {label}
    </button>
  );
}
```

For components that accept arbitrary HTML attributes, extend the built-in props:

```tsx
type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};
```

Common helper types:

| Type | Use |
|---|---|
| `React.ReactNode` | Anything renderable (string, number, JSX, array, fragment) |
| `React.ReactElement` | A single JSX element |
| `React.CSSProperties` | The shape of `style={...}` |
| `React.ComponentPropsWithoutRef<"button">` | All `<button>` attributes, no `ref` |
| `React.PropsWithChildren<T>` | `T & { children?: React.ReactNode }` — explicit is usually clearer |

### Typing `useState`

When the initial value is a non-`null` primitive, inference works:

```tsx
const [count, setCount] = useState(0);              // number
const [name, setName] = useState("");                // string
```

When the type can be wider than the initial value, annotate explicitly:

```tsx
const [user, setUser] = useState<User | null>(null);
const [items, setItems] = useState<Item[]>([]);
```

### Typing events

Events are typed by the JSX attribute that fires them:

```tsx
function onChange(e: React.ChangeEvent<HTMLInputElement>) { /* ... */ }
function onClick(e: React.MouseEvent<HTMLButtonElement>) { /* ... */ }
function onSubmit(e: React.FormEvent<HTMLFormElement>) { /* ... */ }
```

Or inline — inference handles it:

```tsx
<input onChange={e => setValue(e.target.value)} />
```

Annotate only when extracting the handler.

### Typing refs

```tsx
const inputRef = useRef<HTMLInputElement>(null);
const timer    = useRef<number | null>(null);
```

For DOM refs, the initial value is always `null` and the type is the element type.

### Typing `useReducer`

Discriminated unions give exhaustive type checking inside the reducer:

```tsx
type State = { items: Item[] };
type Action =
  | { type: "add"; item: Item }
  | { type: "remove"; id: string }
  | { type: "clear" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "add":    return { items: [...state.items, action.item] };
    case "remove": return { items: state.items.filter(i => i.id !== action.id) };
    case "clear":  return { items: [] };
  }
}
```

If you add a new action variant and forget a case, the compiler flags it.

### Generic components

```tsx
type SelectProps<T> = {
  options: T[];
  value: T;
  getLabel: (option: T) => string;
  onChange: (option: T) => void;
};

function Select<T>({ options, value, getLabel, onChange }: SelectProps<T>) {
  return (
    <select
      value={getLabel(value)}
      onChange={e => onChange(options.find(o => getLabel(o) === e.target.value)!)}
    >
      {options.map(o => (
        <option key={getLabel(o)}>{getLabel(o)}</option>
      ))}
    </select>
  );
}
```

The type parameter `T` flows through props automatically — no `any`, no casting.

### Discriminated unions for props

When a component has mutually exclusive prop shapes (e.g., either `href` for a link or `onClick` for a button), use a union:

```tsx
type Common      = { label: string };
type LinkProps   = Common & { href: string; onClick?: never };
type ButtonProps = Common & { onClick: () => void; href?: never };

type Props = LinkProps | ButtonProps;

function ButtonOrLink(props: Props) {
  if ("href" in props) return <a href={props.href}>{props.label}</a>;
  return <button onClick={props.onClick}>{props.label}</button>;
}
```

The compiler enforces that consumers pass *exactly* one of the two shapes.

---

## Examples

### A typed custom hook

```tsx
function useFetch<T>(url: string): {
  data: T | null;
  error: Error | null;
  loading: boolean;
} {
  const [state, setState] = useState<{
    data: T | null;
    error: Error | null;
    loading: boolean;
  }>({ data: null, error: null, loading: true });

  useEffect(() => {
    let cancelled = false;
    fetch(url)
      .then(r => r.json() as Promise<T>)
      .then(data  => { if (!cancelled) setState({ data, error: null, loading: false }); })
      .catch(error => { if (!cancelled) setState({ data: null, error, loading: false }); });
    return () => { cancelled = true; };
  }, [url]);

  return state;
}

// Usage
const { data, loading } = useFetch<User>(`/api/users/${id}`);
```

### Avoiding `React.FC`

`React.FC` was once recommended but has trade-offs (implicit `children`, no generics support). Prefer plain function declarations:

```tsx
// ❌ Common but discouraged
const Card: React.FC<{ title: string }> = ({ title, children }) => <h3>{title}</h3>;

// ✅
type CardProps = { title: string; children?: React.ReactNode };
function Card({ title, children }: CardProps) {
  return <h3>{title}</h3>;
}
```

---

## When to use

- Every React project of non-trivial size. The IDE feedback alone pays for itself.
- When components are reused across modules — typed contracts prevent silent breakage.
- When state is non-trivial — typed reducers and discriminated unions catch missed cases.
- When integrating with backends — share types (via `tRPC`, generated OpenAPI clients, or shared packages).

---

## When NOT to use

- Don't use `any` to silence the compiler — it defeats the whole point. Reach for `unknown` and narrow with type guards.
- Don't over-type runtime values that come from outside (network responses, `localStorage`). Validate with Zod or a similar schema library at the boundary.
- Don't type your way around obvious refactors — sometimes the right fix is to restructure the data, not add more generics.

---

## References

- [TypeScript — react.dev](https://react.dev/learn/typescript)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app)
- [Zod](https://zod.dev)
- [`@types/react` — DefinitelyTyped](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/react)
