---
type: how-to
tags:
  - language
  - dart
  - cli
related:
  - languages/dart/cli/overview
  - languages/dart/project-setup
  - languages/dart/async-programming
  - languages/dart/error-handling
language: "dart"
---

# How to Build a CLI in Dart

> A hands-on guide: start with `ArgParser`, grow into a `CommandRunner` multi-command tool, compile to a native binary, wire up correct exit codes and streams, and keep it testable.

---

## Prerequisites

- The Dart SDK installed and a project created — see [Project Setup](../project-setup.md). A CLI usually lives in `bin/`.
- The `args` package added: `dart pub add args`.
- Familiarity with `Future`/async ([Async Programming](../async-programming.md)) and [error handling](../error-handling.md).

This guide bakes in the CLI conventions that matter — **exit codes**, **stdout vs. stderr**, and **honoring `NO_COLOR`** — as it goes.

## Steps

### 1. Start with `ArgParser`

For a single-purpose tool, `ArgParser` from the `args` package parses flags and options.

```dart
import 'dart:io';
import 'package:args/args.dart';

void main(List<String> arguments) {
  final parser = ArgParser()
    ..addFlag('verbose', abbr: 'v', defaultsTo: false)
    ..addOption('count', defaultsTo: '1', help: 'how many times to repeat');

  final ArgResults results;
  try {
    results = parser.parse(arguments);
  } on FormatException catch (e) {
    stderr.writeln('error: ${e.message}');
    stderr.writeln(parser.usage);
    exit(2); // 2 = usage error, by convention
  }

  if (results.rest.isEmpty) {
    stderr.writeln('usage: repeat [--count N] [--verbose] TEXT');
    exit(2);
  }

  final count = int.parse(results['count'] as String);
  if (results['verbose'] as bool) {
    stderr.writeln('repeating ${results.rest.first} $count times');
  }
  for (var i = 0; i < count; i++) stdout.writeln(results.rest.first);
}
```

```console
$ dart run bin/repeat.dart --count 3 hi
hi
hi
hi
```

`ArgParser` handles `--flag`, `--flag=value`, abbreviations (`-v`), and generates a `usage` string, but does not dispatch subcommands. When you need those, move up a layer.

### 2. Scale up with `CommandRunner`

For git-style CLIs, subclass `Command` and register commands with a `CommandRunner`. Each command declares its own args; the runner generates `--help` and dispatches.

```dart
import 'dart:io';
import 'package:args/command_runner.dart';

class AddCommand extends Command<int> {
  @override
  final name = 'add';
  @override
  final description = 'Add a new task';

  AddCommand() {
    argParser
      ..addOption('priority', abbr: 'p', defaultsTo: '1')
      ..addFlag('verbose', abbr: 'v', defaultsTo: false);
  }

  @override
  int run() {
    final task = argResults!.rest.isEmpty ? null : argResults!.rest.first;
    if (task == null) {
      stderr.writeln('error: expected a task');
      return 2;
    }
    if (argResults!['verbose'] as bool) {
      stderr.writeln('adding with priority ${argResults!['priority']}');
    }
    stdout.writeln('added: $task');
    return 0; // becomes the process exit code
  }
}

Future<void> main(List<String> arguments) async {
  final runner = CommandRunner<int>('todo', 'A tiny task manager')
    ..addCommand(AddCommand());
  final code = await runner.run(arguments) ?? 0;
  exit(code);
}
```

```console
$ dart run bin/todo.dart add "buy milk" -p 2 -v
adding with priority 2
added: buy milk
```

Key wins over raw `ArgParser`: nested subcommands, generated `--help`/usage per command, and a typed return (`Command<int>`) you can turn into an exit code. Make `run` `async` (`Future<int>`) when it awaits I/O.

### 3. Use exit codes and streams correctly

- **Results to `stdout`, everything else to `stderr`** so `tool > out.json` captures only real output.
- **Exit non-zero on failure.** `0` = success, `1` = general error, `2` = usage error. Set `exitCode` (from `dart:io`) or return a code from a `Command`, rather than throwing uncaught.
- **Respect `NO_COLOR` and non-TTY output.** Only colorize when `stdout.hasTerminal && Platform.environment['NO_COLOR'] == null`.

```dart
import 'dart:io';

final useColor =
    stdout.hasTerminal && Platform.environment['NO_COLOR'] == null;
String ok(String s) => useColor ? '\x1b[32m$s\x1b[0m' : s;
```

### 4. Compile to a native binary

The distribution win: turn the tool into a single self-contained executable (see [Overview](overview.md#how-it-works)).

```bash
dart compile exe bin/todo.dart -o todo
./todo add "buy milk"      # no Dart SDK required to run
```

Compile once per target OS/architecture. For shell completion, add the [`cli_completion`](https://pub.dev/packages/cli_completion) package, which plugs into `CommandRunner`.

### 5. Make it testable

Keep `main` thin. Put logic in functions or `Command`s that return a value (and take an output sink you can capture) rather than calling `exit` deep inside. This lets tests assert on output and exit codes. See [Testing](../testing.md).

```dart
// Testable: returns an exit code, writes to an injectable sink.
int runAdd(List<String> args, StringSink out) {
  out.writeln('added: ${args.first}');
  return 0;
}
```

```dart
// test/add_test.dart
import 'package:test/test.dart';

void main() {
  test('runAdd writes and returns 0', () {
    final buf = StringBuffer();
    final code = runAdd(['buy milk'], buf);
    expect(code, 0);
    expect(buf.toString(), contains('added: buy milk'));
  });
}
```

## Verification

Run in dev, then compile and exercise each path:

```bash
dart run bin/todo.dart add "buy milk" --priority 2   # expect: added: buy milk
dart run bin/todo.dart --help                        # expect: usage with commands
dart compile exe bin/todo.dart -o todo && ./todo add x
echo $?                                              # expect: 0 on success, non-zero on error
```

## Common issues

| Symptom | Likely cause | Fix |
|---|---|---|
| `FormatException` on parse | Unknown flag, or missing value for an option | Catch it, print `parser.usage` to stderr, `exit(2)` |
| Exit code always `0` on error | Throwing an uncaught exception, or never setting `exitCode` | Return a code from the `Command`, or set `exitCode`; wrap `main` in try/catch |
| Option value is a `String` | `ArgResults` values are strings | Coerce with `int.parse` / `num.parse` |
| Colors leak into piped output | Colorizing unconditionally | Gate on `stdout.hasTerminal && NO_COLOR unset` |
| Compiled binary won't run on another OS | Compiled for the wrong platform | Run `dart compile exe` on each target OS/architecture |

## References

- [Dart: Write command-line apps](https://dart.dev/tutorials/server/cmdline)
- [`args` — `ArgParser` and `CommandRunner`](https://pub.dev/packages/args)
- [`cli_completion`](https://pub.dev/packages/cli_completion)
- [`dart compile`](https://dart.dev/tools/dart-compile)
- [Command Line Interface Guidelines (clig.dev)](https://clig.dev/)
