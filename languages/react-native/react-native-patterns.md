---
type: concept
tags:
  - language
  - react-native
  - react
  - typescript
  - mobile
  - design-pattern
  - component-driven
related:
  - languages/react-native/architecture
  - languages/react-native/dependency-injection
  - languages/react-native/best-practices
  - languages/react/composition-patterns
  - software-engineering/design-patterns/structural/adapter
  - software-engineering/design-patterns/structural/facade
  - software-engineering/design-patterns/behavioral/strategy
language: "react-native"
---
# React Native Patterns

> The patterns that earn their place here are the ones that survive the move from classes to functions: composition, custom hooks, repository, adapter, and strategy.

---

## What is it?

These are the recurring shapes in React Native codebases — some inherited from the Gang of Four catalogue, some native to React's component model. Each is presented as it actually appears in TypeScript, not as a class diagram translated literally.

For the patterns themselves in general form, see [Design Patterns](../../software-engineering/design-patterns/README.md). This article covers the form they take here, and which ones to avoid.

---

## Why does it matter?

Most classical patterns exist to work around limitations of class-based, statically-typed object orientation. Functions, closures, and structural typing remove several of those limitations outright — a Strategy is a function, a Factory is a function returning an object, an Observer is a subscription callback.

Applying the patterns literally produces code that is more complex than the problem. Recognising which ones still carry weight, and in what form, is the useful skill.

---

## How it works

### Container and presentational

Separate the component that *gets* data from the one that *shows* it.

```tsx
// Presentational — pure, no data source, trivially testable and reusable
export function PostList({
  posts,
  onSelect,
}: {
  posts: Post[];
  onSelect: (id: string) => void;
}) {
  return (
    <FlatList
      data={posts}
      keyExtractor={(p) => p.id}
      renderItem={({ item }) => <PostRow post={item} onPress={onSelect} />}
    />
  );
}

// Container — knows where posts come from
export function PostListContainer() {
  const { data, isLoading } = usePosts();
  const router = useRouter();

  if (isLoading) return <ActivityIndicator />;
  return <PostList posts={data ?? []} onSelect={(id) => router.push(`/posts/${id}`)} />;
}
```

The presentational component can be rendered in a test or a storybook with literal data. This split is the foundation most of the others build on.

### Custom hook

The primary unit of logic reuse, and — as [Architecture Patterns](architecture-patterns.md) argues — React's answer to the ViewModel.

```ts
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
```

A hook that returns a value and cleans up after itself is a complete, testable unit that no component needs to know the internals of.

### Compound components

Related components sharing implicit state, so the consumer writes structure rather than configuration.

```tsx
const TabsContext = createContext<{ active: string; setActive: (id: string) => void } | null>(null);

export function Tabs({ defaultTab, children }: { defaultTab: string; children: ReactNode }) {
  const [active, setActive] = useState(defaultTab);
  const value = useMemo(() => ({ active, setActive }), [active]);
  return <TabsContext.Provider value={value}>{children}</TabsContext.Provider>;
}

Tabs.List = function TabsList({ children }: { children: ReactNode }) {
  return <View style={{ flexDirection: "row" }}>{children}</View>;
};

Tabs.Tab = function Tab({ id, title }: { id: string; title: string }) {
  const ctx = useContext(TabsContext)!;
  return (
    <Pressable onPress={() => ctx.setActive(id)} accessibilityRole="tab">
      <Text style={ctx.active === id && { fontWeight: "700" }}>{title}</Text>
    </Pressable>
  );
};

Tabs.Panel = function Panel({ id, children }: { id: string; children: ReactNode }) {
  const ctx = useContext(TabsContext)!;
  return ctx.active === id ? <View>{children}</View> : null;
};
```

```tsx
<Tabs defaultTab="feed">
  <Tabs.List>
    <Tabs.Tab id="feed" title="Feed" />
    <Tabs.Tab id="saved" title="Saved" />
  </Tabs.List>
  <Tabs.Panel id="feed"><Feed /></Tabs.Panel>
  <Tabs.Panel id="saved"><Saved /></Tabs.Panel>
</Tabs>
```

The alternative — a `<Tabs items={[…]} renderPanel={…} />` with a dozen props — grows a new prop for every variation. Composition does not.

### Repository

A single module owning access to one kind of data, hiding transport and validation.

```ts
export interface PostRepository {
  list(): Promise<Post[]>;
  getById(id: string): Promise<Post>;
}

export const httpPostRepository: PostRepository = {
  list: async () => postSchema.array().parse(await request("/posts")),
  getById: async (id) => postSchema.parse(await request(`/posts/${id}`)),
};
```

Whether the data comes from HTTP, SQLite, or a cache is invisible above this line. It is also the seam that makes offline support additive rather than invasive.

### Adapter

Wrap a third-party or native module behind an interface you control.

```ts
// Your interface — expressed in your domain's terms
export interface Analytics {
  track(event: string, properties?: Record<string, unknown>): void;
  identify(userId: string): void;
}

// The adapter to a specific vendor
export function makeVendorAnalytics(client: VendorSDK): Analytics {
  return {
    track: (event, properties) => client.logEvent(event, properties ?? {}),
    identify: (userId) => client.setUser({ id: userId }),
  };
}

// A no-op for tests and for development builds
export const noopAnalytics: Analytics = { track: () => {}, identify: () => {} };
```

This is the most valuable structural pattern in React Native, because the ecosystem moves quickly and native SDKs change. Every native module should sit behind one — see [Native Modules](new-architecture-and-native-modules.md).

### Facade

One simple interface over a set of related subsystems.

```ts
// Callers want "sign in". They should not orchestrate four modules to get it.
export function makeAuthFacade(deps: {
  api: AuthApi;
  secureStore: SecureStore;
  analytics: Analytics;
  queryClient: QueryClient;
}) {
  return {
    async signIn(username: string, password: string) {
      const session = await deps.api.signIn(username, password);
      await deps.secureStore.set("session_token", session.token);
      deps.analytics.identify(session.userId);
      return session;
    },
    async signOut() {
      await deps.secureStore.remove("session_token");
      deps.queryClient.clear();
    },
  };
}
```

`signOut` clearing the query cache is exactly the kind of step that gets forgotten when callers orchestrate directly — and exactly why the facade is worth having.

### Strategy

A family of interchangeable behaviours. In TypeScript this is a record of functions, not a class hierarchy.

```ts
type SortKey = "recent" | "popular" | "alphabetical";

const sorters: Record<SortKey, (a: Post, b: Post) => number> = {
  recent: (a, b) => b.publishedAt.getTime() - a.publishedAt.getTime(),
  popular: (a, b) => b.likes - a.likes,
  alphabetical: (a, b) => a.title.localeCompare(b.title),
};

export function sortPosts(posts: Post[], key: SortKey): Post[] {
  return [...posts].sort(sorters[key]);
}
```

`Record<SortKey, …>` makes the compiler require an entry for every key — adding a sort option that is not implemented becomes a type error.

### Provider

Supply a stable dependency down the tree via Context. Covered in full in [Dependency Injection](dependency-injection.md). The rule that matters: Context is for stable references, not changing state.

### Factory

A function that builds a configured object. Every `make*` function above is one — no abstract class, no registry.

---

## Examples

Patterns compose. A feature using repository, adapter, facade, and container together:

```ts
// The facade takes its collaborators — it constructs nothing
export function makePostsFacade(deps: { repo: PostRepository; analytics: Analytics }) {
  return {
    async loadFeed(sort: SortKey) {
      const posts = await deps.repo.list();
      deps.analytics.track("feed_viewed", { sort, count: posts.length });
      return sortPosts(posts, sort);
    },
  };
}
```

```tsx
// The container wires it to the UI
export function FeedContainer() {
  const { posts: repo, analytics } = useContainer();
  const [sort, setSort] = useState<SortKey>("recent");

  const facade = useMemo(() => makePostsFacade({ repo, analytics }), [repo, analytics]);

  const { data, isLoading } = useQuery({
    queryKey: ["feed", sort],
    queryFn: () => facade.loadFeed(sort),
  });

  if (isLoading) return <ActivityIndicator />;
  return <PostList posts={data ?? []} sort={sort} onSortChange={setSort} onSelect={open} />;
}
```

Every dependency arrives from outside, so the whole feature can be exercised in a test with three small fakes and no device.

---

## When to use

- **Container/presentational** wherever a component both fetches and renders — the split costs one file and buys testability.
- **Custom hooks** as the default for any logic used twice, or any logic worth testing without a render.
- **Compound components** for UI with several coordinated parts — tabs, accordions, steppers, pickers.
- **Repository** for every data source, so transport is replaceable.
- **Adapter** around every native module and third-party SDK. Non-negotiable in a fast-moving ecosystem.
- **Facade** when a single user action spans three or more subsystems.
- **Strategy as a `Record`** for interchangeable behaviour, so the compiler enforces exhaustiveness.

## When NOT to use

- **Singleton** — a module-level mutable object is a global with extra steps. It breaks test isolation, since state leaks between tests. Use the DI container.
- **Classical Observer** — hand-rolled subscriber lists duplicate what a store already does better, with selectors and devtools.
- **Higher-order components** — hooks replaced them. HOCs obscure prop origins and stack wrappers in the component tree.
- **Render props for logic** — a hook is clearer. Render props still make sense for rendering, not for behaviour.
- **Abstract factories and builders** — TypeScript object literals with optional fields cover the same ground in a fraction of the code.
- Do not apply a pattern before the duplication exists. Two similar components are not yet an abstraction.

---

## References

- [Design Patterns (section)](../../software-engineering/design-patterns/README.md)
- [Adapter](../../software-engineering/design-patterns/structural/adapter.md)
- [Facade](../../software-engineering/design-patterns/structural/facade.md)
- [Strategy](../../software-engineering/design-patterns/behavioral/strategy.md)
- [Reusing Logic with Custom Hooks — React](https://react.dev/learn/reusing-logic-with-custom-hooks)
- [Passing Props to a Component — React](https://react.dev/learn/passing-props-to-a-component)
