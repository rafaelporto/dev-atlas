---
type: concept
tags:
  - tool
  - ide
  - flutter
  - mobile
related:
  - tools/ides/overview
  - languages/flutter/overview
language: null
---
# Android Studio

> Google's official IDE for Android development, built on IntelliJ, and a first-class environment for Flutter as well.

---

## What is it?

Android Studio is the official IDE for building Android apps, developed by Google on top of the IntelliJ platform. It bundles the Android SDK tooling, the Gradle build system, an emulator, device management, and specialized tools for layouts, resources, and performance profiling. With the Flutter and Dart plugins, it is also a fully supported environment for [Flutter](../../languages/flutter/overview.md) app development.

It is the IntelliJ platform specialized for mobile: the same editing and refactoring core, plus Android- and Flutter-specific tooling that general editors don't include.

## Why does it matter?

For native Android (Kotlin/Java) work, Android Studio is effectively required — it is where Google ships SDK updates, the emulator, and profiling tools, and where new platform features land first. For [Flutter](../../languages/flutter/overview.md), it is one of the two primary options (alongside [VS Code](vscode.md)); it is the heavier choice but gives integrated access to the Android emulator, device manager, and Gradle configuration in one place.

Its profilers (CPU, memory, network, energy) and the layout inspector are tools that lightweight editors don't replicate, which matters when diagnosing performance or UI issues on a device.

## How it works

Android Studio builds on IntelliJ's semantic index and adds the Android toolchain: **Gradle** drives builds, the **Android SDK** provides platform APIs and build tools, and an **AVD (Android Virtual Device)** emulator runs apps. For Flutter, the Flutter/Dart plugins add hot reload, a widget inspector, and Dart analysis.

```
Android Studio (IntelliJ platform)
├── Android SDK + build tools
├── Gradle build system
├── Emulator (AVD) + physical device support
├── Profilers (CPU, memory, network) + Layout Inspector
└── Plugins: Flutter + Dart (hot reload, widget inspector)
```

Because it uses Gradle and the standard SDK, builds match those produced on the command line and in CI.

**Complexity level: Medium.** Approachable, but the Android toolchain (SDK, Gradle, emulators, signing) has real surface area, and initial Gradle syncs are slow.

## Getting Started

Install Android Studio, then add the Flutter/Dart plugins if targeting Flutter:

```bash
# macOS
brew install --cask android-studio

# then, inside the IDE:
# Settings → Plugins → install "Flutter" (pulls in "Dart")
```

On first run, the setup wizard installs the SDK and creates an emulator. For Flutter, run `flutter doctor` in a terminal to confirm the toolchain is complete.

| Symptom | Likely cause | Fix |
|---|---|---|
| Gradle sync fails | SDK/build-tools version mismatch | Open **SDK Manager**, install the required versions; sync again |
| Emulator won't start | Hardware acceleration missing/disabled | Enable virtualization; on Apple Silicon use an arm64 system image |
| Flutter options absent | Flutter/Dart plugins not installed | Install both plugins and restart |
| `flutter doctor` reports issues | Toolchain incomplete (licenses, cmdline-tools) | Follow each item; run `flutter doctor --android-licenses` |

## Examples

Android Studio configuration is largely UI- and Gradle-driven. The shared, committed artefacts are the project's Gradle files; a run configuration for Flutter can also be stored under `.idea/`. A minimal Flutter run is just:

```bash
# from the project root, with a device/emulator running
flutter run
```

SDK versions, signing configs, and build variants live in the Gradle files (`build.gradle` / `build.gradle.kts`), documented by Android's own guides rather than reproduced here.

## When to use

- Native Android development in Kotlin or Java — the official, expected environment.
- Flutter development when you want integrated emulator, device management, and profilers.
- Diagnosing performance or layout issues that need the built-in profilers and inspector.

## When NOT to use

- Lightweight Flutter editing where [VS Code](vscode.md) with the Flutter extension starts faster and feels lighter.
- Non-mobile work — it is heavier than a general editor and adds no benefit outside mobile.
- Very constrained machines, given the SDK, emulator, and Gradle footprint.

## References

- [Android Studio documentation](https://developer.android.com/studio/intro)
- [Flutter — editor setup](https://docs.flutter.dev/tools/android-studio)
