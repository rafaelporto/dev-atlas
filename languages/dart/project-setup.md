# Dart Project Setup

> How to create and structure a Dart project using `dart create` and the standard layout conventions.

---

## Prerequisites

- Dart SDK installed (see [Installation](installation.md))
- `dart` CLI available on `PATH`

---

## Steps

### 1. Create a new project

`dart create` scaffolds a project with the correct structure and a `pubspec.yaml`.

```bash
dart create my_app                  # console application (default)
dart create -t package my_lib       # reusable library package
dart create -t server-shelf my_api  # HTTP server using shelf
dart create -t web my_web           # web app (dart2js target)
```

Available templates: `console`, `package`, `server-shelf`, `web`.

---

### 2. Understand the project structure

**Console application:**

```
my_app/
├── pubspec.yaml             # project metadata and dependencies
├── pubspec.lock             # pinned dependency versions (commit this)
├── analysis_options.yaml    # linting and static analysis config
├── bin/
│   └── my_app.dart         # entry point
├── lib/
│   └── my_app.dart         # library code (exported API)
└── test/
    └── my_app_test.dart
```

**Reusable package:**

```
my_lib/
├── pubspec.yaml
├── lib/
│   ├── my_lib.dart          # public API (barrel file)
│   └── src/                 # private implementation
│       └── feature.dart
└── test/
```

The `lib/src/` directory is a convention for private implementation files. Anything placed there is accessible to the package itself but should not be imported directly by consumers.

---

### 3. Configure pubspec.yaml

```yaml
name: my_app
description: A sample Dart application.
version: 1.0.0

environment:
  sdk: '>=3.0.0 <4.0.0'    # SDK constraint — always set this

dependencies:
  http: ^1.2.0               # production dependencies

dev_dependencies:
  lints: ^3.0.0              # lint rules
  test: ^1.25.0              # test runner
```

---

### 4. Fetch dependencies

```bash
dart pub get
```

This resolves the dependency graph and writes `pubspec.lock`. Always commit `pubspec.lock` for applications; omit it for libraries.

---

### 5. Organise lib/ for non-trivial projects

Group code by feature or layer:

```
lib/
├── my_app.dart              # barrel: re-exports the public surface
└── src/
    ├── models/
    │   └── user.dart
    ├── services/
    │   └── user_service.dart
    └── utils/
        └── logger.dart
```

---

## Verification

```bash
dart run bin/my_app.dart    # runs the app
dart test                   # runs all tests in test/
dart analyze                # static analysis — should report no issues
```

---

## Common issues

| Symptom | Likely cause | Fix |
|---|---|---|
| `Target of URI doesn't exist` | Wrong import path | Paths inside `lib/` use `package:my_app/…`; use `../` only in `test/` |
| `pub get` resolves wrong version | Loose SDK constraint | Tighten the `sdk` range in `pubspec.yaml` |
| Analysis warnings on a new project | `analysis_options.yaml` absent | Add it manually with `include: package:lints/recommended.yaml` |

---

## References

- [dart create — dart.dev](https://dart.dev/tools/dart-create)
- [Package layout conventions — dart.dev](https://dart.dev/tools/pub/package-layout)
- [pubspec.yaml format — dart.dev](https://dart.dev/tools/pub/pubspec)
