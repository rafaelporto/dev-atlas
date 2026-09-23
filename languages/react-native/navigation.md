---
type: concept
tags:
  - language
  - react-native
  - react
  - typescript
  - mobile
related:
  - languages/react-native/project-setup
  - languages/react-native/architecture
  - languages/react-native/state-management
  - languages/react/routing
  - languages/flutter/navigation
language: "react-native"
---
# Navigation

> Expo Router gives you file-based, typed routing on top of native navigation primitives; React Navigation is the imperative alternative that most existing apps still use.

---

## What is it?

Navigation is how screens are organised and moved between: a stack that pushes and pops, tabs along the bottom, a drawer, a modal.

Two libraries matter. **Expo Router** derives routes from the file system, the way Next.js does for the web. **React Navigation** declares routes in JavaScript through navigator components. Expo Router is built on React Navigation's foundations, so the concepts transfer.

---

## Why does it matter?

Navigation shapes an app's architecture more than any other choice. It determines where screens live, how deep links resolve, where authentication is enforced, and what state survives a screen transition.

It is also the decision hardest to reverse. Changing navigation libraries late means touching every screen.

---

## How it works

### Expo Router — routes are files

```
app/
├── _layout.tsx              # Root layout — wraps everything
├── index.tsx                # /
├── (tabs)/
│   ├── _layout.tsx          # Tab bar
│   ├── feed.tsx             # /feed
│   └── profile.tsx          # /profile
├── posts/
│   ├── _layout.tsx          # Stack for the posts section
│   └── [id].tsx             # /posts/123 — dynamic
└── +not-found.tsx           # Fallback
```

Three conventions carry most of the weight:

- **`_layout.tsx`** declares the navigator for its directory — a stack, tabs, or a drawer. It persists across the screens inside it.
- **`[param].tsx`** is a dynamic segment, read with `useLocalSearchParams`.
- **`(group)`** groups routes for layout purposes without adding a URL segment. `(tabs)/feed.tsx` is `/feed`, not `/tabs/feed`.

```tsx
// app/_layout.tsx
import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="posts/[id]" options={{ title: "Post" }} />
    </Stack>
  );
}
```

### Navigating

```tsx
import { Link, router, useLocalSearchParams } from "expo-router";

// Declarative — preferred, because it is a real link and works with deep linking
<Link href="/posts/42">Open post</Link>
<Link href={{ pathname: "/posts/[id]", params: { id: "42" } }}>Open post</Link>

// Imperative — for navigation triggered by logic
router.push("/posts/42");
router.replace("/login");   // no back entry
router.back();

// Reading parameters
const { id } = useLocalSearchParams<{ id: string }>();
```

### Typed routes

Expo Router generates route types from the file tree. Enable it and a typo in a path becomes a compile error:

```json
{ "experiments": { "typedRoutes": true } }
```

```tsx
router.push("/psots/42");  // Type error — no such route
```

### The v56 decoupling

As of Expo SDK 56, **Expo Router no longer supports importing from `@react-navigation/*` in application code.** Anything you previously imported from those packages now comes from `expo-router`:

```tsx
// ✗ No longer supported in SDK 56+
import { useNavigation } from "@react-navigation/native";

// ✓
import { useNavigation } from "expo-router";
```

This matters when following older tutorials — a large amount of published material still shows the old imports.

### Protecting routes

Authentication belongs in a layout, not scattered across screens:

```tsx
// app/(app)/_layout.tsx
import { Redirect, Stack } from "expo-router";
import { useSession } from "@/features/auth/hooks/useSession";

export default function AppLayout() {
  const { session, isLoading } = useSession();

  if (isLoading) return null;
  if (!session) return <Redirect href="/login" />;

  return <Stack />;
}
```

Every route under `(app)/` is now guarded by one component.

### React Navigation

The imperative alternative, and what most existing codebases use:

```tsx
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { NavigationContainer } from "@react-navigation/native";

type RootStackParamList = {
  Feed: undefined;
  Post: { id: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Feed" component={FeedScreen} />
        <Stack.Screen name="Post" component={PostScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

Typing flows from `RootStackParamList`, which gives the same safety as typed routes with more boilerplate.

### Comparison

| | Expo Router | React Navigation |
|---|---|---|
| Route definition | File system | JavaScript components |
| Deep linking | Automatic from the file tree | Configured by hand |
| Type safety | Generated from files | Hand-written param list |
| Web support | Real URLs, shareable | Possible, more work |
| Learning curve | Low if you know Next.js | Low if you know React |
| Existing codebases | Newer | Overwhelmingly dominant |

---

## Examples

A tab layout with a nested stack — the most common app shell:

```tsx
// app/(tabs)/_layout.tsx
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: "#1f6feb" }}>
      <Tabs.Screen
        name="feed"
        options={{
          title: "Feed",
          tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
```

A dynamic route reading its parameter and setting its own title:

```tsx
// app/posts/[id].tsx
import { Stack, useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";
import { usePost } from "@/features/posts/hooks/usePost";

export default function PostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: post, isLoading } = usePost(id);

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Stack.Screen options={{ title: post?.title ?? "Loading…" }} />
      {isLoading ? <Text>Loading…</Text> : <Text>{post?.body}</Text>}
    </View>
  );
}
```

`<Stack.Screen options={…} />` rendered inside the screen lets the screen configure its own header from data it has fetched — no need to lift the title into the layout.

---

## When to use

- **Expo Router** for any new app. File-based routing, automatic deep linking, and typed routes remove a category of work.
- **React Navigation** when maintaining an existing app that already uses it, or when you need a navigator Expo Router does not expose.
- A **layout-level guard** for authentication, rather than a check inside each screen.
- **`Link`** over `router.push` wherever the navigation is a user action on a visible element — it is accessible and works with deep links.

## When NOT to use

- Do not put navigation state in a global store. The navigator already owns it, and duplicating it creates two sources of truth that drift.
- Do not use `router.push` for a "go back" action — repeated pushes grow the stack indefinitely. Use `router.back()` or `replace`.
- Do not import from `@react-navigation/*` in an Expo Router app on SDK 56 or later. It is no longer supported.
- Do not nest navigators more than two or three levels deep. Back behaviour becomes hard to reason about and harder to test.

---

## References

- [Expo Router — introduction](https://docs.expo.dev/router/introduction/)
- [Expo Router — common navigation patterns](https://docs.expo.dev/router/basics/common-navigation-patterns/)
- [Migrate Expo Router from SDK 55 to SDK 56](https://docs.expo.dev/router/migrate/sdk-55-to-56/)
- [React Navigation — documentation](https://reactnavigation.org/docs/getting-started)
- [Navigating between screens — React Native](https://reactnative.dev/docs/navigation)
