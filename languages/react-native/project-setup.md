---
type: how-to
tags:
  - language
  - react-native
  - react
  - typescript
  - mobile
related:
  - languages/react-native/installation
  - languages/react-native/architecture
  - languages/react-native/toolchain
  - languages/react-native/navigation
  - languages/react/folder-structure
language: "react-native"
---
# React Native Project Setup

> Lay out the project, configure strict TypeScript and path aliases, wire environment variables, load fonts and assets, and set up dev/staging/production variants.

---

## Prerequisites

- A project created with `npx create-expo-app@latest` — see [Installing React Native](installation.md).
- `npx expo-doctor` reporting all checks passing.

---

## Steps

### 1. Understand what the scaffold gives you

```
MyApp/
├── app/                  # Expo Router — files here become routes
│   ├── _layout.tsx       # Root layout, wraps every screen
│   └── index.tsx         # The "/" route
├── assets/               # Images, fonts, icons
├── components/           # Shared components
├── app.json              # App configuration
├── package.json
└── tsconfig.json
```

Routing is file-based: `app/settings.tsx` becomes `/settings`, and `app/posts/[id].tsx` becomes a dynamic route. There is no route table to maintain.

### 2. Organise by feature, not by file type

The scaffold's flat `components/` directory stops scaling past a handful of screens. Group by feature so that everything one feature needs sits together:

```
src/
├── features/
│   ├── posts/
│   │   ├── components/     # PostCard, PostList
│   │   ├── hooks/          # usePosts, useCreatePost
│   │   ├── api/            # postRepository
│   │   └── types.ts
│   └── auth/
│       ├── components/
│       ├── hooks/
│       └── api/
├── shared/
│   ├── ui/                 # Button, Card, Input — no feature knowledge
│   ├── hooks/
│   └── lib/                # HTTP client, storage, formatting
└── theme/
    ├── colors.ts
    └── spacing.ts
```

`app/` keeps only routes; each route file imports from `src/features/`. A feature may import from `shared/`, never from another feature — cross-feature needs get promoted to `shared/`.

### 3. Turn on strict TypeScript and path aliases

Relative imports like `../../../shared/ui/Button` are a maintenance tax. Configure aliases once:

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@app/*": ["app/*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"]
}
```

`noUncheckedIndexedAccess` matters more here than on the web: indexing into a list of API results returns `T | undefined`, which is the truth and prevents a class of runtime crashes.

Metro resolves these aliases automatically in Expo projects. Restart the dev server after changing them.

### 4. Move configuration to `app.config.ts`

Static `app.json` cannot read environment variables or branch on the build profile. A TypeScript config can:

```ts
import type { ExpoConfig, ConfigContext } from "expo/config";

const VARIANT = process.env.APP_VARIANT ?? "development";

const names = {
  development: "MyApp Dev",
  staging: "MyApp Staging",
  production: "MyApp",
} as const;

const identifiers = {
  development: "com.acme.myapp.dev",
  staging: "com.acme.myapp.staging",
  production: "com.acme.myapp",
} as const;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: names[VARIANT as keyof typeof names],
  slug: "myapp",
  scheme: "myapp",
  ios: { bundleIdentifier: identifiers[VARIANT as keyof typeof identifiers] },
  android: { package: identifiers[VARIANT as keyof typeof identifiers] },
  plugins: ["expo-router", "expo-font"],
});
```

Distinct identifiers per variant let development, staging, and production builds coexist on one device — which is what makes testing a release candidate practical.

### 5. Wire environment variables

Variables prefixed `EXPO_PUBLIC_` are inlined into the JavaScript bundle at build time:

```bash
# .env.development
EXPO_PUBLIC_API_URL=https://api.dev.example.test
```

```ts
// src/shared/lib/env.ts
import { z } from "zod";

const schema = z.object({
  EXPO_PUBLIC_API_URL: z.string().url(),
});

export const env = schema.parse({
  EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
});
```

Validating at startup turns a missing variable into a clear boot-time error instead of an undefined URL failing somewhere in a network call.

**Anything prefixed `EXPO_PUBLIC_` is embedded in the shipped bundle and readable by anyone with the app.** Never put API secrets, signing keys, or credentials there. Secrets belong on a server.

Add `.env*` to `.gitignore` and commit a `.env.example` listing the names with empty values.

### 6. Add fonts and images

```bash
npx expo install expo-font expo-splash-screen
```

```tsx
// app/_layout.tsx
import { useFonts } from "expo-font";
import { SplashScreen, Stack } from "expo-router";
import { useEffect } from "react";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Inter: require("../assets/fonts/Inter-Regular.ttf"),
    InterBold: require("../assets/fonts/Inter-Bold.ttf"),
  });

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return <Stack />;
}
```

Holding the splash screen until fonts resolve avoids the flash of fallback text on first launch.

### 7. Define the build variants

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "env": { "APP_VARIANT": "development" }
    },
    "staging": {
      "distribution": "internal",
      "env": { "APP_VARIANT": "staging" }
    },
    "production": {
      "env": { "APP_VARIANT": "production" }
    }
  }
}
```

That is `eas.json`. See [Deploying React Native apps](deploy.md) for how these profiles are built and distributed.

---

## Verification

```bash
npx tsc --noEmit        # Type-checks with strict mode and aliases
npx expo-doctor         # Configuration and dependency health
npx expo start --clear  # Boots with a clean Metro cache
```

Confirm the alias resolves by importing through it from a route file:

```tsx
import { Button } from "@/shared/ui/Button";
```

Then check that the variant is applied:

```bash
APP_VARIANT=staging npx expo run:ios
```

The app installs as "MyApp Staging" alongside any existing build rather than replacing it.

---

## Common issues

| Symptom | Likely cause | Fix |
|---|---|---|
| `Unable to resolve module @/shared/...` | Metro cached the old resolver config | `npx expo start --clear` |
| Alias works in the editor but fails at runtime | `paths` set in `tsconfig.json` but `baseUrl` missing | Add `"baseUrl": "."` |
| `process.env.EXPO_PUBLIC_*` is `undefined` | Variable added after the dev server started | Restart the server; env vars are inlined at bundle time |
| Fonts render as the system default | `useFonts` resolved but the family name does not match the key | Use the exact key passed to `useFonts` in `fontFamily` |
| Both variants install over each other | Same bundle identifier and package name | Give each variant a distinct identifier in `app.config.ts` |
| `app.json` edits have no effect | An `app.config.ts` exists and takes precedence | Move the values into `app.config.ts` |

---

## References

- [Configuration with app config — Expo](https://docs.expo.dev/workflow/configuration/)
- [Environment variables — Expo](https://docs.expo.dev/guides/environment-variables/)
- [TypeScript — Expo](https://docs.expo.dev/guides/typescript/)
- [Using fonts — Expo](https://docs.expo.dev/develop/user-interface/fonts/)
- [Expo Router — file-based routing](https://docs.expo.dev/router/introduction/)
