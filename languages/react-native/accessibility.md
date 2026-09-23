---
type: concept
tags:
  - language
  - react-native
  - react
  - typescript
  - mobile
related:
  - languages/react-native/core-components-and-styling
  - languages/react-native/forms
  - languages/react-native/testing
  - languages/react/accessibility
language: "react-native"
---
# Accessibility

> There is no semantic HTML to fall back on. Every role, label, and state a screen reader announces has to be declared explicitly.

---

## What is it?

Accessibility in React Native means making the app usable with VoiceOver on iOS and TalkBack on Android, at larger text sizes, and without relying on colour alone.

On the web, `<button>` and `<label>` carry meaning for free. Here, `Pressable` is a view that happens to respond to touch — a screen reader has no way to know it is a button unless you say so.

---

## Why does it matter?

An unlabelled interface is not merely awkward for a screen-reader user; it is unusable. A row of icon-only buttons announces as "button, button, button".

There is also a practical dividend: the same properties that make an app accessible make it testable. `getByRole("button", { name: "Save" })` works only if the role and the name are there — so accessibility work pays for itself in the test suite, as [Testing](testing.md) shows.

---

## How it works

### The four core properties

| Property | Purpose |
|---|---|
| `accessible` | Groups children into one focusable element |
| `accessibilityLabel` | What the screen reader announces |
| `accessibilityRole` | What kind of element this is |
| `accessibilityState` | Selected, disabled, checked, expanded, busy |

```tsx
<Pressable
  accessible
  accessibilityRole="button"
  accessibilityLabel="Save draft"
  accessibilityHint="Saves without publishing"
  accessibilityState={{ disabled: isSaving }}
  disabled={isSaving}
  onPress={save}
>
  <Icon name="save" />
</Pressable>
```

Without `accessibilityLabel`, that button announces as nothing at all — the icon is a glyph, not text.

The label says **what it is**; the hint says **what happens**. Do not put "button" in the label — the role already announces it, and "Save draft button button" is what users actually hear.

### Roles

The common ones: `button`, `link`, `header`, `image`, `search`, `switch`, `checkbox`, `radio`, `tab`, `tablist`, `alert`, `progressbar`, `summary`.

```tsx
<Text accessibilityRole="header">Settings</Text>
<Pressable accessibilityRole="link" onPress={openTerms}><Text>Terms</Text></Pressable>
<Switch accessibilityRole="switch" value={enabled} onValueChange={setEnabled} />
```

`accessibilityRole="header"` is what enables heading navigation — how screen-reader users skim a long screen without listening to every word.

### Grouping

By default each `Text` is focusable separately, so a card becomes four stops:

```tsx
// ✗ Four separate announcements
<View>
  <Text>Ada Lovelace</Text>
  <Text>Posted 2 hours ago</Text>
  <Text>Notes on the Analytical Engine</Text>
  <Text>42 likes</Text>
</View>

// ✓ One stop, one coherent sentence
<View
  accessible
  accessibilityRole="button"
  accessibilityLabel="Notes on the Analytical Engine, by Ada Lovelace, 2 hours ago, 42 likes"
  onTouchEnd={open}
>
  <Text>Ada Lovelace</Text>
  <Text>Posted 2 hours ago</Text>
  <Text>Notes on the Analytical Engine</Text>
  <Text>42 likes</Text>
</View>
```

`accessible` on the container merges its children into one element. Ordering the label so the most important information comes first is what makes a long list navigable.

### State and live updates

```tsx
<Pressable
  accessibilityRole="tab"
  accessibilityState={{ selected: active === id }}
  accessibilityLabel={title}
>
```

For content that changes without user action:

```tsx
{error && (
  <Text accessibilityLiveRegion="polite" accessibilityRole="alert">
    {error.message}
  </Text>
)}
```

`accessibilityLiveRegion` (Android) and `AccessibilityInfo.announceForAccessibility` (both platforms) are how a validation error or a loading result gets announced. Without one, an error appears silently for a screen-reader user.

### Touch target size

Both platform guidelines set a minimum: 44×44 points on iOS, 48×48 dp on Android. An icon drawn at 20 points needs padding or `hitSlop`:

```tsx
<Pressable hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
  <Icon name="close" size={20} />
</Pressable>
```

`hitSlop` extends the touchable area without changing the layout.

### Text scaling

Users can enlarge system text substantially. Layouts built on fixed heights break at those sizes:

```tsx
// ✗ Clips as soon as text scales
<View style={{ height: 44 }}><Text style={{ fontSize: 16 }}>{label}</Text></View>

// ✓ Grows with its content
<View style={{ minHeight: 44, justifyContent: "center", paddingVertical: 8 }}>
  <Text style={{ fontSize: 16 }}>{label}</Text>
</View>
```

Use `minHeight` rather than `height`, and let content define size. `maxFontSizeMultiplier` can cap scaling where a layout genuinely cannot accommodate it — but treat that as a last resort, not a default.

### Detecting settings

```tsx
import { AccessibilityInfo } from "react-native";

const [reduceMotion, setReduceMotion] = useState(false);

useEffect(() => {
  void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
  return () => sub.remove();
}, []);

// Respect it
<Animated.View entering={reduceMotion ? undefined : FadeIn} />
```

`isScreenReaderEnabled` is also available, though it is usually better to make one interface work for everyone than to branch on it.

### Colour and contrast

Colour must never be the only signal. WCAG asks for a contrast ratio of at least 4.5:1 for body text and 3:1 for large text.

```tsx
// ✗ Only colour distinguishes the error
<TextInput style={{ borderColor: hasError ? "#d33" : "#ccc" }} />

// ✓ Colour, plus text, plus an announcement
<TextInput
  style={{ borderColor: hasError ? "#d33" : "#ccc" }}
  accessibilityLabel="Username"
  accessibilityState={{ invalid: hasError }}
/>
{hasError && (
  <Text accessibilityLiveRegion="polite" style={{ color: "#d33" }}>
    Username is already taken
  </Text>
)}
```

---

## Examples

An accessible list row with a secondary action — the case where naive markup fails most often:

```tsx
import { Pressable, StyleSheet, Text, View } from "react-native";

export function SavedItemRow({
  item,
  onOpen,
  onRemove,
}: {
  item: SavedItem;
  onOpen: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <View style={styles.row}>
      <Pressable
        style={styles.main}
        accessible
        accessibilityRole="button"
        accessibilityLabel={`${item.title}, saved ${item.savedAt}`}
        accessibilityHint="Opens the item"
        onPress={() => onOpen(item.id)}
      >
        <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.meta}>Saved {item.savedAt}</Text>
      </Pressable>

      <Pressable
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={`Remove ${item.title} from saved items`}
        onPress={() => onRemove(item.id)}
      >
        <Icon name="trash" size={20} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16 },
  main: { flex: 1, minHeight: 56, justifyContent: "center", paddingVertical: 8 },
  title: { fontSize: 16 },
  meta: { fontSize: 13, color: "#666" },
});
```

Two focusable elements rather than one, because there are two actions. The remove button's label includes the item title — "Remove" alone is ambiguous in a list of twenty rows, since a screen-reader user may reach it without having just heard the title.

Verifying in a test:

```tsx
it("labels the remove action with the item title", () => {
  render(<SavedItemRow item={{ id: "1", title: "Notes", savedAt: "today" }} onOpen={jest.fn()} onRemove={jest.fn()} />);
  expect(screen.getByLabelText("Remove Notes from saved items")).toBeOnTheScreen();
});
```

---

## When to use

- **`accessibilityRole` and `accessibilityLabel` on every interactive element.** There is no implicit semantics to inherit.
- **`accessible` on composite rows** so a card is one stop rather than five.
- **`hitSlop`** wherever the visual target is smaller than 44 points.
- **`minHeight` instead of `height`** on anything containing text.
- **A live region or an announcement** for anything that changes without user action.
- **Labels that include context** for repeated actions in a list.

## When NOT to use

- Do not write "button" or "link" in a label — the role announces it, and it is read twice.
- Do not label decorative images. Mark them `accessibilityElementsHidden` (iOS) and `importantForAccessibility="no-hide-descendants"` (Android).
- Do not make every element in a card individually focusable. It turns a list into a maze.
- Do not rely on colour alone for state, error, or availability.
- Do not use fixed heights on text containers — they clip at larger system text sizes.
- Do not build a separate "accessible mode". One interface that works for everyone is less code and does not fall behind.

---

## References

- [Accessibility — React Native](https://reactnative.dev/docs/accessibility)
- [AccessibilityInfo — React Native](https://reactnative.dev/docs/accessibilityinfo)
- [Apple — Human Interface Guidelines: Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)
- [Android — Accessibility principles](https://developer.android.com/guide/topics/ui/accessibility/principles)
- [WCAG 2.2 — W3C](https://www.w3.org/TR/WCAG22/)
