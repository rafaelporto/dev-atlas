# Clean Architecture in Flutter

> Clean Architecture separates a Flutter app into three independent layers — UI, domain, and data — so that business logic can be tested without the framework and data sources can be swapped without touching the UI.

---

## What is it?

Clean Architecture, popularised by Robert C. Martin, structures an application in concentric layers where dependencies always point inward: outer layers (UI, data) depend on inner layers (domain), never the reverse. In Flutter, this means the core business logic (entities and use cases) knows nothing about Flutter widgets, HTTP clients, or databases.

Flutter's own **recommended app architecture** follows the same principle with three layers: UI, domain (logic), and data, with a repository as the boundary between domain and data.

---

## Why does it matter?

Without architectural boundaries, Flutter apps commonly end up with networking code in `build` methods, business logic scattered across Blocs and screens, and tests that require a running Flutter engine. Clean Architecture makes business logic testable in pure Dart, makes data sources swappable, and makes the UI a thin layer that only maps state to widgets.

---

## How it works

### The layers

```
┌─────────────────────────────────────┐
│         Presentation Layer          │  Widgets, Screens, ViewModels,
│  (Flutter widgets, state managers)  │  Blocs, Providers, Riverpod Notifiers
└─────────────────┬───────────────────┘
                  │ calls
┌─────────────────▼───────────────────┐
│           Domain Layer              │  Entities, Use Cases, Repository
│       (pure Dart, no Flutter)       │  interfaces (abstract classes)
└─────────────────┬───────────────────┘
                  │ implements
┌─────────────────▼───────────────────┐
│            Data Layer               │  Repository implementations,
│   (HTTP, local DB, cache, mappers)  │  data models, API clients
└─────────────────────────────────────┘
```

The **Dependency Rule**: source code dependencies always point inward. Domain never imports from data or presentation.

### Directory structure

```
lib/
├── features/
│   └── user/
│       ├── domain/
│       │   ├── entities/
│       │   │   └── user.dart            # pure Dart entity
│       │   ├── repositories/
│       │   │   └── user_repository.dart # abstract interface
│       │   └── use_cases/
│       │       └── get_user.dart        # single-responsibility use case
│       ├── data/
│       │   ├── models/
│       │   │   └── user_dto.dart        # JSON mapping
│       │   ├── sources/
│       │   │   └── user_api.dart        # HTTP client
│       │   └── repositories/
│       │       └── user_repository_impl.dart
│       └── presentation/
│           ├── screens/
│           │   └── user_screen.dart
│           ├── widgets/
│           │   └── user_card.dart
│           └── notifiers/
│               └── user_notifier.dart
└── core/
    ├── error/
    │   └── failure.dart
    └── network/
        └── http_client.dart
```

### Domain layer — entities and use cases

```dart
// domain/entities/user.dart — pure Dart, no Flutter, no http
class User {
  final String id;
  final String name;
  final String email;
  const User({required this.id, required this.name, required this.email});
}

// domain/repositories/user_repository.dart — abstract interface
abstract class UserRepository {
  Future<User> getUser(String id);
  Future<List<User>> searchUsers(String query);
}

// domain/use_cases/get_user.dart — single responsibility
class GetUser {
  final UserRepository repository;
  GetUser(this.repository);

  Future<User> call(String id) => repository.getUser(id);
}
```

### Data layer — DTO and repository implementation

```dart
// data/models/user_dto.dart — knows about JSON
class UserDto {
  final String id;
  final String name;
  final String email;

  UserDto.fromJson(Map<String, dynamic> json)
      : id = json['id'] as String,
        name = json['name'] as String,
        email = json['email'] as String;

  User toEntity() => User(id: id, name: name, email: email);
}

// data/repositories/user_repository_impl.dart
class UserRepositoryImpl implements UserRepository {
  final UserApi _api;
  UserRepositoryImpl(this._api);

  @override
  Future<User> getUser(String id) async {
    final dto = await _api.fetchUser(id);
    return dto.toEntity();
  }

  @override
  Future<List<User>> searchUsers(String query) async {
    final dtos = await _api.searchUsers(query);
    return dtos.map((dto) => dto.toEntity()).toList();
  }
}
```

### Presentation layer — Riverpod notifier

```dart
// presentation/notifiers/user_notifier.dart
@riverpod
Future<User> user(UserRef ref, String id) {
  final getUser = ref.watch(getUserUseCaseProvider);
  return getUser(id);
}

// presentation/screens/user_screen.dart
class UserScreen extends ConsumerWidget {
  final String userId;
  const UserScreen({super.key, required this.userId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncUser = ref.watch(userProvider(userId));
    return asyncUser.when(
      loading: () => const CircularProgressIndicator(),
      error: (e, _) => ErrorWidget(e.toString()),
      data: (user) => UserCard(user: user),
    );
  }
}
```

---

## When to use

- Use Clean Architecture for apps with non-trivial business rules, multiple data sources, or teams that need to test business logic independently of Flutter.
- Use the repository abstraction to make data sources (API, local DB, cache) interchangeable.
- Place all Flutter imports exclusively in the presentation layer.

---

## When NOT to use

- Do not apply full Clean Architecture to a simple CRUD app or a prototype — the overhead outweighs the benefit.
- Do not create a use case class that simply delegates to the repository with no additional logic — a use case should encapsulate business rules, not be a pass-through wrapper.
- Do not let domain entities depend on external packages (HTTP libraries, database models) — they should be plain Dart objects.

---

## References

- [Flutter app architecture — docs.flutter.dev](https://docs.flutter.dev/app-architecture)
- [Clean Architecture — Robert C. Martin (Uncle Bob)](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Very Good Architecture — verygood.ventures](https://verygood.ventures/blog/very-good-flutter-architecture)
- [Riverpod — riverpod.dev](https://riverpod.dev)
