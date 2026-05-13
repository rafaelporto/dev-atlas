# Async in Flutter

> Flutter provides `FutureBuilder` and `StreamBuilder` to bridge Dart's async model with the widget tree — turning a `Future` or `Stream` into reactive UI that handles loading and error states declaratively.

---

## What is it?

**`FutureBuilder`** rebuilds its subtree when a `Future` completes, exposing the result (or error) through an `AsyncSnapshot`. **`StreamBuilder`** does the same for a `Stream`, rebuilding every time a new event arrives. Both eliminate the boilerplate of managing loading/error/data state manually in a `StatefulWidget`.

---

## Why does it matter?

Most Flutter apps load data from the network or a database asynchronously. Without a structured pattern, developers resort to managing `_isLoading`, `_error`, and `_data` fields in state, calling `setState` repeatedly, and risking stale UI when the widget is disposed before the `Future` resolves. `FutureBuilder` and `StreamBuilder` centralise this logic in the widget tree itself.

---

## How it works

### FutureBuilder

```dart
class UserProfileScreen extends StatelessWidget {
  final String userId;
  const UserProfileScreen({super.key, required this.userId});

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<User>(
      future: UserService.fetchUser(userId),
      builder: (context, snapshot) {
        return switch (snapshot.connectionState) {
          ConnectionState.waiting => const CircularProgressIndicator(),
          ConnectionState.done when snapshot.hasError =>
            ErrorWidget('Failed to load user: ${snapshot.error}'),
          ConnectionState.done =>
            UserCard(user: snapshot.requireData),
          _ => const SizedBox.shrink(),
        };
      },
    );
  }
}
```

`AsyncSnapshot` exposes:
- `connectionState` — `none`, `waiting`, `active`, `done`
- `data` — the resolved value (may be null)
- `error` — the thrown error (may be null)
- `hasData`, `hasError` — convenience booleans
- `requireData` — returns `data` or throws if null

**Important**: avoid calling an async function directly inside `future:`. If the parent rebuilds, the `Future` is recreated, causing a flicker:

```dart
// Wrong — rebuilds the future on every parent build
future: fetchUser(userId),

// Correct — store the future in initState or a provider
late final Future<User> _userFuture;

@override
void initState() {
  super.initState();
  _userFuture = UserService.fetchUser(widget.userId);
}

// Then use: future: _userFuture
```

### StreamBuilder

```dart
class LiveScoreWidget extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return StreamBuilder<Score>(
      stream: ScoreService.liveScores(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const CircularProgressIndicator();
        }
        if (snapshot.hasError) {
          return Text('Error: ${snapshot.error}');
        }
        if (!snapshot.hasData) {
          return const Text('No data yet');
        }
        return ScoreCard(score: snapshot.requireData);
      },
    );
  }
}
```

### Manual async state in StatefulWidget

For more control (e.g., triggering fetches on button press, caching, retry logic), manage async state manually:

```dart
class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key});

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  List<Product>? _results;
  Object? _error;
  bool _loading = false;

  Future<void> _search(String query) async {
    setState(() { _loading = true; _error = null; });
    try {
      final results = await ProductService.search(query);
      if (mounted) setState(() { _results = results; _loading = false; });
    } catch (e) {
      if (mounted) setState(() { _error = e; _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        SearchBar(onSubmitted: _search),
        if (_loading) const LinearProgressIndicator(),
        if (_error != null) ErrorBanner(error: _error!),
        if (_results != null) ProductList(products: _results!),
      ],
    );
  }
}
```

### Async with state management (Riverpod)

Riverpod's `AsyncValue` and `FutureProvider` are the idiomatic way to handle async state in apps using Riverpod:

```dart
final userProvider = FutureProvider.family<User, String>((ref, userId) {
  return UserService.fetchUser(userId);
});

class UserProfileScreen extends ConsumerWidget {
  final String userId;
  const UserProfileScreen({super.key, required this.userId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncUser = ref.watch(userProvider(userId));

    return asyncUser.when(
      loading: () => const CircularProgressIndicator(),
      error: (error, _) => ErrorWidget(error.toString()),
      data: (user) => UserCard(user: user),
    );
  }
}
```

---

## When to use

- Use `FutureBuilder` for one-off data loads that are scoped to a single widget and do not need caching.
- Use `StreamBuilder` for real-time data (WebSocket feeds, Firestore snapshots, sensor data).
- Use manual `StatefulWidget` state for async operations with complex control flow (retry, pagination, cancellation).
- Use `FutureProvider` / `StreamProvider` (Riverpod) when the async state needs to be shared or cached across widgets.

---

## When NOT to use

- Do not pass a function call directly to `FutureBuilder.future` — cache the `Future` in `initState` or a provider.
- Do not ignore `snapshot.connectionState` — always handle the `waiting` state to avoid showing stale data.
- Do not call `setState` after `dispose()` — guard async callbacks with `if (mounted)`.

---

## References

- [Fetch data from the internet — docs.flutter.dev](https://docs.flutter.dev/cookbook/networking/fetch-data)
- [FutureBuilder API — api.flutter.dev](https://api.flutter.dev/flutter/widgets/FutureBuilder-class.html)
- [StreamBuilder API — api.flutter.dev](https://api.flutter.dev/flutter/widgets/StreamBuilder-class.html)
- [AsyncValue — Riverpod docs](https://riverpod.dev/docs/concepts/reading#asyncvalue)
