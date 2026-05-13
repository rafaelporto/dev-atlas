# IDEs and Editors for Flutter

> VS Code and Android Studio are the two officially supported editors for Flutter — each with dedicated extensions, hot reload integration, and widget inspection tools.

---

## What is it?

Flutter is officially supported by two editors: **VS Code** (with the Flutter and Dart extensions) and **Android Studio / IntelliJ IDEA** (with the Flutter plugin). Both provide hot reload, a widget inspector, device management, and debugging. The choice between them depends on familiarity, the scope of native work, and resource constraints.

---

## Why does it matter?

The Flutter tooling experience is tightly integrated into the editor. Hot reload, the widget inspector, and the performance overlay are all surfaced through IDE commands — not just the terminal. Choosing an editor that fits your workflow reduces friction and speeds up the development loop.

---

## How it works

### VS Code

**Setup:**

1. Install [VS Code](https://code.visualstudio.com/)
2. Install the [Flutter extension](https://marketplace.visualstudio.com/items?itemName=Dart-Code.flutter) (the Dart extension is bundled automatically)

**Key features:**

| Feature | How to access |
|---|---|
| Hot reload | Save a file (`Cmd+S` / `Ctrl+S`) or click the flame icon in the debug toolbar |
| Hot restart | `Cmd+Shift+F5` / `Ctrl+Shift+F5` |
| Widget inspector | Open from the Flutter sidebar panel while a debug session is running |
| Device picker | Status bar (bottom) — click the current device name |
| Run / debug | `F5` or the Run and Debug panel |
| New Flutter project | Command Palette: `Flutter: New Project` |
| dart fix --apply | Command Palette: `Dart: Apply All Fixes` |
| Pub get | Command Palette: `Flutter: Get Packages` |

**Recommended extensions:**

| Extension | Purpose |
|---|---|
| Flutter (Dart-Code) | Core Flutter and Dart support |
| Pubspec Assist | Quick pub.dev package search from the editor |
| Error Lens | Inline error and warning highlighting |
| GitLens | Enhanced git history and blame |

**`.vscode/launch.json` for multiple entry points:**

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Development",
      "request": "launch",
      "type": "dart",
      "program": "lib/main_dev.dart",
      "args": ["--flavor", "development"]
    },
    {
      "name": "Production",
      "request": "launch",
      "type": "dart",
      "program": "lib/main_prod.dart",
      "args": ["--flavor", "production"]
    }
  ]
}
```

---

### Android Studio / IntelliJ IDEA

**Setup:**

1. Install [Android Studio](https://developer.android.com/studio)
2. Go to **Preferences → Plugins** and install the **Flutter** plugin (the Dart plugin is installed automatically)

**Key features:**

| Feature | How to access |
|---|---|
| Hot reload | Click the lightning bolt icon in the toolbar |
| Hot restart | Click the restart icon next to hot reload |
| Widget inspector | View → Tool Windows → Flutter Inspector |
| Layout explorer | Inside Flutter Inspector — visualises layout constraints |
| Performance overlay | Flutter Inspector → Performance |
| AVD Manager | Tools → Device Manager |
| Logcat | View → Tool Windows → Logcat |

**Advantages over VS Code:**

- Built-in Android AVD Manager and emulator integration
- Built-in Logcat for Android-specific logging
- Layout Explorer with constraint visualisation
- Stronger native (Java/Kotlin) editing when working on platform channels

---

## Comparison

| | VS Code | Android Studio |
|---|---|---|
| **Performance** | Lightweight, fast startup | Heavier, higher memory usage |
| **Flutter features** | Full feature parity | Full feature parity |
| **Native Android dev** | Limited | Full (Logcat, AVD, Gradle) |
| **Native iOS dev** | Limited | Limited (requires Xcode either way) |
| **Layout Explorer** | Not available | Available |
| **Customisability** | High (extensions ecosystem) | Moderate |
| **Learning curve** | Low (if already using VS Code) | Moderate |

---

## When to use

- Use **VS Code** if you prefer a lightweight editor, work primarily on the Dart layer, or already use VS Code for other languages.
- Use **Android Studio** if you need to work frequently on Android-specific native code, debug with Logcat, or use the Layout Explorer for complex layout analysis.

---

## When NOT to use

- Do not use Android Studio on a machine with less than 8 GB RAM — it will be noticeably sluggish.
- Do not use VS Code for debugging deep Android-native issues (JNI, Gradle, Logcat) — Android Studio's tooling is significantly better for that.

---

## References

- [Set up an editor — docs.flutter.dev](https://docs.flutter.dev/get-started/editor)
- [Flutter extension for VS Code — marketplace.visualstudio.com](https://marketplace.visualstudio.com/items?itemName=Dart-Code.flutter)
- [Flutter plugin for Android Studio — plugins.jetbrains.com](https://plugins.jetbrains.com/plugin/9212-flutter)
- [Flutter DevTools — docs.flutter.dev](https://docs.flutter.dev/tools/devtools/overview)
