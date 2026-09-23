---
type: concept
tags:
  - language
  - react-native
  - react
  - typescript
  - mobile
  - ci-cd
related:
  - languages/react-native/project-setup
  - languages/react-native/testing
  - languages/react-native/deploy
  - languages/react-native/performance
  - languages/react/toolchain
  - languages/flutter/toolchain
language: "react-native"
---
# Toolchain

> The Expo CLI, Metro, TypeScript, a linter, and a test runner — wired into `package.json` scripts so the same commands run locally and in CI.

---

## What is it?

The toolchain is everything that runs around the code: the CLI that starts the dev server and builds the app, the bundler, the type checker, the linter and formatter, the test runner, and the diagnostics that tell you when the project is misconfigured.

Expo projects use the **Expo CLI**; projects without a framework use the **Community CLI**. The commands differ; everything downstream of them does not.

---

## Why does it matter?

React Native has more moving parts than a web project: two native toolchains, a bundler with its own cache, and native dependencies that must match the SDK version. Most of the time lost is not to hard problems but to stale caches, mismatched versions, and a linter that was never configured.

A short, well-named set of scripts removes that. It also makes CI trivial, since CI runs the same commands a developer runs.

---

## How it works

### The commands

| Command | What it does |
|---|---|
| `npx expo start` | Dev server and Metro bundler |
| `npx expo start --clear` | The same, with the Metro cache cleared |
| `npx expo run:ios` | Builds and runs the native iOS app |
| `npx expo run:android` | Builds and runs the native Android app |
| `npx expo install <pkg>` | Installs the version matching the SDK |
| `npx expo install --fix` | Realigns mismatched dependency versions |
| `npx expo-doctor` | Diagnoses configuration and dependency problems |
| `npx expo prebuild` | Generates `ios/` and `android/` from the config |
| `npx expo prebuild --clean` | Regenerates them from scratch |
| `npx expo export` | Produces a production bundle |
| `npx eas build` | Builds in the cloud |
| `npx eas update` | Ships an over-the-air JavaScript update |

Two are worth calling out. **`expo install` rather than `npm install`** for any package with a native side: it resolves the version compatible with your SDK, and using `npm install` is the most common cause of a build that compiles but crashes on launch. **`expo-doctor`** should be run before any release; it catches version drift that produces confusing runtime failures.

Without a framework, the equivalents are `npx react-native start`, `run-ios`, `run-android`, and `npx react-native doctor`.

### Metro

Metro is the bundler. Two things about it matter day to day.

It caches aggressively, and the cache is the first suspect whenever a change does not appear or a module fails to resolve:

```bash
npx expo start --clear
```

And it resolves platform extensions automatically — `Storage.ios.ts` and `Storage.android.ts` both satisfy `import "./Storage"`.

Configuration is rarely needed, but when it is:

```js
// metro.config.js
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
config.resolver.sourceExts.push("svg");

module.exports = config;
```

### TypeScript

```bash
npx tsc --noEmit
```

Type checking is separate from bundling — Metro strips types without checking them, so a type error will not stop the app from running. That is why `tsc --noEmit` belongs in the scripts and in CI, not just in the editor.

React Native 0.87 ships a **Strict TypeScript API** by default, which gives accurate types for the framework's own surface rather than the looser hand-maintained definitions used previously.

### Linting and formatting

```bash
npx expo lint
```

This scaffolds ESLint with `eslint-config-expo` on first run. A configuration worth extending:

```js
// eslint.config.js
const expoConfig = require("eslint-config-expo/flat");

module.exports = [
  ...expoConfig,
  {
    rules: {
      "react-hooks/exhaustive-deps": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["@/features/*/!(index)"], message: "Import from the feature's index.ts" },
            { group: ["@react-navigation/*"], message: "Use expo-router (SDK 56+)" },
          ],
        },
      ],
    },
  },
];
```

Those `no-restricted-imports` patterns are the cheapest way to enforce the architectural boundaries from [Application Architecture](architecture.md) — a rule the linter checks costs nothing to maintain, unlike one that lives only in review comments.

Formatting with Prettier or Biome; Biome is faster and combines both roles, Prettier has wider editor support.

### Testing

Jest with the `jest-expo` preset — see [Testing](testing.md) for the full configuration.

### Debugging

```bash
npx expo start
# press j to open React Native DevTools
```

DevTools attaches to Hermes and provides a console, network inspector, component tree, and profiler. It replaced the old remote-debugging-in-Chrome workflow, which did not reflect real runtime behaviour.

### Keeping dependencies aligned

```bash
npx expo install --check    # reports mismatches
npx expo install --fix      # corrects them
```

Native dependency versions are tied to the SDK. Drift here produces build failures that are hard to attribute, so running `--check` in CI is worthwhile.

`patch-package` handles the case where a dependency has a bug you cannot wait for:

```bash
npm install --save-dev patch-package
# edit the file in node_modules, then
npx patch-package some-broken-lib
```

The patch is committed and reapplied on install. Treat it as temporary and revisit on upgrade.

---

## Examples

A complete `package.json` scripts block:

```json
{
  "scripts": {
    "start": "expo start",
    "start:clear": "expo start --clear",
    "ios": "expo run:ios",
    "android": "expo run:android",

    "typecheck": "tsc --noEmit",
    "lint": "expo lint",
    "lint:fix": "expo lint --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",

    "test": "jest",
    "test:watch": "jest --watch",
    "test:ci": "jest --ci --coverage --maxWorkers=2",

    "doctor": "expo-doctor",
    "deps:check": "expo install --check",

    "verify": "npm run typecheck && npm run lint && npm run format:check && npm run test",

    "build:dev": "eas build --profile development",
    "build:prod": "eas build --profile production",
    "update": "eas update --branch production"
  }
}
```

`verify` is the one that matters: a single command that runs everything CI runs, so a developer can reproduce a pipeline failure locally without reading the workflow file.

A CI workflow that calls the same scripts:

```yaml
name: CI
on:
  pull_request:
  push:
    branches: [main]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm run format:check
      - run: npm run test:ci
      - run: npx expo install --check
```

Running the steps separately rather than as one `verify` call gives a named, individually-readable failure in the CI log.

A pre-commit hook that checks only what changed:

```json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md}": ["prettier --write"]
  }
}
```

Keep type checking and tests out of the hook — they are too slow for every commit and belong in CI.

---

## When to use

- **`expo install`** for every package with a native component. Always.
- **`expo-doctor`** before a release, and in CI on the main branch.
- **`tsc --noEmit` in CI** — the bundler will not catch type errors for you.
- **`no-restricted-imports`** to enforce feature boundaries automatically.
- **A single `verify` script** that mirrors CI.
- **`--clear`** as the first thing to try when Metro behaves inexplicably.

## When NOT to use

- Do not use `npm install` for native packages — version drift produces crashes that look unrelated to the install.
- Do not put the full test suite in a pre-commit hook. Slow hooks get bypassed with `--no-verify`, and then nothing runs.
- Do not commit `ios/` and `android/` in a managed Expo project. `prebuild` regenerates them, and committed copies drift from the config.
- Do not skip `tsc --noEmit` because the editor shows no errors. The editor may use a different `tsconfig`.
- Do not leave `patch-package` patches in place indefinitely. Re-check them on every dependency upgrade.

---

## References

- [Expo CLI — reference](https://docs.expo.dev/more/expo-cli/)
- [expo-doctor](https://docs.expo.dev/develop/tools/#expo-doctor)
- [Metro bundler — React Native](https://reactnative.dev/docs/metro)
- [React Native DevTools](https://reactnative.dev/docs/react-native-devtools)
- [Using TypeScript — React Native](https://reactnative.dev/docs/typescript)
- [Continuous Integration — Expo](https://docs.expo.dev/build/building-on-ci/)
