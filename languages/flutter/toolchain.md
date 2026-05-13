# Flutter Toolchain

> The `flutter` CLI is the single entry point for running, building, testing, analysing, and managing dependencies in a Flutter project.

---

## What is it?

The Flutter SDK ships with the `flutter` CLI that orchestrates the full development workflow: launching the app on a device, running tests, building release binaries, analysing code, and managing packages. Most commands internally delegate to Dart's toolchain (`dart analyze`, `dart pub`) but add Flutter-specific context (platform targets, assets, native builds).

---

## Why does it matter?

Understanding the CLI is essential for both local development and CI/CD pipelines. Every release build, every test run, and every static analysis check in automation goes through `flutter` commands.

---

## How it works

The `flutter` command is a dispatcher:

```
flutter
├── run          — launch the app on a connected device or emulator
├── build        — compile a release binary (apk, appbundle, ios, web, macos, …)
├── test         — run unit and widget tests
├── analyze      — static analysis (delegates to dart analyze)
├── format       — code formatting (delegates to dart format)
├── pub          — package management (delegates to dart pub)
├── doctor       — check the development environment
├── devices      — list connected devices and emulators
├── emulators    — list and launch Android emulators
├── clean        — delete build/ and .dart_tool/
├── upgrade      — upgrade Flutter to the latest version on the current channel
└── channel      — switch between stable, beta, and master channels
```

---

## Examples

### Run the app

```bash
flutter run                          # launch on the first available device
flutter run -d <device-id>           # specify a device (from flutter devices)
flutter run --flavor development \
  -t lib/main_dev.dart               # run a specific flavor/entry point
flutter run --release                # run the release build on the device
flutter run --profile                # run with profiling enabled
```

During a debug session, the terminal accepts single-key commands:
- `r` — hot reload
- `R` — hot restart
- `q` — quit
- `p` — toggle the performance overlay
- `P` — toggle the widget size overlay

### Build

```bash
# Android
flutter build apk                    # debug APK
flutter build apk --release          # release APK (signed)
flutter build appbundle --release    # Android App Bundle (for Play Store)

# iOS
flutter build ios --release          # requires a Mac with Xcode
flutter build ipa --release          # .ipa archive for App Store distribution

# Web
flutter build web --release

# macOS / Windows / Linux
flutter build macos --release
flutter build windows --release
flutter build linux --release
```

### Analyze

```bash
flutter analyze                      # static analysis for the whole project
flutter analyze --fatal-infos        # treat hints as errors (stricter CI mode)
```

### Format

```bash
flutter format .                     # format all Dart files
flutter format --set-exit-if-changed . # fail in CI if files are unformatted
```

### Test

```bash
flutter test                         # all unit and widget tests in test/
flutter test test/widgets/           # specific directory
flutter test --coverage              # collect coverage data into coverage/lcov.info
flutter test --update-goldens        # regenerate golden screenshot baselines
```

### Package management

```bash
flutter pub get                      # fetch declared dependencies
flutter pub upgrade                  # upgrade to latest allowed versions
flutter pub outdated                 # show packages with newer versions available
flutter pub add riverpod             # add a dependency
```

### Utilities

```bash
flutter doctor -v                    # verbose environment check
flutter devices                      # list connected devices
flutter emulators --launch <name>    # start an Android emulator by name
flutter clean                        # wipe build artifacts (fixes many cache issues)
flutter upgrade                      # upgrade Flutter SDK
flutter channel stable               # switch to the stable channel
```

---

## When to use

- Use `flutter clean` when builds fail for unclear reasons — it clears stale native build artifacts.
- Use `flutter build appbundle` (not `apk`) for Play Store submissions — App Bundle allows Google to deliver optimised APKs per device.
- Use `flutter analyze --fatal-infos` in CI to enforce code quality gates.
- Use `flutter run --profile` when measuring performance — the debug build disables AOT and skews profiling results.

---

## When NOT to use

- Do not use `flutter run --release` for everyday development — you lose hot reload and debugging tools.
- Do not skip `flutter doctor` when setting up a new machine or CI runner — it catches toolchain misconfigurations early.
- Do not commit the `build/` directory — add it to `.gitignore` (the default template already does this).

---

## References

- [Flutter CLI reference — docs.flutter.dev](https://docs.flutter.dev/reference/flutter-cli)
- [Build and release Android — docs.flutter.dev](https://docs.flutter.dev/deployment/android)
- [Build and release iOS — docs.flutter.dev](https://docs.flutter.dev/deployment/ios)
- [Flutter test — docs.flutter.dev](https://docs.flutter.dev/testing/overview)
