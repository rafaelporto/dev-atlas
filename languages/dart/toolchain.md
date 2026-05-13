# Dart Toolchain

> The `dart` CLI is the single entry point for building, formatting, analysing, testing, and running Dart code.

---

## What is it?

The Dart SDK ships with a unified CLI tool, `dart`, that consolidates what were once separate executables (`dartfmt`, `dartanalyzer`, `pub`) into one command. Every standard workflow — running a script, fetching packages, running tests, compiling to native — goes through `dart`.

---

## Why does it matter?

A single, consistent toolchain reduces setup friction: no external formatters, no separate linters, no separate test runners. The same `dart` binary produces identical results locally and in CI.

---

## How it works

The `dart` command is a dispatcher. Each subcommand delegates to the appropriate SDK tool:

```
dart
├── run          — execute a Dart file or package entry point
├── compile      — compile to native (exe), JS, AOT snapshot, or kernel
├── test         — run the test suite via package:test
├── pub          — package manager (get, upgrade, publish, outdated)
├── analyze      — static analysis using the Dart analyzer
├── format       — opinionated code formatter
├── fix          — apply automated lint fixes
└── doc          — generate API documentation
```

---

## Examples

### Run a file

```bash
dart run bin/my_app.dart
dart run                        # uses the entry point declared in pubspec.yaml
```

### Compile to a native executable

```bash
dart compile exe bin/my_app.dart -o build/my_app
./build/my_app
```

`dart compile exe` produces a self-contained binary — no Dart VM required at runtime.

### Compile to JavaScript

```bash
dart compile js bin/my_app.dart -o build/my_app.js
```

### Format code

```bash
dart format .                               # format all Dart files recursively
dart format --set-exit-if-changed .         # fails in CI if any file is unformatted
```

### Static analysis

```bash
dart analyze                                # report errors, warnings, and hints
dart analyze --fatal-infos                  # treat hints as errors (stricter CI mode)
```

### Package management

```bash
dart pub get                                # fetch declared dependencies
dart pub upgrade                            # upgrade to latest allowed versions
dart pub outdated                           # show packages with newer versions available
dart pub add http                           # add a dependency and run get
dart pub remove http                        # remove a dependency and run get
dart pub publish                            # publish to pub.dev
dart pub publish --dry-run                  # validate without publishing
```

### Run tests

```bash
dart test                                   # run all tests in test/
dart test test/user_test.dart               # run a specific file
dart test --name 'adds two'                 # run tests matching a name pattern
dart test --coverage=coverage/              # collect coverage data
```

### Apply automated fixes

```bash
dart fix --apply                            # apply all available automated lint fixes
```

---

## When to use

- Run `dart analyze` before every commit or in CI to catch issues early.
- Use `dart format --set-exit-if-changed` in CI to enforce consistent style.
- Use `dart compile exe` to ship a CLI tool or server binary with no runtime dependency.
- Use `dart pub outdated` periodically to stay on top of dependency updates.

---

## When NOT to use

- Do not use `dart compile js` for Flutter projects — Flutter uses its own build pipeline (`flutter build web`).
- Do not bypass `dart format` in favour of manual style — the formatter is the authority.
- Do not use `dart run` in production for performance-sensitive services — compile to a native binary first.

---

## References

- [dart CLI reference — dart.dev](https://dart.dev/tools)
- [dart compile — dart.dev](https://dart.dev/tools/dart-compile)
- [dart analyze — dart.dev](https://dart.dev/tools/dart-analyze)
- [dart format — dart.dev](https://dart.dev/tools/dart-format)
- [dart pub — dart.dev](https://dart.dev/tools/pub/cmd)
