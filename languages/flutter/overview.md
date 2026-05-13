# Flutter Overview

> Flutter is Google's open-source UI toolkit for building natively compiled applications for mobile, web, and desktop from a single Dart codebase.

---

## What is it?

Flutter is a UI framework created by Google, first released in 2018, that lets developers build apps for Android, iOS, web, macOS, Windows, and Linux from a single codebase. Unlike frameworks that wrap native components (React Native, Xamarin), Flutter owns its own rendering pipeline: it draws every pixel itself using the Skia (legacy) or Impeller (default since Flutter 3.10) graphics engine. This means the UI looks and behaves identically on every platform.

---

## Why does it matter?

Flutter eliminates the traditional trade-off between native performance and cross-platform productivity. Before Flutter, teams either maintained separate native codebases per platform (maximum performance, maximum cost) or accepted the performance and fidelity gaps of hybrid frameworks (lower cost, noticeable trade-offs).

Flutter's model delivers:

- **Native performance**: Dart compiles to native ARM or x86 machine code via AOT. There is no JavaScript bridge.
- **Pixel-perfect consistency**: the same widget renders identically on Android, iOS, and the web.
- **Fast development loop**: hot reload applies UI changes in milliseconds without losing state.
- **Single codebase**: one team, one language, one set of tests for all platforms.

---

## What can you build with Flutter?

| Platform | Status |
|---|---|
| Android | Stable |
| iOS | Stable |
| Web (Canvas/HTML renderer) | Stable |
| macOS | Stable |
| Windows | Stable |
| Linux | Stable |
| Embedded / custom devices | Experimental |

---

## How Flutter renders

Most cross-platform frameworks delegate rendering to the host platform's UI components. Flutter does not:

```
Flutter App
    │
    ▼
Flutter Engine (C++)
    │  Dart code → AOT native binary
    │  Widget tree → Element tree → RenderObject tree
    │  Layout, paint, compositing
    ▼
Impeller / Skia (GPU-accelerated rendering)
    │
    ▼
Platform window (Android SurfaceView, iOS CAMetalLayer, etc.)
```

The platform provides only a surface (a canvas) and input events. Flutter handles everything else — layout, painting, gestures, text, animation — itself.

---

## Key highlights

**Hot reload**
Changes to Dart code are injected into the running app in under a second, preserving the current navigation state. Hot restart re-runs `main()` from scratch but is still faster than a full rebuild.

**Widget composition**
Everything visible is a widget. Complex UIs are built by composing small, single-responsibility widgets — not by inheriting from a base component.

**Material and Cupertino design systems**
Flutter ships built-in implementations of Google's Material Design and Apple's Cupertino (iOS) design systems, including full theming support.

**DevTools**
The Flutter DevTools suite (accessible from the browser during debug sessions) includes a widget inspector, performance profiler, memory profiler, network inspector, and CPU profiler.

**Platform channels**
When Flutter's Dart API does not cover a platform feature (Bluetooth, NFC, camera), platform channels provide a typed message-passing bridge between Dart and native Kotlin/Swift code.

---

## Ecosystem highlights

| Area | Notable packages |
|---|---|
| State management | `riverpod`, `flutter_bloc`, `provider` |
| Navigation | `go_router`, `auto_route` |
| HTTP | `dio`, `http` |
| Local storage | `shared_preferences`, `drift`, `isar`, `sqflite` |
| DI | `get_it`, `injectable` |
| Serialisation | `json_serializable`, `freezed` |
| UI components | `flutter_svg`, `cached_network_image`, `shimmer` |
| Testing | `flutter_test` (stdlib), `mocktail`, `patrol` |

---

## Design decisions worth knowing

**Everything is a widget** — layout primitives (`Padding`, `Row`, `Column`), gestures (`GestureDetector`), animations (`AnimatedContainer`), and even state management wrappers (`Consumer`, `BlocBuilder`) are all widgets.

**Immutable widgets, mutable elements** — a `Widget` is an immutable description. The framework owns the `Element` tree (the live instance tree) and reconciles it efficiently when widgets are rebuilt.

**`BuildContext` is a tree handle** — every widget's `build` method receives a `BuildContext` that represents its location in the element tree. It is the mechanism for dependency lookup (`of(context)`) and for reading inherited data.

**No reflection** — Flutter relies on code generation (via `build_runner`) for JSON serialisation and DI because Dart's AOT compilation does not support runtime reflection.

---

## References

- [Flutter documentation — docs.flutter.dev](https://docs.flutter.dev)
- [Flutter architectural overview — docs.flutter.dev](https://docs.flutter.dev/resources/architectural-overview)
- [Impeller rendering engine — docs.flutter.dev](https://docs.flutter.dev/perf/impeller)
- [Flutter DevTools — docs.flutter.dev](https://docs.flutter.dev/tools/devtools/overview)
- [pub.dev — Flutter packages](https://pub.dev/flutter)
