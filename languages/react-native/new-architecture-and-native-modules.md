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
  - languages/react-native/overview
  - languages/react-native/performance
  - languages/react-native/platform-apis-and-permissions
  - languages/react-native/architecture
language: "react-native"
---
# The New Architecture and Native Modules

> JSI lets JavaScript call native code directly, Fabric renders the view tree, and TurboModules expose platform capability. When no module exists for what you need, you write one.

---

## What is it?

The New Architecture is the set of internals that connect JavaScript to the platform: **JSI**, **Fabric**, **TurboModules**, and **Codegen**. It replaced the original asynchronous bridge, became the default in React Native 0.76, and has been the only architecture since 0.82.

A **native module** is platform code — Swift or Kotlin — exposed to JavaScript. You write one when a capability has no existing module.

---

## Why does it matter?

Two reasons, one immediate and one occasional.

The immediate one: most React Native material written before 2025 describes the old bridge — JSON messages passed asynchronously in batches. That system no longer exists, and advice derived from its constraints ("minimise bridge crossings", "batch your calls") is now misleading.

The occasional one: sooner or later an app needs something no library provides — an SDK with no wrapper, a platform API too new to be covered. Knowing the boundary makes that a contained task rather than a rewrite.

---

## How it works

### JSI

JSI is a lightweight C++ interface that lets JavaScript hold references to native objects and invoke their methods **directly and synchronously**.

```
Old bridge (removed in 0.84)        New Architecture
──────────────────────────────      ─────────────────────────
JS  ──serialize to JSON──►          JS  ──► JSI ──► C++ ──► native
    ◄──async batched queue──            ◄─────── direct ───────
                                    
Asynchronous, serialised,           Synchronous where it needs to be,
everything crosses as a string      no serialisation, direct references
```

Removing serialisation is what makes Reanimated worklets, synchronous MMKV reads, and JSI-backed database drivers possible.

### Fabric

Fabric is the renderer. It builds an immutable shadow tree in C++, computes layout, and commits the result to real platform views. Because the tree is immutable and lives in C++, layout can be computed off the main thread and React's concurrent features work correctly.

For app code the consequence is mostly that measurements are consistent and `useLayoutEffect` behaves as it does on the web.

### TurboModules and Codegen

A TurboModule is a native module that is **lazily loaded** — initialised the first time JavaScript touches it, rather than at app startup. An app with forty modules pays for only the ones it uses, which is a measurable startup win.

**Codegen** is what makes this type-safe. You declare the module's interface in TypeScript; Codegen generates the C++ and platform-side scaffolding at build time, so a mismatch between the JavaScript signature and the native implementation is a compile error.

### Hermes

Hermes is the JavaScript engine, default since 0.70 and at **V1** since 0.84. It compiles to bytecode ahead of time, which cuts startup and memory compared with JSC. It is also what React Native DevTools attaches to for debugging and profiling.

### When to write a native module

Ask in this order:

1. **Does an Expo module cover it?** `expo-camera`, `expo-location`, `expo-notifications` and the rest cover most capability.
2. **Does a community library cover it?** Check that it supports the New Architecture.
3. **Can it be done in JavaScript?** Often yes, and always cheaper to maintain.
4. **Only then**, write a module.

A native module means maintaining Swift and Kotlin alongside TypeScript, and every platform SDK update becomes your problem.

### Writing one with the Expo Modules API

This is the path with the least ceremony. It generates the Codegen wiring for you.

```bash
npx create-expo-module@latest --local expo-battery-info
```

The TypeScript face of the module — the only part app code sees:

```ts
// modules/expo-battery-info/index.ts
import { requireNativeModule } from "expo-modules-core";

declare class BatteryInfoModule {
  getLevel(): number;              // synchronous — possible thanks to JSI
  isCharging(): Promise<boolean>;
}

export default requireNativeModule<BatteryInfoModule>("BatteryInfo");
```

The iOS implementation:

```swift
// ios/BatteryInfoModule.swift
import ExpoModulesCore

public class BatteryInfoModule: Module {
  public func definition() -> ModuleDefinition {
    Name("BatteryInfo")

    Function("getLevel") { () -> Double in
      UIDevice.current.isBatteryMonitoringEnabled = true
      return Double(UIDevice.current.batteryLevel)
    }

    AsyncFunction("isCharging") { () -> Bool in
      UIDevice.current.isBatteryMonitoringEnabled = true
      return UIDevice.current.batteryState == .charging
    }
  }
}
```

The Android implementation:

```kotlin
// android/src/main/java/expo/modules/batteryinfo/BatteryInfoModule.kt
package expo.modules.batteryinfo

import android.os.BatteryManager
import android.content.Context
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class BatteryInfoModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("BatteryInfo")

    Function("getLevel") {
      val manager = appContext.reactContext
        ?.getSystemService(Context.BATTERY_SERVICE) as BatteryManager
      manager.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY) / 100.0
    }

    AsyncFunction("isCharging") {
      val manager = appContext.reactContext
        ?.getSystemService(Context.BATTERY_SERVICE) as BatteryManager
      manager.isCharging
    }
  }
}
```

`Function` is synchronous and `AsyncFunction` returns a promise. Both are declared the same way on each platform, which keeps the two implementations aligned.

### Keeping the module at the edge

Never call a native module directly from a component. Wrap it, so the rest of the app depends on your interface rather than on the module:

```ts
// src/shared/device/battery.ts
import BatteryInfo from "@/modules/expo-battery-info";

export interface BatteryReader {
  level(): number;
  charging(): Promise<boolean>;
}

export const nativeBattery: BatteryReader = {
  level: () => BatteryInfo.getLevel(),
  charging: () => BatteryInfo.isCharging(),
};
```

That one indirection makes the feature testable without a device and replaceable without touching call sites. It is the Adapter pattern — see [React Native Patterns](react-native-patterns.md).

---

## Examples

Consuming the module through a hook, with a stub for tests:

```ts
// src/shared/device/useBatteryLevel.ts
import { useEffect, useState } from "react";
import { AppState } from "react-native";
import type { BatteryReader } from "./battery";

export function useBatteryLevel(reader: BatteryReader) {
  const [level, setLevel] = useState(() => reader.level());

  useEffect(() => {
    const sub = AppState.addEventListener("change", (status) => {
      if (status === "active") setLevel(reader.level());
    });
    return () => sub.remove();
  }, [reader]);

  return level;
}
```

```ts
// In a test — no device, no native code
const fakeBattery: BatteryReader = {
  level: () => 0.42,
  charging: async () => false,
};
```

The hook takes the reader as a parameter, so the test supplies a fake and the app supplies the native one.

---

## When to use

- **Reach for an Expo or community module first.** Writing native code is the last option, not the first.
- **The Expo Modules API** when you do write one — it is substantially less code than a raw TurboModule.
- **`Function` (synchronous)** only for genuinely cheap reads. Anything doing I/O should be `AsyncFunction`, or it blocks the JS thread.
- **An adapter interface** in front of every native module.

## When NOT to use

- Do not write a native module to avoid learning an existing library's API.
- Do not follow guides that describe the bridge, `RCTBridgeModule`, or `NativeModules` with manual `NativeEventEmitter` wiring — that surface was removed in 0.84.
- Do not add a community library without checking New Architecture support. Unmaintained packages will not build.
- Do not expose a native module directly to components. Wrap it.
- Do not do heavy work in a synchronous `Function`. Synchronous here means it blocks JavaScript.

---

## References

- [About the New Architecture — React Native](https://reactnative.dev/architecture/landing-page)
- [Fabric renderer — React Native](https://reactnative.dev/architecture/fabric-renderer)
- [Native modules — React Native](https://reactnative.dev/docs/turbo-native-modules-introduction)
- [Expo Modules API — get started](https://docs.expo.dev/modules/get-started/)
- [Hermes — React Native](https://reactnative.dev/docs/hermes)
