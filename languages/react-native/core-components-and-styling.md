---
type: concept
tags:
  - language
  - react-native
  - react
  - typescript
  - mobile
  - component-driven
related:
  - languages/react-native/overview
  - languages/react-native/lists-and-performance
  - languages/react-native/forms
  - languages/react-native/accessibility
  - languages/react/components-and-props
  - languages/react/styling
language: "react-native"
---
# Core Components and Styling

> React Native gives you a small set of primitives — `View`, `Text`, `Image`, `Pressable`, `TextInput`, `ScrollView` — and a styling system that looks like CSS but is not CSS.

---

## What is it?

Core components are the building blocks React Native maps directly onto native views. There is no `<div>`, no `<p>`, no `<button>`: instead you compose a handful of primitives, each backed by a real platform view.

Styling uses JavaScript objects with CSS-like property names. The names are familiar; the semantics are not. There is no cascade, no inheritance across component boundaries, and no selectors.

---

## Why does it matter?

Most bugs a React developer hits in their first week of React Native come from assuming web behaviour: wrapping a string outside `Text`, expecting `display: block`, expecting a child to inherit the parent's font, or expecting a row layout by default. Knowing where the model diverges removes almost all of that friction.

The primitive set is also deliberately small. Nearly every interface is `View` plus `Text` plus a list, composed. Learning to compose those five or six well matters more than learning a component library.

---

## How it works

### The primitives

| Component | Renders to | Use for |
|---|---|---|
| `View` | `UIView` / `ViewGroup` | Layout container — the `div` equivalent |
| `Text` | `UITextView` / `TextView` | All text. Strings cannot live outside one |
| `Image` | `UIImageView` / `ImageView` | Local and remote images |
| `Pressable` | Touch-handling view | Anything tappable |
| `TextInput` | `UITextField` / `EditText` | Text entry |
| `ScrollView` | `UIScrollView` / `ScrollView` | Scrolling content of **bounded** size |
| `FlatList` | Virtualised scroll view | Scrolling content of unbounded size |

Two rules are enforced by the runtime rather than by convention:

1. **Every string must be inside a `Text`.** `<View>Hello</View>` throws.
2. **`ScrollView` renders all children immediately.** For a long or unknown-length list, use `FlatList` — see [Lists and Performance](lists-and-performance.md).

### Layout: Flexbox with different defaults

React Native uses Flexbox for layout, but three defaults differ from the web:

| Property | Web default | React Native default |
|---|---|---|
| `flexDirection` | `row` | **`column`** |
| `alignContent` | `stretch` | `flex-start` |
| `flexShrink` | `1` | **`0`** |

Everything is `display: flex` already; there is no `display: block`. `flex: 1` means "fill the space my parent gives me", and it is the single most-used style in the framework.

```
Parent:  flexDirection: "column"   (default)
┌────────────────────┐
│ ┌────────────────┐ │  ← children stack vertically
│ │  child 1       │ │
│ └────────────────┘ │
│ ┌────────────────┐ │
│ │  child 2       │ │
│ └────────────────┘ │
└────────────────────┘

Parent:  flexDirection: "row"
┌────────────────────┐
│ ┌────────┐┌──────┐ │  ← children sit side by side
│ │ child 1││child2│ │
│ └────────┘└──────┘ │
└────────────────────┘
```

### Styling has no cascade

```tsx
// On the web this text would be red. Here it is not.
<View style={{ color: "red" }}>
  <Text>Not red</Text>
</View>
```

Style does not flow from `View` to `Text`. Text properties inherit only from a parent `Text` to a nested `Text`. Anything else must be passed explicitly — which is exactly what shared components are for.

`StyleSheet.create` returns a plain object. Its value is grouping, autocomplete, and a stable reference that avoids allocating a new object on every render.

### Platform differences

```tsx
import { Platform } from "react-native";

const styles = StyleSheet.create({
  header: {
    paddingTop: Platform.select({ ios: 44, android: 24, default: 0 }),
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
});
```

Shadows are the classic divergence: iOS uses four `shadow*` properties, Android uses a single `elevation`. You need both.

For file-level differences, Metro resolves `Button.ios.tsx` and `Button.android.tsx` automatically from an import of `./Button`.

### Safe areas and edge-to-edge

Since 0.86, Android 15+ draws apps edge-to-edge by default — content renders behind the status and navigation bars unless you account for it. iOS has the notch and home indicator. Both are handled the same way:

```tsx
import { SafeAreaView } from "react-native-safe-area-context";

export function Screen({ children }: { children: React.ReactNode }) {
  return <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>{children}</SafeAreaView>;
}
```

Use the `react-native-safe-area-context` version, not the one exported from `react-native` — the core export does not handle Android correctly.

---

## Examples

A reusable button that keeps styling decisions in one place:

```tsx
import { Pressable, StyleSheet, Text, type PressableProps } from "react-native";

type Props = PressableProps & {
  title: string;
  variant?: "primary" | "secondary";
};

export function Button({ title, variant = "primary", disabled, ...rest }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
      {...rest}
    >
      <Text style={[styles.text, variant === "secondary" && styles.textSecondary]}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, alignItems: "center" },
  primary: { backgroundColor: "#1f6feb" },
  secondary: { backgroundColor: "transparent", borderWidth: 1, borderColor: "#1f6feb" },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.4 },
  text: { color: "white", fontWeight: "600" },
  textSecondary: { color: "#1f6feb" },
});
```

Two details worth copying: `style` accepts a **function** on `Pressable`, giving access to the pressed state without any local state; and passing an **array** lets you compose conditional styles, with later entries overriding earlier ones.

Responding to screen size:

```tsx
import { useWindowDimensions } from "react-native";

export function Grid({ children }: { children: React.ReactNode }) {
  const { width } = useWindowDimensions();
  const columns = width > 700 ? 3 : width > 400 ? 2 : 1;

  return <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>{children}</View>;
}
```

Use `useWindowDimensions`, not `Dimensions.get("window")` — the hook re-renders on rotation and on split-screen resize; the static call does not.

---

## When to use

- `View` and `Text` for essentially all layout and content — resist reaching for a component library before you need one.
- `Pressable` for every tappable element; it supersedes `TouchableOpacity` and `TouchableHighlight`.
- `ScrollView` when the content is bounded and known — a settings page, a form, a detail screen.
- `StyleSheet.create` for any style used more than once or that lives in a component rendered repeatedly.

## When NOT to use

- `ScrollView` for lists of unknown or large length — it mounts every child at once and will drop frames. Use `FlatList` or FlashList.
- Inline style objects inside a list item — a new object every render defeats memoisation and causes avoidable re-renders.
- `Dimensions.get("window")` at module scope — the value is captured once and goes stale on rotation.
- The `SafeAreaView` exported from `react-native` — it does not handle Android edge-to-edge correctly.
- Porting a web design system property by property. Percentage heights, `position: fixed`, and CSS grid have no equivalent here.

---

## References

- [Core Components and APIs — React Native](https://reactnative.dev/docs/components-and-apis)
- [Layout with Flexbox — React Native](https://reactnative.dev/docs/flexbox)
- [Style — React Native](https://reactnative.dev/docs/style)
- [Platform-specific code — React Native](https://reactnative.dev/docs/platform-specific-code)
- [Safe area insets — Expo](https://docs.expo.dev/develop/user-interface/safe-areas/)
