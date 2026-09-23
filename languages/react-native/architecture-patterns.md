---
type: concept
tags:
  - language
  - react-native
  - react
  - typescript
  - mobile
  - architecture
  - mvc
  - mvp
  - mvvm
  - mvi
  - clean-architecture
  - comparison
  - decision-support
related:
  - languages/react-native/architecture
  - languages/react-native/state-management
  - languages/react-native/dependency-injection
  - software-engineering/architecture/mobile/comparison
  - software-engineering/architecture/mobile/mvvm
  - software-engineering/architecture/mobile/mvi
  - software-engineering/architecture/mobile/clean-architecture-mobile
language: "react-native"
---
# Architecture Patterns

> MVC, MVP, MVVM, MVI and Clean all describe how to separate presentation from logic. React already answers part of that question — so what matters here is which parts are still yours to decide.

---

## What is it?

These are patterns for splitting responsibility between what the user sees and what the app does. They were formalised for imperative UI toolkits — UIKit, Android Views, WinForms — where the view was a mutable object you held a reference to and updated by hand.

React Native is declarative. A component is a function from state to UI; there is no view object to mutate. That changes which patterns still earn their keep, and how.

For the patterns themselves in full, framework-agnostic depth, see [Mobile Architecture](../../software-engineering/architecture/mobile/README.md). This article is about what they mean *here*.

---

## Why does it matter?

Two failure modes are common and opposite.

The first is importing Android or iOS structure wholesale: `PostViewModel` classes, `PostPresenter` interfaces, a `View` protocol the component implements. The ceremony is real and the benefit is not, because hooks already provide what the ViewModel was invented to give.

The second is having no structure at all: every screen is a component with `fetch`, validation, formatting, and rendering inline. That works until the app has twenty screens.

The useful question is not "which pattern" but "which parts of my presentation logic live outside the component, and in what shape".

---

## How it works

### What React already decides for you

Before comparing patterns, it is worth being precise about what is no longer a choice:

| Pattern's concern | React Native's answer |
|---|---|
| How does the View learn about changes? | Re-render. No observers, no bindings to wire |
| Where does view state live? | `useState` / `useReducer` in a hook |
| How is the View updated? | It is not — it is re-derived from state |
| How is presentation logic reused? | A custom hook |

**A custom hook is a ViewModel.** It holds state, exposes derived values, and offers actions, with no reference to any view. That is the definition. Writing a `class PostViewModel` on top of that adds a layer without adding a capability.

This is not an argument against structure — it is an argument that the structure has a different shape here, and that naming it after a class-based pattern usually obscures more than it clarifies.

### MVC

The original: Model holds data, View displays it, Controller mediates.

In React Native the mapping is loose — the component is both View and Controller. In practice "MVC" here means *no deliberate pattern*: state and handlers inline, data access in the component.

```tsx
export default function PostsScreen() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/posts")
      .then((r) => r.json())
      .then((data) => { setPosts(data); setLoading(false); });
  }, []);

  if (loading) return <ActivityIndicator />;
  return <FlatList data={posts} renderItem={({ item }) => <Text>{item.title}</Text>} />;
}
```

**Pros** — nothing to learn, everything in one file, fastest possible start.
**Cons** — untestable without rendering; nothing reusable; the component grows without limit; the race condition in that `useEffect` is invisible until it bites.

### MVP

Model, View, and a Presenter that holds all presentation logic. The View is passive and implements an interface the Presenter calls.

The defining feature — the Presenter pushing commands into a View through an interface — is the thing React removed. Reproducing it means holding a ref to the component and calling methods on it, which fights the framework.

```ts
// The shape MVP implies — rarely a good idea here
interface PostsView {
  showLoading(): void;
  showPosts(posts: Post[]): void;
  showError(message: string): void;
}
```

**Pros** — the Presenter is plain TypeScript, testable with no UI at all.
**Cons** — imperative view updates contradict the declarative model; every screen needs an interface; in React the same testability comes free from a hook.

**Verdict:** documented for completeness. It is almost never the right choice in React Native.

### MVVM

Model, View, and a ViewModel exposing observable state. The View binds to it and re-renders on change.

This is the pattern React Native actually implements, whether or not anyone names it. The hook is the ViewModel; the binding is the re-render.

```ts
// src/features/posts/hooks/usePostsViewModel.ts — the ViewModel
export function usePostsViewModel() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["posts"],
    queryFn: postRepository.list,
  });

  const [query, setQuery] = useState("");

  const visible = useMemo(
    () => (data ?? []).filter((p) => p.title.toLowerCase().includes(query.toLowerCase())),
    [data, query],
  );

  return {
    posts: visible,
    isEmpty: !isLoading && visible.length === 0,
    isLoading,
    error,
    query,
    setQuery,
    refresh: refetch,
  };
}
```

```tsx
// The View — renders state, emits events, knows nothing else
export default function PostsScreen() {
  const vm = usePostsViewModel();

  if (vm.isLoading) return <ActivityIndicator />;
  if (vm.error) return <ErrorState onRetry={vm.refresh} />;

  return (
    <>
      <SearchBar value={vm.query} onChangeText={vm.setQuery} />
      {vm.isEmpty ? <EmptyState /> : <PostList posts={vm.posts} onRefresh={vm.refresh} />}
    </>
  );
}
```

The hook is testable with `renderHook` and no UI. The component is testable with a stubbed hook and no network.

**Pros** — idiomatic; no extra concepts; logic reusable across screens; both sides testable in isolation.
**Cons** — a hook can accumulate unrelated concerns just as a component can; nothing enforces the separation.

### MVI and Flux/Redux

Model-View-Intent: the UI emits intents, a pure reducer maps `(state, intent)` to a new state, and the View renders that state. One immutable state object, one transition function.

`useReducer` gives this natively:

```ts
type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; posts: Post[]; query: string }
  | { status: "error"; message: string };

type Intent =
  | { type: "load" }
  | { type: "loaded"; posts: Post[] }
  | { type: "failed"; message: string }
  | { type: "search"; query: string };

export function reducer(state: State, intent: Intent): State {
  switch (intent.type) {
    case "load":
      return { status: "loading" };
    case "loaded":
      return { status: "ready", posts: intent.posts, query: "" };
    case "failed":
      return { status: "error", message: intent.message };
    case "search":
      return state.status === "ready" ? { ...state, query: intent.query } : state;
    default:
      return state;
  }
}
```

The discriminated union is what makes this pay: impossible states — loading *and* error, ready with no data — cannot be constructed. The compiler enforces the state machine.

**Pros** — one source of truth per screen; transitions are pure functions, trivially unit-tested; illegal states unrepresentable; excellent for complex flows.
**Cons** — verbose for simple screens; asynchronous work lives outside the reducer and needs somewhere to go; a boolean-and-a-list screen does not need a state machine.

### Clean Architecture

Concentric layers with dependencies pointing inward: entities and use cases at the centre, frameworks at the edge.

```
app/ + components/      →  Presentation
hooks/                  →  Application
model/                  →  Domain      ← no React, no fetch, no react-native
api/, device/           →  Data
```

This is orthogonal to the other four. Clean says where the *layers* are; MVVM or MVI says how the presentation layer is organised inside them. `MVVM + Clean` is a coherent and common combination — see [Application Architecture](architecture.md) for the layout.

**Pros** — business rules survive framework changes; the domain tests in milliseconds; layers can be owned by different people.
**Cons** — real cost in files and indirection; wasted on an app whose "business logic" is one API call.

---

## Decision matrix

Legend: ✅ good fit • ⚠️ workable with discipline • ❌ poor fit

| Criterion | MVC | MVP | MVVM | MVI | Clean |
|---|---|---|---|---|---|
| **Prototype / under 5 screens** | ✅ | ❌ | ⚠️ | ❌ | ❌ |
| **Medium app, 5–30 screens** | ❌ | ❌ | ✅ | ⚠️ | ⚠️ |
| **Large app, multi-team** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Solo developer** | ⚠️ | ❌ | ✅ | ⚠️ | ⚠️ |
| **Idiomatic in React Native** | ⚠️ | ❌ | ✅ | ✅ | ✅ |
| **Logic testable without rendering** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Complex async flows / side effects** | ❌ | ⚠️ | ⚠️ | ✅ | ✅ |
| **Many interdependent states per screen** | ❌ | ⚠️ | ⚠️ | ✅ | ⚠️ |
| **Business rules that outlive the UI** | ❌ | ⚠️ | ⚠️ | ⚠️ | ✅ |
| **Low boilerplate** | ✅ | ❌ | ✅ | ⚠️ | ❌ |

### Recommended pairings

| Situation | Stack |
|---|---|
| Prototype, a few screens | Components with local state — no pattern |
| Typical product app | **MVVM** — a hook per screen, a repository per feature |
| Screen with a genuine state machine (checkout, upload, wizard) | **MVI** for that screen, MVVM elsewhere |
| Real business rules, long-lived product | **MVVM + Clean** — hooks over a pure domain layer |
| Large app, several teams | **MVVM + Clean**, features as modules with explicit public APIs |
| Existing app already on Redux | **MVI + Clean** — Redux Toolkit is MVI with tooling |

Patterns are not exclusive, and they are not uniform across an app. Using MVI for the checkout flow and plain hooks for the settings screen is a good decision, not an inconsistency.

---

## Examples

The same screen at three levels of structure, so the cost of each is visible.

**No pattern** — fine for a prototype:

```tsx
export default function Screen() {
  const [items, setItems] = useState<Item[]>([]);
  useEffect(() => { fetch("/api/items").then(r => r.json()).then(setItems); }, []);
  return <FlatList data={items} renderItem={({ item }) => <Text>{item.name}</Text>} />;
}
```

**MVVM** — the default for a product app:

```ts
export function useItems() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["items"],
    queryFn: itemRepository.list,
  });
  return { items: data ?? [], isLoading, error, retry: refetch };
}
```

```tsx
export default function Screen() {
  const { items, isLoading, error, retry } = useItems();
  if (isLoading) return <ActivityIndicator />;
  if (error) return <ErrorState onRetry={retry} />;
  return <ItemList items={items} />;
}
```

**MVI** — when the screen is a state machine:

```tsx
export default function CheckoutScreen() {
  const [state, dispatch] = useReducer(reducer, { status: "idle" });

  switch (state.status) {
    case "idle":       return <Button title="Pay" onPress={() => dispatch({ type: "submit" })} />;
    case "submitting": return <ActivityIndicator />;
    case "error":      return <ErrorState message={state.message} onRetry={() => dispatch({ type: "submit" })} />;
    case "done":       return <Receipt id={state.receiptId} />;
  }
}
```

The `switch` is exhaustive and the compiler proves it — there is no state the UI forgot to handle. That property is what MVI buys, and it is worth the verbosity exactly when the state space is large enough to get wrong.

---

## When to use

- **No pattern** for a prototype or an app under five screens. Structure you do not need is cost you do not recover.
- **MVVM** as the default: one hook per screen, a repository per feature. It is what the framework already encourages.
- **MVI** for individual screens with a real state machine — checkout, multi-step upload, a wizard — not for the whole app.
- **Clean** when business rules exist independently of the UI and are expected to outlive it.
- **Mixed approaches**, chosen per screen by complexity.

## When NOT to use

- Do not write `class SomethingViewModel` in React Native. A hook is already one, with less code and better ergonomics.
- Do not adopt MVP. Its defining mechanism — imperative view updates through an interface — is what React removed.
- Do not put every screen behind a reducer. A screen with a list and a loading flag does not need a state machine.
- Do not add a Clean domain layer that only forwards calls to a repository. If there are no rules, there is no domain.
- Do not apply one pattern uniformly because consistency feels tidy. Match the structure to the screen's actual complexity.
- Do not port an Android or iOS architecture wholesale. The patterns transfer; the class structure does not.

---

## References

- [Mobile Architecture — comparison and decision matrix](../../software-engineering/architecture/mobile/comparison.md)
- [MVVM — mobile](../../software-engineering/architecture/mobile/mvvm.md)
- [MVI — mobile](../../software-engineering/architecture/mobile/mvi.md)
- [Clean Architecture — Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Reusing Logic with Custom Hooks — React](https://react.dev/learn/reusing-logic-with-custom-hooks)
- [Extracting State Logic into a Reducer — React](https://react.dev/learn/extracting-state-logic-into-a-reducer)
