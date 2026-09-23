---
type: concept
tags:
  - language
  - react-native
  - react
  - typescript
  - mobile
related:
  - languages/react-native/toolchain
  - languages/react-native/installation
  - languages/react-native/performance
language: "react-native"
---
# IDEs and Editors

> VS Code for the TypeScript, Xcode and Android Studio for the native side, and React Native DevTools for anything happening at runtime.

---

## What is it?

React Native development spans three editors. Day-to-day work happens in a JavaScript editor — VS Code, Cursor, or Zed. Native builds, signing, and device logs go through Xcode and Android Studio. Runtime inspection happens in React Native DevTools, which is not an editor but is where debugging actually takes place.

---

## Why does it matter?

The common mistake is trying to do everything in one place. Debugging a build failure from inside VS Code means reading a truncated Gradle log; Xcode shows the actual error. Conversely, editing TypeScript in Android Studio wastes the JavaScript tooling entirely.

Knowing which tool owns which problem removes a lot of wasted time.

---

## How it works

### VS Code

The default choice, and where most of the work happens.

| Extension | What it gives you |
|---|---|
| **ESLint** | Inline lint errors and fix-on-save |
| **Prettier** or **Biome** | Formatting on save |
| **Expo Tools** | `app.json` validation, config autocomplete, EAS integration |
| **React Native Tools** | Command palette entries, log viewing |
| **Error Lens** | Diagnostics inline rather than only on hover |

A workspace configuration worth committing:

```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": { "source.fixAll.eslint": "explicit" },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "search.exclude": {
    "**/node_modules": true,
    "**/ios/Pods": true,
    "**/android/build": true,
    "**/.expo": true
  }
}
```

`typescript.tsdk` matters: without it the editor may use its bundled TypeScript rather than the project's, and report different errors than `tsc --noEmit`. Excluding `ios/Pods` and `android/build` from search removes tens of thousands of irrelevant results.

**Cursor** and **Zed** are drop-in alternatives — both use the same TypeScript language server and the same ESLint configuration.

### Xcode

Needed for building, signing, and debugging the iOS side. Reach for it when:

- A build fails and the Metro output is not enough. Xcode shows the real compiler error.
- Signing or provisioning needs inspecting.
- Native crash logs need symbolicating.
- **Instruments** is needed for native-level profiling — memory, energy, time.

```bash
open ios/MyApp.xcworkspace   # the workspace, never the .xcodeproj
```

Opening the `.xcodeproj` skips CocoaPods dependencies and the build will fail.

### Android Studio

The Android equivalent:

- **Logcat** for device logs, including native crashes that never reach the JavaScript console.
- **Device Manager** for emulators.
- **Layout Inspector** for the real native view hierarchy.
- **Profiler** for CPU, memory, and energy.

You can open just the `android/` directory rather than the whole project.

### React Native DevTools

The runtime debugger, built in since 0.76:

```bash
npx expo start
# press j
```

It attaches directly to Hermes and provides:

- **Console** — the app's logs.
- **Sources** — breakpoints in TypeScript, via source maps.
- **Network** — request inspection.
- **Components** — the React tree with props and state.
- **Profiler** — commit timeline and render reasons; see [Performance](performance.md).

This replaced remote debugging in Chrome, which ran JavaScript in the browser's engine and therefore did not reflect real behaviour. Guides that describe "Debug JS Remotely" are out of date.

### Which tool for which problem

| Problem | Tool |
|---|---|
| Type error, lint error | VS Code |
| Component re-rendering too often | DevTools — Profiler |
| Network request failing | DevTools — Network |
| iOS build fails | Xcode |
| Android build fails | Android Studio, or `./gradlew` output |
| App crashes with no JS error | Xcode console or Logcat |
| Native memory growth | Instruments or Android Studio Profiler |
| Signing or provisioning | Xcode, or `eas credentials` |

---

## Examples

A committed `.vscode/extensions.json`, so a new contributor gets the right setup on first open:

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "expo.vscode-expo-tools",
    "msjsdiag.vscode-react-native"
  ]
}
```

A launch configuration for breakpoints in the editor rather than in DevTools:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Attach to Hermes",
      "type": "reactnativedirect",
      "request": "attach",
      "cwd": "${workspaceFolder}"
    }
  ]
}
```

Reading native logs when the JavaScript console shows nothing:

```bash
npx react-native log-ios
npx react-native log-android

# or directly
xcrun simctl spawn booted log stream --predicate 'processImagePath CONTAINS "MyApp"'
adb logcat *:E
```

A native crash — a missing permission string, a null pointer in a module — frequently produces no JavaScript error at all. These logs are the only place it appears.

---

## When to use

- **VS Code, Cursor, or Zed** for all TypeScript work.
- **Committed workspace settings and extension recommendations**, so the whole team gets identical lint and format behaviour.
- **`typescript.tsdk` pointed at the project's TypeScript**, so the editor and CI agree.
- **Xcode and Android Studio** for build failures, signing, native crashes, and native profiling.
- **React Native DevTools** for everything at runtime — it is the default debugger now.

## When NOT to use

- Do not debug JavaScript in Xcode or Android Studio. They show the native side; DevTools shows yours.
- Do not open `ios/MyApp.xcodeproj`. Open the `.xcworkspace`.
- Do not edit files under `ios/` or `android/` in a managed Expo project — `prebuild` regenerates them. Use a config plugin instead.
- Do not use "Debug JS Remotely". It was removed; DevTools replaced it.
- Do not commit `.vscode/settings.json` entries that are personal preference. Keep shared configuration — formatting, lint, TypeScript — and leave themes and keybindings out.

---

## References

- [Debugging — React Native](https://reactnative.dev/docs/debugging)
- [React Native DevTools](https://reactnative.dev/docs/react-native-devtools)
- [Development tools — Expo](https://docs.expo.dev/debugging/tools/)
- [Expo Tools for VS Code](https://marketplace.visualstudio.com/items?itemName=expo.vscode-expo-tools)
