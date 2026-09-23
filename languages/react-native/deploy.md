---
type: how-to
tags:
  - language
  - react-native
  - react
  - typescript
  - mobile
  - ci-cd
related:
  - languages/react-native/toolchain
  - languages/react-native/project-setup
  - languages/react-native/testing
  - languages/flutter/deploy
language: "react-native"
---
# Deploying React Native Apps

> Build with EAS or locally, distribute internally for testing, submit to both stores, and ship JavaScript-only fixes over the air without a review cycle.

---

## Prerequisites

- A project that runs on both platforms — see [Installing React Native](installation.md).
- An **Apple Developer Program** membership for the App Store, and a **Google Play Developer** account for Play.
- `npx expo-doctor` reporting all checks passing.
- Build profiles defined in `eas.json` — see [Project Setup](project-setup.md).

---

## Steps

### 1. Choose where builds run

**EAS Build** compiles in Expo's cloud. It handles signing credentials, needs no local Xcode or Android SDK, and can build iOS from a Linux machine or from CI.

**Local builds** use `expo prebuild` plus Xcode and Gradle directly. No external service, no cost beyond the developer accounts, but you manage credentials and the machines yourself.

```bash
npm install --global eas-cli
eas login
eas build:configure
```

EAS has a free tier with a monthly build allowance; beyond that it is a paid service. Local builds remain fully supported, and the rest of these steps note the equivalent where it differs.

### 2. Build for internal testing first

```bash
eas build --profile development --platform all
```

A development build includes the dev client, so it behaves like a release build while still supporting Fast Refresh and DevTools. Unlike Expo Go, it contains your actual native dependencies — which is why any app with a custom native module needs one.

For a release candidate:

```bash
eas build --profile staging --platform all
```

Locally, the equivalents are:

```bash
npx expo prebuild --clean
npx expo run:ios --configuration Release
cd android && ./gradlew assembleRelease
```

### 3. Set up signing

EAS generates and stores credentials on first build:

```bash
eas credentials
```

For iOS it manages the distribution certificate and provisioning profiles. For Android it generates an upload keystore.

**Back up the Android keystore.** Google Play ties an app to its upload key; losing it without Play App Signing enrolment means you cannot update the app at all.

```bash
eas credentials --platform android
# Select: download the keystore, store it somewhere safe
```

### 4. Build for production

```bash
eas build --profile production --platform all
```

This produces an `.ipa` for iOS and an `.aab` for Android. Bump the version first:

```ts
// app.config.ts
export default {
  version: "1.4.0",          // user-visible
  ios: { buildNumber: "42" },  // must increase on every upload
  android: { versionCode: 42 },
};
```

Or let EAS manage the build numbers:

```json
{ "cli": { "appVersionSource": "remote" } }
```

### 5. Submit to the stores

```bash
eas submit --platform ios --latest
eas submit --platform android --latest
```

For iOS this uploads to App Store Connect, where you complete the listing and submit for review. For Android it uploads to a Play Console track — internal, closed, open, or production.

Each store needs, at minimum: an app icon, screenshots at required sizes, a description, a privacy policy URL, and a completed data-safety or privacy-nutrition declaration.

### 6. Ship over-the-air updates

```bash
npx expo install expo-updates
eas update --branch production --message "Fix crash on empty feed"
```

An OTA update replaces the JavaScript bundle and assets on devices already running a compatible native build. It skips store review entirely, which turns a crash fix from days into minutes.

The constraint is firm: **OTA updates cannot change native code.** Adding a native dependency, changing a permission, or upgrading the SDK all require a new store build. `expo-updates` uses a runtime version to enforce this, so an incompatible update is simply not delivered:

```ts
export default {
  runtimeVersion: { policy: "appVersion" },
  updates: { url: "https://u.expo.dev/your-project-id" },
};
```

Both stores permit OTA updates for bug fixes and content. Using them to materially change the app's purpose or to bypass review is against store policy — keep them to fixes and incremental changes.

### 7. Automate it

```yaml
name: Release
on:
  push:
    tags: ["v*"]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - run: npm ci
      - run: npm run verify
      - run: eas build --profile production --platform all --non-interactive --no-wait
```

`npm run verify` before building means a failing type check or test stops the release rather than shipping.

---

## Verification

```bash
eas build:list --limit 5      # build status and artefacts
eas update:list               # published updates per branch
```

Before promoting a build to production:

- Install the staging build on a physical device on both platforms. A simulator does not exercise camera, notifications, biometrics, or real network conditions.
- Confirm the version and build number are what you expect, in the app's about screen or the store console.
- Publish an OTA update to a non-production branch and confirm it is received:

```bash
eas update --branch staging --message "Verify update delivery"
```

- Check that the release build has no development warnings and that startup time is comparable to the previous release.

---

## Common issues

| Symptom | Likely cause | Fix |
|---|---|---|
| `Invalid build number` on App Store upload | `buildNumber` not increased | Bump it, or set `appVersionSource: "remote"` |
| Android upload rejected: wrong signing key | Built with a different keystore | Restore the original keystore, or use Play App Signing |
| OTA update not received | Runtime version mismatch, or native change | Check `eas update:list`; native changes need a store build |
| Build succeeds, app crashes on launch | Native dependency version mismatch | `npx expo install --fix`, then rebuild |
| `Missing Info.plist value` at review | Permission used without a purpose string | Add the purpose string via the config plugin |
| iOS build fails only in CI | Credentials not available to the runner | `eas credentials` and confirm `EXPO_TOKEN` is set |
| App rejected for background location | Usage not justified in the listing | Remove the capability or explain it in review notes |

---

## References

- [Publishing to app stores — Expo](https://docs.expo.dev/deploy/submit-to-app-stores/)
- [EAS Build — introduction](https://docs.expo.dev/build/introduction/)
- [EAS Submit](https://docs.expo.dev/submit/introduction/)
- [EAS Update](https://docs.expo.dev/eas-update/introduction/)
- [Publishing to Google Play — React Native](https://reactnative.dev/docs/signed-apk-android)
- [App Store Review Guidelines — Apple](https://developer.apple.com/app-store/review/guidelines/)
