---
type: how-to
tags:
  - language
  - react-native
  - react
  - typescript
  - mobile
related:
  - languages/react-native/overview
  - languages/react-native/project-setup
  - languages/react-native/toolchain
  - languages/react-native/ides
language: "react-native"
---
# Installing React Native

> Set up Node, the iOS and Android toolchains, and create your first project with Expo — or with the Community CLI if you need a bare app.

---

## Prerequisites

- **macOS** to build for iOS. Android builds work on macOS, Linux, and Windows. Commands below assume macOS; platform differences are noted where they matter.
- **Node.js 20 LTS or newer**. Check with `node --version`.
- Roughly **20 GB of free disk space** — Xcode and Android Studio are large.
- An Apple ID if you intend to run on a physical iPhone.

---

## Steps

### 1. Install Node and a package manager

Use a version manager rather than a system-wide install, so each project can pin its runtime.

```bash
# nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
nvm install --lts
nvm use --lts

# or Homebrew
brew install node
```

Any of npm, pnpm, yarn, or bun works. The examples here use npm.

### 2. Create the project

The official documentation recommends starting with a framework. Expo is the framework it names.

```bash
npx create-expo-app@latest MyApp
cd MyApp
```

This gives you TypeScript, Expo Router, and a working project with no native folders to manage.

If your app has constraints a framework does not serve — you need full control of the native projects from day one — use the Community CLI instead:

```bash
npx @react-native-community/cli init MyApp
cd MyApp
```

You can also start with Expo and generate native folders later with `npx expo prebuild`, which is usually the better order.

### 3. Run it without any native toolchain

Before installing Xcode or Android Studio, confirm the project runs. Install **Expo Go** on a physical device from the App Store or Play Store, then:

```bash
npx expo start
```

Scan the QR code with the device camera (iOS) or the Expo Go app (Android). This path skips native builds entirely and is the fastest way to verify the install.

### 4. Set up the iOS toolchain

Install Xcode from the Mac App Store, then:

```bash
# Point the command-line tools at the full Xcode install
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -runFirstLaunch

# Accept the licence
sudo xcodebuild -license accept

# CocoaPods — dependency manager for the iOS project
brew install cocoapods
```

Open Xcode once and install an iOS Simulator runtime under **Settings → Components**.

### 5. Set up the Android toolchain

Install [Android Studio](https://developer.android.com/studio). During setup, make sure these are selected:

- Android SDK
- Android SDK Platform
- Android Virtual Device

Then set the environment variables in your shell profile:

```bash
# ~/.zshrc
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$PATH:$ANDROID_HOME/emulator"
export PATH="$PATH:$ANDROID_HOME/platform-tools"
```

React Native requires **JDK 17**:

```bash
brew install --cask zulu@17
```

Create a virtual device in Android Studio under **Device Manager**.

### 6. Build and run natively

```bash
npx expo run:ios
npx expo run:android
```

The first run generates the `ios/` and `android/` directories and compiles the native app — expect several minutes. Subsequent runs are much faster.

With the Community CLI the equivalents are `npx react-native run-ios` and `npx react-native run-android`.

---

## Verification

Run the built-in diagnostic:

```bash
npx expo-doctor
```

A healthy project reports all checks passing:

```
15/15 checks passed. No issues detected!
```

Then confirm both platforms build and launch:

```bash
npx expo run:ios       # Simulator opens with the app running
npx expo run:android   # Emulator opens with the app running
```

Edit a string in `app/index.tsx` and save — the change should appear immediately via Fast Refresh.

---

## Common issues

| Symptom | Likely cause | Fix |
|---|---|---|
| `xcrun: error: unable to find utility "simctl"` | Command-line tools point at the stub, not Xcode | `sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer` |
| `SDK location not found` | `ANDROID_HOME` unset or shell not reloaded | Set it in `~/.zshrc`, then `source ~/.zshrc` |
| `Unsupported class file major version` | Wrong JDK — usually 21 or 23 instead of 17 | Install JDK 17 and set `JAVA_HOME` to it |
| Metro serves stale code after a dependency change | Cached bundle | `npx expo start --clear` |
| `CocoaPods could not find compatible versions` | Outdated local pod spec repo | `pod repo update` inside `ios/`, then rebuild |
| Device cannot reach the dev server over Wi-Fi | Device and host on different networks, or firewall | Use `npx expo start --tunnel` |
| `expo-doctor` flags mismatched package versions | Packages installed with `npm install` instead of `expo install` | `npx expo install --fix` |

---

## References

- [Get Started with React Native](https://reactnative.dev/docs/environment-setup)
- [Set up your environment — React Native](https://reactnative.dev/docs/set-up-your-environment)
- [Create a project — Expo](https://docs.expo.dev/get-started/create-a-project/)
- [Set up your environment — Expo](https://docs.expo.dev/get-started/set-up-your-environment/)
