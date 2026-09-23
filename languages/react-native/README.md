# React Native

> A study guide covering React Native's component model, navigation, state, architecture, testing, and delivery with Expo.

---

## Overview

| Article | Description |
|---|---|
| [Overview](overview.md) | What React Native is, how it renders through JSI and Fabric, supported platforms, and why the docs recommend a framework |

---

## Getting Started

| Article | Description |
|---|---|
| [Installation](installation.md) | Node, Xcode and Android Studio setup, `create-expo-app`, the Community CLI path, and `expo-doctor` |
| [Project Setup](project-setup.md) | Feature-first structure, strict TypeScript and path aliases, `app.config.ts`, environment variables, fonts, and build variants |

---

## Core Concepts

| Article | Description |
|---|---|
| [Core Components and Styling](core-components-and-styling.md) | `View`, `Text`, `Pressable`, `StyleSheet`, Flexbox defaults that differ from the web, platform differences, and safe areas |
| [Lists and List Performance](lists-and-performance.md) | `FlatList`, `SectionList`, FlashList, stable keys, memoised rows, and `getItemLayout` |
| [Navigation](navigation.md) | Expo Router's file-based routing and typed routes, React Navigation compared, deep linking, and route guards |
| [State Management](state-management.md) | Sorting state by kind — local, client, server, persisted — and choosing between Zustand, Redux Toolkit, Jotai, and Context |
| [Data Fetching](data-fetching.md) | TanStack Query on a device, repositories, schema validation, offline behaviour, and mutations |
| [Platform APIs and Permissions](platform-apis-and-permissions.md) | The `Platform` module, the permission lifecycle, Expo modules, and config plugins |
| [Forms](forms.md) | Controlled `TextInput`, React Hook Form with Zod, keyboard handling, field focus, and validation |
| [Animations and Gestures](animations-and-gestures.md) | Reanimated worklets, Gesture Handler, the native driver, and keeping animation off the JavaScript thread |

---

## Platform

| Article | Description |
|---|---|
| [The New Architecture and Native Modules](new-architecture-and-native-modules.md) | JSI, Fabric, TurboModules, Codegen, Hermes V1, and writing a module with the Expo Modules API |

---

## Architecture

| Article | Description |
|---|---|
| [Application Architecture](architecture.md) | Feature-first organisation, presentation/application/domain/data layers, and where each kind of logic belongs |
| [Architecture Patterns](architecture-patterns.md) | MVC, MVP, MVVM, MVI and Clean applied to React Native — pros, cons, and a decision matrix |
| [Dependency Injection](dependency-injection.md) | Depending on interfaces, a Context container, factory functions, and fakes over mocks |

---

## Quality

| Article | Description |
|---|---|
| [React Native Patterns](react-native-patterns.md) | Container/presentational, custom hooks, compound components, repository, adapter, facade, and strategy |
| [Best Practices](best-practices.md) | SOLID and DRY/KISS/YAGNI applied to components and hooks, with do/don't pairs |
| [Testing](testing.md) | Jest with `jest-expo`, React Native Testing Library, mocking native modules, route tests, and end-to-end with Maestro |
| [Performance](performance.md) | Profiling with React Native DevTools, re-renders, startup cost, images, and bundle size |
| [Accessibility](accessibility.md) | Roles, labels and state, grouping, touch targets, text scaling, VoiceOver and TalkBack |

---

## Toolchain & Deploy

| Article | Description |
|---|---|
| [Toolchain](toolchain.md) | Expo CLI commands, Metro, TypeScript, ESLint, `package.json` scripts, and CI checks |
| [Deploy](deploy.md) | EAS Build and Submit, signing credentials, store submission, and over-the-air updates |
| [IDEs and Editors](ides.md) | VS Code, Xcode, Android Studio, React Native DevTools — and which owns which problem |

---

## See also

| Article | Description |
|---|---|
| [Mobile Architecture — Comparison and Decision Matrix](../../software-engineering/architecture/mobile/comparison.md) | Side-by-side comparison of MVC, MVP, MVVM, MVI, VIPER, Clean, and Modular — with a matrix for choosing one |
| [Mobile Architecture (section)](../../software-engineering/architecture/mobile/README.md) | Full, framework-agnostic coverage of mobile architectural patterns |
| [React (section)](../react/README.md) | The component model, hooks, and ecosystem that React Native builds on |
