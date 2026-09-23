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
  - languages/react-native/performance
  - languages/react-native/core-components-and-styling
  - languages/react-native/new-architecture-and-native-modules
language: "react-native"
---
# Animations and Gestures

> An animation that runs on the JavaScript thread will stutter the moment that thread is busy. Reanimated moves the work to the UI thread, where it cannot be blocked.

---

## What is it?

React Native offers two animation systems. The built-in **Animated** API covers simple transitions. **Reanimated** runs animation and gesture logic on the UI thread through *worklets* — small JavaScript functions compiled to run outside the main JS runtime.

**Gesture Handler** is the companion library that replaces the built-in touch system with native gesture recognisers.

---

## Why does it matter?

The UI thread redraws at 60 or 120 frames per second. If an animation's next frame depends on JavaScript, and the JavaScript thread is busy parsing an API response or rendering a list, the frame is late and the user sees a stutter.

This is the most visible difference between an app that feels native and one that does not — and it is almost always caused by animation driven from the wrong thread.

---

## How it works

### Why the thread matters

```
Animation on the JS thread                Animation on the UI thread
───────────────────────────               ──────────────────────────
JS: compute frame ──┐                     JS: describe the animation once
                    ▼                                    │
UI: draw frame   ◄──┘                     UI: compute AND draw every frame
                                              (independent of JS)
JS busy?  →  frame is late  →  jank       JS busy?  →  animation unaffected
```

### The built-in Animated API

```tsx
import { Animated, useAnimatedValue } from "react-native";

const opacity = useAnimatedValue(0);

useEffect(() => {
  Animated.timing(opacity, {
    toValue: 1,
    duration: 300,
    useNativeDriver: true,   // ← without this, every frame crosses to JS
  }).start();
}, [opacity]);

<Animated.View style={{ opacity }} />
```

`useNativeDriver: true` hands the animation to the native side and is what keeps it smooth. It only supports `opacity` and `transform` — not `width`, `height`, `backgroundColor`, or layout. That limitation is the main reason to reach for Reanimated.

Release 0.85 introduced a new animation backend that improves the built-in API's performance, but the native-driver constraint on animatable properties remains.

### Reanimated and worklets

```tsx
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
} from "react-native-reanimated";

const scale = useSharedValue(1);

const animatedStyle = useAnimatedStyle(() => ({
  transform: [{ scale: scale.value }],
}));

<Animated.View style={animatedStyle} />
```

Two concepts carry the library:

- **Shared value** — a piece of state readable and writable from both threads. Mutating `.value` does not re-render the component.
- **Worklet** — the function passed to `useAnimatedStyle`, compiled to run on the UI thread. It cannot close over arbitrary JavaScript; to call back into the JS thread you use `runOnJS`.

```tsx
scale.value = withSpring(1.2);
scale.value = withTiming(1, { duration: 200 });
```

Because the style is computed on the UI thread, a busy JS thread does not affect it.

### Gestures

```tsx
import { Gesture, GestureDetector } from "react-native-gesture-handler";

const offset = useSharedValue({ x: 0, y: 0 });
const start = useSharedValue({ x: 0, y: 0 });

const pan = Gesture.Pan()
  .onBegin(() => {
    start.value = offset.value;
  })
  .onUpdate((event) => {
    offset.value = {
      x: start.value.x + event.translationX,
      y: start.value.y + event.translationY,
    };
  })
  .onEnd(() => {
    offset.value = withSpring({ x: 0, y: 0 });
  });

const style = useAnimatedStyle(() => ({
  transform: [{ translateX: offset.value.x }, { translateY: offset.value.y }],
}));

<GestureDetector gesture={pan}>
  <Animated.View style={style} />
</GestureDetector>
```

Every callback here is a worklet. The gesture is tracked, the position computed, and the view redrawn without the JS thread being involved at all — which is why it keeps up with a finger.

Gestures compose: `Gesture.Simultaneous(pan, pinch)`, `Gesture.Race(tap, longPress)`, `Gesture.Exclusive(doubleTap, singleTap)`.

### Crossing back to JavaScript

```tsx
const tap = Gesture.Tap().onEnd(() => {
  runOnJS(setSelected)(item.id);   // setSelected is a React setter — JS thread only
});
```

Calling a React setter directly from a worklet throws. `runOnJS` schedules it.

### Layout animations

For entering, exiting, and layout changes, Reanimated provides declarative presets that need no shared values:

```tsx
import Animated, { FadeIn, FadeOut, LinearTransition } from "react-native-reanimated";

<Animated.View entering={FadeIn} exiting={FadeOut} layout={LinearTransition}>
  <Text>{item.title}</Text>
</Animated.View>
```

This is the cheapest way to make list insertions and removals feel deliberate rather than abrupt.

---

## Examples

A press-scale animation, which is the most common interaction in a mobile app:

```tsx
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, withSpring, runOnJS } from "react-native-reanimated";

export function PressableCard({
  children,
  onPress,
}: {
  children: React.ReactNode;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);

  const gesture = Gesture.Tap()
    .onBegin(() => {
      scale.value = withSpring(0.96, { damping: 15 });
    })
    .onFinalize(() => {
      scale.value = withSpring(1, { damping: 15 });
    })
    .onEnd(() => {
      runOnJS(onPress)();
    });

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={style} accessibilityRole="button">{children}</Animated.View>
    </GestureDetector>
  );
}
```

A swipe-to-dismiss row, where the threshold decision also runs on the UI thread:

```tsx
const translateX = useSharedValue(0);
const THRESHOLD = 120;

const pan = Gesture.Pan()
  .activeOffsetX([-20, 20])          // let vertical scroll win until 20px horizontal
  .onUpdate((event) => {
    translateX.value = event.translationX;
  })
  .onEnd((event) => {
    if (Math.abs(event.translationX) > THRESHOLD) {
      translateX.value = withTiming(Math.sign(event.translationX) * 500, { duration: 180 });
      runOnJS(onDismiss)(item.id);
    } else {
      translateX.value = withSpring(0);
    }
  });
```

`activeOffsetX` is what makes this coexist with a vertical list: the pan gesture does not claim the touch until the finger has moved 20 pixels horizontally, so scrolling still works.

---

## When to use

- **Reanimated** for any animation driven by a gesture, or that must survive a busy JS thread.
- **Gesture Handler** for all custom touch interaction — it is also what navigation libraries use underneath.
- **Layout animations** (`entering`, `exiting`, `layout`) for list changes; they are a one-line improvement.
- **The built-in Animated API with `useNativeDriver: true`** for a simple fade or slide where adding a dependency is not worth it.
- **`activeOffsetX` / `activeOffsetY`** whenever a gesture lives inside a scrollable.

## When NOT to use

- Do not animate without `useNativeDriver` in the Animated API — every frame round-trips to JavaScript.
- Do not animate `width`, `height`, `top`, or `left`. Use `transform: scale` and `translate`, which do not trigger layout.
- Do not call React setters from inside a worklet without `runOnJS`.
- Do not read `sharedValue.value` during render. It does not subscribe, so the component will not update.
- Do not animate many items at once in a long list — animate what is on screen.
- Do not add Reanimated for one fade. The built-in API with the native driver is enough.

---

## References

- [Animations — React Native](https://reactnative.dev/docs/animations)
- [Reanimated — documentation](https://docs.swmansion.com/react-native-reanimated/)
- [Reanimated — worklets](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#worklet)
- [React Native Gesture Handler](https://docs.swmansion.com/react-native-gesture-handler/docs/)
- [Animation — Expo](https://docs.expo.dev/develop/user-interface/animation/)
