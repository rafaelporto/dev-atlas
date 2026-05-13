# Deploying Flutter Apps

> Building a release-ready Flutter app requires signing configuration, platform-specific build commands, and submission to the Play Store (Android) or App Store (iOS).

---

## Prerequisites

- Flutter SDK installed (see [Installation](installation.md))
- Android: a keystore file for signing; Google Play Console account
- iOS: Apple Developer account; provisioning profile and distribution certificate; Mac with Xcode

---

## Android deployment

### Step 1 — Generate a signing keystore

```bash
keytool -genkey -v \
  -keystore ~/keystores/upload-keystore.jks \
  -storetype JKS \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -alias upload
```

Keep this file secure — it cannot be regenerated if lost. Never commit it to version control.

### Step 2 — Reference the keystore in the build

Create `android/key.properties` (add to `.gitignore`):

```
storePassword=<your-store-password>
keyPassword=<your-key-password>
keyAlias=upload
storeFile=/Users/you/keystores/upload-keystore.jks
```

Update `android/app/build.gradle`:

```groovy
def keystoreProperties = new Properties()
def keystorePropertiesFile = rootProject.file('key.properties')
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
    signingConfigs {
        release {
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
            storeFile keystoreProperties['storeFile'] ? file(keystoreProperties['storeFile']) : null
            storePassword keystoreProperties['storePassword']
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            shrinkResources true
        }
    }
}
```

### Step 3 — Build the release App Bundle

```bash
flutter build appbundle --release
```

Output: `build/app/outputs/bundle/release/app-release.aab`

Use the App Bundle format (not APK) for Play Store uploads — Google generates optimised APKs per device configuration.

### Step 4 — Submit to Google Play Console

1. Sign in to [Google Play Console](https://play.google.com/console).
2. Create your app (or select an existing one).
3. Navigate to **Release → Production → Create new release**.
4. Upload the `.aab` file.
5. Fill in the release notes and submit for review.

---

## iOS deployment

### Step 1 — Configure signing in Xcode

Open `ios/Runner.xcworkspace` in Xcode:

1. Select the **Runner** target → **Signing & Capabilities**.
2. Select your Apple Developer team.
3. Ensure the bundle identifier matches what you registered in App Store Connect.
4. Set the provisioning profile to **Automatic** (or select a manual Distribution profile).

### Step 2 — Build the release archive

```bash
flutter build ios --release
```

Then in Xcode:

1. Set the scheme to **Runner** and the destination to **Any iOS Device (arm64)**.
2. **Product → Archive**.
3. In the Organizer, select the archive and click **Distribute App → App Store Connect**.

Or build an `.ipa` directly for distribution via Fastlane or CI:

```bash
flutter build ipa --release
```

Output: `build/ios/ipa/Runner.ipa`

### Step 3 — Submit to App Store Connect

1. Sign in to [App Store Connect](https://appstoreconnect.apple.com/).
2. Create a new app or select an existing one.
3. Use Xcode Organizer or Transporter to upload the `.ipa`.
4. Complete the app metadata, screenshots, and pricing.
5. Submit for App Store review.

---

## Version and build number

Flutter uses `version` in `pubspec.yaml` in the format `major.minor.patch+buildNumber`:

```yaml
version: 1.2.0+5   # 1.2.0 is the version name; 5 is the build number
```

The build number must be incremented for each submission to both stores.

Override from the CLI without changing `pubspec.yaml`:

```bash
flutter build appbundle --build-name=1.2.0 --build-number=5
```

---

## CI/CD basics

A minimal CI/CD pipeline for Flutter (GitHub Actions example):

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    tags: ['v*']

jobs:
  android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.x'
          channel: stable
      - run: flutter pub get
      - run: flutter analyze
      - run: flutter test
      - run: flutter build appbundle --release
        env:
          KEYSTORE_FILE: ${{ secrets.KEYSTORE_BASE64 }}
          KEYSTORE_PASSWORD: ${{ secrets.KEYSTORE_PASSWORD }}
          KEY_ALIAS: ${{ secrets.KEY_ALIAS }}
          KEY_PASSWORD: ${{ secrets.KEY_PASSWORD }}
```

For full automation (signing, upload, release notes), use [Fastlane](https://fastlane.tools/) alongside the Flutter build commands.

---

## Verification

```bash
# Android — inspect the signed AAB
bundletool build-apks \
  --bundle=build/app/outputs/bundle/release/app-release.aab \
  --output=/tmp/my_app.apks
bundletool install-apks --apks=/tmp/my_app.apks

# iOS — validate the archive before upload
xcrun altool --validate-app -f build/ios/ipa/Runner.ipa \
  --type ios --apiKey <key> --apiIssuer <issuer>
```

---

## Common issues

| Symptom | Likely cause | Fix |
|---|---|---|
| `Keystore file not found` | Wrong path in `key.properties` | Use an absolute path or a path relative to the project root |
| `Code signing is required` (iOS) | No provisioning profile selected | Select a team and profile in Xcode Signing settings |
| `Invalid binary — missing 64-bit support` | Old minimum deployment target | Set iOS deployment target to 12.0+ in Xcode |
| Build number rejected by Play Store | Build number not incremented | Increment `+N` in `pubspec.yaml` or pass `--build-number` |
| `ITMS-90685` (icon missing) | App icon not set for all sizes | Generate icons with `flutter_launcher_icons` package |

---

## References

- [Build and release Android — docs.flutter.dev](https://docs.flutter.dev/deployment/android)
- [Build and release iOS — docs.flutter.dev](https://docs.flutter.dev/deployment/ios)
- [Continuous delivery with Flutter — docs.flutter.dev](https://docs.flutter.dev/deployment/cd)
- [Fastlane for Flutter — fastlane.tools](https://fastlane.tools/)
- [subosito/flutter-action — GitHub](https://github.com/subosito/flutter-action)
