---
type: concept
tags:
  - language
  - react-native
  - react
  - typescript
  - mobile
  - best-practice
related:
  - languages/react-native/architecture
  - languages/react-native/react-native-patterns
  - languages/react-native/dependency-injection
  - software-engineering/concepts/solid/solid
  - software-engineering/concepts/pragmatic-principles/overview
language: "react-native"
---
# Best Practices

> SOLID and the pragmatic principles were written for class-based systems. Four of the five SOLID principles translate cleanly to components and hooks; one does not, and pretending otherwise produces worse code.

---

## What is it?

A set of design principles applied to React Native: the five SOLID principles, and DRY, KISS and YAGNI. Each is shown as a concrete pair — the version that causes trouble, and the version that does not.

For the principles themselves, see [SOLID](../../software-engineering/concepts/solid/README.md) and [Pragmatic Principles](../../software-engineering/concepts/pragmatic-principles/README.md).

---

## Why does it matter?

These principles are usually taught with class examples, which makes the translation to functional React ambiguous. The result is either that they get ignored, or that they get applied literally — interfaces for every component, abstract factories, inheritance hierarchies of hooks.

Both outcomes are avoidable. The principles have clear, useful forms here; they just are not the textbook ones.

---

## How it works

### Single Responsibility

A module should have one reason to change. In React Native the violation is almost always a component that fetches, transforms, validates, and renders.

```tsx
// ✗ Four reasons to change: API shape, discount rules, formatting, layout
function OrderScreen({ id }: { id: string }) {
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    fetch(`/api/orders/${id}`).then((r) => r.json()).then(setOrder);
  }, [id]);

  const discount =
    order && order.total > 500 ? order.total * 0.1 : order && order.items.length > 10 ? order.total * 0.05 : 0;

  return <Text>{`R$ ${((order?.total ?? 0) - discount).toFixed(2).replace(".", ",")}`}</Text>;
}
```

```tsx
// ✓ Each piece changes for its own reason
// model/pricing.ts — a pure rule, tested in one line
export function discountFor(order: Order): number {
  if (order.total > 500) return order.total * 0.1;
  if (order.items.length > 10) return order.total * 0.05;
  return 0;
}

// hooks/useOrder.ts — orchestration
export function useOrder(id: string) {
  return useQuery({ queryKey: ["orders", id], queryFn: () => orderRepository.getById(id) });
}

// components/OrderTotal.tsx — rendering
export function OrderTotal({ order }: { order: Order }) {
  return <Text>{formatBRL(order.total - discountFor(order))}</Text>;
}
```

### Open/Closed

Open for extension, closed for modification. With components, this means **composition over configuration**: adding a variation should not mean editing the component.

```tsx
// ✗ Every new variation edits Card and adds a prop
function Card({ title, showBadge, badgeText, showFooter, footerText, onFooterPress }) { … }

// ✓ New variations compose; Card never changes
function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}
Card.Header = ({ children }: { children: ReactNode }) => <View style={styles.header}>{children}</View>;
Card.Footer = ({ children }: { children: ReactNode }) => <View style={styles.footer}>{children}</View>;
```

```tsx
<Card>
  <Card.Header><Text>Order #42</Text><Badge label="New" /></Card.Header>
  <OrderSummary order={order} />
  <Card.Footer><Button title="Track" onPress={track} /></Card.Footer>
</Card>
```

The `Record`-based Strategy in [React Native Patterns](react-native-patterns.md) is the same principle for behaviour: a new sort order adds an entry, it does not edit `sortPosts`.

### Liskov Substitution

**This one does not translate.** Liskov is about subtype substitutability in an inheritance hierarchy, and React Native has no component inheritance — composition is the only mechanism.

The nearest useful reading is about **honouring a contract**: a component accepting a known prop interface should behave as callers of that interface expect.

```tsx
// ✗ Accepts PressableProps but silently ignores onPress and disabled
function IconButton({ icon, ...rest }: PressableProps & { icon: string }) {
  return <Pressable onPress={() => track(icon)}><Icon name={icon} /></Pressable>;
}

// ✓ Honours the contract it advertises
function IconButton({ icon, onPress, ...rest }: PressableProps & { icon: string }) {
  return (
    <Pressable
      onPress={(e) => { track(icon); onPress?.(e); }}
      accessibilityRole="button"
      {...rest}
    >
      <Icon name={icon} />
    </Pressable>
  );
}
```

Stating the limit is more honest than inventing an example. Do not force inheritance into a React codebase in order to have somewhere to apply Liskov.

### Interface Segregation

No client should depend on methods it does not use. In React this is about **prop and interface surface**.

```tsx
// ✗ Needs the whole user to render a name
function Avatar({ user }: { user: User }) {
  return <Image source={{ uri: user.profile.avatarUrl }} />;
}

// ✓ Depends on exactly what it uses — reusable, trivially testable
function Avatar({ uri, size = 40 }: { uri: string; size?: number }) {
  return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
}
```

The same applies to repositories: a screen that only reads should not receive an interface with `create`, `update`, and `delete`.

### Dependency Inversion

Depend on abstractions, not concretions. This is the one with the largest practical payoff, and it has its own article — [Dependency Injection](dependency-injection.md).

```ts
// ✗ The hook is welded to one implementation
import { httpPostRepository } from "../api/httpPostRepository";
export function usePosts() {
  return useQuery({ queryKey: ["posts"], queryFn: httpPostRepository.list });
}

// ✓ The hook depends on the interface; the container supplies the implementation
export function usePosts() {
  const { posts } = useContainer();
  return useQuery({ queryKey: ["posts"], queryFn: () => posts.list() });
}
```

### DRY — the right kind of duplication

DRY is about knowledge, not characters. Two pieces of code that look alike but change for different reasons should stay separate.

```tsx
// ✗ A "shared" component serving two unrelated features
// Every new requirement on either side adds a flag
function ListItem({ item, isCart, isWishlist, showPrice, showRemove, showMoveToCart }) { … }
```

```tsx
// ✓ Two components sharing the primitives they actually share
function CartItem({ item, onRemove }: { item: CartLine; onRemove: (id: string) => void }) {
  return <Row><Thumbnail uri={item.image} /><Price value={item.price} /><RemoveButton onPress={() => onRemove(item.id)} /></Row>;
}

function WishlistItem({ item, onMoveToCart }: { item: SavedItem; onMoveToCart: (id: string) => void }) {
  return <Row><Thumbnail uri={item.image} /><Button title="Move to cart" onPress={() => onMoveToCart(item.id)} /></Row>;
}
```

A component whose body is mostly conditionals driven by boolean props is usually two components that were merged too early. Where DRY genuinely applies: validation rules, formatting, API paths, and design tokens — facts with exactly one correct value.

### KISS

The simplest thing that works, and no simpler.

```tsx
// ✗ A reducer, a context, and a provider — for a modal
// ✓
const [isOpen, setOpen] = useState(false);
```

Reach for `useState` first. Promote to `useReducer` when transitions become interdependent, and to a store when a second screen genuinely needs the value. Each promotion should be triggered by a real need, not anticipated.

### YAGNI

Build what is needed now.

```ts
// ✗ Written on day one, for requirements nobody has stated
export interface PostRepository {
  list(filters?: PostFilters, pagination?: Pagination, sort?: SortSpec): Promise<Paginated<Post>>;
  getById(id: string, options?: { includeComments?: boolean; includeAuthor?: boolean }): Promise<Post>;
  // …eight more methods, two of them used
}

// ✓ What the app calls today
export interface PostRepository {
  list(): Promise<Post[]>;
  getById(id: string): Promise<Post>;
}
```

The second is easier to change, because there is less of it and every line has a caller.

---

## Examples

One screen, both ways.

```tsx
// ✗ Single Responsibility, Interface Segregation, DRY and KISS all violated
export default function ProfileScreen({ userId }: { userId: string }) {
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/users/${userId}`).then((r) => r.json()),
      fetch(`/api/users/${userId}/posts`).then((r) => r.json()),
    ]).then(([u, p]) => { setUser(u); setPosts(p); setLoading(false); });
  }, [userId]);

  const isVerified = user && user.followers > 10000 && user.createdAt < "2023-01-01";

  if (loading) return <ActivityIndicator />;
  return (
    <View>
      <Image source={{ uri: user!.profile.avatarUrl }} style={{ width: 80, height: 80, borderRadius: 40 }} />
      <Text>{user!.name} {isVerified && "✓"}</Text>
      <FlatList data={posts} renderItem={({ item }) => <Text>{item.title}</Text>} />
    </View>
  );
}
```

```ts
// ✓ A rule, in the domain layer — no React, tested directly
export function isVerified(user: User): boolean {
  return user.followers > 10_000 && user.createdAt < new Date("2023-01-01");
}
```

```tsx
// ✓ A screen that composes and nothing else
export default function ProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, posts, isLoading } = useProfile(id);

  if (isLoading || !user) return <ActivityIndicator />;

  return (
    <View>
      <Avatar uri={user.avatarUrl} size={80} />
      <Text>{user.name} {isVerified(user) && "✓"}</Text>
      <PostList posts={posts} onSelect={open} />
    </View>
  );
}
```

`isVerified` is now a one-line unit test. `Avatar` takes a URI rather than a `User`. The screen reads top to bottom in five seconds.

---

## When to use

- **Single Responsibility** as the everyday heuristic: if you cannot name what a module does without "and", split it.
- **Composition over props** whenever a component grows its third boolean flag.
- **Interface Segregation** on component props — pass the field, not the aggregate.
- **Dependency Inversion** at the boundaries that actually vary: repositories, native modules, third-party SDKs.
- **KISS by default**, promoting state only when a concrete need appears.
- **YAGNI on interfaces** — add the method when there is a caller.

## When NOT to use

- Do not force Liskov into a React codebase. There is no component inheritance, and inventing a hierarchy to satisfy the principle makes the code worse.
- Do not apply DRY to code that merely looks similar. Premature consolidation produces flag-driven components that are harder to change than the duplication was.
- Do not create an interface with one implementation and no test double.
- Do not split a component that genuinely does one thing just because it is long. Length is not a responsibility count.
- Do not apply SOLID to a prototype. These principles manage change over time; code that will be deleted next week has no time to manage.

---

## References

- [SOLID (section)](../../software-engineering/concepts/solid/README.md)
- [Pragmatic Principles (section)](../../software-engineering/concepts/pragmatic-principles/README.md)
- [Thinking in React](https://react.dev/learn/thinking-in-react)
- [You Might Not Need an Effect — React](https://react.dev/learn/you-might-not-need-an-effect)
- [Choosing the State Structure — React](https://react.dev/learn/choosing-the-state-structure)
