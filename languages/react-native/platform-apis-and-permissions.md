---
type: concept
tags:
  - language
  - react-native
  - react
  - typescript
  - mobile
related:
  - languages/react-native/new-architecture-and-native-modules
  - languages/react-native/core-components-and-styling
  - languages/react-native/project-setup
  - languages/react-native/architecture
language: "react-native"
---
# Platform APIs and Permissions

> Camera, location, notifications and storage reach JavaScript through modules — and every one of them needs a permission the user can refuse at any time.

---

## What is it?

Platform APIs are the device capabilities an app reaches for: camera, photo library, location, notifications, biometrics, contacts, clipboard, haptics. In React Native they are exposed as modules — `expo-camera`, `expo-location`, `expo-notifications` — each wrapping the iOS and Android implementation behind one JavaScript interface.

Most are gated by a **permission**: a runtime prompt the user answers once and can change later in system settings.

---

## Why does it matter?

Permissions are the part of mobile development with no web equivalent, and the part where a careless implementation is most visible. An app that asks for location on first launch, before explaining why, gets denied — and on iOS you only get one chance to show the system prompt.

There is also no "granted forever" state. The user can revoke a permission in settings while your app is backgrounded, so every use has to handle denial, not just the first.

---

## How it works

### Detecting the platform

```tsx
import { Platform } from "react-native";

Platform.OS;        // "ios" | "android" | "web"
Platform.Version;   // iOS: "17.4" — Android: 34 (API level)

const padding = Platform.select({ ios: 44, android: 24, default: 0 });
```

For anything larger than a value, prefer file extensions — Metro resolves `Storage.ios.ts` and `Storage.android.ts` from an import of `./Storage`. That keeps branching out of the component.

### The permission lifecycle

```
        ┌──────────────┐
        │ undetermined │  ← never asked
        └──────┬───────┘
               │ request()
        ┌──────▼───────┐
   ┌────│   granted    │────┐
   │    └──────────────┘    │
   │                        │ user revokes in Settings
   │ user revokes           │
   │    ┌──────────────┐    │
   └───►│    denied    │◄───┘
        └──────┬───────┘
               │ canAskAgain === false  (iOS: after first denial)
        ┌──────▼──────────────┐
        │ must open Settings  │
        └─────────────────────┘
```

The critical asymmetry: on iOS the system prompt shows **once**. After a denial, `requestPermissionsAsync` returns immediately without prompting, and the only path forward is `Linking.openSettings()`. Android allows a second prompt in some cases, but also has a permanent-denial state.

### Asking well

```tsx
import * as Location from "expo-location";

async function requestLocation() {
  const { status, canAskAgain } = await Location.getForegroundPermissionsAsync();

  if (status === "granted") return true;

  if (!canAskAgain) {
    // Prompting again does nothing — send the user to Settings
    Alert.alert(
      "Location is off",
      "Enable location access in Settings to see nearby results.",
      [{ text: "Not now" }, { text: "Open Settings", onPress: () => Linking.openSettings() }],
    );
    return false;
  }

  const result = await Location.requestForegroundPermissionsAsync();
  return result.status === "granted";
}
```

Check before requesting, and treat `canAskAgain: false` as a different branch. Requesting blindly produces the silent failure that makes a feature look broken.

Ask **in context**, not on launch — when the user taps "Find near me", not on the splash screen. Acceptance rates differ dramatically, and the reason is obvious to the user at that moment.

### Declaring intent

Both platforms require the app to declare why it wants a capability. With Expo this goes in the config, and a config plugin writes the native manifests during prebuild:

```ts
// app.config.ts
export default {
  plugins: [
    [
      "expo-location",
      {
        locationAlwaysAndWhenInUsePermission:
          "We use your location to show results near you.",
      },
    ],
    ["expo-camera", { cameraPermission: "We use the camera so you can add a photo." }],
  ],
};
```

Those strings are what the user reads in the system dialog. Vague text ("This app needs location") measurably reduces acceptance, and App Store review rejects missing or generic descriptions.

### Common modules

| Capability | Module | Permission |
|---|---|---|
| Camera | `expo-camera` | Yes |
| Photo library | `expo-image-picker` | Yes |
| Location | `expo-location` | Yes |
| Notifications | `expo-notifications` | Yes |
| Biometrics | `expo-local-authentication` | Device-gated |
| Contacts | `expo-contacts` | Yes |
| Clipboard | `expo-clipboard` | No |
| Haptics | `expo-haptics` | No |
| Secure storage | `expo-secure-store` | No |

Install with `npx expo install`, not `npm install` — it resolves the version matching your SDK.

### App lifecycle

A permission can change while the app is backgrounded, so re-check on return:

```tsx
import { AppState } from "react-native";

useEffect(() => {
  const sub = AppState.addEventListener("change", (state) => {
    if (state === "active") void refreshPermissionStatus();
  });
  return () => sub.remove();
}, []);
```

---

## Examples

Wrapping a capability behind a hook, so screens never touch the permission API directly:

```ts
// src/features/location/hooks/useNearby.ts
import { useCallback, useState } from "react";
import * as Location from "expo-location";
import { Alert, Linking } from "react-native";

type Status = "idle" | "requesting" | "granted" | "denied" | "blocked";

export function useNearby() {
  const [status, setStatus] = useState<Status>("idle");
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  const locate = useCallback(async () => {
    setStatus("requesting");

    const current = await Location.getForegroundPermissionsAsync();

    if (current.status !== "granted" && !current.canAskAgain) {
      setStatus("blocked");
      Alert.alert("Location is off", "Enable it in Settings to see nearby results.", [
        { text: "Not now" },
        { text: "Open Settings", onPress: () => void Linking.openSettings() },
      ]);
      return;
    }

    const granted =
      current.status === "granted" ||
      (await Location.requestForegroundPermissionsAsync()).status === "granted";

    if (!granted) {
      setStatus("denied");
      return;
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    setCoords(position.coords);
    setStatus("granted");
  }, []);

  return { status, coords, locate };
}
```

```tsx
// The screen only renders states — it knows nothing about expo-location
export function NearbyScreen() {
  const { status, coords, locate } = useNearby();

  if (status === "blocked") return <Text>Location is disabled in Settings.</Text>;
  if (status === "denied") return <Button title="Allow location" onPress={locate} />;
  if (status === "requesting") return <ActivityIndicator />;
  if (!coords) return <Button title="Find near me" onPress={locate} />;

  return <NearbyResults coords={coords} />;
}
```

That boundary is what makes the feature testable: the screen can be rendered against any status without a device, and swapping `expo-location` for another provider touches one file.

---

## When to use

- **`npx expo install`** for every native module, so versions match the SDK.
- **Request in context**, at the moment the capability is needed and its purpose is obvious.
- **A hook per capability**, wrapping the module so components stay free of permission logic.
- **`Platform.select`** for values; **platform file extensions** for anything larger.
- **Re-check on app foreground**, because permissions change outside your app.

## When NOT to use

- Do not request permissions on first launch. It is the single most reliable way to get denied.
- Do not call `requestPermissionsAsync` without checking `canAskAgain` first — on iOS it silently no-ops after a denial.
- Do not treat a granted permission as permanent. It can be revoked between two screens.
- Do not write vague purpose strings. They reduce acceptance and can fail App Store review.
- Do not request a permission you do not yet need "to get it out of the way".
- Do not scatter `Platform.OS` checks through components. Push the difference to the module boundary.

---

## References

- [Platform-specific code — React Native](https://reactnative.dev/docs/platform-specific-code)
- [Permissions — Expo](https://docs.expo.dev/guides/permissions/)
- [expo-location](https://docs.expo.dev/versions/latest/sdk/location/)
- [expo-camera](https://docs.expo.dev/versions/latest/sdk/camera/)
- [Config plugins — Expo](https://docs.expo.dev/config-plugins/introduction/)
- [AppState — React Native](https://reactnative.dev/docs/appstate)
