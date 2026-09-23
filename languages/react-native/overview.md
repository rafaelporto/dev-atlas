---
type: concept
tags:
  - language
  - react-native
  - react
  - typescript
  - mobile
  - overview
related:
  - languages/react-native/new-architecture-and-native-modules
  - languages/react-native/architecture
  - languages/react/overview
  - languages/flutter/overview
  - languages/javascript/overview
language: "react-native"
---
# React Native Overview

> React Native lets you build native iOS and Android apps with React — your components render to real platform views, not to a web page inside a browser.

---

## What is it?

React Native is a framework for building mobile apps using React. You write components in JavaScript or TypeScript, and instead of producing HTML elements, those components produce **actual native views** — a `UIView` on iOS, an Android `View` on Android.

It was created at Meta and open-sourced in 2015. It powers Facebook, Instagram, Discord, Shopify, and Microsoft Office on mobile.

The key distinction: this is not a web page in a wrapper. There is no WebView, no DOM, no CSS engine. A `<Text>` component becomes a real native text view that the operating system draws, scrolls, and makes accessible.

---

## Why does it matter?

Building the same app twice — once in Swift, once in Kotlin — means two codebases, two teams, two sets of bugs, and features that drift apart. React Native lets one team ship both platforms from one codebase while keeping native rendering, native gestures, and native accessibility.

The trade is real and worth stating plainly: you gain shared code and React's programming model; you give up some direct access to the platform, and you take on a JavaScript runtime as a dependency.

---

## How it works

A React Native app runs JavaScript in an embedded engine (**Hermes**) alongside the native app. Your components describe a tree; React reconciles it; the result is applied to native views.

```
┌──────────────────────────────────────────────┐
│  Your code — TypeScript + JSX                │
│  function Profile() { return <Text>…</Text> }│
└───────────────────┬──────────────────────────┘
                    │ React reconciliation
┌───────────────────▼──────────────────────────┐
│  Hermes — the JavaScript engine              │
└───────────────────┬──────────────────────────┘
                    │ JSI — direct, synchronous
                    │ C++ interface (no bridge)
┌───────────────────▼──────────────────────────┐
│  Fabric renderer    │   TurboModules          │
│  (builds the tree   │   (camera, storage,     │
│   of native views)  │    geolocation, …)      │
└───────────────────┬─┴────────────────────────┘
                    │
┌───────────────────▼──────────────────────────┐
│  UIView (iOS)        android.view.View        │
└──────────────────────────────────────────────┘
```

**JSI** (JavaScript Interface) is a C++ layer that lets JavaScript hold references to native objects and call them directly. **Fabric** is the renderer that turns your component tree into native views. **TurboModules** are native modules loaded lazily and called through JSI.

This is the **New Architecture**. It has been the default since React Native 0.76 and the *only* architecture since 0.82 — the previous asynchronous "bridge" was frozen in June 2025 and removed in 0.84. Material describing React Native as message-passing over a JSON bridge is describing a system that no longer exists.

For the full mechanism, see [New Architecture and Native Modules](new-architecture-and-native-modules.md).

---

## Frameworks: the recommended starting point

The official documentation is explicit: *"if you're building a new app with React Native, we recommend using a Framework."* The framework it names is **Expo**.

A framework supplies what nearly every app needs and what React Native itself does not ship: routing, a standard library of native modules, over-the-air updates, and a build service. Without one, you assemble and maintain those yourself.

```bash
# The recommended path
npx create-expo-app@latest

# Without a framework — for apps with unusual constraints
npx @react-native-community/cli init MyApp
```

Both paths are supported and documented. This section leads with Expo and calls out the difference wherever the two genuinely diverge.

---

## What you can build

| Target | Support |
|---|---|
| **iOS** | First-class — iPhone and iPad |
| **Android** | First-class — phones and tablets |
| **Web** | Via `react-native-web`; strong for shared logic, weaker for a web-first product |
| **macOS / Windows** | Via `react-native-macos` / `react-native-windows`, maintained by Microsoft |
| **tvOS / Android TV** | Community-maintained |

---

## Ecosystem highlights

- **Expo Router** — file-based routing, typed routes, native navigation primitives.
- **React Navigation** — the long-standing navigation library; still what most existing apps use.
- **Reanimated** and **Gesture Handler** — animations and gestures that run off the JavaScript thread.
- **TanStack Query** — server-state caching, unchanged from its web usage.
- **Zustand**, **Redux Toolkit**, **Jotai** — client state, also unchanged from web.
- **FlashList** — a faster list implementation from Shopify.
- **MMKV** — fast synchronous key-value storage.

Most of the React ecosystem that is not DOM-specific works here without modification. That is a large part of the value.

---

## Where React Native stands today

React Native 0.87 is current as of August 2026. Recent releases have been about consolidation rather than upheaval:

- **0.82** — first release running entirely on the New Architecture.
- **0.84** — Hermes V1 becomes the default engine; Legacy Architecture code removed.
- **0.85** — new animation backend.
- **0.86** — edge-to-edge display support for Android 15+.
- **0.87** — Strict TypeScript API by default, Swift Package Manager support.

React 19.2 ships with 0.87. Expo SDK 56 embeds React Native 0.85, so a freshly created Expo app is typically one or two minor versions behind the standalone release — expected, and not a problem.

---

## Examples

A complete screen — components, styling, and state:

```tsx
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function Counter() {
  const [count, setCount] = useState(0);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>You tapped {count} times</Text>
      <Pressable style={styles.button} onPress={() => setCount((c) => c + 1)}>
        <Text style={styles.buttonText}>Tap me</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  label: { fontSize: 18 },
  button: { backgroundColor: "#1f6feb", paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 },
  buttonText: { color: "white", fontWeight: "600" },
});
```

Three things differ from React on the web, and they catch newcomers:

1. **There is no `<div>` or `<span>`.** You use `View` and `Text`, and every string must be inside a `Text`.
2. **Styles are objects, not CSS.** No cascade, no inheritance (except some text properties), no stylesheets shared across components.
3. **`flexDirection` defaults to `column`**, not `row` as on the web, and `flex: 1` is how you fill available space.

---

## When to use

- A product that needs both iOS and Android, where most of the value is in screens, forms, lists, and API calls rather than in platform-specific capability.
- A team that already knows React — the component model, hooks, and most libraries carry over directly.
- Apps where shipping speed and a single codebase matter more than squeezing the last frame of rendering performance.
- Products that benefit from over-the-air updates to JavaScript without a store review cycle.

## When NOT to use

- Apps built around heavy, sustained native work — real-time video processing, 3D rendering, augmented reality. The JavaScript layer becomes overhead rather than leverage.
- Single-platform apps with no plan to expand. Swift or Kotlin will be simpler, faster, and better supported.
- Apps that must adopt brand-new OS features on release day — those reach React Native after they reach the native SDKs.
- Teams with no JavaScript or React experience and no appetite to build it. The framework assumes React fluency.

---

## References

- [React Native — official documentation](https://reactnative.dev/docs/getting-started)
- [Get Started with React Native](https://reactnative.dev/docs/environment-setup)
- [About the New Architecture](https://reactnative.dev/architecture/landing-page)
- [React Native blog — release notes](https://reactnative.dev/blog)
- [Expo documentation](https://docs.expo.dev/)
