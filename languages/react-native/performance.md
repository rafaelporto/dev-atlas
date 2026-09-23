---
type: concept
tags:
  - language
  - react-native
  - react
  - typescript
  - mobile
  - rendering
related:
  - languages/react-native/lists-and-performance
  - languages/react-native/animations-and-gestures
  - languages/react-native/new-architecture-and-native-modules
  - languages/react/memoization
language: "react-native"
---
# Performance

> Measure first. Almost every real React Native performance problem is one of three things: too many re-renders, an unvirtualised list, or work on the wrong thread.

---

## What is it?

Performance here means three distinct things a user perceives separately: how long the app takes to become usable (**startup**), whether scrolling and animation hold their frame budget (**runtime**), and how long the app takes to download and install (**size**).

They have different causes and different fixes. Lumping them together is why "the app is slow" is rarely actionable.

---

## Why does it matter?

A frame budget is 16.7 ms at 60 Hz and 8.3 ms at 120 Hz. Miss it and the user sees a stutter — not a number in a report, but something that makes the app feel cheap.

Optimising without measuring is the common failure. Wrapping everything in `memo` adds comparison cost on every render and usually changes nothing, because the actual problem was an unvirtualised list or an animation on the JS thread.

---

## How it works

### The two threads

```
JS thread                          UI thread
─────────                          ─────────
React renders                      Layout and drawing
Your event handlers                Native gesture recognisers
Data transforms                    Reanimated worklets
                                   Native-driver animations

Blocked by heavy JS work      →    Keeps running independently
```

Anything expensive on the JS thread delays every handler and every non-native-driven animation. The UI thread is unaffected — which is why moving animation and gesture work there, as described in [Animations and Gestures](animations-and-gestures.md), matters so much.

### Measuring

**React Native DevTools** is the built-in profiler, opened with `j` in the terminal running Metro:

```bash
npx expo start
# press j
```

The React Profiler tab records a commit timeline: which components rendered, how long each took, and why. "Why did this render?" is the question that resolves most issues.

For startup, `performance.now()` at the app's entry and at first meaningful paint is cruder but honest. For native-side work, Xcode Instruments and Android Studio Profiler show what no JavaScript tool can.

### Re-renders

The most common runtime problem, and the one most often mis-diagnosed.

```tsx
// ✗ New object and new function identity on every parent render
<ProfileCard
  user={{ name, avatar }}
  style={{ padding: 16 }}
  onPress={() => open(id)}
/>
```

Every render creates a new object, so `memo` on `ProfileCard` compares unequal every time and re-renders anyway.

```tsx
// ✓ Stable identities
const cardStyle = useMemo(() => ({ padding: 16 }), []);
const handlePress = useCallback(() => open(id), [id, open]);

<ProfileCard user={user} style={cardStyle} onPress={handlePress} />
```

Better still, avoid the problem: `StyleSheet.create` produces stable references, and a component that closes over its own `id` needs no new callback per item.

The **React Compiler** automates much of this memoisation. Where it is enabled, manual `useMemo` and `useCallback` become largely unnecessary — but verify with the profiler rather than assuming.

### Lists

Lists deserve their own treatment — see [Lists and List Performance](lists-and-performance.md). The short version: virtualise, use a stable `keyExtractor`, memoise the row, and provide `getItemLayout` when heights are fixed.

### Startup

```tsx
// ✗ Imports the entire icon set at module load
import * as Icons from "@expo/vector-icons";

// ✓ Imports one family
import { Ionicons } from "@expo/vector-icons";
```

Levers that matter, roughly in order of effect:

- **Hermes** — default since 0.70, V1 since 0.84. Bytecode is precompiled, so there is no parse cost at launch.
- **Lazy TurboModules** — native modules initialise on first use, not at startup. Automatic on the New Architecture.
- **Defer non-critical work.** Analytics initialisation, feature-flag fetches, and crash-reporter setup do not need to block first paint.
- **`React.lazy` for heavy screens** that are not on the launch path.
- **Keep the root layout thin.** Everything it renders is on the critical path.

### Images

Images are the most common memory problem in a mobile app:

```tsx
import { Image } from "expo-image";

<Image
  source={{ uri: post.imageUrl }}
  style={{ width: 200, height: 120 }}
  contentFit="cover"
  transition={200}
  cachePolicy="memory-disk"
/>
```

`expo-image` caches to memory and disk and decodes more efficiently than the core `Image`. The larger win is upstream: serve images at the size they will be displayed. A 4000-pixel-wide photo rendered into a 200-pixel thumbnail decodes at full size in memory.

### Bundle size

```bash
npx expo export --platform ios
npx react-native-bundle-visualizer
```

Common offenders: importing a whole utility library for one function, embedding fonts that are never used, bundling every locale of a date library, and shipping uncompressed assets.

`expo-updates` also matters here — over-the-air updates ship only the JavaScript bundle, so keeping it small shortens update downloads on cellular connections.

---

## Examples

Profiling then fixing a screen that stutters while scrolling.

**What the profiler shows:** every `PostRow` re-renders whenever the parent's search text changes, though none of their props changed.

```tsx
// ✗ The cause
export function Feed() {
  const [query, setQuery] = useState("");
  const { data } = usePosts();

  return (
    <>
      <SearchBar value={query} onChangeText={setQuery} />
      <FlatList
        data={data}
        renderItem={({ item }) => (
          <PostRow post={item} onPress={() => router.push(`/posts/${item.id}`)} />
        )}
      />
    </>
  );
}
```

Each keystroke re-renders `Feed`, which creates a new `renderItem`, which the list treats as a change.

```tsx
// ✓ The fix
const PostRow = memo(function PostRow({
  post,
  onPress,
}: {
  post: Post;
  onPress: (id: string) => void;
}) {
  return (
    <Pressable onPress={() => onPress(post.id)}>
      <Text>{post.title}</Text>
    </Pressable>
  );
});

export function Feed() {
  const [query, setQuery] = useState("");
  const { data } = usePosts();
  const router = useRouter();

  const open = useCallback((id: string) => router.push(`/posts/${id}`), [router]);

  const renderItem = useCallback(
    ({ item }: { item: Post }) => <PostRow post={item} onPress={open} />,
    [open],
  );

  const visible = useMemo(
    () => (data ?? []).filter((p) => p.title.includes(query)),
    [data, query],
  );

  return (
    <>
      <SearchBar value={query} onChangeText={setQuery} />
      <FlatList data={visible} renderItem={renderItem} keyExtractor={(p) => p.id} />
    </>
  );
}
```

Three stable references — `open`, `renderItem`, and the memoised row — and only rows whose data actually changed re-render.

Moving expensive work off the JS thread:

```tsx
// ✗ Recomputed on the JS thread during a gesture
const progress = Math.min(scrollY / 200, 1);

// ✓ Computed on the UI thread, in a worklet
const headerStyle = useAnimatedStyle(() => ({
  opacity: Math.min(scrollY.value / 200, 1),
}));
```

---

## When to use

- **Profile before optimising.** React Native DevTools first, always.
- **Memoise list rows** and the callbacks they receive — the highest-yield fix in most apps.
- **`expo-image`** for any remote or repeated image.
- **Reanimated worklets** for anything driven by a gesture or scroll position.
- **Defer non-critical startup work** until after first paint.
- **Measure bundle size** when the app grows or OTA updates feel slow.

## When NOT to use

- Do not wrap everything in `memo`, `useMemo`, and `useCallback` pre-emptively. Comparison has a cost, and most components are cheap to render.
- Do not optimise a screen nobody reported as slow.
- Do not animate layout properties — `width`, `height`, `top`, `left` — when `transform` achieves the same effect without triggering layout.
- Do not benchmark in a development build. Dev mode carries warnings, source maps, and no minification; always measure a release build.
- Do not add a native module for performance before establishing that JavaScript is the bottleneck.
- Do not conflate the three kinds of performance. A fix for startup rarely helps scrolling.

---

## References

- [Performance overview — React Native](https://reactnative.dev/docs/performance)
- [React Native DevTools](https://reactnative.dev/docs/react-native-devtools)
- [Profiling — React Native](https://reactnative.dev/docs/profiling)
- [Speeding up your app — React Native](https://reactnative.dev/docs/speeding-up-your-app)
- [expo-image](https://docs.expo.dev/versions/latest/sdk/image/)
