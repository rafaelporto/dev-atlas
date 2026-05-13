# Installing Flutter

> How to install the Flutter SDK, configure the Android and iOS toolchains, and verify your setup with `flutter doctor`.

---

## Prerequisites

- macOS, Linux, or Windows (64-bit)
- Git installed
- 2.8 GB of free disk space (minimum; Android toolchain requires more)
- For iOS builds: a Mac with Xcode installed
- For Android builds: Android Studio or the Android command-line tools

---

## Steps

### 1. Download the Flutter SDK

Download the latest stable release from [docs.flutter.dev/get-started/install](https://docs.flutter.dev/get-started/install) and select your operating system.

**macOS (via Homebrew — recommended):**

```bash
brew install --cask flutter
```

**Manual installation (all platforms):**

Extract the downloaded archive to a permanent location (e.g., `~/development/flutter`) and add the `bin` directory to `PATH`.

```bash
# Add to ~/.zshrc or ~/.bashrc
export PATH="$HOME/development/flutter/bin:$PATH"
```

Reload the shell:

```bash
source ~/.zshrc
```

---

### 2. Run flutter doctor

`flutter doctor` inspects the environment and reports what is missing or misconfigured:

```bash
flutter doctor
```

Work through each item flagged with `[✗]` or `[!]` before proceeding.

---

### 3. Configure the Android toolchain

**Install Android Studio:**

Download from [developer.android.com/studio](https://developer.android.com/studio). During setup, install the Android SDK, Android SDK Command-line Tools, and at least one SDK platform (API 34 or later is recommended).

**Accept Android licenses:**

```bash
flutter doctor --android-licenses
```

Answer `y` to all prompts.

**Create an Android Virtual Device (emulator):**

Open Android Studio → Device Manager → Create Device. Select a phone profile (e.g., Pixel 8) and a system image (API 34, x86_64).

---

### 4. Configure the iOS toolchain (macOS only)

**Install Xcode from the Mac App Store:**

After installation, accept the license and install command-line tools:

```bash
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -runFirstLaunch
```

**Install CocoaPods:**

```bash
sudo gem install cocoapods
```

**Open the iOS Simulator:**

```bash
open -a Simulator
```

---

### 5. Install VS Code or Android Studio Flutter extension

**VS Code:** Install the [Flutter extension](https://marketplace.visualstudio.com/items?itemName=Dart-Code.flutter) from the extensions marketplace. It bundles the Dart extension automatically.

**Android Studio / IntelliJ:** Install the Flutter plugin via **Preferences → Plugins → Flutter**.

---

## Verification

```bash
flutter doctor -v        # verbose output, all checks
flutter --version        # Flutter 3.x.x, Dart 3.x.x
flutter devices          # list connected devices and emulators
```

Create and run a test project:

```bash
flutter create /tmp/hello_flutter
cd /tmp/hello_flutter
flutter run              # launches on the first available device
```

---

## Common issues

| Symptom | Likely cause | Fix |
|---|---|---|
| `flutter: command not found` | SDK not on `PATH` | Add `flutter/bin` to `PATH` and reload shell |
| `Android license status unknown` | Licenses not accepted | Run `flutter doctor --android-licenses` |
| `CocoaPods not installed` | Missing gem | Run `sudo gem install cocoapods` |
| `Unable to locate Android SDK` | `ANDROID_HOME` not set | Set `ANDROID_HOME` or configure in Android Studio |
| `Xcode not found` | Xcode not installed or path wrong | Install Xcode and run `sudo xcode-select --switch /Applications/Xcode.app/...` |
| `No connected devices` | No emulator running | Start an AVD in Android Studio or run `open -a Simulator` for iOS |

---

## References

- [Install Flutter — docs.flutter.dev](https://docs.flutter.dev/get-started/install)
- [flutter doctor — docs.flutter.dev](https://docs.flutter.dev/reference/flutter-cli#flutter-doctor)
- [Android Studio setup — developer.android.com](https://developer.android.com/studio)
- [Xcode setup — developer.apple.com](https://developer.apple.com/xcode/)
