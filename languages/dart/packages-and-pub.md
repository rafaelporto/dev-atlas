---
type: concept
tags:
  - language
  - dart
related: []
language: "dart"
---
# Packages and pub in Dart

> `pub` is Dart's package manager: it resolves dependencies, fetches packages from pub.dev, and manages the full lifecycle of both application and library packages.

---

## What is it?

Every Dart project is a **package** — a directory with a `pubspec.yaml` file that declares its name, version, SDK constraints, and dependencies. The `dart pub` command interacts with [pub.dev](https://pub.dev), Dart's official package repository, to fetch and version-lock those dependencies.

---

## Why does it matter?

Dart's ecosystem is built entirely on packages: the Flutter framework, HTTP clients, state management libraries, testing utilities, and serialisation tools are all installed via `pub`. Understanding how versioning, dependency resolution, and `pubspec.lock` work prevents broken environments and unexpected behaviour after upgrades.

---

## How it works

### pubspec.yaml

The manifest for a Dart package. Every field affects how the package is built and resolved:

```yaml
name: my_app
description: A sample Dart application.
version: 1.0.0
homepage: https://github.com/example/my_app

environment:
  sdk: '>=3.0.0 <4.0.0'    # required: SDK version constraint

dependencies:
  http: ^1.2.0               # ^1.2.0 means >=1.2.0 <2.0.0
  intl: '>=0.18.0 <1.0.0'   # explicit range

dev_dependencies:            # not included in the compiled output for consumers
  lints: ^3.0.0
  test: ^1.25.0
  build_runner: ^2.4.0
```

### Version constraints

Dart uses [semantic versioning](https://semver.org/). The caret (`^`) constraint is the most common form:

| Constraint | Meaning |
|---|---|
| `^1.2.3` | `>=1.2.3 <2.0.0` |
| `^0.13.0` | `>=0.13.0 <0.14.0` (major=0: minor is treated as breaking) |
| `>=1.0.0 <2.0.0` | explicit range |
| `any` | no constraint — avoid in practice |

### pubspec.lock

`dart pub get` resolves the dependency graph and writes exact pinned versions to `pubspec.lock`.

- **Applications**: commit `pubspec.lock` — ensures reproducible builds across machines and CI.
- **Libraries**: do not commit `pubspec.lock` — lets consumers resolve compatible versions freely.

### Core pub commands

```bash
dart pub get               # fetch all declared dependencies
dart pub upgrade           # upgrade to the newest versions allowed by constraints
dart pub upgrade http      # upgrade a single package
dart pub outdated          # list packages that have newer versions available
dart pub add http          # add a dependency and run get
dart pub remove http       # remove a dependency and run get
dart pub publish           # publish to pub.dev
dart pub publish --dry-run # validate the package without publishing
```

### Local and path dependencies

During development you can depend on a local package by path instead of a published version:

```yaml
dependencies:
  my_utils:
    path: ../my_utils
```

Useful when developing two packages simultaneously. Switch back to a version constraint before committing.

### Package structure conventions

| Directory / file | Purpose |
|---|---|
| `lib/` | Public API — everything here is importable by consumers |
| `lib/src/` | Private implementation — importable but not the public API |
| `bin/` | Executable scripts |
| `test/` | Tests (not included when consumers install the package) |
| `example/` | Example apps or usage snippets |
| `pubspec.yaml` | Package manifest |
| `pubspec.lock` | Pinned dependency versions |
| `CHANGELOG.md` | Version history (required for pub.dev publishing) |

### Importing packages

```dart
// Public package import
import 'package:http/http.dart' as http;

// Internal import within the same package
import 'package:my_app/src/models/user.dart';

// Relative import (only valid inside test/ or bin/)
import '../lib/src/utils.dart';
```

---

## Examples

A realistic end-to-end flow: a `pubspec.yaml` for a small CLI package plus the commands to set it up, add a dependency, and lock versions.

```yaml
# pubspec.yaml
name: url_pinger
description: A tiny CLI that checks whether a URL is reachable.
version: 0.1.0

environment:
  sdk: '>=3.0.0 <4.0.0'

dependencies:
  http: ^1.2.0
  args: ^2.4.0

dev_dependencies:
  lints: ^3.0.0
  test: ^1.25.0
```

```bash
dart pub get                 # resolve and fetch, writing pubspec.lock
dart pub add args            # add a dependency (updates pubspec.yaml + lock)
dart pub outdated            # check for newer allowed versions
dart run bin/url_pinger.dart # run the executable in bin/
```

```dart
// bin/url_pinger.dart
import 'package:http/http.dart' as http;

Future<void> main(List<String> args) async {
  final url = args.isEmpty ? 'https://dart.dev' : args.first;
  final res = await http.get(Uri.parse(url));
  print('$url -> ${res.statusCode}');
}
```

---

## When to use

- Use `dart pub add` to add a dependency — it updates `pubspec.yaml` and runs `get` atomically.
- Use `dart pub outdated` as part of regular maintenance to surface security and bug-fix updates.
- Use path dependencies during local development; switch to version constraints before committing or publishing.

---

## When NOT to use

- Do not use `any` as a version constraint — it causes resolution conflicts in downstream consumers.
- Do not commit `pubspec.lock` for library packages — it prevents consumers from resolving compatible versions.
- Do not list runtime dependencies in `dev_dependencies` — they are excluded from the compiled output for consumers.

---

## References

- [pubspec.yaml format — dart.dev](https://dart.dev/tools/pub/pubspec)
- [pub.dev — Dart and Flutter package repository](https://pub.dev)
- [dart pub commands — dart.dev](https://dart.dev/tools/pub/cmd)
- [Package versioning — dart.dev](https://dart.dev/tools/pub/versioning)
