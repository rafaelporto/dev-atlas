---
type: concept
tags:
  - language
  - flutter
  - dart
  - mobile
  - comparison
related: []
language: "flutter"
---
# Stateless vs Stateful Widgets

> `StatelessWidget` describes UI that depends only on its configuration; `StatefulWidget` pairs with a `State` object that can change over time and trigger rebuilds.

---

## What is it?

Flutter has two fundamental widget base classes: **`StatelessWidget`** (immutable, rebuilds only when its parent passes new configuration) and **`StatefulWidget`** (owns a mutable `State` object that persists across rebuilds and can call `setState()` to schedule a repaint). Every custom widget you write extends one of these two.

---

## Why does it matter?

Choosing the wrong type is the most common Flutter beginner mistake. A `StatefulWidget` where a `StatelessWidget` would suffice adds unnecessary complexity. A `StatelessWidget` trying to manage mutable data leads to stale UI. Understanding when state belongs in the widget itself versus in an external state management solution shapes the entire architecture of a Flutter app.

---

## How it works

### StatelessWidget

A `StatelessWidget` is a pure function of its inputs. Given the same constructor arguments, it always builds the same widget tree. The framework rebuilds it when its parent rebuilds and passes different properties.

```dart
class GreetingCard extends StatelessWidget {
  final String name;
  final String message;

  const GreetingCard({
    super.key,
    required this.name,
    required this.message,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(name, style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 8),
            Text(message),
          ],
        ),
      ),
    );
  }
}
```

### StatefulWidget

A `StatefulWidget` is split into two classes:
- The **widget** itself — immutable, holds the configuration.
- The **State** object — mutable, holds the runtime state, survives widget rebuilds.

```dart
class Counter extends StatefulWidget {
  final int initialValue;

  const Counter({super.key, this.initialValue = 0});

  @override
  State<Counter> createState() => _CounterState();
}

class _CounterState extends State<Counter> {
  late int _count;

  @override
  void initState() {
    super.initState();
    _count = widget.initialValue;
  }

  void _increment() {
    setState(() {
      _count++;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text('Count: $_count'),
        ElevatedButton(
          onPressed: _increment,
          child: const Text('Increment'),
        ),
      ],
    );
  }

  @override
  void dispose() {
    // cancel timers, close streams, dispose controllers here
    super.dispose();
  }
}
```

### StatefulWidget lifecycle

```
createState()         — framework calls this once when the widget is first inserted
     │
initState()           — called once; initialise state, subscribe to streams
     │
didChangeDependencies() — called after initState and when an InheritedWidget changes
     │
build()               — called on every rebuild; must be pure and fast
     │
didUpdateWidget()     — called when the parent rebuilds with a new widget instance
     │                   (same type); compare old vs new widget.property here
setState()  ──────────► build()  — triggers a rebuild of this subtree
     │
deactivate()          — called when the widget is removed from the tree temporarily
     │
dispose()             — called once when permanently removed; clean up resources
```

### setState

`setState` schedules a rebuild of the `State`'s subtree. The callback passed to it should only mutate state synchronously — do not `await` inside `setState`:

```dart
// correct
setState(() => _loading = true);
final data = await fetchData();
setState(() {
  _loading = false;
  _data = data;
});

// wrong — awaiting inside setState does not work as expected
setState(() async {
  _data = await fetchData(); // this runs after the setState callback returns
});
```

---

## Examples

An end-to-end screen composing both kinds of widget: a stateful parent owning the mutable count and a stateless child that only renders what it is given:

```dart
class CounterScreen extends StatefulWidget {
  const CounterScreen({super.key});

  @override
  State<CounterScreen> createState() => _CounterScreenState();
}

class _CounterScreenState extends State<CounterScreen> {
  int _count = 0;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        CountLabel(count: _count), // stateless: pure function of its input
        ElevatedButton(
          onPressed: () => setState(() => _count++),
          child: const Text('Increment'),
        ),
      ],
    );
  }
}

class CountLabel extends StatelessWidget {
  final int count;
  const CountLabel({super.key, required this.count});

  @override
  Widget build(BuildContext context) => Text('Count: $count');
}
```

---

## When to use

- Use a `StatelessWidget` when the widget is a pure function of its constructor inputs and holds no mutable state.
- Use a `StatefulWidget` when the widget owns local, mutable state or a resource (controller, timer, subscription) that must be disposed.
- Push shared or long-lived state out of widgets entirely into a state-management solution (see below).

The subsections below break this down per case.

## When to use StatelessWidget

- The widget displays data passed from its parent and has no internal state.
- All visual logic is derived from constructor parameters.
- The widget is a pure presentation component (a card, a badge, a header).

## When to use StatefulWidget

- The widget needs to react to user input and update itself (a form field, a toggle, an animation).
- The widget manages a subscription (a stream, a timer, a scroll controller) that must be disposed.
- The state is local and does not need to be shared with other widgets.

## When to use neither (external state management)

- The state needs to be shared across multiple widgets or screens.
- The state outlives the widget (e.g., user session, shopping cart).
- Business logic should be separated from the UI layer.

In those cases, use Riverpod, Bloc, or Provider instead of `StatefulWidget`. See [State Management](state-management.md).

---

## When NOT to use

- Do not use a `StatefulWidget` when the widget only renders data passed from its parent — a `StatelessWidget` is simpler and cheaper.
- Do not store shared or app-wide state (session, cart, auth) in a widget's `State` — it dies with the widget and cannot be reached elsewhere; lift it into a state-management layer.
- Do not put business logic or I/O directly in `build()` or `setState()` — keep `build` pure and fast.
- Do not call `setState()` after `dispose()` (e.g., from a late-arriving async callback) — guard with `if (mounted)`.

---

## References

- [Adding interactivity — docs.flutter.dev](https://docs.flutter.dev/ui/interactivity)
- [StatefulWidget API — api.flutter.dev](https://api.flutter.dev/flutter/widgets/StatefulWidget-class.html)
- [State API — api.flutter.dev](https://api.flutter.dev/flutter/widgets/State-class.html)
- [StatelessWidget API — api.flutter.dev](https://api.flutter.dev/flutter/widgets/StatelessWidget-class.html)
