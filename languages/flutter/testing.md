# Testing in Flutter

> Flutter's testing pyramid has three levels — unit tests (pure Dart), widget tests (Flutter engine, no device), and integration tests (full app on a device) — each with a different speed/fidelity trade-off.

---

## What is it?

Flutter ships `flutter_test` (bundled with the SDK) as its testing framework. It extends Dart's `package:test` with widget-specific utilities: `WidgetTester`, `testWidgets`, `find`, and the `pump` family of methods. Integration tests run on a real device or emulator via the `integration_test` package. Golden tests compare widget screenshots against reference images.

---

## Why does it matter?

Flutter's widget tests run in a headless environment — no device, no simulator — making them fast and CI-friendly. They catch layout bugs, state transitions, and interaction bugs that pure unit tests cannot reach. Integration tests close the gap to production but are slower and require a device. Understanding which level to use when prevents both over-testing slow paths and under-testing critical user flows.

---

## How it works

### Unit tests

Pure Dart tests for business logic. No Flutter engine, no widget tree:

```dart
// test/use_cases/get_user_test.dart
import 'package:test/test.dart';
import 'package:mocktail/mocktail.dart';

class MockUserRepository extends Mock implements UserRepository {}

void main() {
  late MockUserRepository repo;
  late GetUser getUser;

  setUp(() {
    repo = MockUserRepository();
    getUser = GetUser(repo);
  });

  test('returns user when repository succeeds', () async {
    when(() => repo.getUser('1'))
        .thenAnswer((_) async => const User(id: '1', name: 'Alice', email: ''));

    final user = await getUser('1');

    expect(user.name, equals('Alice'));
    verify(() => repo.getUser('1')).called(1);
  });

  test('throws when repository fails', () async {
    when(() => repo.getUser('99'))
        .thenThrow(NotFoundException('User not found'));

    expect(() => getUser('99'), throwsA(isA<NotFoundException>()));
  });
}
```

### Widget tests

Test a single widget or a small widget tree in a headless Flutter environment. Faster than integration tests, with access to the full widget tree:

```dart
// test/widgets/user_card_test.dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('UserCard displays name and email', (WidgetTester tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: UserCard(
          user: User(id: '1', name: 'Alice', email: 'alice@example.com'),
        ),
      ),
    );

    expect(find.text('Alice'), findsOneWidget);
    expect(find.text('alice@example.com'), findsOneWidget);
  });

  testWidgets('tapping the button calls onTap', (WidgetTester tester) async {
    var tapped = false;

    await tester.pumpWidget(
      MaterialApp(
        home: UserCard(
          user: const User(id: '1', name: 'Alice', email: ''),
          onTap: () => tapped = true,
        ),
      ),
    );

    await tester.tap(find.byType(UserCard));
    await tester.pump(); // trigger the rebuild

    expect(tapped, isTrue);
  });
}
```

**Key tester methods:**

| Method | Purpose |
|---|---|
| `pumpWidget(widget)` | Mount the widget tree |
| `pump()` | Advance one frame; process pending callbacks |
| `pumpAndSettle()` | Pump until no more frames are pending (animations done) |
| `tap(finder)` | Simulate a tap |
| `enterText(finder, text)` | Type into a text field |
| `drag(finder, offset)` | Drag a widget |
| `find.text('…')` | Find widgets by text |
| `find.byType(Type)` | Find widgets by type |
| `find.byKey(key)` | Find widgets by key |
| `find.byIcon(icon)` | Find widgets by icon |

### Golden tests

Golden tests compare a rendered widget screenshot against a stored reference image:

```dart
testWidgets('UserCard matches golden', (WidgetTester tester) async {
  await tester.pumpWidget(
    const MaterialApp(
      home: UserCard(
        user: User(id: '1', name: 'Alice', email: 'alice@example.com'),
      ),
    ),
  );

  await expectLater(
    find.byType(UserCard),
    matchesGoldenFile('goldens/user_card.png'),
  );
});
```

Generate or update golden files:

```bash
flutter test --update-goldens
```

### Integration tests

Integration tests run the full app on a device or emulator. Add the `integration_test` package:

```yaml
dev_dependencies:
  integration_test:
    sdk: flutter
```

```dart
// integration_test/app_test.dart
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:my_app/main.dart' as app;

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('full login flow', (tester) async {
    app.main();
    await tester.pumpAndSettle();

    await tester.enterText(find.byKey(const Key('email_field')), 'alice@example.com');
    await tester.enterText(find.byKey(const Key('password_field')), 'secret');
    await tester.tap(find.byKey(const Key('login_button')));
    await tester.pumpAndSettle();

    expect(find.text('Welcome, Alice'), findsOneWidget);
  });
}
```

Run on a device:

```bash
flutter test integration_test/app_test.dart
```

### Running tests

```bash
flutter test                              # all unit and widget tests
flutter test test/widgets/user_card_test.dart  # specific file
flutter test --coverage                   # collect coverage
flutter test --update-goldens             # regenerate golden images
```

---

## When to use

- Use **unit tests** for all business logic, use cases, and repository implementations.
- Use **widget tests** for individual widgets and screen-level state transitions.
- Use **golden tests** for design-system components where visual regression matters.
- Use **integration tests** for critical user journeys (login, checkout, onboarding).

---

## When NOT to use

- Do not use widget tests for business logic — test that in unit tests where it runs faster and without the Flutter engine.
- Do not use integration tests for every screen — they are slow and brittle; reserve them for the critical happy path.
- Do not regenerate goldens automatically in CI — review diffs before updating reference images.

---

## References

- [Testing Flutter apps — docs.flutter.dev](https://docs.flutter.dev/testing/overview)
- [flutter_test API — api.flutter.dev](https://api.flutter.dev/flutter/flutter_test/flutter_test-library.html)
- [integration_test package — pub.dev](https://pub.dev/packages/integration_test)
- [Widget testing cookbook — docs.flutter.dev](https://docs.flutter.dev/cookbook/testing/widget/introduction)
- [mocktail — pub.dev](https://pub.dev/packages/mocktail)
