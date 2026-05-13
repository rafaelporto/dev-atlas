# Dependency Injection in Flutter

> Flutter apps use a service locator (GetIt) or annotation-based code generation (Injectable) to wire dependencies without passing them through the widget tree manually.

---

## What is it?

**Dependency Injection (DI)** is the practice of supplying a class's dependencies from outside rather than having the class create them itself. In Flutter, there is no built-in DI container. The most common approach is a **service locator** via **GetIt** — a global registry where dependencies are registered at startup and retrieved anywhere without `BuildContext`. **Injectable** extends GetIt with code generation, eliminating the manual registration boilerplate.

---

## Why does it matter?

Without DI, dependencies are either hardcoded (`UserRepository()` called inside a notifier) or propagated manually through constructors across many layers. Hardcoded dependencies make testing impossible; manual propagation creates constructor chains. A service locator or DI container centralises wiring, making it easy to swap implementations for tests and to manage the lifecycle of singletons and factories.

---

## How it works

### GetIt — manual registration

```dart
// lib/core/di/service_locator.dart
import 'package:get_it/get_it.dart';

final getIt = GetIt.instance;

Future<void> setupServiceLocator() async {
  // Singletons — created once, reused forever
  getIt.registerSingleton<HttpClient>(HttpClient());
  getIt.registerSingleton<UserApi>(UserApi(getIt<HttpClient>()));

  // Lazy singletons — created on first access
  getIt.registerLazySingleton<UserRepository>(
    () => UserRepositoryImpl(getIt<UserApi>()),
  );

  // Factories — new instance on every call
  getIt.registerFactory<GetUser>(
    () => GetUser(getIt<UserRepository>()),
  );
}

// main.dart
void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await setupServiceLocator();
  runApp(const MyApp());
}
```

**Accessing registered dependencies:**

```dart
// Anywhere in the app — no BuildContext needed
final getUser = getIt<GetUser>();
final user = await getUser('42');
```

### GetIt — async singletons

For dependencies that require async initialisation (database, preferences):

```dart
getIt.registerSingletonAsync<Database>(
  () async {
    final db = await openDatabase('app.db');
    return db;
  },
);

// Wait for all async singletons to be ready before running the app
await getIt.allReady();
runApp(const MyApp());
```

### Injectable — code generation

Injectable generates the `setupServiceLocator` call from annotations, removing manual registration code entirely.

**Add dependencies:**

```yaml
dependencies:
  get_it: ^7.6.0
  injectable: ^2.3.0

dev_dependencies:
  injectable_generator: ^2.4.0
  build_runner: ^2.4.0
```

**Annotate classes:**

```dart
// Singleton
@singleton
class HttpClient { /* ... */ }

// Lazy singleton
@lazySingleton
class UserApi {
  final HttpClient _client;
  UserApi(this._client);
}

// Repository interface + implementation
@lazySingleton
class UserRepositoryImpl implements UserRepository {
  final UserApi _api;
  UserRepositoryImpl(this._api);
  // ...
}

// Factory
@injectable
class GetUser {
  final UserRepository _repository;
  GetUser(this._repository);
}
```

**Configure the locator:**

```dart
// lib/core/di/service_locator.dart
import 'package:get_it/get_it.dart';
import 'package:injectable/injectable.dart';
import 'service_locator.config.dart'; // generated file

final getIt = GetIt.instance;

@InjectableInit()
Future<void> setupServiceLocator() async => getIt.init();
```

**Generate the registration code:**

```bash
dart run build_runner build --delete-conflicting-outputs
```

This generates `service_locator.config.dart` with all registrations wired automatically.

### Testing with GetIt

Override registrations for tests by unregistering and re-registering:

```dart
setUp(() {
  getIt.reset(); // clear all registrations

  getIt.registerSingleton<UserRepository>(MockUserRepository());
  getIt.registerFactory<GetUser>(() => GetUser(getIt<UserRepository>()));
});
```

Or use `allowReassignment` for targeted overrides:

```dart
getIt.allowReassignment = true;
getIt.registerSingleton<UserRepository>(MockUserRepository());
```

---

## When to use

- Use **GetIt** for straightforward manual wiring in small-to-medium apps where the registration code is manageable.
- Use **Injectable** in larger apps to eliminate boilerplate and enforce consistent DI patterns across the codebase.
- Use factory registrations for use cases and view models; use lazy singletons for repositories and API clients; use singletons for services that must be shared globally (analytics, logging).

---

## When NOT to use

- Do not use GetIt as a hidden global state store — only register true dependencies (services, repositories, clients), not arbitrary app state.
- Do not skip `getIt.reset()` between tests — stale registrations cause test pollution.
- Do not register Flutter widgets or BuildContext-dependent objects in GetIt — they belong in the widget tree.

---

## References

- [get_it — pub.dev](https://pub.dev/packages/get_it)
- [injectable — pub.dev](https://pub.dev/packages/injectable)
- [Flutter app architecture: dependency injection — docs.flutter.dev](https://docs.flutter.dev/app-architecture/design-patterns/dependency-injection)
