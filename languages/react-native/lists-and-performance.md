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
  - languages/react-native/core-components-and-styling
  - languages/react-native/performance
  - languages/react-native/data-fetching
  - languages/react/lists-and-keys
  - languages/react/memoization
language: "react-native"
---
# Lists and List Performance

> Lists are where mobile apps drop frames. Virtualisation, stable keys, and a memoised row component solve almost all of it.

---

## What is it?

A virtualised list renders only the rows currently visible plus a small buffer, recycling the rest. React Native ships `FlatList` and `SectionList` for this; Shopify's `FlashList` is a faster drop-in replacement.

The alternative — `ScrollView` — mounts every child immediately. With twenty rows that is fine. With two thousand it will freeze the app on mount.

---

## Why does it matter?

A list is the most common screen in a mobile app and the most common source of jank. The symptoms are recognisable: stutter while scrolling, blank space where rows should be, a visible pause when the screen opens.

All three have the same small set of causes, and all are fixable without native code. Getting lists right is the highest-leverage performance work available in React Native.

---

## How it works

### Virtualisation

```
Rendered window (what exists in memory)
        ┌─────────────┐
        │   buffer    │  ← windowSize extends past the viewport
   ╔════╪═════════════╪════╗
   ║    │   row 12    │    ║
   ║    │   row 13    │    ║  ← visible viewport
   ║    │   row 14    │    ║
   ╚════╪═════════════╪════╝
        │   buffer    │
        └─────────────┘
   rows 0–10 and 17–2000: not mounted
```

As you scroll, rows leaving the window unmount and new ones mount. Memory stays flat regardless of list length — but every mount costs work, which is why the row component's render cost is what determines smoothness.

### Choosing the component

| Component | When |
|---|---|
| `ScrollView` | Bounded, short content — a form, a settings page |
| `FlatList` | Any list of unknown or significant length |
| `SectionList` | The same, with section headers |
| `FlashList` | Long or complex lists where `FlatList` still stutters |

### The three things that matter

**1. A stable `keyExtractor`.** Using the array index means React reuses the wrong row when the data reorders or an item is removed. Use a real identifier.

```tsx
keyExtractor={(item) => item.id}
```

**2. A memoised row that does not receive new props every render.** This is the one most often missed:

```tsx
// ✗ A new function every render — memo on PostRow achieves nothing
<FlatList renderItem={({ item }) => <PostRow post={item} onPress={() => open(item.id)} />} />

// ✓ Stable renderItem, stable callback, memoised row
const renderItem = useCallback(
  ({ item }: { item: Post }) => <PostRow post={item} onPress={open} />,
  [open],
);
```

```tsx
const PostRow = memo(function PostRow({ post, onPress }: Props) {
  return (
    <Pressable onPress={() => onPress(post.id)}>
      <Text>{post.title}</Text>
    </Pressable>
  );
});
```

The row takes `onPress` as a stable reference and closes over `post.id` internally — so the prop identity does not change when the list re-renders.

**3. `getItemLayout` when rows are a fixed height.** It lets the list skip measurement entirely, which removes the blank-space flicker on fast scrolls:

```tsx
const ITEM_HEIGHT = 72;

getItemLayout={(_, index) => ({
  length: ITEM_HEIGHT,
  offset: ITEM_HEIGHT * index,
  index,
})}
```

### FlashList

`FlashList` recycles view instances instead of unmounting and remounting them, which is meaningfully faster for complex rows:

```tsx
import { FlashList } from "@shopify/flash-list";

<FlashList data={posts} renderItem={renderItem} estimatedItemSize={72} />
```

It needs `estimatedItemSize` rather than `getItemLayout`. Because it recycles, a row holding local state must reset that state when the item changes — the most common FlashList bug.

---

## Examples

A complete, well-behaved list with pull-to-refresh and pagination:

```tsx
import { memo, useCallback } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";

type Post = { id: string; title: string; excerpt: string };

const ITEM_HEIGHT = 72;

const PostRow = memo(function PostRow({
  post,
  onPress,
}: {
  post: Post;
  onPress: (id: string) => void;
}) {
  return (
    <Pressable style={styles.row} onPress={() => onPress(post.id)}>
      <Text style={styles.title} numberOfLines={1}>{post.title}</Text>
      <Text style={styles.excerpt} numberOfLines={1}>{post.excerpt}</Text>
    </Pressable>
  );
});

export function PostList({
  posts,
  isRefreshing,
  isLoadingMore,
  onRefresh,
  onEndReached,
  onSelect,
}: {
  posts: Post[];
  isRefreshing: boolean;
  isLoadingMore: boolean;
  onRefresh: () => void;
  onEndReached: () => void;
  onSelect: (id: string) => void;
}) {
  const renderItem = useCallback(
    ({ item }: { item: Post }) => <PostRow post={item} onPress={onSelect} />,
    [onSelect],
  );

  return (
    <FlatList
      data={posts}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      getItemLayout={(_, index) => ({
        length: ITEM_HEIGHT,
        offset: ITEM_HEIGHT * index,
        index,
      })}
      refreshing={isRefreshing}
      onRefresh={onRefresh}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListEmptyComponent={<Text style={styles.empty}>Nothing here yet.</Text>}
      ListFooterComponent={isLoadingMore ? <ActivityIndicator style={styles.footer} /> : null}
    />
  );
}

const styles = StyleSheet.create({
  row: { height: ITEM_HEIGHT, justifyContent: "center", paddingHorizontal: 16, gap: 4 },
  title: { fontSize: 16, fontWeight: "600" },
  excerpt: { fontSize: 14, color: "#666" },
  separator: { height: 1, backgroundColor: "#eee" },
  empty: { textAlign: "center", marginTop: 48, color: "#666" },
  footer: { paddingVertical: 16 },
});
```

Note that `ListEmptyComponent`, `ListFooterComponent`, and `ItemSeparatorComponent` remove the conditional rendering that would otherwise clutter the parent — the list handles empty and loading states itself.

---

## When to use

- `FlatList` as the default for any list whose length you do not control.
- `getItemLayout` whenever rows have a fixed, known height — it is a few lines for a visible improvement.
- `FlashList` when rows are complex (images, multiple text blocks, nested views) and `FlatList` still stutters after memoisation.
- `SectionList` for grouped data, rather than flattening sections into one array with header sentinels.

## When NOT to use

- `ScrollView` for any list backed by an API response — the length is unknown by definition.
- Index as key. It breaks reordering, insertion, and deletion, and the damage shows up as rows displaying the wrong data.
- Inline arrow functions in `renderItem` when rows are memoised — the memo becomes dead weight.
- `getItemLayout` with variable-height rows. It will misplace rows; use `FlashList` with `estimatedItemSize` instead.
- Nesting a `FlatList` inside a `ScrollView` of the same orientation. Virtualisation stops working and the console warns about it.

---

## References

- [Using List Views — React Native](https://reactnative.dev/docs/using-a-listview)
- [FlatList — React Native](https://reactnative.dev/docs/flatlist)
- [Optimizing FlatList configuration — React Native](https://reactnative.dev/docs/optimizing-flatlist-configuration)
- [FlashList — Shopify](https://shopify.github.io/flash-list/)
