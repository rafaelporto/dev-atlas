# Flutter Project Setup

> How to create, structure, and configure a Flutter project using `flutter create` and standard conventions.

---

## Prerequisites

- Flutter SDK installed (see [Installation](installation.md))
- At least one device or emulator available (`flutter devices`)

---

## Steps

### 1. Create a new project

```bash
flutter create my_app                        # default (Material, Dart)
flutter create --org com.example my_app      # set the bundle/package ID prefix
flutter create --platforms android,ios my_app  # target specific platforms
flutter create --template=plugin my_plugin   # Flutter plugin (Dart + native)
flutter create --template=package my_pkg     # pure-Dart package
```

---

### 2. Understand the project structure

```
my_app/
├── pubspec.yaml              # dependencies, assets, fonts
├── pubspec.lock
├── analysis_options.yaml     # linting config
├── lib/
│   └── main.dart             # app entry point
├── test/
│   └── widget_test.dart
├── android/                  # Android-specific project files
├── ios/                      # iOS-specific Xcode project
├── web/                      # Web target (generated if included)
├── macos/                    # macOS target
├── linux/                    # Linux target
└── windows/                  # Windows target
```

The `lib/` directory holds all Dart code. Everything outside `lib/` is platform-specific glue.

---

### 3. Organise lib/ by feature or layer

For small projects, a flat `lib/` structure is fine. For anything non-trivial, organise by feature:

```
lib/
├── main.dart
├── app.dart                  # MaterialApp / root widget
└── features/
    ├── auth/
    │   ├── data/
    │   ├── domain/
    │   └── presentation/
    └── home/
        ├── data/
        ├── domain/
        └── presentation/
```

Or organise by layer (simpler, works for small apps):

```
lib/
├── main.dart
├── models/
├── services/
├── repositories/
└── ui/
    ├── screens/
    └── widgets/
```

---

### 4. Configure pubspec.yaml

```yaml
name: my_app
description: A Flutter application.
version: 1.0.0+1          # version+buildNumber (semver+integer)

environment:
  sdk: '>=3.0.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter            # always present — Flutter SDK dependency
  go_router: ^14.0.0
  riverpod: ^2.5.0

dev_dependencies:
  flutter_test:
    sdk: flutter            # always present — test framework
  flutter_lints: ^4.0.0
  build_runner: ^2.4.0

flutter:
  uses-material-design: true

  assets:
    - assets/images/
    - assets/icons/

  fonts:
    - family: Roboto
      fonts:
        - asset: assets/fonts/Roboto-Regular.ttf
        - asset: assets/fonts/Roboto-Bold.ttf
          weight: 700
```

---

### 5. Add assets and fonts

Place assets in a top-level `assets/` directory (or any path declared in `pubspec.yaml`):

```
assets/
├── images/
│   └── logo.png
└── icons/
    └── app_icon.png
```

Access assets in code:

```dart
Image.asset('assets/images/logo.png')
AssetImage('assets/images/logo.png')
```

---

### 6. Configure app flavors (optional)

Flavors allow building different variants of the same app (development, staging, production) from a single codebase. They require platform-specific configuration:

- **Android**: product flavors in `android/app/build.gradle`
- **iOS**: schemes and configurations in Xcode

A common Dart-side pattern uses an entry point per flavor:

```
lib/
├── main_dev.dart
├── main_staging.dart
└── main_prod.dart
```

Run a specific flavor:

```bash
flutter run --flavor development -t lib/main_dev.dart
```

---

## Verification

```bash
flutter pub get             # fetch dependencies
flutter analyze             # static analysis — no issues expected on a new project
flutter test                # run tests — widget_test.dart should pass
flutter run                 # launch on the first available device
```

---

## Common issues

| Symptom | Likely cause | Fix |
|---|---|---|
| Asset not found at runtime | Path not declared in `pubspec.yaml` | Add the path under `flutter: assets:` |
| `version` field format error | Wrong version string | Use `major.minor.patch+buildNumber` (e.g., `1.0.0+1`) |
| `pub get` fails on iOS | CocoaPods not installed | Run `sudo gem install cocoapods` |
| `flutter run` shows multiple devices | More than one device connected | Specify with `flutter run -d <device-id>` |

---

## References

- [Test drive — docs.flutter.dev](https://docs.flutter.dev/get-started/test-drive)
- [Flutter project structure — docs.flutter.dev](https://docs.flutter.dev/tools/pubspec)
- [Adding assets and images — docs.flutter.dev](https://docs.flutter.dev/ui/assets/assets-and-images)
- [Flutter flavors — docs.flutter.dev](https://docs.flutter.dev/deployment/flavors)
