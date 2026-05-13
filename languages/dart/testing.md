# Testing in Dart

> Dart's `package:test` provides a full testing framework — unit tests, grouped suites, matchers, and first-class async support — all runnable with a single command.

---

## What is it?

Dart testing is built on the `test` package, which provides `test()`, `group()`, `expect()`, and a rich matcher API. Tests are discovered and run with `dart test`, which finds all `*_test.dart` files in the `test/` directory. For mocking dependencies, `mocktail` defines mock classes without code generation; `mockito` generates them from annotations via `build_runner`.

---

## Why does it matter?

Dart's sound type system catches type errors at compile time, but it cannot verify business logic. Tests fill that gap. Because Dart applications are heavily async, the testing framework must handle `Future` and `Stream` natively — `package:test` does, so async tests look exactly like synchronous ones.

---

## How it works

### Basic test structure

```dart
import 'package:test/test.dart';
import 'package:my_app/src/calculator.dart';

void main() {
  group('Calculator', () {
    late Calculator calc;

    setUp(() => calc = Calculator());

    test('adds two numbers', () {
      expect(calc.add(2, 3), equals(5));
    });

    test('throws on division by zero', () {
      expect(() => calc.divide(10, 0), throwsArgumentError);
    });
  });
}
```

- `group` — organises related tests and shares `setUp`/`tearDown`.
- `setUp` / `tearDown` — run before/after each test in the group.
- `setUpAll` / `tearDownAll` — run once before/after all tests in the group.

### Common matchers

```dart
expect(value, equals(42));
expect(list, hasLength(3));
expect(string, contains('hello'));
expect(string, startsWith('Hi'));
expect(value, isNull);
expect(value, isNotNull);
expect(value, isA<User>());
expect(value, greaterThan(0));
expect(list, containsAll(['a', 'b']));
expect(() => boom(), throwsA(isA<FormatException>()));
expect(() => boom(), throwsArgumentError);
```

### Async tests

```dart
test('fetches a user asynchronously', () async {
  final user = await userService.getUser(1);
  expect(user.name, equals('Alice'));
});

test('stream emits expected values', () async {
  final stream = counter(3); // emits 0, 1, 2
  await expectLater(stream, emitsInOrder([0, 1, 2, emitsDone]));
});
```

Mark the test callback `async` — `package:test` detects the returned `Future` and waits for it automatically.

### Mocking with mocktail

`mocktail` does not require code generation — mock classes are written manually by extending `Mock`:

```dart
import 'package:mocktail/mocktail.dart';
import 'package:test/test.dart';

class MockUserRepository extends Mock implements UserRepository {}

void main() {
  late MockUserRepository repo;
  late UserService service;

  setUp(() {
    repo = MockUserRepository();
    service = UserService(repo);
  });

  test('returns user from repository', () async {
    when(() => repo.findById('1'))
        .thenAnswer((_) async => User(id: '1', name: 'Alice'));

    final user = await service.getUser('1');

    expect(user.name, equals('Alice'));
    verify(() => repo.findById('1')).called(1);
  });

  test('throws when user not found', () async {
    when(() => repo.findById('99')).thenAnswer((_) async => null);

    expect(
      () => service.getUser('99'),
      throwsA(isA<NotFoundException>()),
    );
  });
}
```

### Test coverage

```bash
dart test --coverage=coverage/

# Convert to LCOV format (requires the coverage package)
dart pub global activate coverage
dart pub global run coverage:format_coverage \
    --lcov \
    --in=coverage \
    --out=coverage/lcov.info \
    --report-on=lib

# Generate HTML report (requires lcov installed)
genhtml coverage/lcov.info -o coverage/html
open coverage/html/index.html
```

### Running tests

```bash
dart test                             # run all tests
dart test test/user_test.dart         # run a specific file
dart test --name 'adds two'           # run tests matching a name pattern
dart test --tags unit                 # run tests tagged with @Tags(['unit'])
dart test --reporter expanded         # verbose output with test names
```

---

## When to use

- Write unit tests for all business logic, domain models, and utility functions.
- Use `setUp` / `tearDown` for test-local state; use `setUpAll` / `tearDownAll` for expensive shared setup (server instances, database connections).
- Use `mocktail` (or `mockito`) to isolate the unit under test from its dependencies.
- Use stream matchers (`emitsInOrder`, `emitsThrough`, `emitsDone`) for testing async sequences.

---

## When NOT to use

- Do not mock types you do not own (third-party library classes) — test against the real implementation or wrap it in your own interface.
- Do not write tests that only verify the mock — keep mock setups minimal and verify only the interactions that matter.
- Do not use `setUpAll` for state that must be fresh per test — use `setUp`.

---

## References

- [Testing in Dart — dart.dev](https://dart.dev/tools/testing)
- [package:test — pub.dev](https://pub.dev/packages/test)
- [mocktail — pub.dev](https://pub.dev/packages/mocktail)
- [mockito — pub.dev](https://pub.dev/packages/mockito)
- [coverage package — pub.dev](https://pub.dev/packages/coverage)
